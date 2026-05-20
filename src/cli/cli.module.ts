import { Module } from '@nestjs/common';
import { CliService } from './cli.service';
import { OrderModule } from '../order/order.module';
import { BotModule } from '../bot/bot.module';

@Module({
  imports: [OrderModule, BotModule],
  providers: [CliService],
})
export class CliModule {}
