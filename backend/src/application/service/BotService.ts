import { OrderProcessingEngine } from '../../domain/service/OrderProcessingEngine';
import type { BotProps } from '../../domain/model/index';

export class BotService {
  constructor(private engine: OrderProcessingEngine) {}

  addBot(): BotProps {
    const bot = this.engine.addBot();
    return bot.toJSON();
  }

  removeBot(): void {
    this.engine.removeBot();
  }

  getBots(): BotProps[] {
    return this.engine.getBots().map((b) => b.toJSON());
  }
}
