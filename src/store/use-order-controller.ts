// --------------------------------------------------------------------------
// useSyncExternalStore bridge between the pure OrderController and React.
//
// One module-level controller instance is the single source of truth.
// Selector hooks let each column subscribe independently — a column re-renders
// only when its own slice reference changes (paired with stable snapshots).
// All actions are stable object references; never recreated between renders.
// No domain logic lives here — only wiring.
// --------------------------------------------------------------------------

import { OrderController } from '@/core/order-controller';
import { systemScheduler } from '@/core/scheduler';
import type { Bot, CompleteOrder, PendingOrder, Snapshot } from '@/core/types';
import { useSyncExternalStore } from 'react';

const controller = new OrderController(systemScheduler);

function getSnapshot(): Snapshot {
  return controller.getSnapshot();
}

function subscribe(listener: () => void): () => void {
  return controller.subscribe(listener);
}

// --------------------------------------------------------------------------
// Selector hooks — each extracts the slice it needs from the same snapshot.

export function usePendingOrders(): readonly PendingOrder[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot).pending;
}

export function useCompleteOrders(): readonly CompleteOrder[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot).complete;
}

export function useBots(): readonly Bot[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot).bots;
}

// Full snapshot — used by components that need cross-slice data (e.g. BotShelf
// needs both bots and processing-order details).
export function useSnapshot(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// --------------------------------------------------------------------------
// Stable action object — same reference across all renders.
// Components call these; they never import OrderController directly.

export const controllerActions = {
  addNormalOrder: () => controller.addNormalOrder(),
  addVipOrder: () => controller.addVipOrder(),
  addBot: () => controller.addBot(),
  removeBot: () => controller.removeBot(),
} as const;
