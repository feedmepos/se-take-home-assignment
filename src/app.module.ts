import { Module } from '@nestjs/common';
import { OrderModule } from './order/order.module';
import { BotModule } from './bot/bot.module';
import { LoggerModule } from './logger/logger.module';
import { SimulationModule } from './simulation/simulation.module';
import { StateModule } from './state/state.module';

@Module({
  imports: [
    LoggerModule,
    OrderModule,
    BotModule,
    SimulationModule,
    StateModule,
  ],
})
export class AppModule {}
