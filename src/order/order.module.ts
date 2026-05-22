import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { QueueModule } from 'src/queue/queue.module';
import { OrderRepository } from './order.repository';

@Module({
  imports: [QueueModule],
  controllers: [OrderController],
  providers: [OrderService, OrderRepository],
  exports: [OrderService],
})
export class OrderModule {}
