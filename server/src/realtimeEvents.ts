import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import url from 'url';
import { verifyToken } from './auth/auth';

// ---- Types ----
export interface RealtimeEvent {
  type: string;
  payload: unknown;
  timestamp?: string;
}

// ---- Connected Clients Map ----
// Map<userId, Set<WebSocket>> — supports multiple tabs per user
const connectedClients = new Map<string, Set<WebSocket>>();

// ---- Emit helpers ----
export function emitToUser(userId: string, event: RealtimeEvent): void {
  const sockets = connectedClients.get(userId);
  if (!sockets) return;
  const message = JSON.stringify({ ...event, timestamp: new Date().toISOString() });
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}


// ---- Setup ----
export function setupEventWebSocket(_server: http.Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    const parsedUrl = url.parse(req.url || '', true);
    const token = parsedUrl.query.token as string | undefined;

    if (!token) {
      ws.close(4001, 'No token provided');
      return;
    }

    const payload = verifyToken(token);
    if (!payload) {
      ws.close(4001, 'Invalid or expired token');
      return;
    }

    const userId = payload.id;

    // Register connection
    if (!connectedClients.has(userId)) {
      connectedClients.set(userId, new Set());
    }
    connectedClients.get(userId)!.add(ws);

    // Heartbeat ping every 30s to keep connection alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);

    ws.on('close', () => {
      clearInterval(pingInterval);
      cleanup(userId, ws);
    });

    ws.on('error', () => {
      clearInterval(pingInterval);
      cleanup(userId, ws);
    });
  });

  console.log('[RealtimeEvents] WebSocket server ready on /ws/events');

  return wss;
}

function cleanup(userId: string, ws: WebSocket): void {
  const sockets = connectedClients.get(userId);
  if (sockets) {
    sockets.delete(ws);
    if (sockets.size === 0) {
      connectedClients.delete(userId);
    }
  }
}
