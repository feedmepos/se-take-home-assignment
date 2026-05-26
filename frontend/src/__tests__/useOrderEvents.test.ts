import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOrderEvents } from '../hooks/useOrderEvents';
import { orderEventClient } from '../services/OrderEventClient';

vi.mock('../services/OrderEventClient', () => ({
  orderEventClient: {
    subscribe: vi.fn(() => vi.fn()),
  },
}));

describe('useOrderEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (orderEventClient.subscribe as ReturnType<typeof vi.fn>).mockReturnValue(vi.fn());
  });

  it('should subscribe on mount and unsubscribe on unmount', () => {
    const unsubscribe = vi.fn();
    (orderEventClient.subscribe as ReturnType<typeof vi.fn>).mockReturnValue(unsubscribe);

    const callback = vi.fn();
    const { unmount } = renderHook(() => useOrderEvents(callback));

    expect(orderEventClient.subscribe).toHaveBeenCalledWith(expect.any(Function));

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('should only subscribe once even when callback reference changes', () => {
    const { rerender } = renderHook(
      ({ cb }) => useOrderEvents(cb),
      { initialProps: { cb: vi.fn() } },
    );

    expect(orderEventClient.subscribe).toHaveBeenCalledTimes(1);

    rerender({ cb: vi.fn() });
    expect(orderEventClient.subscribe).toHaveBeenCalledTimes(1);
  });
});
