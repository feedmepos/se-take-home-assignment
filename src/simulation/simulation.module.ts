import { Module } from '@nestjs/common';
import { OrderModule } from '../order/order.module';
import { SimulationService } from './simulation.service';

@Module({
  imports: [OrderModule],
  providers: [SimulationService],
  exports: [SimulationService],
})
export class SimulationModule {}

