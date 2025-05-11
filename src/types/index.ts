import { OrderStatus, OrderType, BotStatus } from '../constants';

export interface Order {
  // [x: string]: any;
  id: number;
  type: OrderType;
  status: OrderStatus;
  createdAt?: Date;
}

export interface Bot {
  id: number;
  status: BotStatus;
  currentOrder: Order | null;
  timeoutId: NodeJS.Timeout | null;
}