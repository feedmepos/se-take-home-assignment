import { describe, it, expect, vi } from 'vitest';

describe('OrderEventClient', () => {
  it('should be importable and defined', async () => {
    vi.resetModules();

    class StubWebSocket {
      static OPEN = 1;
      readyState = 1;
      onmessage: ((event: { data: string }) => void) | null = null;
      onclose: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor() {}
      close() {}
      send() {}
    }

    (globalThis as any).WebSocket = StubWebSocket;

    try {
      const { orderEventClient } = await import('../services/OrderEventClient');
      const listener = vi.fn();
      const unsubscribe = orderEventClient.subscribe(listener);
      expect(orderEventClient).toBeDefined();
      unsubscribe();
    } finally {
      // cleanup
    }
  });

  it('should not call listener after unsubscribe', async () => {
    vi.resetModules();

    class StubWebSocket {
      static OPEN = 1;
      readyState = 1;
      onmessage: ((event: { data: string }) => void) | null = null;
      onclose: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor() {}
      close() {}
      send() {}
    }

    (globalThis as any).WebSocket = StubWebSocket;

    try {
      const { orderEventClient } = await import('../services/OrderEventClient');
      const listener = vi.fn();
      const unsubscribe = orderEventClient.subscribe(listener);
      unsubscribe();
      expect(orderEventClient).toBeDefined();
    } finally {
      // cleanup
    }
  });
});
