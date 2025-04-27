import Bot from "@/models/bot";

export default class BotAllocationService {
  private bots: Map<number, Bot>;
  private nextId: number = 1;

  constructor(bots: Map<number, Bot>) {
    this.bots = bots;
  }

  public deploy() {
    const bot = new Bot(this.nextId++);
    this.bots.set(bot.id, bot);
    return bot;
  }

  public undeploy(id: number) {
    const bot = this.bots.get(id);
    if (!bot) return;
    bot.stop();
    this.bots.delete(bot.id);
  }

  public getIdleBots() {
    return this.getDeployedBots().filter((bot) => bot.isIdle());
  }

  public getDeployedBots() {
    return [...this.bots.values()];
  }
}
