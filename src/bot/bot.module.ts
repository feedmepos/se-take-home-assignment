import { forwardRef, Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';
import { OrderModule } from '../order/order.module';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [LoggerModule, forwardRef(() => OrderModule),],
  providers: [BotService],
  controllers: [BotController],
  exports: [BotService],
})
export class BotModule {}
