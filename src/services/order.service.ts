import { Injectable, Logger, Inject } from '@nestjs/common';
import { Order, OrderType, OrderStatus } from '../domain/orders/order.entity';
import { OrderRepository } from '../domain/orders/order.repository';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @Inject('OrderRepository') private readonly orderRepo: OrderRepository,
  ) {}

  createOrder(type: OrderType): Order {
    // Edge case: Validate order type
    if (!Object.values(OrderType).includes(type)) {
      throw new Error(`Invalid order type: ${type}`);
    }

    const order = new Order(this.orderRepo.nextId(), type);
    this.orderRepo.save(order);
    this.logger.log(`Created order #${order.id} of type ${type}`);
    return order;
  }

  getAllOrders(): Order[] {
    return this.orderRepo.findAll();
  }

  getPendingOrders(): Order[] {
    return this.orderRepo.getByStatus(OrderStatus.PENDING);
  }

  getCompletedOrders(): Order[] {
    return this.orderRepo.getByStatus(OrderStatus.COMPLETE);
  }

  getProcessingOrders(): Order[] {
    return this.orderRepo.getByStatus(OrderStatus.PROCESSING);
  }

  getNextOrderToProcess(): Order | null {
    return this.orderRepo.getNextPendingByPriority();
  }

  getOrderById(id: number): Order | undefined {
    return this.orderRepo.findById(id);
  }

  startProcessingOrder(orderId: number): boolean {
    // Edge case: Validate input
    if (!orderId || orderId <= 0) {
      this.logger.error(`Invalid order ID: ${orderId}`);
      return false;
    }

    const order = this.orderRepo.findById(orderId);
    if (!order) {
      this.logger.error(`Order #${orderId} not found`);
      return false;
    }

    // Edge case: Check for invalid state transitions
    if (order.status !== OrderStatus.PENDING) {
      this.logger.warn(`Cannot start processing order #${orderId} - current status: ${order.status}`);
      return false;
    }

    order.startProcessing();
    this.orderRepo.update(order);
    this.logger.log(`Started processing order #${orderId}`);
    return true;
  }

  completeOrder(orderId: number): boolean {
    // Edge case: Validate input
    if (!orderId || orderId <= 0) {
      this.logger.error(`Invalid order ID: ${orderId}`);
      return false;
    }

    const order = this.orderRepo.findById(orderId);
    if (!order) {
      this.logger.error(`Order #${orderId} not found`);
      return false;
    }

    // Edge case: Check for invalid state transitions
    if (order.status !== OrderStatus.PROCESSING) {
      this.logger.warn(`Cannot complete order #${orderId} - current status: ${order.status}`);
      return false;
    }

    order.complete();
    this.orderRepo.update(order);
    this.logger.log(`Completed order #${orderId}`);
    return true;
  }

  resetOrderToPending(orderId: number): boolean {
    // Edge case: Validate input
    if (!orderId || orderId <= 0) {
      this.logger.error(`Invalid order ID: ${orderId}`);
      return false;
    }

    const order = this.orderRepo.findById(orderId);
    if (!order) {
      this.logger.error(`Order #${orderId} not found`);
      return false;
    }

    // Edge case: Check for invalid state transitions
    if (order.status !== OrderStatus.PROCESSING) {
      this.logger.warn(`Cannot reset order #${orderId} to pending - current status: ${order.status}`);
      return false;
    }

    order.resetToPending();
    this.orderRepo.update(order);
    this.logger.log(`Reset order #${orderId} to pending`);
    return true;
  }

  getOrderStats(): { total: number; pending: number; processing: number; complete: number } {
    return this.orderRepo.getStats();
  }

  // Edge case: Cleanup completed orders to prevent memory issues
  private cleanupCompletedOrders(): void {
    const removed = this.orderRepo.cleanupCompleted();
    if (removed > 0) {
      this.logger.log(`Cleaned up ${removed} completed orders`);
    }
  }

  // Edge case: Validate system integrity
  validateSystemIntegrity(): { isValid: boolean; issues: string[] } {
    return this.orderRepo.validateIntegrity();
  }

  // Edge case: Emergency reset for stuck orders
  resetStuckOrders(): number {
    const count = this.orderRepo.resetStuck();
    if (count > 0) {
      this.logger.warn(`Reset ${count} stuck orders to pending`);
    }
    return count;
  }
}
