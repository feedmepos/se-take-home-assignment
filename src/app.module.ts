import { Module } from '@nestjs/common';
import { OrderModule } from './order/order.module';
import { BotModule } from './bot/bot.module';
import { CliModule } from './cli/cli.module';
import { OrderController } from './order/order.controller';
import { BotController } from './bot/bot.controller';

@Module({
  imports: [OrderModule, BotModule, CliModule],
  controllers: [OrderController, BotController],
})
export class AppModule {}
