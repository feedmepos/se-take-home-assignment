import { Injectable } from '@nestjs/common';
import { Order } from './entities/order.entity';

@Injectable()
export class OrderRepository {
  private orders: Order[] = [];
  private nextOrderId = 1;

  save(order: Order): Order {
    this.orders.push(order);
    return order;
  }

  findById(id: number): Order | undefined {
    return this.orders.find((o) => o.id === id);
  }

  findAll(): Order[] {
    return this.orders;
  }

  update(id: number, updates: Partial<Order>): Order | undefined {
    const order = this.findById(id);
    if (order) {
      Object.assign(order, updates);
    }
    return order;
  }

  getNextId(): number {
    return this.nextOrderId++;
  }

  count(): number {
    return this.orders.length;
  }
}
