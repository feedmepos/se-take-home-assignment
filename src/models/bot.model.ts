export type BotStatus = 'IDLE' | 'PROCESSING';

export interface Bot {
  id: number;
  status: BotStatus;
  currentOrderId?: number;
  createdAt: Date;
}
