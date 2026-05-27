import type { OrderType } from '@contracts';

export async function newOrder(type: OrderType): Promise<void> {
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type }),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
}

export async function addBot(): Promise<void> {
  const res = await fetch('/api/bots', { method: 'POST' });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
}

export async function delBot(): Promise<void> {
  const res = await fetch('/api/bots', { method: 'DELETE' });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
}
