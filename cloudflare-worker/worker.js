/**
 * Safar Gafargaon - Cloudflare Worker for Real-Time Live Location Tracking
 * Handles real-time WebSocket sync and HTTP REST API for Passengers & Drivers
 */

// In-Memory state for global Cloudflare Worker instance
const activeDrivers = new Map();
const activePassengers = new Map();
const connectedSockets = new Set();

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function broadcast(message, excludeWs = null) {
  const jsonStr = typeof message === 'string' ? message : JSON.stringify(message);
  for (const ws of connectedSockets) {
    if (ws !== excludeWs && ws.readyState === 1) { // WebSocket.OPEN = 1
      try {
        ws.send(jsonStr);
      } catch (err) {
        connectedSockets.delete(ws);
      }
    }
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // 1. WebSocket upgrade for Real-Time tracking: /ws or /api/live/ws
    if (url.pathname === '/ws' || url.pathname === '/api/live/ws') {
      const upgradeHeader = request.headers.get('Upgrade');
      if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
        return new Response('Expected WebSocket upgrade', { status: 426, headers: CORS_HEADERS });
      }

      // Create WebSocket pair in Cloudflare Worker runtime
      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);

      server.accept();
      connectedSockets.add(server);

      // Send initial snapshot of live drivers and passengers
      server.send(JSON.stringify({
        type: 'SYNC_STATE',
        provider: 'Cloudflare Worker (Edge)',
        drivers: Array.from(activeDrivers.values()),
        passengers: Array.from(activePassengers.values()),
        timestamp: Date.now()
      }));

      server.addEventListener('message', (event) => {
        try {
          const payload = JSON.parse(event.data);
          const now = Date.now();

          if (payload.type === 'PING') {
            server.send(JSON.stringify({ type: 'PONG', timestamp: now }));
            return;
          }

          if (payload.type === 'UPDATE_DRIVER') {
            const driver = { ...payload.data, updatedAt: now };
            activeDrivers.set(driver.id, driver);
            broadcast({ type: 'DRIVER_MOVED', driver, timestamp: now }, server);
          }

          if (payload.type === 'UPDATE_PASSENGER') {
            const passenger = { ...payload.data, updatedAt: now };
            activePassengers.set(passenger.id, passenger);
            broadcast({ type: 'PASSENGER_MOVED', passenger, timestamp: now }, server);
          }

          if (payload.type === 'REMOVE_USER') {
            if (payload.role === 'driver') {
              activeDrivers.delete(payload.id);
            } else {
              activePassengers.delete(payload.id);
            }
            broadcast({ type: 'USER_REMOVED', id: payload.id, role: payload.role, timestamp: now });
          }

          if (payload.type === 'REQUEST_RIDE') {
            broadcast({ type: 'NEW_RIDE_REQUEST', request: payload.request, timestamp: now });
          }
        } catch (err) {
          // invalid message
        }
      });

      server.addEventListener('close', () => {
        connectedSockets.delete(server);
      });

      server.addEventListener('error', () => {
        connectedSockets.delete(server);
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
        headers: CORS_HEADERS,
      });
    }

    // 2. Health check endpoint
    if (url.pathname === '/api/live/health' || url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        edgeServer: 'Cloudflare Worker Live Engine',
        connectedSockets: connectedSockets.size,
        activeDrivers: activeDrivers.size,
        activePassengers: activePassengers.size,
        time: new Date().toISOString()
      }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // 3. GET all active locations
    if (url.pathname === '/api/live/all') {
      return new Response(JSON.stringify({
        status: 'success',
        drivers: Array.from(activeDrivers.values()),
        passengers: Array.from(activePassengers.values()),
        timestamp: Date.now()
      }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    // 4. POST update location (HTTP fallback)
    if (url.pathname === '/api/live/update' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { role, data } = body;
        const now = Date.now();

        if (role === 'driver' && data && data.id) {
          const driver = { ...data, updatedAt: now };
          activeDrivers.set(driver.id, driver);
          broadcast({ type: 'DRIVER_MOVED', driver, timestamp: now });
        } else if (role === 'passenger' && data && data.id) {
          const passenger = { ...data, updatedAt: now };
          activePassengers.set(passenger.id, passenger);
          broadcast({ type: 'PASSENGER_MOVED', passenger, timestamp: now });
        }

        return new Response(JSON.stringify({ success: true, timestamp: now }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Invalid payload' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });
      }
    }

    // Default welcome page
    return new Response(
      `Safar Gafargaon - Cloudflare Real-Time Live Location Server\nRunning on Cloudflare Edge with WebSockets and HTTP REST.\nActive Drivers: ${activeDrivers.size}, Active Passengers: ${activePassengers.size}`,
      { headers: { ...CORS_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }
};
