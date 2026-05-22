import { Bot, BotStatus } from './bot.entity';

export interface BotRepository {
  nextId(): number;
  save(bot: Bot): void;
  removeLatest(): Bot | undefined;
  findAll(): Bot[];
  findById(id: number): Bot | undefined;
  update(bot: Bot): void;
  getByStatus(status: BotStatus): Bot[];
}


