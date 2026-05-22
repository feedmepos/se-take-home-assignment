import { Injectable } from '@nestjs/common';
import { LoggerService } from 'src/logger/logger.service';
import { BotRepository } from './bot.repository';
import { Bot } from './entities/bot.entity';
import { BotStatus } from './enums/bot-status.enum';

@Injectable()
export class BotService {
  constructor(
    private readonly botRepository: BotRepository,
    private readonly logger: LoggerService,
  ) {}

  create(): Bot {
    const bot: Bot = {
      id: this.botRepository.getNextId(),
      status: BotStatus.IDLE,
    };

    this.botRepository.save(bot);

    this.logger.logWithTimestamp(
      `Bot #${bot.id} created - Status: ${bot.status}`,
    );

    return bot;
  }

  remove(botId: number): Bot | undefined {
    const bot = this.botRepository.remove(botId);

    if (bot) {
      this.logger.logWithTimestamp(
        `Bot #${bot.id} destroyed while ${bot.status}`,
      );
    }

    return bot;
  }

  removeLast(): Bot | undefined {
    const bot = this.botRepository.removeLast();

    if (bot) {
      this.logger.logWithTimestamp(
        `Bot #${bot.id} destroyed while ${bot.status}`,
      );
    }

    return bot;
  }

  getAll(): Bot[] {
    return this.botRepository.findAll();
  }

  getById(id: number): Bot | undefined {
    return this.botRepository.findById(id);
  }

  getCount(): number {
    return this.botRepository.count();
  }

  onOrderReceived(botId: number, orderId: number): Bot | undefined {
    const bot = this.botRepository.findById(botId);
    if (!bot) return undefined;

    bot.status = BotStatus.PROCESSING;
    bot.currentOrderId = orderId;
    return bot;
  }

  onOrderCompleted(botId: number): Bot | undefined {
    const bot = this.botRepository.findById(botId);
    if (!bot) return undefined;

    bot.status = BotStatus.IDLE;
    bot.currentOrderId = undefined;
    return bot;
  }

  onOrderCancelled(botId: number): Bot | undefined {
    const bot = this.botRepository.findById(botId);
    if (!bot) return undefined;

    bot.status = BotStatus.IDLE;
    bot.currentOrderId = undefined;
    return bot;
  }

  onQueueSubscribed(botId: number, callback: () => boolean): Bot | undefined {
    const bot = this.botRepository.findById(botId);
    if (!bot) return undefined;

    bot.callback = callback;
    return bot;
  }

  onQueueUnsubscribed(botId: number): Bot | undefined {
    const bot = this.botRepository.findById(botId);
    if (!bot) return undefined;

    bot.callback = undefined;
    return bot;
  }

  isIdle(botId: number): boolean | undefined {
    const bot = this.botRepository.findById(botId);
    if (!bot) return undefined;

    return bot.status === BotStatus.IDLE;
  }
}
