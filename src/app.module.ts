import { Module } from '@nestjs/common';
import { OrderModule } from './order/order.module';
import { SimulationModule } from './simulation/simulation.module';

@Module({
  imports: [OrderModule, SimulationModule],
})
export class AppModule {}

