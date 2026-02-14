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
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus('connecting');
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('[WS] Connected to server');
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

    ws.onclose = () => {
      console.log('[WS] Disconnected');
      setStatus('disconnected');
      wsRef.current = null;
    };

    ws.onerror = () => {
      console.error('[WS] Connection error');
      setStatus('error');
    };

    wsRef.current = ws;
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
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
