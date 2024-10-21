import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { CustomerModule } from 'src/customer/customer.module';
import { GatewayModule } from 'src/gateway/gateway.module';

@Module({
  imports: [CustomerModule, GatewayModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService]
})
export class OrderModule {}
