export enum BotStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
}

export class Bot {
  id: number;
  status: BotStatus;
  currentOrderId?: number;
  createdAt: Date;

  constructor(id: number) {
    this.id = id;
    this.status = BotStatus.IDLE;
    this.createdAt = new Date();
  }

  startProcessing(orderId: number): void {
    this.status = BotStatus.PROCESSING;
    this.currentOrderId = orderId;
  }

  stopProcessing(): void {
    this.status = BotStatus.IDLE;
    this.currentOrderId = undefined;
  }
}


