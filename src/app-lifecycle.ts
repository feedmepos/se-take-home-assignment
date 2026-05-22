import {
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { BotService } from './bot/bot.service';
import { OrderService } from './order/order.service';
import { LoggerService } from './logger/logger.service';

@Injectable()
export class AppLifecycle
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  constructor(
    private readonly botService: BotService,
    private readonly orderService: OrderService,
    private readonly logger: LoggerService,
  ) {}

  onApplicationBootstrap() {
    const botCount = this.botService.getCount();
    this.logger.log("McDonald's Order Management System - Simulation Results");
    this.logger.logNewLine();
    this.logger.logWithTimestamp(`System initialized with ${botCount} bots`);
  }

  onApplicationShutdown() {
    const completedCount = this.orderService.getCompletedCount();
    const completedNormalCount = this.orderService.getNormalCompletedCount();
    const completedVipCount = this.orderService.getVipCompletedCount();
    const botCount = this.botService.getCount();
    const pendingCount = this.orderService.getPendingCount();

    this.logger.logNewLine();
    this.logger.log('Final Status:');
    this.logger.log(
      `- Total Orders Processed: ${completedCount} (${completedVipCount} VIP, ${completedNormalCount} Normal)`,
    );
    this.logger.log(`- Orders Completed: ${completedCount}`);
    this.logger.log(`- Bots available: ${botCount}`);
    this.logger.log(`- Pending Orders: ${pendingCount}`);
  }
}
