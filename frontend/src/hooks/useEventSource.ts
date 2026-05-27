import { useEffect, useState } from 'react';
import type { StatusDTO } from '@contracts';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting';

// Minimal structural interface so a test double satisfies it without DOM globals.
export interface EventSourceLike {
  onopen: ((this: unknown, ev: unknown) => void) | null;
  onmessage: ((this: unknown, ev: { data: string }) => void) | null;
  onerror: ((this: unknown, ev: unknown) => void) | null;
  close(): void;
}

export function useEventSource(
  url: string,
  factory: (url: string) => EventSourceLike = (u) =>
    new EventSource(u) as unknown as EventSourceLike,
): { snapshot: StatusDTO | null; status: ConnectionStatus } {
  const [snapshot, setSnapshot] = useState<StatusDTO | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  useEffect(() => {
    const es = factory(url);

    es.onopen = () => {
      setStatus('connected');
    };

    es.onmessage = (ev: { data: string }) => {
      setSnapshot(JSON.parse(ev.data) as StatusDTO);
    };

    es.onerror = () => {
      setStatus('reconnecting');
    };

    return () => {
      es.close();
    };
  }, [url, factory]);

  return { snapshot, status };
}
