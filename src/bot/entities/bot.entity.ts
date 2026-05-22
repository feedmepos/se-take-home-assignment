import { BotStatus } from '../enums/bot-status.enum';

export class Bot {
  id: number;
  status: BotStatus;
  callback?: () => boolean;
  currentOrderId?: number;
}
