import { Injectable } from '@nestjs/common';
import { Bot } from './entities/bot.entity';

@Injectable()
export class BotRepository {
  private bots: Bot[] = [];
  private nextBotId = 1;

  save(bot: Bot): Bot {
    this.bots.push(bot);
    return bot;
  }

  findById(id: number): Bot | undefined {
    return this.bots.find((b) => b.id === id);
  }

  findAll(): Bot[] {
    return this.bots;
  }

  remove(id: number): Bot | undefined {
    const index = this.bots.findIndex((b) => b.id === id);
    if (index !== -1) {
      return this.bots.splice(index, 1)[0];
    }
    return undefined;
  }

  removeLast(): Bot | undefined {
    return this.bots.pop();
  }

  getNextId(): number {
    return this.nextBotId++;
  }

  count(): number {
    return this.bots.length;
  }
}
