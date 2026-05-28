import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import type { EventSourceLike } from './hooks/useEventSource';
import type { StatusDTO } from '@contracts';

// ---------------------------------------------------------------------------
// FakeEventSource — minimal test double (same pattern as useEventSource.test.ts)
// ---------------------------------------------------------------------------
class FakeEventSource implements EventSourceLike {
  onopen: ((this: unknown, ev: unknown) => void) | null = null;
  onmessage: ((this: unknown, ev: { data: string }) => void) | null = null;
  onerror: ((this: unknown, ev: unknown) => void) | null = null;

  private _closed = false;

  close(): void {
    this._closed = true;
  }

  get closed(): boolean {
    return this._closed;
  }

  open(): void {
    this.onopen?.call(this, {});
  }

  emit(data: string): void {
    this.onmessage?.call(this, { data });
  }

  fail(): void {
    this.onerror?.call(this, {});
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeSnapshot(): StatusDTO {
  return {
    pending: [{ id: 1, type: 'VIP', status: 'PENDING', createdAt: '2026-01-01T00:00:00.000Z' }],
    processing: [
      {
        order: { id: 2, type: 'NORMAL', status: 'PROCESSING', createdAt: '2026-01-01T00:00:00.000Z', startedAt: new Date().toISOString() },
        botId: 1,
      },
    ],
    complete: [{ id: 3, type: 'NORMAL', status: 'COMPLETE', createdAt: '2026-01-01T00:00:00.000Z', completedAt: '2026-01-01T00:01:00.000Z' }],
    bots: [{ id: 1, status: 'PROCESSING', currentOrderId: 2 }],
    cookDurationMs: 10_000,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('App integration', () => {
  let fake: FakeEventSource;

  beforeEach(() => {
    fake = new FakeEventSource();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows "Connecting…" placeholder before first frame, indicator "Live" after open', async () => {
    render(<App eventSourceFactory={() => fake} />);

    // Before open: status=connecting, no snapshot — both indicator and placeholder show "Connecting…"
    expect(screen.getAllByText('Connecting…').length).toBeGreaterThanOrEqual(2);

    // After open: status=connected → indicator "Live"; snapshot still null → placeholder still visible
    act(() => { fake.open(); });
    expect(await screen.findByText('Live')).toBeInTheDocument();
    // snapshot is still null — connecting placeholder still visible
    expect(screen.getByText('Connecting…')).toBeInTheDocument();
  });

  it('renders pending/bot/complete areas after receiving a snapshot', async () => {
    render(<App eventSourceFactory={() => fake} />);
    act(() => { fake.open(); });
    act(() => { fake.emit(JSON.stringify(makeSnapshot())); });

    // VIP pending order (title text — no separate badge)
    expect(await screen.findByText('VIP Order #1')).toBeInTheDocument();
    // Bot section
    expect(screen.getByText('Bot #1')).toBeInTheDocument();
    // Complete section has an order (OrderCard renders "Normal Order #3")
    expect(screen.getByText('Normal Order #3')).toBeInTheDocument();
  });

  it('calls fetch POST /api/orders with type VIP on "New VIP Order" click', async () => {
    render(<App eventSourceFactory={() => fake} />);
    act(() => { fake.open(); });
    act(() => { fake.emit(JSON.stringify(makeSnapshot())); });

    await screen.findByText('VIP Order #1'); // wait for render
    await userEvent.setup().click(screen.getByRole('button', { name: 'New VIP Order' }));

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      '/api/orders',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ type: 'VIP' }),
      }),
    );
  });

  it('calls fetch POST /api/bots on "+ Bot" click', async () => {
    render(<App eventSourceFactory={() => fake} />);
    act(() => { fake.open(); });
    act(() => { fake.emit(JSON.stringify(makeSnapshot())); });

    await screen.findByText('VIP Order #1');
    await userEvent.setup().click(screen.getByRole('button', { name: '+ Bot' }));

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      '/api/bots',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('shows "Reconnecting…" indicator after connection failure', async () => {
    render(<App eventSourceFactory={() => fake} />);
    act(() => { fake.open(); });
    act(() => { fake.emit(JSON.stringify(makeSnapshot())); });
    await screen.findByText('VIP Order #1');

    act(() => { fake.fail(); });
    expect(await screen.findByText('Reconnecting…')).toBeInTheDocument();
  });

  it('replaces rendered state when a second frame arrives (full-replace)', async () => {
    render(<App eventSourceFactory={() => fake} />);
    act(() => { fake.open(); });
    act(() => { fake.emit(JSON.stringify(makeSnapshot())); });
    await screen.findByText('VIP Order #1');

    // Second frame: pending now empty
    const second: StatusDTO = {
      pending: [],
      processing: [],
      complete: [{ id: 3, type: 'NORMAL', status: 'COMPLETE', createdAt: '2026-01-01T00:00:00.000Z', completedAt: '2026-01-01T00:01:00.000Z' }],
      bots: [],
      cookDurationMs: 10_000,
    };
    act(() => { fake.emit(JSON.stringify(second)); });

    expect(await screen.findByText('No pending orders')).toBeInTheDocument();
  });
});
