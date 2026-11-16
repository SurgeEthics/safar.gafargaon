import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import crypto from 'node:crypto';
// @ts-ignore
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0494218293';
const SUPER_ADMIN_EMAIL = 'safar.gafargaon@gmail.com';
const ZIP_SIGNING_SECRET =
  process.env.ZIP_SIGNING_SECRET || crypto.randomBytes(32).toString('hex');

const app = express();
app.disable('x-powered-by');
const server = http.createServer(app);

// Strict JSON / URL-encoded body size limits (OWASP API #8)
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));

// Allowed CORS origins (OWASP API #10)
const ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  /^https?:\/\/localhost(:\d+)?$/i,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/i,
  /^https:\/\/ais-(dev|pre)-w6vgd7lt5ex5bc5rbquynw-243355990991\.asia-northeast1\.run\.app$/i,
  /^https:\/\/[a-z0-9-]+\.asia-northeast1\.run\.app$/i,
  /^https:\/\/[a-z0-9-]+\.pages\.dev$/i,
  /^https:\/\/[a-z0-9-]+\.workers\.dev$/i,
];

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
}

// Security Headers & Origin-Validated CORS Middleware (OWASP API #10)
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(self)');
  // Explicit COOP allow-popups so Firebase Google Sign-In popup works cleanly
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(origin && !isAllowedOrigin(origin) ? 403 : 204);
  }
  next();
});

// Sliding-Window Per-IP Rate Limiting (OWASP API #8)
const ipBuckets = new Map<string, number[]>();

function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function createIpRateLimiter(bucketPrefix: string, maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${bucketPrefix}:${getClientIp(req)}`;
    const now = Date.now();
    const recent = (ipBuckets.get(key) || []).filter((t) => now - t < windowMs);
    if (recent.length >= maxRequests) {
      const oldest = recent[0] ?? now;
      const retryAfter = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: 'অনেক বেশি অনুরোধ পাঠানো হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।',
        retryAfterSec: retryAfter,
      });
    }
    recent.push(now);
    ipBuckets.set(key, recent);
    next();
  };
}

// Periodically prune expired IP rate-limit buckets
setInterval(() => {
  const cutoff = Date.now() - 120000;
  ipBuckets.forEach((timestamps, key) => {
    const kept = timestamps.filter((t) => t > cutoff);
    if (kept.length === 0) ipBuckets.delete(key);
    else ipBuckets.set(key, kept);
  });
}, 60000);

// Google X.509 Certificate Cache & Firebase ID Token Verifier (OWASP API #1 & #2)
let cachedCerts: Record<string, string> = {};
let certsExpireAt = 0;

async function fetchGooglePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (now < certsExpireAt && Object.keys(cachedCerts).length > 0) {
    return cachedCerts;
  }
  const resp = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!resp.ok) {
    throw new Error(`Failed to fetch Firebase auth certs (${resp.status})`);
  }
  const cc = resp.headers.get('cache-control') || '';
  const maxAgeMatch = cc.match(/max-age=(\d+)/i);
  const maxAgeSec = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 3600;
  cachedCerts = (await resp.json()) as Record<string, string>;
  certsExpireAt = now + Math.max(60, maxAgeSec) * 1000;
  return cachedCerts;
}

export interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  isAdmin: boolean;
}

function decodeBase64Url(segment: string): Buffer {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64');
}

async function verifyFirebaseIdToken(token: string): Promise<VerifiedFirebaseUser> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT');
  }
  const [headerB64, payloadB64, signatureB64] = parts;
  const header = JSON.parse(decodeBase64Url(headerB64).toString('utf8'));
  const payload = JSON.parse(decodeBase64Url(payloadB64).toString('utf8'));

  if (header.alg !== 'RS256' || typeof header.kid !== 'string') {
    throw new Error('Unsupported token algorithm or missing kid');
  }

  const certs = await fetchGooglePublicCerts();
  const certPem = certs[header.kid];
  if (!certPem) {
    throw new Error('Unknown signing key');
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  const signatureOk = verifier.verify(certPem, decodeBase64Url(signatureB64));
  if (!signatureOk) {
    throw new Error('Invalid token signature');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const expectedIssuer = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
  if (payload.iss !== expectedIssuer || payload.aud !== FIREBASE_PROJECT_ID) {
    throw new Error('Invalid token audience or issuer');
  }
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) {
    throw new Error('Token expired');
  }
  if (typeof payload.iat !== 'number' || payload.iat > nowSec + 300) {
    throw new Error('Token issued in the future');
  }
  if (typeof payload.sub !== 'string' || !payload.sub) {
    throw new Error('Missing token subject');
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const emailVerified = payload.email_verified === true;
  if (!emailVerified) {
    throw new Error('Email is not verified');
  }

  return {
    uid: payload.sub,
    email,
    emailVerified,
    isAdmin: email === SUPER_ADMIN_EMAIL && emailVerified,
  };
}

interface AuthedRequest extends Request {
  authUser?: VerifiedFirebaseUser;
}

async function requireFirebaseAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'অনুমোদিত Google সাইন-ইন টোকেন প্রয়োজন।' });
  }
  const token = authHeader.slice(7).trim();
  try {
    req.authUser = await verifyFirebaseIdToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'অবৈধ বা মেয়াদোত্তীর্ণ Google টোকেন।' });
  }
}

async function requireFirebaseAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  await requireFirebaseAuth(req, res, () => {
    if (!req.authUser?.isAdmin) {
      return res.status(403).json({ error: 'কেবল সুপার অ্যাডমিন অনুমোদিত।' });
    }
    next();
  });
}

// Signed Ephemeral ZIP Token Utilities (5-minute TTL)
function createSignedZipToken(uid: string): { token: string; expiresAtMs: number } {
  const expiresAtMs = Date.now() + 5 * 60 * 1000;
  const payloadStr = Buffer.from(JSON.stringify({ uid, exp: expiresAtMs }), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', ZIP_SIGNING_SECRET)
    .update(payloadStr)
    .digest('base64url');
  return { token: `${payloadStr}.${sig}`, expiresAtMs };
}

function verifySignedZipToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadStr, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', ZIP_SIGNING_SECRET)
    .update(payloadStr)
    .digest('base64url');
  const sigBuf = Buffer.from(sig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return false;

  try {
    const parsed = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf8'));
    return typeof parsed.exp === 'number' && parsed.exp > Date.now() && typeof parsed.uid === 'string';
  } catch {
    return false;
  }
}

// Sanitization & Bounds Validation Helpers (OWASP API #6 & #7)
function cleanStr(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  return val.replace(/[\u0000-\u001F\u007F<>]/g, '').trim().slice(0, maxLen);
}

function isValidBdCoord(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 20.0 &&
    lat <= 27.0 &&
    lng >= 88.0 &&
    lng <= 93.0
  );
}

// In-Memory Real-Time State (Strict Non-PII Schema)
interface LiveDriverData {
  id: string;
  ownerUid: string;
  name: string;
  category: string;
  categoryBengali: string;
  vehicleModel: string;
  plateNumber: string;
  standName: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  accuracy?: number;
  rating: number;
  isOnline: boolean;
  isAvailable: boolean;
  updatedAt: number;
}

interface LivePassengerData {
  id: string;
  ownerUid: string;
  lat: number;
  lng: number;
  accuracy?: number;
  pickupPoint: string;
  destination: string;
  status: 'idle' | 'seeking_ride' | 'on_trip';
  requestedAt?: number;
  updatedAt: number;
}

const liveDrivers = new Map<string, LiveDriverData>();
const livePassengers = new Map<string, LivePassengerData>();

function buildSafeDriverRecord(raw: any, ownerUid: string, now: number): LiveDriverData | null {
  const id = cleanStr(raw?.id, 128);
  if (!id || !/^[a-zA-Z0-9_\-]+$/.test(id)) return null;
  if (!isValidBdCoord(raw?.lat, raw?.lng)) return null;

  return {
    id,
    ownerUid,
    name: cleanStr(raw?.name, 80) || 'চালক',
    category: cleanStr(raw?.category, 40) || 'cng',
    categoryBengali: cleanStr(raw?.categoryBengali, 50),
    vehicleModel: cleanStr(raw?.vehicleModel, 80),
    plateNumber: cleanStr(raw?.plateNumber, 40),
    standName: cleanStr(raw?.standName, 100),
    lat: raw.lat,
    lng: raw.lng,
    speed: typeof raw?.speed === 'number' && Number.isFinite(raw.speed) ? Math.min(140, Math.max(0, raw.speed)) : 0,
    heading: typeof raw?.heading === 'number' && Number.isFinite(raw.heading) ? raw.heading % 360 : 0,
    accuracy: typeof raw?.accuracy === 'number' && Number.isFinite(raw.accuracy) ? Math.min(5000, Math.max(0, raw.accuracy)) : undefined,
    rating: typeof raw?.rating === 'number' && Number.isFinite(raw.rating) ? Math.min(5, Math.max(0, raw.rating)) : 5.0,
    isOnline: raw?.isOnline !== false,
    isAvailable: raw?.isAvailable !== false,
    updatedAt: now,
  };
}

function buildSafePassengerRecord(raw: any, ownerUid: string, now: number): LivePassengerData | null {
  const id = cleanStr(raw?.id, 128);
  if (!id || !/^[a-zA-Z0-9_\-]+$/.test(id)) return null;
  if (!isValidBdCoord(raw?.lat, raw?.lng)) return null;
  const allowedStatuses = new Set(['idle', 'seeking_ride', 'on_trip']);
  const status = allowedStatuses.has(raw?.status) ? raw.status : 'idle';

  return {
    id,
    ownerUid,
    lat: raw.lat,
    lng: raw.lng,
    accuracy: typeof raw?.accuracy === 'number' && Number.isFinite(raw.accuracy) ? Math.min(5000, Math.max(0, raw.accuracy)) : undefined,
    pickupPoint: cleanStr(raw?.pickupPoint, 120),
    destination: cleanStr(raw?.destination, 120),
    status,
    requestedAt: typeof raw?.requestedAt === 'number' ? raw.requestedAt : now,
    updatedAt: now,
  };
}

// Public views omit ownerUid & any phone/PII fields
function toPublicDriver(d: LiveDriverData) {
  const { ownerUid: _omit, ...safe } = d;
  return safe;
}

function toPublicPassenger(p: LivePassengerData) {
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

// WebSocket Server with maxPayload 16KB & AUTH gate (OWASP API #1, #8)
const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });

server.on('upgrade', (request, socket, head) => {
  const host = request.headers.host || 'localhost';
  const url = new URL(request.url || '', `http://${host}`);
  const origin = request.headers.origin;
  if (origin && !isAllowedOrigin(origin)) {
    socket.destroy();
    return;
  }
  if (url.pathname === '/ws' || url.pathname === '/api/live/ws') {
    (wss as any).handleUpgrade(request, socket, head, (ws: any) => {
      (wss as any).emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

function broadcast(data: any, excludeWs?: any) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client: any) => {
    if (client !== excludeWs && client.readyState === 1) {
      try {
        client.send(message);
      } catch {
        // ignore closed socket
      }
    }
  });
}

// Clean up stale users (> 90 seconds without ping)
setInterval(() => {
  const now = Date.now();
  let changed = false;

  liveDrivers.forEach((driver, id) => {
    if (now - driver.updatedAt > 90000) {
      liveDrivers.delete(id);
      changed = true;
    }
  });

  livePassengers.forEach((passenger, id) => {
    if (now - passenger.updatedAt > 90000) {
      livePassengers.delete(id);
      changed = true;
    }
  });

  if (changed) {
    broadcast({
      type: 'SYNC_STATE',
      drivers: Array.from(liveDrivers.values()).map(toPublicDriver),
      passengers: Array.from(livePassengers.values()).map(toPublicPassenger),
      timestamp: now,
    });
  }
}, 15000);

wss.on('connection', (ws: WebSocket) => {
  let socketAuthUser: VerifiedFirebaseUser | null = null;
  let wsMsgTimestamps: number[] = [];

  ws.send(
    JSON.stringify({
      type: 'SYNC_STATE',
      drivers: Array.from(liveDrivers.values()).map(toPublicDriver),
      passengers: Array.from(livePassengers.values()).map(toPublicPassenger),
      timestamp: Date.now(),
    })
  );

  ws.on('message', async (message: Buffer | string) => {
    const rawStr = message.toString();
    if (rawStr.length > 16384) return;

    const now = Date.now();
    wsMsgTimestamps = wsMsgTimestamps.filter((t) => now - t < 10000);
    if (wsMsgTimestamps.length >= 30) {
      ws.send(JSON.stringify({ type: 'ERROR', error: 'Rate limit exceeded' }));
      return;
    }
    wsMsgTimestamps.push(now);

    try {
      const payload = JSON.parse(rawStr);

      if (payload.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: now }));
        return;
      }

      if (payload.type === 'AUTH' && typeof payload.token === 'string') {
        try {
          socketAuthUser = await verifyFirebaseIdToken(payload.token);
          ws.send(JSON.stringify({ type: 'AUTH_OK', uid: socketAuthUser.uid }));
        } catch {
          socketAuthUser = null;
          ws.send(JSON.stringify({ type: 'AUTH_ERROR', error: 'Invalid auth token' }));
        }
        return;
      }

      // All mutation frames require verified Firebase auth
      if (!socketAuthUser) {
        ws.send(JSON.stringify({ type: 'AUTH_REQUIRED', error: 'Google sign-in required' }));
        return;
      }

      if (payload.type === 'UPDATE_DRIVER') {
        const safeDriver = buildSafeDriverRecord(payload.data, socketAuthUser.uid, now);
        if (!safeDriver) return;
        const prev = liveDrivers.get(safeDriver.id);
        if (prev && prev.ownerUid !== socketAuthUser.uid && !socketAuthUser.isAdmin) {
          return;
        }
        liveDrivers.set(safeDriver.id, safeDriver);
        broadcast({ type: 'DRIVER_MOVED', driver: toPublicDriver(safeDriver), timestamp: now }, ws);
      }

      if (payload.type === 'UPDATE_PASSENGER') {
        const safePassenger = buildSafePassengerRecord(payload.data, socketAuthUser.uid, now);
        if (!safePassenger) return;
        const prev = livePassengers.get(safePassenger.id);
        if (prev && prev.ownerUid !== socketAuthUser.uid && !socketAuthUser.isAdmin) {
          return;
        }
        livePassengers.set(safePassenger.id, safePassenger);
        broadcast(
          { type: 'PASSENGER_MOVED', passenger: toPublicPassenger(safePassenger), timestamp: now },
          ws
        );
      }

      if (payload.type === 'REMOVE_USER') {
        const id = cleanStr(payload.id, 128);
        if (!id) return;
        if (payload.role === 'driver') {
          const existing = liveDrivers.get(id);
          if (existing && (existing.ownerUid === socketAuthUser.uid || socketAuthUser.isAdmin)) {
            liveDrivers.delete(id);
            broadcast({ type: 'USER_REMOVED', id, role: 'driver', timestamp: now }, ws);
          }
        } else {
          const existing = livePassengers.get(id);
          if (existing && (existing.ownerUid === socketAuthUser.uid || socketAuthUser.isAdmin)) {
            livePassengers.delete(id);
            broadcast({ type: 'USER_REMOVED', id, role: 'passenger', timestamp: now }, ws);
          }
        }
      }
    } catch {
      // Ignore invalid JSON frames safely
    }
  });
});

// REST API Endpoints
const publicRateLimiter = createIpRateLimiter('public', 60, 60000);
const writeRateLimiter = createIpRateLimiter('write', 40, 60000);
const adminRateLimiter = createIpRateLimiter('admin', 20, 60000);

app.get('/api/live/health', publicRateLimiter, (_req, res) => {
  res.json({
    status: 'ok',
    server: 'সফর গফরগাঁও রিয়েল-টাইম সার্ভার',
    connectedClients: wss.clients.size,
    activeDrivers: liveDrivers.size,
    activePassengers: livePassengers.size,
    time: new Date().toISOString(),
  });
});

app.get('/api/live/all', publicRateLimiter, (_req, res) => {
  res.json({
    status: 'success',
    drivers: Array.from(liveDrivers.values()).map(toPublicDriver),
    passengers: Array.from(livePassengers.values()).map(toPublicPassenger),
    timestamp: Date.now(),
  });
});

app.post('/api/live/update', writeRateLimiter, requireFirebaseAuth, (req: AuthedRequest, res: Response) => {
  const { role, data } = req.body || {};
  const now = Date.now();
  const uid = req.authUser!.uid;

  if (!data || !data.id) {
    return res.status(400).json({ error: 'Missing ID or data payload' });
  }

  if (role === 'driver') {
    const safeDriver = buildSafeDriverRecord(data, uid, now);
    if (!safeDriver) {
      return res.status(400).json({ error: 'Invalid driver coordinates or ID' });
    }
    const existing = liveDrivers.get(safeDriver.id);
    if (existing && existing.ownerUid !== uid && !req.authUser!.isAdmin) {
      return res.status(403).json({ error: 'Forbidden driver update' });
    }
    liveDrivers.set(safeDriver.id, safeDriver);
    broadcast({ type: 'DRIVER_MOVED', driver: toPublicDriver(safeDriver), timestamp: now });
  } else {
    const safePassenger = buildSafePassengerRecord(data, uid, now);
    if (!safePassenger) {
      return res.status(400).json({ error: 'Invalid passenger coordinates or ID' });
    }
    const existing = livePassengers.get(safePassenger.id);
    if (existing && existing.ownerUid !== uid && !req.authUser!.isAdmin) {
      return res.status(403).json({ error: 'Forbidden passenger update' });
    }
    livePassengers.set(safePassenger.id, safePassenger);
    broadcast({ type: 'PASSENGER_MOVED', passenger: toPublicPassenger(safePassenger), timestamp: now });
  }

  return res.json({ success: true, timestamp: now });
});

app.post('/api/live/remove', writeRateLimiter, requireFirebaseAuth, (req: AuthedRequest, res: Response) => {
  const role = req.body?.role === 'driver' ? 'driver' : 'passenger';
  const id = cleanStr(req.body?.id, 128);
  const uid = req.authUser!.uid;
  if (!id) return res.status(400).json({ error: 'Missing ID' });

  if (role === 'driver') {
    const existing = liveDrivers.get(id);
    if (existing && existing.ownerUid !== uid && !req.authUser!.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    liveDrivers.delete(id);
  } else {
    const existing = livePassengers.get(id);
    if (existing && existing.ownerUid !== uid && !req.authUser!.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    livePassengers.delete(id);
  }
  broadcast({ type: 'USER_REMOVED', id, role, timestamp: Date.now() });
  return res.json({ success: true });
});

// Mint 5-minute HMAC signed download link strictly for authenticated Super Admin
app.post('/api/admin/source-zip-token', adminRateLimiter, requireFirebaseAdmin, (req: AuthedRequest, res: Response) => {
  const zipPath = path.resolve(__dirname, 'private-archives', 'safar-gafargaon-clean-source.zip');
  if (!fs.existsSync(zipPath)) {
    return res.status(404).json({ error: 'সোর্স জিপ প্যাকেজ এখনো তৈরি হয়নি।' });
  }
  const stat = fs.statSync(zipPath);
  const { token, expiresAtMs } = createSignedZipToken(req.authUser!.uid);
  return res.json({
    token,
    expiresAtMs,
    sizeBytes: stat.size,
  });
});

// Protected Admin Source Code ZIP Endpoint (Requires Google Admin Bearer Token OR valid 5-min HMAC token)
async function handleAdminZipDownload(req: AuthedRequest, res: Response) {
  const queryToken = typeof req.query.token === 'string' ? req.query.token : '';
  let authorized = false;

  if (queryToken && verifySignedZipToken(queryToken)) {
    authorized = true;
  } else {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      try {
        const user = await verifyFirebaseIdToken(authHeader.slice(7).trim());
        authorized = user.isAdmin;
      } catch {
        authorized = false;
      }
    }
  }

  if (!authorized) {
    return res.status(401).json({ error: 'অ্যাডমিন Google অনুমোদন প্রয়োজন।' });
  }

  const zipPath = path.resolve(__dirname, 'private-archives', 'safar-gafargaon-clean-source.zip');
  if (!fs.existsSync(zipPath)) {
    return res.status(404).send('ZIP file not found');
  }

  const stat = fs.statSync(zipPath);
  const fd = fs.openSync(zipPath, 'r');
  const sig = Buffer.allocUnsafe(4);
  fs.readSync(fd, sig, 0, 4, 0);
  fs.closeSync(fd);
  if (stat.size <= 50000 || sig[0] !== 0x50 || sig[1] !== 0x4b) {
    return res.status(500).send('Invalid ZIP archive');
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Disposition', 'attachment; filename="safar-gafargaon-clean-source.zip"');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  if (req.method === 'HEAD') {
    return res.status(200).end();
  }
  return res.sendFile(zipPath);
}

app.head('/api/admin/source-zip', adminRateLimiter, handleAdminZipDownload);
app.get('/api/admin/source-zip', adminRateLimiter, handleAdminZipDownload);

// Block ALL public / unauthenticated .zip or private-archives routes (OWASP API #6)
app.use((req: Request, res: Response, next: NextFunction) => {
  const lowerPath = req.path.toLowerCase();
  if (
    lowerPath.endsWith('.zip') ||
    lowerPath === '/download-zip' ||
    lowerPath === '/api/download-zip' ||
    lowerPath.startsWith('/private-archives')
  ) {
    return res.status(404).send('Not found');
  }
  next();
});

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

async function startServer() {
  if (!isProduction) {
    app.get('/sw.js', (_req: Request, res: Response) => {
      const devSwPath = path.resolve(__dirname, 'public', 'sw-notifications.js');
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      if (fs.existsSync(devSwPath)) {
        return res.sendFile(devSwPath);
      }
      return res.send('// Dev Service Worker\n');
    });
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    const publicPath = path.resolve(__dirname, 'public');
    app.use(express.static(publicPath));
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.endsWith('.zip') || req.path.endsWith('.mp3')) {
        return res.status(404).send('File not found');
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 Safar Real-Time Server running on http://0.0.0.0:${PORT} (WS on /ws)`);
  });
}

startServer();
