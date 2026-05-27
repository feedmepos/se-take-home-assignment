import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { OrderController } from './domain/order-controller';
import { SystemClock, RealScheduler } from './domain/time';
import { OrdersController } from './api/orders.controller';
import { BotsController } from './api/bots.controller';
import { StatusController } from './api/status.controller';
import { EventsController } from './api/events.controller';
import { EventsService } from './api/events.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'frontend-dist'),
      exclude: ['/api/{*splat}'],
    }),
  ],
  controllers: [OrdersController, BotsController, StatusController, EventsController],
  providers: [
    {
      provide: OrderController,
      useFactory: () => new OrderController(new SystemClock(), new RealScheduler()),
    },
    EventsService,
  ],
})
export class AppModule {}
