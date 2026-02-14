import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import http from 'http';
import { setupWebSocket } from './websocket';

const app = express();
const PORT = process.env.PORT || 8081;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const server = http.createServer(app);

setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`[Sukoon] Server running on port ${PORT}`);
  console.log(`[Sukoon] WebSocket ready for connections`);
  console.log(`[Sukoon] Accepting clients from ${CLIENT_URL}`);
});
