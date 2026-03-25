import { Bot, BotStatus, Order } from "./types";

export class CookingBotService implements Bot {
  private static readonly PROCESSING_TIME_MS = 10000; // 10 seconds

  public readonly id: number;
  public status: BotStatus = 'IDLE';
  public currentOrder: Order | null = null;

  private resolveProcess?: (value: void) => void;
  private timer?: NodeJS.Timeout;

  constructor(id: number) {
    this.id = id;
  }

  async processOrder(order: Order): Promise<void> {
    this.status = 'PROCESSING';
    this.currentOrder = order;

    await new Promise<void>((resolve) => {
      this.resolveProcess = resolve;
      this.timer = setTimeout(() => {
        resolve();
      }, CookingBotService.PROCESSING_TIME_MS);
    });
  }

  // This method will always be called during mid-processing order
  stopProcessing(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    // Manually resolve the promise to unblock the async processOrder function
    if (this.resolveProcess) {
      this.resolveProcess();
    }
    this.status = 'IDLE';
    this.currentOrder = null;
  }

  completeProcessing(): void {
    this.status = 'IDLE';
    this.currentOrder = null;
  }
}
