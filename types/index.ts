export type OrderType = 'normal' | 'vip';

export type OrderStatus = 'pending' | 'processing' | 'complete';

export type BotStatus = 'idle' | 'processing';

export interface Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
  createdAt: number;
}

export interface Bot {
  id: number;
  status: BotStatus;
  currentOrderId: number | null;
}

export interface AppState {
  orders: Order[];
  bots: Bot[];
  orderCounter: number;
  botCounter: number;
}
