import { useRef, useEffect, useCallback } from 'react';
import { getStoredToken } from '../services/api';

export interface RealtimeEvent {
  type: string;
  payload: unknown;
  timestamp: string;
}

type EventHandler = (event: RealtimeEvent) => void;

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8081/ws';
const EVENTS_URL = WS_BASE.replace(/\/ws\/?$/, '/ws/events');
const RECONNECT_DELAY = 3000;

export function useRealtimeEvents(onEvent: EventHandler): void {
  const wsRef = useRef<WebSocket | null>(null);
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    const token = getStoredToken();
    if (!token) return;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.close();
    }

    const ws = new WebSocket(`${EVENTS_URL}?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as RealtimeEvent;
        handlerRef.current(event);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (mountedRef.current) {
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY);
      }
    };

    ws.onerror = () => {
      // onclose will fire after onerror, triggering reconnect
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connect]);
}
