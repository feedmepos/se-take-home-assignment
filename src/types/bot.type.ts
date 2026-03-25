import { Order } from "./order.type";

export type BotStatus = 'IDLE' | 'PROCESSING';

export interface Bot {
  id: number;
  status: BotStatus;
  currentOrder: Order | null;
  processOrder(order: Order): Promise<void>;
}