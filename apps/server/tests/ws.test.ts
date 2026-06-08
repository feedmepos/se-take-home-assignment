import { describe, it, expect, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import type { AddressInfo } from 'node:net';
import { buildApp } from '../src/app';
import { KitchenService } from '../src/application/KitchenService';
import { FakeClock, OrderType, type ServerMessage } from '@feedme/core';

let close: (() => Promise<void>) | null = null;

afterEach(async () => {
  if (close) await close();
  close = null;
});

const waitFor = async (predicate: () => boolean, timeoutMs = 1000): Promise<void> => {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error('timeout waiting for condition');
    await new Promise((r) => setTimeout(r, 10));
  }
};

describe('WebSocket gateway', () => {
  it('sends an initial STATE then pushes EVENT and STATE on a command', async () => {
    const service = new KitchenService(new FakeClock());
    const app = await buildApp(service);
    await app.listen({ port: 0, host: '127.0.0.1' });
    close = () => app.close();

    const { port } = app.server.address() as AddressInfo;
    const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const messages: ServerMessage[] = [];
    socket.on('message', (data) => messages.push(JSON.parse(data.toString()) as ServerMessage));

    await new Promise((resolve) => socket.on('open', resolve));
    await waitFor(() => messages.length >= 1);
    expect(messages[0]?.type).toBe('STATE');

    service.createOrder(OrderType.VIP);
    await waitFor(() => messages.some((m) => m.type === 'EVENT'));

    const event = messages.find((m) => m.type === 'EVENT');
    expect(event?.type).toBe('EVENT');
    if (event?.type === 'EVENT') {
      expect(event.payload.kind).toBe('OrderCreated');
    }

    const latestState = [...messages].reverse().find((m) => m.type === 'STATE');
    if (latestState?.type === 'STATE') {
      expect(latestState.payload.pending.map((o) => o.type)).toContain('VIP');
    }

    socket.close();
  });
});
