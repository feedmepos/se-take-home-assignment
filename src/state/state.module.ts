import { Module } from '@nestjs/common';
import { StateController } from './state.controller';
import { OrderModule } from '../order/order.module';
import { BotModule } from '../bot/bot.module';

@Module({
  imports: [OrderModule, BotModule],
  controllers: [StateController],
})
export class StateModule {}
