import { OrderProcessingEngine } from '../../domain/service/OrderProcessingEngine';
import type { OrderType, OrderProps } from '../../domain/model/index';

export class OrderService {
  constructor(private engine: OrderProcessingEngine) {}

  createOrder(type: OrderType): OrderProps {
    const order = this.engine.createOrder(type);
    return order.toJSON();
  }

  getOrders(): OrderProps[] {
    return this.engine.getOrders().map((o) => o.toJSON());
  }
}
