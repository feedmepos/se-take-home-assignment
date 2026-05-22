import { Module } from '@nestjs/common';
import { OrderModule } from 'src/order/order.module';
import { QueueModule } from 'src/queue/queue.module';
import { BotProcessorService } from './bot-processor.service';
import { BotController } from './bot.controller';
import { BotRepository } from './bot.repository';
import { BotService } from './bot.service';

@Module({
  imports: [QueueModule, OrderModule],
  controllers: [BotController],
  providers: [BotService, BotProcessorService, BotRepository],
  exports: [BotService],
})
export class BotModule {}
