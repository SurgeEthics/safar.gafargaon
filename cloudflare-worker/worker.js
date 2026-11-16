/**
 * Safar Gafargaon - Hardened Cloudflare Worker for Real-Time Live Location Tracking
 * Implements Origin-validated CORS, Security Headers, Firebase ID Token verification,
 * Per-IP rate limiting, strict schema sanitization, and zero-PII broadcasting.
 */

const FIREBASE_PROJECT_ID = 'gen-lang-client-0494218293';
const SUPER_ADMIN_EMAIL = 'safar.gafargaon@gmail.com';
const MAX_WS_PAYLOAD_BYTES = 16384;

const activeDrivers = new Map();
const activePassengers = new Map();
const connectedSockets = new Set();
const ipRateBuckets = new Map();

let cachedJwks = null;
let jwksExpireAt = 0;

const ALLOWED_ORIGIN_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?$/i,
  /^https:\/\/ais-(dev|pre)-w6vgd7lt5ex5bc5rbquynw-243355990991\.asia-northeast1\.run\.app$/i,
  /^https:\/\/[a-z0-9-]+\.asia-northeast1\.run\.app$/i,
  /^https:\/\/[a-z0-9-]+\.pages\.dev$/i,
  /^https:\/\/[a-z0-9-]+\.workers\.dev$/i,
];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
}

function buildHeaders(request, extra = {}) {
  const origin = request.headers.get('Origin');
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    ...extra,
  };
  if (origin && isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
  }
  return headers;
}

function checkRateLimit(ip, limit, windowMs) {
  const now = Date.now();
  const list = (ipRateBuckets.get(ip) || []).filter((t) => now - t < windowMs);
  if (list.length >= limit) {
    return false;
  }
  list.push(now);
  ipRateBuckets.set(ip, list);
  return true;
}

function decodeBase64UrlToUint8Array(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '==='.slice((b64.length + 3) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function fetchGoogleJwks() {
  const now = Date.now();
  if (cachedJwks && now < jwksExpireAt) return cachedJwks;
  const resp = await fetch(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
  );
  if (!resp.ok) throw new Error('Failed to fetch Firebase JWKs');
  const data = await resp.json();
  cachedJwks = data.keys || [];
  jwksExpireAt = now + 3600 * 1000;
  return cachedJwks;
}

async function verifyFirebaseIdTokenEdge(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed JWT');
  const [headerB64, payloadB64, sigB64] = parts;
  const header = JSON.parse(new TextDecoder().decode(decodeBase64UrlToUint8Array(headerB64)));
  const payload = JSON.parse(new TextDecoder().decode(decodeBase64UrlToUint8Array(payloadB64)));

  if (header.alg !== 'RS256' || !header.kid) throw new Error('Invalid alg');
  const jwks = await fetchGoogleJwks();
  const jwk = jwks.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('Unknown key');

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signedBytes = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const sigBytes = decodeBase64UrlToUint8Array(sigB64);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sigBytes, signedBytes);
  if (!valid) throw new Error('Invalid signature');

  const nowSec = Math.floor(Date.now() / 1000);
  if (
    payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}` ||
    payload.aud !== FIREBASE_PROJECT_ID ||
    typeof payload.exp !== 'number' ||
    payload.exp <= nowSec ||
    !payload.sub ||
    payload.email_verified !== true
  ) {
    throw new Error('Token claims invalid');
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  return {
    uid: payload.sub,
    email,
    isAdmin: email === SUPER_ADMIN_EMAIL && payload.email_verified === true,
  };
}

function cleanStr(val, maxLen) {
  if (typeof val !== 'string') return '';
  return val.replace(/[\u0000-\u001F\u007F<>]/g, '').trim().slice(0, maxLen);
}

function isValidBdCoord(lat, lng) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 20 &&
    lat <= 27 &&
    lng >= 88 &&
    lng <= 93
  );
}

function toPublicDriver(d) {
  const { ownerUid: _omit, ...safe } = d;
  return safe;
}

function toPublicPassenger(p) {
  return {
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    status: p.status,
    pickupPoint: p.pickupPoint,
    destination: p.destination,
    updatedAt: p.updatedAt,
  };
}

function broadcast(message, excludeWs = null) {
  const jsonStr = typeof message === 'string' ? message : JSON.stringify(message);
  for (const ws of connectedSockets) {
    if (ws !== excludeWs && ws.readyState === 1) {
      try {
        ws.send(jsonStr);
      } catch {
        connectedSockets.delete(ws);
      }
    }
  }
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const ip = request.headers.get('CF-Connecting-IP') || 'edge';

    if (request.method === 'OPTIONS') {
      if (origin && !isAllowedOrigin(origin)) {
        return new Response(null, { status: 403 });
      }
      return new Response(null, { status: 204, headers: buildHeaders(request) });
    }

    if (!checkRateLimit(ip, 60, 60000)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: buildHeaders(request, { 'Content-Type': 'application/json', 'Retry-After': '60' }),
      });
    }

    // 1. WebSocket upgrade
    if (url.pathname === '/ws' || url.pathname === '/api/live/ws') {
      if (origin && !isAllowedOrigin(origin)) {
        return new Response('Forbidden origin', { status: 403 });
      }
      const upgradeHeader = request.headers.get('Upgrade');
      if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
        return new Response('Expected WebSocket upgrade', { status: 426, headers: buildHeaders(request) });
      }

      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);

      server.accept();
      connectedSockets.add(server);
      let wsAuthUser = null;
      let wsMsgTimestamps = [];

      server.send(
        JSON.stringify({
          type: 'SYNC_STATE',
          provider: 'Cloudflare Worker (Edge)',
          drivers: Array.from(activeDrivers.values()).map(toPublicDriver),
          passengers: Array.from(activePassengers.values()).map(toPublicPassenger),
          timestamp: Date.now(),
        })
      );

      server.addEventListener('message', async (event) => {
        if (typeof event.data !== 'string' || event.data.length > MAX_WS_PAYLOAD_BYTES) return;
        const now = Date.now();
        wsMsgTimestamps = wsMsgTimestamps.filter((t) => now - t < 10000);
        if (wsMsgTimestamps.length >= 30) return;
        wsMsgTimestamps.push(now);

        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'PING') {
            server.send(JSON.stringify({ type: 'PONG', timestamp: now }));
            return;
          }
          if (payload.type === 'AUTH' && typeof payload.token === 'string') {
            try {
              wsAuthUser = await verifyFirebaseIdTokenEdge(payload.token);
              server.send(JSON.stringify({ type: 'AUTH_OK', uid: wsAuthUser.uid }));
            } catch {
              wsAuthUser = null;
              server.send(JSON.stringify({ type: 'AUTH_ERROR' }));
            }
            return;
          }
          if (!wsAuthUser) {
            server.send(JSON.stringify({ type: 'AUTH_REQUIRED' }));
            return;
          }

          if (payload.type === 'UPDATE_DRIVER' && payload.data?.id && isValidBdCoord(payload.data.lat, payload.data.lng)) {
            const id = cleanStr(payload.data.id, 128);
            const prev = activeDrivers.get(id);
            if (prev && prev.ownerUid !== wsAuthUser.uid && !wsAuthUser.isAdmin) return;
            const driver = {
              id,
              ownerUid: wsAuthUser.uid,
              name: cleanStr(payload.data.name, 80) || 'চালক',
              category: cleanStr(payload.data.category, 40) || 'cng',
              vehicleModel: cleanStr(payload.data.vehicleModel, 80),
              plateNumber: cleanStr(payload.data.plateNumber, 40),
              standName: cleanStr(payload.data.standName, 100),
              lat: payload.data.lat,
              lng: payload.data.lng,
              isOnline: payload.data.isOnline !== false,
              updatedAt: now,
            };
            activeDrivers.set(id, driver);
            broadcast({ type: 'DRIVER_MOVED', driver: toPublicDriver(driver), timestamp: now }, server);
          }

          if (payload.type === 'UPDATE_PASSENGER' && payload.data?.id && isValidBdCoord(payload.data.lat, payload.data.lng)) {
            const id = cleanStr(payload.data.id, 128);
            const prev = activePassengers.get(id);
            if (prev && prev.ownerUid !== wsAuthUser.uid && !wsAuthUser.isAdmin) return;
            const passenger = {
              id,
              ownerUid: wsAuthUser.uid,
              lat: payload.data.lat,
              lng: payload.data.lng,
              pickupPoint: cleanStr(payload.data.pickupPoint, 120),
              destination: cleanStr(payload.data.destination, 120),
              status: payload.data.status === 'on_trip' ? 'on_trip' : 'seeking_ride',
              updatedAt: now,
            };
            activePassengers.set(id, passenger);
            broadcast({ type: 'PASSENGER_MOVED', passenger: toPublicPassenger(passenger), timestamp: now }, server);
          }

          if (payload.type === 'REMOVE_USER' && payload.id) {
            const id = cleanStr(payload.id, 128);
            if (payload.role === 'driver') {
              const prev = activeDrivers.get(id);
              if (prev && (prev.ownerUid === wsAuthUser.uid || wsAuthUser.isAdmin)) {
                activeDrivers.delete(id);
                broadcast({ type: 'USER_REMOVED', id, role: 'driver', timestamp: now });
              }
            } else {
              const prev = activePassengers.get(id);
              if (prev && (prev.ownerUid === wsAuthUser.uid || wsAuthUser.isAdmin)) {
                activePassengers.delete(id);
                broadcast({ type: 'USER_REMOVED', id, role: 'passenger', timestamp: now });
              }
            }
          }
        } catch {
          // ignore invalid frame
        }
      });

      server.addEventListener('close', () => connectedSockets.delete(server));
      server.addEventListener('error', () => connectedSockets.delete(server));

      return new Response(null, {
        status: 101,
        webSocket: client,
        headers: buildHeaders(request),
      });
    }

    // 2. Health check
    if (url.pathname === '/api/live/health' || url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          edgeServer: 'Cloudflare Worker Live Engine',
          connectedSockets: connectedSockets.size,
          activeDrivers: activeDrivers.size,
          activePassengers: activePassengers.size,
          time: new Date().toISOString(),
        }),
        { headers: buildHeaders(request, { 'Content-Type': 'application/json' }) }
      );
    }

    // 3. Public non-PII live list
    if (url.pathname === '/api/live/all') {
      return new Response(
        JSON.stringify({
          status: 'success',
          drivers: Array.from(activeDrivers.values()).map(toPublicDriver),
          passengers: Array.from(activePassengers.values()).map(toPublicPassenger),
          timestamp: Date.now(),
        }),
        { headers: buildHeaders(request, { 'Content-Type': 'application/json' }) }
      );
    }

    // 4. Authenticated POST update location
    if (url.pathname === '/api/live/update' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization') || '';
      if (!authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), {
          status: 401,
          headers: buildHeaders(request, { 'Content-Type': 'application/json' }),
        });
      }

      let authUser;
      try {
        authUser = await verifyFirebaseIdTokenEdge(authHeader.slice(7).trim());
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid auth token' }), {
          status: 401,
          headers: buildHeaders(request, { 'Content-Type': 'application/json' }),
        });
      }

      try {
        const rawText = await request.text();
        if (rawText.length > 65536) {
          return new Response(JSON.stringify({ error: 'Payload too large' }), {
            status: 413,
            headers: buildHeaders(request, { 'Content-Type': 'application/json' }),
          });
        }
        const body = JSON.parse(rawText);
        const { role, data } = body;
        const now = Date.now();
        if (!data?.id || !isValidBdCoord(data.lat, data.lng)) {
          return new Response(JSON.stringify({ error: 'Invalid ID or coordinates' }), {
            status: 400,
            headers: buildHeaders(request, { 'Content-Type': 'application/json' }),
          });
        }

        const id = cleanStr(data.id, 128);
        if (role === 'driver') {
          const prev = activeDrivers.get(id);
          if (prev && prev.ownerUid !== authUser.uid && !authUser.isAdmin) {
            return new Response(JSON.stringify({ error: 'Forbidden' }), {
              status: 403,
              headers: buildHeaders(request, { 'Content-Type': 'application/json' }),
            });
          }
          const driver = {
            id,
            ownerUid: authUser.uid,
            name: cleanStr(data.name, 80) || 'চালক',
            category: cleanStr(data.category, 40) || 'cng',
            vehicleModel: cleanStr(data.vehicleModel, 80),
            plateNumber: cleanStr(data.plateNumber, 40),
            standName: cleanStr(data.standName, 100),
            lat: data.lat,
            lng: data.lng,
            isOnline: data.isOnline !== false,
            updatedAt: now,
          };
          activeDrivers.set(id, driver);
          broadcast({ type: 'DRIVER_MOVED', driver: toPublicDriver(driver), timestamp: now });
        } else {
          const prev = activePassengers.get(id);
          if (prev && prev.ownerUid !== authUser.uid && !authUser.isAdmin) {
            return new Response(JSON.stringify({ error: 'Forbidden' }), {
              status: 403,
              headers: buildHeaders(request, { 'Content-Type': 'application/json' }),
            });
          }
          const passenger = {
            id,
            ownerUid: authUser.uid,
            lat: data.lat,
            lng: data.lng,
            pickupPoint: cleanStr(data.pickupPoint, 120),
            destination: cleanStr(data.destination, 120),
            status: data.status === 'on_trip' ? 'on_trip' : 'seeking_ride',
            updatedAt: now,
          };
          activePassengers.set(id, passenger);
          broadcast({ type: 'PASSENGER_MOVED', passenger: toPublicPassenger(passenger), timestamp: now });
        }

        return new Response(JSON.stringify({ success: true, timestamp: now }), {
          headers: buildHeaders(request, { 'Content-Type': 'application/json' }),
        });
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid payload' }), {
          status: 400,
          headers: buildHeaders(request, { 'Content-Type': 'application/json' }),
        });
      }
    }

    return new Response(
      `Safar Gafargaon - Cloudflare Real-Time Live Server\nActive Drivers: ${activeDrivers.size}`,
      { headers: buildHeaders(request, { 'Content-Type': 'text/plain; charset=utf-8' }) }
    );
  },
};
