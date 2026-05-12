import { Bot as BotInterface, BotStatus, Order } from './types';

// Processing time in milliseconds (10 seconds)
const PROCESSING_TIME_MS = 10000;

// Callback types
export type OnOrderCompleteCallback = (botId: number, order: Order) => void;
export type OnBotIdleCallback = (botId: number) => void;

/**
 * Bot class that processes orders
 */
export class Bot {
  private bot: BotInterface;
  private onOrderComplete: OnOrderCompleteCallback | null = null;
  private onBotIdle: OnBotIdleCallback | null = null;

  constructor(id: number) {
    this.bot = {
      id,
      status: BotStatus.IDLE,
      currentOrder: null,
      processingTimer: null
    };
  }

  get id(): number {
    return this.bot.id;
  }

  get status(): BotStatus {
    return this.bot.status;
  }

  get currentOrder(): Order | null {
    return this.bot.currentOrder;
  }

  get isIdle(): boolean {
    return this.bot.status === BotStatus.IDLE && this.bot.currentOrder === null;
  }

  get isProcessing(): boolean {
    return this.bot.status === BotStatus.ACTIVE && this.bot.currentOrder !== null;
  }

  /**
   * Set callback for when order completes
   */
  setOnOrderComplete(callback: OnOrderCompleteCallback): void {
    this.onOrderComplete = callback;
  }

  /**
   * Set callback for when bot becomes idle
   */
  setOnBotIdle(callback: OnBotIdleCallback): void {
    this.onBotIdle = callback;
  }

  /**
   * Start processing an order
   */
  startProcessing(order: Order): void {
    if (this.bot.currentOrder !== null) {
      throw new Error(`Bot ${this.bot.id} is already processing an order`);
    }

    this.bot.currentOrder = order;
    this.bot.status = BotStatus.ACTIVE;
    order.processingStartedAt = new Date();
    order.processedByBotId = this.bot.id;

    // Set timer for order completion
    this.bot.processingTimer = setTimeout(() => {
      this.completeOrder();
    }, PROCESSING_TIME_MS);
  }

  /**
   * Complete the current order
   */
  private completeOrder(): void {
    if (this.bot.currentOrder === null) return;

    const completedOrder = this.bot.currentOrder;
    completedOrder.completedAt = new Date();

    this.bot.currentOrder = null;
    this.bot.processingTimer = null;
    this.bot.status = BotStatus.IDLE;

    // Notify callback
    if (this.onOrderComplete) {
      this.onOrderComplete(this.bot.id, completedOrder);
    }

    // Notify that bot is now idle and ready for next order
    if (this.onBotIdle) {
      this.onBotIdle(this.bot.id);
    }
  }

  /**
   * Stop processing and return the current order
   * Called when bot is being destroyed
   */
  stopProcessing(): Order | null {
    if (this.bot.processingTimer) {
      clearTimeout(this.bot.processingTimer);
      this.bot.processingTimer = null;
    }

    const order = this.bot.currentOrder;
    this.bot.currentOrder = null;
    this.bot.status = BotStatus.IDLE;

    return order;
  }

  /**
   * Destroy the bot (cleanup)
   */
  destroy(): void {
    this.stopProcessing();
  }
}
