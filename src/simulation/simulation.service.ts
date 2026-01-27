import { Injectable } from '@nestjs/common';
import { OrderService } from '../order/order.service';
import { BotService } from '../bot/bot.service';
import { LoggerService } from '../logger/logger.service';
import { OrderType } from '../order/order.types';

/**
 * SimulationService drives a deterministic CLI scenario that validates:
 * - VIP priority over NORMAL
 * - FIFO ordering by createdAt
 * - Bot removal during processing (Requirement #6)
 * - Correct re-queuing of interrupted orders
 */
@Injectable()
export class SimulationService {
  constructor(
    private readonly orders: OrderService,
    private readonly bots: BotService,
    private readonly logger: LoggerService,
  ) { }

  async run(): Promise<void> {
    this.logger.log("McDonald's Order Management System - Simulation Results");

    // Initial state
    this.logger.log('[System initialized with 0 bots]');

    // Create orders (NORMAL first, VIP later)
    this.orders.createOrder(OrderType.NORMAL);
    await this.delay(1000);

    this.orders.createOrder(OrderType.VIP);
    await this.delay(1000);

    this.orders.createOrder(OrderType.NORMAL);

    // Add bots
    await this.delay(1000);
    this.bots.addBot(); // Bot #1
    await this.delay(1000);
    this.bots.addBot(); // Bot #2

    // Trigger processing
    this.bots.onNewOrder();

    // Create another VIP while bots are working
    await this.delay(2000);
    this.orders.createOrder(OrderType.VIP);
    this.bots.onNewOrder();

    // Remove a bot (Requirement #6)
    await this.delay(2000);
    this.bots.removeBot();

    // Let system continue
    while (this.bots.hasActiveWork()) {
      await this.delay(1000);
    }

    // Final state summary
    this.printFinalStatus();
  }

  private printFinalStatus(): void {
    const summary = this.bots.getSummary(); // or from OrderService if you have it

    this.logger.log('Final Status:');
    this.logger.log(
      `- Total Orders Processed: ${summary.total} (${summary.vip} VIP, ${summary.normal} NORMAL)`,
    );
    this.logger.log(`- Orders Completed: ${summary.completed}`);
    this.logger.log(`- Active Bots: ${summary.activeBots}`);
    this.logger.log(`- Pending Orders: ${summary.pending}`);
  }


  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
