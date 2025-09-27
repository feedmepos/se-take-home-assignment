export enum OrderType {
  NORMAL = 'NORMAL',
  VIP = 'VIP',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETE = 'COMPLETE',
}

export class Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
  createdAt: Date;
  completedAt?: Date;
  processingStartedAt?: Date;

  constructor(id: number, type: OrderType) {
    this.id = id;
    this.type = type;
    this.status = OrderStatus.PENDING;
    this.createdAt = new Date();
  }

  startProcessing(): void {
    this.status = OrderStatus.PROCESSING;
    this.processingStartedAt = new Date();
  }

  complete(): void {
    this.status = OrderStatus.COMPLETE;
    this.completedAt = new Date();
  }

  resetToPending(): void {
    this.status = OrderStatus.PENDING;
    this.processingStartedAt = undefined;
  }
}


