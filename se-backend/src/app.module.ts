import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CustomerModule } from './customer/customer.module';
import { OrderModule } from './order/order.module';
import { BotModule } from './bot/bot.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [CustomerModule, OrderModule, BotModule, AdminModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
