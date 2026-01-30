import { forwardRef, Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { LoggerModule } from '../logger/logger.module';
import { BotModule } from '../bot/bot.module';

@Module({
  imports: [
    LoggerModule, forwardRef(() => BotModule),
  ],
  providers: [OrderService],
  controllers: [OrderController],
  exports: [OrderService],
})
export class OrderModule { }
