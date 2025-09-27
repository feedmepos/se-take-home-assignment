import { Bot, BotStatus } from '../../domain/bots/bot.entity';
import { BotRepository } from '../../domain/bots/bot.repository';

export class InMemoryBotRepository implements BotRepository {
  private bots: Bot[] = [];
  private nextBotId = 1;

  nextId(): number {
    if (this.nextBotId > Number.MAX_SAFE_INTEGER - 1000) {
      this.nextBotId = 1;
    }
    return this.nextBotId++;
  }

  save(bot: Bot): void {
    this.bots.push(bot);
  }

  removeLatest(): Bot | undefined {
    return this.bots.pop();
  }

  update(bot: Bot): void {
    const idx = this.bots.findIndex(b => b.id === bot.id);
    if (idx >= 0) this.bots[idx] = bot;
  }

  findAll(): Bot[] {
    return [...this.bots];
  }

  findById(id: number): Bot | undefined {
    return this.bots.find(b => b.id === id);
  }

  getByStatus(status: BotStatus): Bot[] {
    return this.bots.filter(b => b.status === status);
  }
}


