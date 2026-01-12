export type BotStatus = 'IDLE' | 'PROCESSING';

export interface IBot {
  id: number;
  status: BotStatus;
  currentOrderId: number | null;
}

export class Bot implements IBot {
  id: number;
  status: BotStatus;
  currentOrderId: number | null;
  processingTimeout: NodeJS.Timeout | null;

  constructor(id: number) {
    this.id = id;
    this.status = 'IDLE';
    this.currentOrderId = null;
    this.processingTimeout = null;
  }

  toString(): string {
    return `Bot #${this.id}`;
  }

  toJSON(): IBot {
    return {
      id: this.id,
      status: this.status,
      currentOrderId: this.currentOrderId,
    };
  }
}

