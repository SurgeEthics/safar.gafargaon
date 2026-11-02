import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// In-memory cache for live driver GPS coordination
const liveDrivers = new Map();

// API Endpoints
app.get('/api/live/health', (req, res) => {
  res.json({
    status: 'online',
    server: 'সফর গফরগাঁও এক্সপ্রেস লাইভ সার্ভার',
    timestamp: new Date().toISOString(),
    activeDrivers: liveDrivers.size
  });
});

app.get('/api/live/drivers', (req, res) => {
  res.json({
    success: true,
    count: liveDrivers.size,
    drivers: Array.from(liveDrivers.values())
  });
});

app.post('/api/live/driver/update', (req, res) => {
  const { id, lat, lng, name, category, phone } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Missing driver id' });
  }
  const driverData = { id, lat, lng, name, category, phone, updatedAt: new Date().toISOString() };
  liveDrivers.set(id, driverData);
  res.json({ success: true, driver: driverData });
});

// Serve frontend build from dist
const distPath = path.resolve(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.resolve(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Safar Gafargaon server listening on port ${port}`);
});
