import { Module } from '@nestjs/common';
import { AppLifecycle } from './app-lifecycle';
import { BotModule } from './bot/bot.module';
import { LoggerModule } from './logger/logger.module';
import { OrderModule } from './order/order.module';

@Module({
  imports: [LoggerModule, OrderModule, BotModule],
  controllers: [],
  providers: [AppLifecycle],
})
export class AppModule {}
