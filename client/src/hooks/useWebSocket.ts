import { useRef, useCallback, useEffect, useState } from 'react';
import type { ConnectionStatus, ServerMessage } from '../types';
import { getStoredToken } from '../services/api';

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8081/ws';

function clog(msg: string): void {
  console.log(`[${new Date().toISOString()}] [WS] ${msg}`);
}

interface UseWebSocketReturn {
  status: ConnectionStatus;
  sessionId: string | null;
  connect: () => Promise<void>;
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

  const connectPromiseRef = useRef<{ resolve: () => void; reject: (err: Error) => void } | null>(null);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback((): Promise<void> => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      clog('Already connected, reusing existing socket');
      return Promise.resolve();
    }

    intentionalCloseRef.current = false;
    reconnectAttemptsRef.current = 0;
    setStatus('connecting');
    const token = getStoredToken();
    const wsUrl = token ? `${WS_BASE}?token=${encodeURIComponent(token)}` : WS_BASE;
    clog(`Connecting to ${WS_BASE} | hasToken: ${!!token}`);
    const ws = new WebSocket(wsUrl);

    const promise = new Promise<void>((resolve, reject) => {
      connectPromiseRef.current = { resolve, reject };
    });

    // Connection timeout — reject after 10 seconds
    connectTimeoutRef.current = setTimeout(() => {
      if (connectPromiseRef.current) {
        clog('Connection timeout (10s)');
        connectPromiseRef.current.reject(new Error('Connection timeout'));
        connectPromiseRef.current = null;
        ws.close();
      }
    }, 10000);

    ws.onopen = () => {
      clog('Socket opened');
      reconnectAttemptsRef.current = 0;
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }
      connectPromiseRef.current?.resolve();
      connectPromiseRef.current = null;
      // Don't set connected yet — wait for session.status from server
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);

        // Log important lifecycle events
        if (['session.created', 'session.status', 'error'].includes(message.type)) {
          clog(`<< ${message.type} ${message.status ? '| status: ' + message.status : ''} ${message.sessionId ? '| sessionId: ' + message.sessionId : ''} ${message.message ? '| ' + message.message : ''}`);
        }

        // Handle connection lifecycle
        if (message.type === 'session.created' && message.sessionId) {
          setSessionId(message.sessionId);
        }
        if (message.type === 'session.status') {
          setStatus(message.status || 'idle');
        }
        if (message.type === 'error') {
          console.error(`[${new Date().toISOString()}] [WS] Server error:`, message.message);
        }

        // Forward to message handler
        messageHandlerRef.current?.(message);
      } catch (err) {
        console.error(`[${new Date().toISOString()}] [WS] Failed to parse message:`, err);
      }
    };

    ws.onclose = (event: CloseEvent) => {
      clog(`Disconnected | code: ${event.code} | reason: ${event.reason || 'none'}`);
      setStatus('disconnected');
      wsRef.current = null;

      // Reject pending connect promise
      if (connectPromiseRef.current) {
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
        connectPromiseRef.current.reject(new Error(`WebSocket closed: ${event.code}`));
        connectPromiseRef.current = null;
      }

      // Auto-reconnect on unexpected close (not user-initiated)
      if (!intentionalCloseRef.current && event.code !== 1000 && reconnectAttemptsRef.current < 3) {
        reconnectAttemptsRef.current++;
        clog(`Reconnect attempt ${reconnectAttemptsRef.current}/3`);
        setTimeout(() => connect(), 2000 * reconnectAttemptsRef.current);
      }
    };

    ws.onerror = () => {
      console.error(`[${new Date().toISOString()}] [WS] Connection error`);
      setStatus('error');
      // Reject pending connect promise
      if (connectPromiseRef.current) {
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
        connectPromiseRef.current.reject(new Error('WebSocket connection failed'));
        connectPromiseRef.current = null;
      }
    };

    wsRef.current = ws;
    return promise;
  }, []);

  const disconnect = useCallback(() => {
    clog('Disconnecting (intentional)');
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
      clog(`>> ${data.type as string}`);
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn(`[${new Date().toISOString()}] [WS] Cannot send ${data.type as string} — socket not open (readyState: ${wsRef.current?.readyState ?? 'null'})`);
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
