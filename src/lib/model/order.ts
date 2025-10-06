import { OrderStatus, OrderType } from "./type";

export class Order {
  id: number;
  type: OrderType;
  createdAt: Date;
  status: OrderStatus;

  constructor(id: number, type: OrderType = OrderType.NORMAL) {
    this.id = id;
    this.type = type;
    this.createdAt = new Date();
    this.status = OrderStatus.PENDING;
  }
}
