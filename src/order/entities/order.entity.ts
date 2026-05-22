import { OrderStatus } from '../enums/order-status.enum';
import { OrderType } from '../enums/order-type.enum';

export class Order {
  id: number;
  type: OrderType;
  status: OrderStatus;
  createdAt: Date;
  completedAt?: Date;
  botId?: number;
}
