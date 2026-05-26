export interface Order {
  id: number;
  type: 'VIP' | 'NORMAL';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETE';
  createdAt: number;
  completedAt?: number;
}

export interface Bot {
  id: number;
  name: string;
  status: 'IDLE' | 'PROCESSING';
  currentOrderId?: number;
}

export interface OrderEvent {
  event: 'order:completed' | 'bot:status_changed';
  payload: Order | BotStatusPayload;
}

export interface BotStatusPayload {
  botId: number;
  status: 'IDLE' | 'PROCESSING';
  currentOrderId?: number;
}
