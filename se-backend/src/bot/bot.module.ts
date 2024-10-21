import { Module } from '@nestjs/common';
import { BotController } from './bot.controller';
import { BotService } from './bot.service';
import { OrderService } from 'src/order/order.service';
import { OrderModule } from 'src/order/order.module';
import { GatewayModule } from 'src/gateway/gateway.module';

@Module({
  imports: [OrderModule, GatewayModule],
  controllers: [BotController],
  providers: [BotService],
  exports: [BotService]
})
export class BotModule {}
