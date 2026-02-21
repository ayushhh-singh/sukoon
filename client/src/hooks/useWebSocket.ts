import { useRef, useCallback, useEffect, useState } from 'react';
import type { ConnectionStatus, ServerMessage } from '../types';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8081/ws';

interface UseWebSocketReturn {
  status: ConnectionStatus;
  sessionId: string | null;
  connect: () => void;
  disconnect: () => void;
  send: (data: Record<string, unknown>) => void;
  onMessage: (handler: (message: ServerMessage) => void) => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const messageHandlerRef = useRef<((message: ServerMessage) => void) | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const intentionalCloseRef = useRef(false);
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    intentionalCloseRef.current = false;
    reconnectAttemptsRef.current = 0;
    setStatus('connecting');
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('[WS] Connected to server');
      reconnectAttemptsRef.current = 0;
      // Don't set connected yet — wait for session.status from OpenAI
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);

        // Handle connection lifecycle
        if (message.type === 'session.created' && message.sessionId) {
          setSessionId(message.sessionId);
        }
        if (message.type === 'session.status') {
          setStatus(message.status || 'idle');
        }
        if (message.type === 'error') {
          console.error('[WS] Server error:', message.message);
        }

        // Forward to message handler
        messageHandlerRef.current?.(message);
      } catch (err) {
        console.error('[WS] Failed to parse message:', err);
      }
    };

    ws.onclose = (event: CloseEvent) => {
      console.log('[WS] Disconnected', event.code, event.reason);
      setStatus('disconnected');
      wsRef.current = null;

      // Auto-reconnect on unexpected close (not user-initiated)
      if (!intentionalCloseRef.current && event.code !== 1000 && reconnectAttemptsRef.current < 3) {
        reconnectAttemptsRef.current++;
        console.log(`[WS] Reconnect attempt ${reconnectAttemptsRef.current}/3`);
        setTimeout(() => connect(), 2000 * reconnectAttemptsRef.current);
      }
    };

    ws.onerror = () => {
      console.error('[WS] Connection error');
      setStatus('error');
    };

    wsRef.current = ws;
  }, []);

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    reconnectAttemptsRef.current = 0;
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    setStatus('idle');
    setSessionId(null);
  }, []);

  const send = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const onMessage = useCallback((handler: (message: ServerMessage) => void) => {
    messageHandlerRef.current = handler;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return { status, sessionId, connect, disconnect, send, onMessage };
}
