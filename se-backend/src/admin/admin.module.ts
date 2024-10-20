import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { BotModule } from 'src/bot/bot.module';

@Module({
  imports: [BotModule],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
