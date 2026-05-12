// Order types and statuses
export enum OrderType {
  NORMAL = 'NORMAL',
  VIP = 'VIP'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETE = 'COMPLETE'
}

// Order interface
export interface Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
  createdAt: Date;
  processingStartedAt?: Date;
  completedAt?: Date;
  processedByBotId?: number;
}

// Bot status
export enum BotStatus {
  IDLE = 'IDLE',
  ACTIVE = 'ACTIVE'
}

// Bot interface
export interface Bot {
  id: number;
  status: BotStatus;
  currentOrder: Order | null;
  processingTimer: NodeJS.Timeout | null;
}

// Logger interface for dependency injection
export interface Logger {
  log(message: string): void;
}
