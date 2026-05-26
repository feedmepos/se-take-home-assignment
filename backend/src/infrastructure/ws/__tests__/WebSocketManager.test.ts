import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer } from 'http';
import WebSocket from 'ws';
import { WebSocketManager } from '../WebSocketManager';
import { OrderProcessingEngine } from '../../../domain/service/OrderProcessingEngine';

describe('WebSocketManager', () => {
  let server: ReturnType<typeof createServer>;
  let engine: OrderProcessingEngine;
  let port: number;

  beforeEach(async () => {
    engine = new OrderProcessingEngine();
    const manager = new WebSocketManager();
    server = createServer();
    manager.attach(server, engine);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        port = (server.address() as { port: number }).port;
        resolve();
      });
    });
  });

  afterEach(() => {
    server.close();
  });

  function connectClient(): Promise<{ ws: WebSocket; messages: unknown[] }> {
    return new Promise((resolve) => {
      const ws = new WebSocket(`ws://localhost:${port}/ws`);
      const messages: unknown[] = [];

      ws.on('message', (data) => {
        messages.push(JSON.parse(data.toString()));
      });

      ws.on('open', () => {
        resolve({ ws, messages });
      });
    });
  }

  it('should broadcast bot:status_changed when processing starts', async () => {
    const { messages } = await connectClient();

    engine.createOrder('NORMAL');
    engine.addBot();

    await new Promise((resolve) => setTimeout(resolve, 50));

    const event = messages.find(
      (m: any) => m.event === 'bot:status_changed' && (m.payload as any).status === 'PROCESSING',
    );
    expect(event).toBeDefined();
    expect((event as any).payload.currentOrderId).toBe(1);
  });

  it('should broadcast events to all connected clients', async () => {
    const c1 = await connectClient();
    const c2 = await connectClient();

    engine.createOrder('NORMAL');
    engine.addBot();

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(c1.messages.length).toBeGreaterThan(0);
    expect(c2.messages.length).toBeGreaterThan(0);
    expect(c1.messages).toEqual(c2.messages);
  });

  it('should not broadcast to clients that connect after event', async () => {
    engine.createOrder('NORMAL');
    engine.addBot();

    await new Promise((resolve) => setTimeout(resolve, 50));

    const { messages } = await connectClient();
    expect(messages.length).toBe(0);
  });
});
