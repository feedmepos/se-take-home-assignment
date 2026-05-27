import { renderHook, act } from '@testing-library/react';
import { useEventSource, type EventSourceLike, type ConnectionStatus } from './useEventSource';
import type { StatusDTO } from '@contracts';

// ---------------------------------------------------------------------------
// FakeEventSource — minimal test double; no DOM globals needed.
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

  /** Simulate the connection being established. */
  open(): void {
    this.onopen?.call(this, {});
  }

  /** Simulate a message frame arriving from the server. */
  emit(data: string): void {
    this.onmessage?.call(this, { data });
  }

  /** Simulate a network/connection error. */
  fail(): void {
    this.onerror?.call(this, {});
  }
}

// ---------------------------------------------------------------------------
// Helper — build a minimal valid StatusDTO
// ---------------------------------------------------------------------------
function makeStatus(cookDurationMs: number): StatusDTO {
  return {
    pending: [],
    processing: [],
    complete: [],
    bots: [],
    cookDurationMs,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useEventSource', () => {
  let fake: FakeEventSource;

  function factory(_url: string): EventSourceLike {
    fake = new FakeEventSource();
    return fake;
  }

  it('starts with status=connecting and snapshot=null', () => {
    const { result } = renderHook(() =>
      useEventSource('/api/events', factory),
    );

    expect(result.current.status).toBe<ConnectionStatus>('connecting');
    expect(result.current.snapshot).toBeNull();
  });

  it('transitions to connected when the connection opens', () => {
    const { result } = renderHook(() =>
      useEventSource('/api/events', factory),
    );

    act(() => {
      fake.open();
    });

    expect(result.current.status).toBe<ConnectionStatus>('connected');
  });

  it('replaces snapshot wholesale on each message', () => {
    const { result } = renderHook(() =>
      useEventSource('/api/events', factory),
    );

    act(() => { fake.open(); });

    const first = makeStatus(10_000);
    act(() => { fake.emit(JSON.stringify(first)); });
    expect(result.current.snapshot).toEqual(first);

    // Second emit must REPLACE, not merge — different cookDurationMs
    const second = makeStatus(20_000);
    act(() => { fake.emit(JSON.stringify(second)); });
    expect(result.current.snapshot).toEqual(second);
    expect(result.current.snapshot?.cookDurationMs).toBe(20_000);
  });

  it('transitions to reconnecting on error', () => {
    const { result } = renderHook(() =>
      useEventSource('/api/events', factory),
    );

    act(() => { fake.open(); });
    act(() => { fake.fail(); });

    expect(result.current.status).toBe<ConnectionStatus>('reconnecting');
  });

  it('calls close() on the EventSource when the hook unmounts', () => {
    const { unmount } = renderHook(() =>
      useEventSource('/api/events', factory),
    );

    expect(fake.closed).toBe(false);
    unmount();
    expect(fake.closed).toBe(true);
  });
});
