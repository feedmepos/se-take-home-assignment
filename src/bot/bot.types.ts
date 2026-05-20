import { Order } from '../order/order.types';

export enum BotStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
}

export interface Bot {
  id: number;
  status: BotStatus;
  currentOrder: Order | null;
}
