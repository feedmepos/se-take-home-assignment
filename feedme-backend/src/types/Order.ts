export type OrderType = 'NORMAL' | 'VIP';
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE';

export interface IOrder {
  id: number;
  type: OrderType;
  status: OrderStatus;
  createdAt: Date;
}

export class Order implements IOrder {
  id: number;
  type: OrderType;
  status: OrderStatus;
  createdAt: Date;

  constructor(id: number, type: OrderType) {
    this.id = id;
    this.type = type;
    this.status = 'PENDING';
    this.createdAt = new Date();
  }

  toString(): string {
    return `${this.type} Order #${this.id}`;
  }

  toJSON(): IOrder {
    return {
      id: this.id,
      type: this.type,
      status: this.status,
      createdAt: this.createdAt,
    };
  }
}

