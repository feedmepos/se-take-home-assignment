import { Module } from '@nestjs/common';
import { SimulationService } from './simulation.service';
import { OrderModule } from '../order/order.module';
import { BotModule } from '../bot/bot.module';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [OrderModule, BotModule, LoggerModule],
  providers: [SimulationService],
  exports: [SimulationService],
})
export class SimulationModule {}
