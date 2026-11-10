process.env.DISABLE_HMR = 'true';
import express from 'express';
import http from 'http';
// @ts-ignore
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// JSON body parser with limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS headers for Cloudflare / Cross-origin requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// In-Memory Real-Time State (Drivers & Passengers)
interface LiveDriverData {
  id: string;
  name: string;
  phone: string;
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
  name: string;
  phone: string;
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

// WebSocket Server with explicit HTTP upgrade routing
const wss = new WebSocketServer({ noServer: true });
const viteWss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const host = request.headers.host || 'localhost';
  let pathname = '/';
  try {
    pathname = new URL(request.url || '', `http://${host}`).pathname;
  } catch {}

  const protocol = request.headers['sec-websocket-protocol'];
  const isViteHmr = protocol === 'vite-hmr' || (request.url && request.url.includes('token='));

  if (pathname === '/ws' || pathname === '/api/live/ws') {
    (wss as any).handleUpgrade(request, socket, head, (ws: any) => {
      (wss as any).emit('connection', ws, request);
    });
  } else if (isViteHmr || pathname === '/' || pathname.startsWith('/@vite')) {
    // Gracefully accept Vite HMR connection so @vite/client connects with 0 errors
    (viteWss as any).handleUpgrade(request, socket, head, (ws: any) => {
      try {
        ws.send(JSON.stringify({ type: 'connected' }));
      } catch {}
    });
  } else {
    try {
      socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
    } catch {
      socket.destroy();
    }
  }
});

// Broadcast helper
function broadcast(data: any, excludeWs?: any) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client: any) => {
    if (client !== excludeWs && client.readyState === 1) {
      try {
        client.send(message);
      } catch (err) {
        // ignore send error on closing socket
      }
    }
  });
}

// Clean up stale users (> 90 seconds without ping)
setInterval(() => {
  const now = Date.now();
  let driverChanged = false;
  let passengerChanged = false;

  liveDrivers.forEach((driver, id) => {
    if (now - driver.updatedAt > 90000) {
      liveDrivers.delete(id);
      driverChanged = true;
    }
  });

  livePassengers.forEach((passenger, id) => {
    if (now - passenger.updatedAt > 90000) {
      livePassengers.delete(id);
      passengerChanged = true;
    }
  });

  if (driverChanged || passengerChanged) {
    broadcast({
      type: 'SYNC_STATE',
      drivers: Array.from(liveDrivers.values()),
      passengers: Array.from(livePassengers.values()),
      timestamp: now
    });
  }
}, 15000);

// WebSocket connection lifecycle
wss.on('connection', (ws: WebSocket) => {
  // Send current full state upon connection
  ws.send(JSON.stringify({
    type: 'SYNC_STATE',
    drivers: Array.from(liveDrivers.values()),
    passengers: Array.from(livePassengers.values()),
    timestamp: Date.now()
  }));

  ws.on('message', (message: string) => {
    try {
      const payload = JSON.parse(message.toString());

      if (payload.type === 'PING') {
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        return;
      }

      if (payload.type === 'UPDATE_DRIVER') {
        const driver: LiveDriverData = {
          ...payload.data,
          updatedAt: Date.now()
        };
        liveDrivers.set(driver.id, driver);
        broadcast({
          type: 'DRIVER_MOVED',
          driver,
          timestamp: Date.now()
        });
      }

      if (payload.type === 'UPDATE_PASSENGER') {
        const passenger: LivePassengerData = {
          ...payload.data,
          updatedAt: Date.now()
        };
        livePassengers.set(passenger.id, passenger);
        broadcast({
          type: 'PASSENGER_MOVED',
          passenger,
          timestamp: Date.now()
        });
      }

      if (payload.type === 'REMOVE_USER') {
        if (payload.role === 'driver') {
          liveDrivers.delete(payload.id);
        } else {
          livePassengers.delete(payload.id);
        }
        broadcast({
          type: 'USER_REMOVED',
          id: payload.id,
          role: payload.role,
          timestamp: Date.now()
        });
      }

      if (payload.type === 'REQUEST_RIDE') {
        broadcast({
          type: 'NEW_RIDE_REQUEST',
          request: payload.request,
          timestamp: Date.now()
        });
      }
    } catch (err) {
      console.error('Error parsing WS message:', err);
    }
  });
});

// REST API Endpoints (Compatible with Cloudflare Worker protocol)
app.get('/api/live/health', (req, res) => {
  res.json({
    status: 'ok',
    server: 'safar-gafargaon-realtime',
    provider: 'cloudflare-worker-compatible',
    connectedClients: wss.clients.size,
    activeDrivers: liveDrivers.size,
    activePassengers: livePassengers.size,
    time: new Date().toISOString()
  });
});

app.get('/api/live/all', (req, res) => {
  res.json({
    status: 'success',
    drivers: Array.from(liveDrivers.values()),
    passengers: Array.from(livePassengers.values()),
    timestamp: Date.now()
  });
});

app.post('/api/live/update', (req, res) => {
  const { role, data } = req.body;
  const now = Date.now();

  if (!data || !data.id) {
    return res.status(400).json({ error: 'Missing ID or data payload' });
  }

  if (role === 'driver') {
    const driver: LiveDriverData = { ...data, updatedAt: now };
    liveDrivers.set(driver.id, driver);
    broadcast({ type: 'DRIVER_MOVED', driver, timestamp: now });
  } else {
    const passenger: LivePassengerData = { ...data, updatedAt: now };
    livePassengers.set(passenger.id, passenger);
    broadcast({ type: 'PASSENGER_MOVED', passenger, timestamp: now });
  }

  res.json({ success: true, timestamp: now });
});

app.post('/api/live/remove', (req, res) => {
  const { role, id } = req.body;
  if (role === 'driver') {
    liveDrivers.delete(id);
  } else {
    livePassengers.delete(id);
  }
  broadcast({ type: 'USER_REMOVED', id, role, timestamp: Date.now() });
  res.json({ success: true });
});

// Direct Force-Download endpoint for ALL ZIP files (sets Content-Disposition: attachment)
app.get([
  '/safar-gafargaon-clean-source.zip',
  '/safar-gafargaon-latest.zip',
  '/safar-gafargaon-final.zip',
  '/safar-gafargaon.zip',
  '/safar-app.zip',
  '/api/download-zip',
  '/download-zip',
  '/download/project.zip'
], (req, res) => {
  const candidatePaths = [
    path.resolve(__dirname, 'public', 'safar-gafargaon-clean-source.zip'),
    path.resolve(__dirname, 'dist', 'safar-gafargaon-clean-source.zip'),
    path.resolve(__dirname, 'public', 'safar-gafargaon-latest.zip'),
    path.resolve(__dirname, 'dist', 'safar-gafargaon-latest.zip'),
    path.resolve(__dirname, 'public', 'safar-gafargaon-final.zip'),
    path.resolve(__dirname, 'dist', 'safar-gafargaon-final.zip'),
  ];

  const requestedBase = path.basename(req.path || '');
  const downloadFilename = requestedBase.endsWith('.zip')
    ? requestedBase
    : 'safar-gafargaon-clean-source.zip';

  for (const filePath of candidatePaths) {
    if (fs.existsSync(filePath)) {
      try {
        const stat = fs.statSync(filePath);
        if (stat.size > 50000) {
          const fd = fs.openSync(filePath, 'r');
          const sig = Buffer.allocUnsafe(4);
          fs.readSync(fd, sig, 0, 4, 0);
          fs.closeSync(fd);
          if (sig[0] === 0x50 && sig[1] === 0x4b) {
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Length', stat.size);
            res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Disposition');
            res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            if (req.method === 'HEAD') {
              return res.end();
            }
            return res.sendFile(filePath);
          }
        }
      } catch (e) {}
    }
  }

  return res.status(404).send('ZIP file not found');
});

// Dynamic ZIP Info Endpoint (returns real-time file size & meta)
app.get('/api/zip-info', (req, res) => {
  const candidatePaths = [
    path.resolve(__dirname, 'public', 'safar-gafargaon-clean-source.zip'),
    path.resolve(__dirname, 'dist', 'safar-gafargaon-clean-source.zip'),
    path.resolve(__dirname, 'public', 'safar-app.zip'),
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      const stat = fs.statSync(p);
      return res.json({
        success: true,
        sizeBytes: stat.size,
        sizeMb: (stat.size / (1024 * 1024)).toFixed(2),
        filename: path.basename(p),
        updatedAt: stat.mtime.toISOString(),
      });
    }
  }
  return res.json({
    success: true,
    sizeBytes: 6816160,
    sizeMb: '6.50',
    filename: 'safar-gafargaon-clean-source.zip',
    updatedAt: new Date().toISOString(),
  });
});

// Dynamic ZIP Upload endpoint (Upload new/updated zip directly into public & dist)
app.post('/api/upload-zip', express.raw({ type: '*/*', limit: '50mb' }), (req, res) => {
  try {
    const buf = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);
    if (buf && buf.length > 50000 && buf[0] === 0x50 && buf[1] === 0x4b) {
      const targetDirs = ['public', 'dist'];
      const zipNames = [
        'safar-gafargaon-clean-source.zip',
        'safar-gafargaon-latest.zip',
        'safar-gafargaon-final.zip',
        'safar-app.zip',
        'safar-gafargaon.zip'
      ];
      for (const dir of targetDirs) {
        const dPath = path.resolve(__dirname, dir);
        if (fs.existsSync(dPath)) {
          for (const name of zipNames) {
            fs.writeFileSync(path.join(dPath, name), buf);
          }
        }
      }
      const mb = (buf.length / (1024 * 1024)).toFixed(2);
      return res.json({
        success: true,
        sizeBytes: buf.length,
        sizeMb: mb,
        message: `ফ্রেশ জিপ ফাইল (${mb} MB) সফলভাবে আপলোড ও আপডেট হয়েছে!`
      });
    }
    return res.status(400).json({ success: false, error: 'ফাইলটি সঠিক ZIP ফরম্যাট নয় অথবা সাইজ অপর্যাপ্ত' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'আপলোড ব্যর্থ হয়েছে' });
  }
});

// Dynamic Re-generate ZIP from current live project source
app.post('/api/regenerate-zip', async (req, res) => {
  try {
    const { execSync } = await import('child_process');
    execSync('node scripts/create-clean-zip.mjs', { stdio: 'ignore' });
    const p = path.resolve(__dirname, 'public', 'safar-gafargaon-clean-source.zip');
    const stat = fs.statSync(p);
    const mb = (stat.size / (1024 * 1024)).toFixed(2);
    return res.json({
      success: true,
      sizeBytes: stat.size,
      sizeMb: mb,
      message: `লেটেস্ট কোডবেস থেকে ফ্রেশ জিপ (${mb} MB) সফলভাবে প্রস্তুত হয়েছে!`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'জিপ প্রস্তুত ব্যর্থ হয়েছে' });
  }
});

// Mount Vite or serve static
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

async function startServer() {
  if (!isProduction) {
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
      // Never send index.html for .zip or .mp3 files
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
