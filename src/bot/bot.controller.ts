import { Controller, Delete, Get, Post } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotProcessorService } from './bot-processor.service';

@Controller('bot')
export class BotController {
  constructor(
    private readonly botService: BotService,
    private readonly botProcessorService: BotProcessorService,
  ) {}

  @Post()
  addBot() {
    const bot = this.botService.create();
    this.botProcessorService.subscribeBot(bot.id);
    return bot;
  }

  @Delete()
  removeBot() {
    let bot = this.botService.getAll().at(-1);
    if (!bot) {
      return { message: 'No bots to remove' };
    }

    this.botProcessorService.unsubscribeBot(bot.id);
    this.botProcessorService.stopProcessing(bot.id);
    bot = this.botService.remove(bot.id);

    return bot;
  }

  @Get()
  getBots() {
    return {
      bots: this.botService.getAll(),
      count: this.botService.getCount(),
    };
  }
}
