import { Order } from './order';
import { Bot } from './bot';

export interface SystemState {
  orders: Order[];
  bots: Bot[];
}

export interface GetStateResponse {
  orders: Order[];
  bots: Bot[];
}

export interface ResetResponse {
  message: string;
}
