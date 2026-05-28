import { describe, it, expect, vi, afterEach } from 'vitest';
import { newOrder, addBot, delBot } from './client';

describe('api/client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockFetch(ok: boolean, status: number): void {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok, status }));
  }

  // ---------------------------------------------------------------------------
  // newOrder
  // ---------------------------------------------------------------------------
  it('newOrder("VIP") POSTs /api/orders with correct method, headers, and body', async () => {
    mockFetch(true, 200);

    await newOrder('VIP');

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'VIP' }),
    });
  });

  it('newOrder("NORMAL") POSTs /api/orders with body { type: "NORMAL" }', async () => {
    mockFetch(true, 200);

    await newOrder('NORMAL');

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'NORMAL' }),
    });
  });

  // ---------------------------------------------------------------------------
  // addBot
  // ---------------------------------------------------------------------------
  it('addBot() POSTs /api/bots', async () => {
    mockFetch(true, 200);

    await addBot();

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith('/api/bots', { method: 'POST' });
  });

  // ---------------------------------------------------------------------------
  // delBot
  // ---------------------------------------------------------------------------
  it('delBot() DELETEs /api/bots', async () => {
    mockFetch(true, 200);

    await delBot();

    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith('/api/bots', { method: 'DELETE' });
  });

  // ---------------------------------------------------------------------------
  // error path
  // ---------------------------------------------------------------------------
  it('throws when fetch resolves with ok: false', async () => {
    mockFetch(false, 404);

    await expect(newOrder('VIP')).rejects.toThrow('Request failed: 404');
  });

  it('throws for non-ok on addBot', async () => {
    mockFetch(false, 500);

    await expect(addBot()).rejects.toThrow('Request failed: 500');
  });

  it('throws for non-ok on delBot', async () => {
    mockFetch(false, 409);

    await expect(delBot()).rejects.toThrow('Request failed: 409');
  });
});
