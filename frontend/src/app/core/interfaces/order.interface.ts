import { OrderType } from '../enums/order-type.enum';
import { OrderStatus } from '../enums/order-status.enum';

export interface Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
  createdAt: Date;
  completedAt?: Date;
}
