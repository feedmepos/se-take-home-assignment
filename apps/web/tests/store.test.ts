import { describe, it, expect, beforeEach } from 'vitest';
import { useKitchenStore } from '../src/store/useKitchenStore';
import { OrderType, OrderStatus, BotStatus, type StateSnapshot } from '@feedme/core';

const snapshot: StateSnapshot = {
  pending: [
    { id: 1001, type: OrderType.VIP, status: OrderStatus.PENDING, createdAt: 0, completedAt: null },
  ],
  processing: [],
  complete: [],
  bots: [{ id: 1, status: BotStatus.IDLE, currentOrderId: null, processingTime: 10_000 }],
};

beforeEach(() => {
  useKitchenStore.setState({
    connected: false,
    pending: [],
    processing: [],
    complete: [],
    bots: [],
    startedAt: {},
  });
});

describe('useKitchenStore', () => {
  it('applies a full state snapshot', () => {
    useKitchenStore.getState().applyState(snapshot);
    const state = useKitchenStore.getState();
    expect(state.pending).toHaveLength(1);
    expect(state.bots[0]?.id).toBe(1);
  });

  it('records a processing start time on OrderPickedUp', () => {
    useKitchenStore
      .getState()
      .applyEvent({ kind: 'OrderPickedUp', at: 0, orderId: 1001, botId: 1 });
    expect(useKitchenStore.getState().startedAt[1001]).toBeTypeOf('number');
  });

  it('clears the start time on OrderCompleted', () => {
    const store = useKitchenStore.getState();
    store.applyEvent({ kind: 'OrderPickedUp', at: 0, orderId: 1001, botId: 1 });
    store.applyEvent({ kind: 'OrderCompleted', at: 0, orderId: 1001, botId: 1 });
    expect(useKitchenStore.getState().startedAt[1001]).toBeUndefined();
  });

  it('clears the start time on OrderRequeued', () => {
    const store = useKitchenStore.getState();
    store.applyEvent({ kind: 'OrderPickedUp', at: 0, orderId: 1001, botId: 1 });
    store.applyEvent({ kind: 'OrderRequeued', at: 0, orderId: 1001, botId: 1 });
    expect(useKitchenStore.getState().startedAt[1001]).toBeUndefined();
  });

  it('tracks connection status', () => {
    useKitchenStore.getState().setConnected(true);
    expect(useKitchenStore.getState().connected).toBe(true);
  });
});
