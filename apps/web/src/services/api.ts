import { config } from '../config';
import type { OrderTypeCommand } from '@feedme/core';

async function send(path: string, method: string, body?: unknown): Promise<void> {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { 'content-type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${config.apiBase}${path}`, init);
  if (!res.ok) {
    throw new Error(`${method} ${path} failed: ${res.status}`);
  }
}

export const api = {
  createOrder: (type: OrderTypeCommand) => send('/api/orders', 'POST', { type }),
  addBot: (time?: number) => send('/api/bots', 'POST', { time: time ?? 10_000 }),
  removeBot: () => send('/api/bots', 'DELETE'),
};
