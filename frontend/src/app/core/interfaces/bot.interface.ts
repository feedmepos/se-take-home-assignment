import { BotStatus } from '../enums/bot-status.enum';
import { Order } from './order.interface';

export interface Bot {
  id: number;
  status: BotStatus;
  processingOrder: Order | null;
  timeLeft: number;
}
