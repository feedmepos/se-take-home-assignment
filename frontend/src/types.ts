export type OrderStatus = 'waiting' | 'processing' | 'completed';

export interface Order {
  id: number;
  isVip: boolean;
  status: OrderStatus;
}

export interface Robot {
  id: number;
  status: 'idle' | 'processing';
  currentOrderId: number | null;
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  waiting: '等待中',
  processing: '处理中',
  completed: '已完成',
};

export const PROCESSING_TIME_MS = 10000;
