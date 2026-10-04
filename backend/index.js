import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import drivesRoutes from './routes/drives.js';
import sharesRoutes from './routes/shares.js';
import filesRoutes from './routes/files.js';
import { initWebSocket } from './websocket.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/drives', drivesRoutes);
app.use('/api/shares', sharesRoutes);
app.use('/api/files', filesRoutes);

// System Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Serve Vite frontend static files in production
const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));

app.get('/*path', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
      if (err) res.status(404).send('Frontend build not found. Run npm run build first.');
    });
  }
});

// Initialize WebSockets
initWebSocket(server);

// Start HTTP + WS Server
server.listen(PORT, () => {
  console.log(`=================================`);
  console.log(` NAS Explorer Backend Active`);
  console.log(` HTTP API: http://localhost:${PORT}`);
  console.log(` WebSocket: ws://localhost:${PORT}`);
  console.log(`=================================`);
});