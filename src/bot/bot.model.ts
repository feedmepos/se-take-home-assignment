import { Order } from '../order/order.model.js';

export type BotStatus = 'idle' | 'processing';

export interface Bot {
  id: number;
  status: BotStatus;
  currentOrder: Order | null;
  timer: ReturnType<typeof setTimeout> | null;
}
