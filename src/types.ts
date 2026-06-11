// ---- Domain Types ----

export type OrderType = 'VIP' | 'NORMAL';
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE';
export type BotStatus = 'IDLE' | 'PROCESSING';

// ---- Models ----

export interface Order {
  id: string;                       // UUID v4 — unique key, never displayed
  orderNumber: number;              // Display number, 4-digit padded, wraps 9999→0001
  type: OrderType;
  status: OrderStatus;
  createdAt: number;                // Unix ms — determines FIFO position within tier
  processingStartedAt: number | null;
  processingBotId: number | null;
  completedAt: number | null;       // Timestamp when order finished; null until COMPLETE
}

export interface Bot {
  id: number;                       // Permanent, never reused
  status: BotStatus;
  currentOrderId: string | null;
}

// ---- State & Hook Return ----

export interface KitchenState {
  orders: Order[];
  bots: Bot[];
  orderIdCounter: number;
  botIdCounter: number;
  tickCounter: number;              // Incremented every TICK — guarantees re-render
}

export interface KitchenStateReturn {
  state: KitchenState;
  pendingOrders: Order[];           // Sorted: VIPs by createdAt, then NORMALs by createdAt
  processingOrders: Order[];        // All PROCESSING orders
  completedOrders: Order[];         // All COMPLETE orders
  addNormalOrder: () => void;
  addVipOrder: () => void;
  addBot: () => void;
  removeBot: () => void;
}

// ---- Reducer Actions ----

export type KitchenAction =
  | { type: 'ADD_NORMAL_ORDER' }
  | { type: 'ADD_VIP_ORDER' }
  | { type: 'ADD_BOT' }
  | { type: 'REMOVE_BOT' }
  | { type: 'TICK'; now: number };
