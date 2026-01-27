import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { BotService } from '../bot/bot.service';
import { LoggerService } from '../logger/logger.service';

@Module({
  providers: [OrderService, BotService, LoggerService],
  exports: [OrderService, BotService, LoggerService],
})
export class OrderModule {}

