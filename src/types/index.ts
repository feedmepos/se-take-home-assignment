export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: 'burger' | 'sides' | 'drink';
}

export interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
}

export type Order = {
  id: number;
  type: 'normal' | 'vip';
  items: OrderItem[];
  total: number;
  createdAt: Date;
} & (
  | { status: 'pending' }
  | { status: 'processing'; processingStartedAt: Date; processingBotId: number }
  | { status: 'complete'; processingStartedAt: Date; completedAt: Date; processingBotId: number }
);

export type Bot = {
  id: number;
} & (
  | { status: 'idle' }
  | { status: 'processing'; currentOrderId: number }
);

export interface AppState {
  orders: Order[];
  bots: Bot[];
  nextOrderId: number;
  nextBotId: number;
}

export type AppAction =
  | { type: 'CREATE_ORDER'; payload: { orderType: 'normal' | 'vip'; items: OrderItem[] } }
  | { type: 'ADD_BOT' }
  | { type: 'REMOVE_BOT' }
  | { type: 'START_PROCESSING'; payload: { orderId: number; botId: number } }
  | { type: 'COMPLETE_ORDER'; payload: { orderId: number; botId: number } }
  | { type: 'RESET_ORDER_TO_PENDING'; payload: { orderId: number } };