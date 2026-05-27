import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrderController } from './domain/order-controller';
import { SystemClock, RealScheduler } from './domain/time';
import { OrdersController } from './api/orders.controller';
import { BotsController } from './api/bots.controller';
import { StatusController } from './api/status.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [OrdersController, BotsController, StatusController],
  providers: [
    {
      provide: OrderController,
      useFactory: () => new OrderController(new SystemClock(), new RealScheduler()),
    },
  ],
})
export class AppModule {}
