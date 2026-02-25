import { createContext, useContext, useRef, useCallback, type ReactNode } from 'react';
import { useRealtimeEvents, type RealtimeEvent } from '../hooks/useRealtimeEvents';
import { useEffect } from 'react';

type Listener = (event: RealtimeEvent) => void;

interface RealtimeContextValue {
  subscribe: (eventPattern: string, listener: Listener) => () => void;
}

const RealtimeCtx = createContext<RealtimeContextValue | null>(null);

/**
 * Provides real-time event distribution to child components.
 * Connects a single WebSocket to /ws/events and fans out events
 * to subscribers via pattern matching (supports `*` wildcard).
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const listenersRef = useRef<Map<string, Set<Listener>>>(new Map());

  const handleEvent = useCallback((event: RealtimeEvent) => {
    // Exact match listeners
    const exact = listenersRef.current.get(event.type);
    if (exact) {
      for (const fn of exact) fn(event);
    }

    // Wildcard match: e.g., "medication:*" matches "medication:created"
    const prefix = event.type.split(':')[0];
    const wildcard = listenersRef.current.get(`${prefix}:*`);
    if (wildcard) {
      for (const fn of wildcard) fn(event);
    }

    // Global wildcard "*"
    const global = listenersRef.current.get('*');
    if (global) {
      for (const fn of global) fn(event);
    }
  }, []);

  useRealtimeEvents(handleEvent);

  const subscribe = useCallback((eventPattern: string, listener: Listener) => {
    if (!listenersRef.current.has(eventPattern)) {
      listenersRef.current.set(eventPattern, new Set());
    }
    listenersRef.current.get(eventPattern)!.add(listener);

    // Return unsubscribe function
    return () => {
      const set = listenersRef.current.get(eventPattern);
      if (set) {
        set.delete(listener);
        if (set.size === 0) listenersRef.current.delete(eventPattern);
      }
    };
  }, []);

  return (
    <RealtimeCtx.Provider value={{ subscribe }}>
      {children}
    </RealtimeCtx.Provider>
  );
}

/**
 * Subscribe to real-time events by pattern.
 * Patterns: exact "medication:created", wildcard "medication:*", or global "*"
 */
export function useRealtimeSubscription(eventPattern: string, handler: Listener): void {
  const ctx = useContext(RealtimeCtx);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!ctx) return;
    const stableHandler: Listener = (event) => handlerRef.current(event);
    return ctx.subscribe(eventPattern, stableHandler);
  }, [ctx, eventPattern]);
}
