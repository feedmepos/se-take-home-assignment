import { create } from 'zustand';
import type { StateSnapshot, OrderSnapshot, BotSnapshot, DomainEvent } from '@feedme/core';

export interface KitchenStore {
  connected: boolean;
  pending: OrderSnapshot[];
  processing: OrderSnapshot[];
  complete: OrderSnapshot[];
  bots: BotSnapshot[];
  /** orderId → 本地记录的处理开始时间(ms),用于前端绘制 10 秒进度条。 */
  startedAt: Record<number, number>;

  setConnected: (connected: boolean) => void;
  applyState: (state: StateSnapshot) => void;
  applyEvent: (event: DomainEvent) => void;
}

const emptyState = {
  pending: [] as OrderSnapshot[],
  processing: [] as OrderSnapshot[],
  complete: [] as OrderSnapshot[],
  bots: [] as BotSnapshot[],
};

export const useKitchenStore = create<KitchenStore>((set) => ({
  connected: false,
  ...emptyState,
  startedAt: {},

  setConnected: (connected) => set({ connected }),

  applyState: (state) =>
    set({
      pending: state.pending,
      processing: state.processing,
      complete: state.complete,
      bots: state.bots,
    }),

  applyEvent: (event) =>
    set((store) => {
      if (event.kind === 'OrderPickedUp') {
        return { startedAt: { ...store.startedAt, [event.orderId]: Date.now() } };
      }
      if (event.kind === 'OrderCompleted' || event.kind === 'OrderRequeued') {
        const next = { ...store.startedAt };
        delete next[event.orderId];
        return { startedAt: next };
      }
      return {};
    }),
}));
