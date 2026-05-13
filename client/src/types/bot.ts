export type BotStatus = 'IDLE' | 'PROCESSING';

export interface Bot {
  id: number;
  status: BotStatus;
  currentOrderId?: number;
  processingStartTime?: string;
}

export interface CreateBotResponse {
  bot: Bot;
}

export interface RemoveBotResponse {
  bot: Bot | null;
}
