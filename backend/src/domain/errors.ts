export class BotNotFoundError extends Error {
  constructor(public readonly botId?: number) {
    super(botId === undefined ? 'No bot to remove' : `Bot ${botId} not found`);
    this.name = 'BotNotFoundError';
  }
}
