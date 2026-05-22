import { Injectable } from '@nestjs/common';
import { LoggerService } from 'src/logger/logger.service';
import { QueueService } from 'src/queue/queue.service';
import { Order } from './entities/order.entity';
import { OrderStatus } from './enums/order-status.enum';
import { OrderType } from './enums/order-type.enum';
import { OrderRepository } from './order.repository';

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly queueService: QueueService,
    private readonly logger: LoggerService,
  ) {}

  create(type: OrderType): Order {
    const order: Order = {
      id: this.orderRepository.getNextId(),
      type,
      status: OrderStatus.PENDING,
      createdAt: new Date(),
    };

    this.orderRepository.save(order);
    this.logger.logWithTimestamp(
      `Created ${order.type} Order #${order.id} - Status: ${order.status}`,
    );
    this.queueService.enqueue(order);

    return order;
  }

  getAll(): Order[] {
    return this.orderRepository.findAll();
  }

  getById(id: number): Order | undefined {
    return this.orderRepository.findById(id);
  }

  getCount(): number {
    return this.orderRepository.count();
  }

  getPendingCount(): number {
    return this.orderRepository
      .findAll()
      .filter((o) => o.status === OrderStatus.PENDING).length;
  }

  getCompletedCount(): number {
    return this.orderRepository
      .findAll()
      .filter((o) => o.status === OrderStatus.COMPLETE).length;
  }

  getNormalCompletedCount(): number {
    return this.orderRepository
      .findAll()
      .filter(
        (o) => o.type === OrderType.NORMAL && o.status === OrderStatus.COMPLETE,
      ).length;
  }

  getVipCompletedCount(): number {
    return this.orderRepository
      .findAll()
      .filter(
        (o) => o.type === OrderType.VIP && o.status === OrderStatus.COMPLETE,
      ).length;
  }

  startProcessing(orderId: number, botId: number): Order | undefined {
    const updates: Partial<Order> = { status: OrderStatus.PROCESSING, botId };
    const order = this.orderRepository.update(orderId, updates);
    return order;
  }

  completeOrder(orderId: number): Order | undefined {
    const updates: Partial<Order> = {
      status: OrderStatus.COMPLETE,
      completedAt: new Date(),
    };
    const order = this.orderRepository.update(orderId, updates);
    return order;
  }

  returnToPending(orderId: number): Order | undefined {
    const updates: Partial<Order> = {
      status: OrderStatus.PENDING,
      botId: undefined,
    };
    const order = this.orderRepository.update(orderId, updates);
    return order;
  }
}
