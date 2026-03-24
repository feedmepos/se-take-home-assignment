import { OrderType } from '../enums/order-type.enum';

export interface Order {
  id: number;
  type: OrderType;
}
