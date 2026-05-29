import { EventEmitter } from 'node:events';
import type { Order } from './Order.js';
import { Timer } from '../utils/Timer.js';
import { eventBus } from '../utils/EventBus.js';

export type BotStatus = 'idle' | 'busy' | 'destroyed';

export class Bot extends EventEmitter {
  id: number;
  status: BotStatus = 'idle';
  currentOrder?: Order;
  processingStartedAt?: Date;
  private timer: Timer;
  private timeoutId?: ReturnType<Timer['setTimeout']>;

  private static nextBotId = 1;

  constructor(timer?: Timer) {
    super();
    this.id = Bot.nextBotId++;
    this.timer = timer || new Timer();
  }

  /**
   * 机器人开始处理订单
   */
  startProcessing(order: Order): void {
    if (this.status === 'destroyed') {
      this.emit('bot:error', {
        botId: this.id,
        error: new Error('Cannot process order: bot is destroyed'),
      });
      return;
    }

    if (this.status === 'busy') {
      this.emit('bot:error', {
        botId: this.id,
        error: new Error('Cannot process order: bot is already busy'),
        currentOrder: this.currentOrder,
      });
      return;
    }

    this.status = 'busy';
    this.currentOrder = order;
    this.processingStartedAt = new Date();

    // 发送事件
    this.emit('bot:started', {
      botId: this.id,
      order: order,
    });

    // 设置 10 秒后完成
    this.timeoutId = this.timer.setTimeout(() => {
      this.completeOrder();
    }, 10000);
  }

  /**
   * 内部方法：完成订单
   */
  private completeOrder(): void {
    if (this.status !== 'busy' || !this.currentOrder) {
      return;
    }

    const order = this.currentOrder;
    const startTime = this.processingStartedAt;
    const processingTime = startTime
      ? Math.floor((Date.now() - startTime.getTime()) / 1000)
      : 10;

    // 更新状态
    this.status = 'idle';
    this.currentOrder = undefined;
    this.processingStartedAt = undefined;
    this.timeoutId = undefined;

    // 发送完成事件
    this.emit('bot:completed', {
      botId: this.id,
      order: order,
      processingTime: processingTime,
    });

    // 发送空闲事件，尝试获取下一个订单
    this.emit('bot:idle', {
      botId: this.id,
    });
  }

  /**
   * 销毁机器人
   */
  destroy(): { success: boolean; message: string; interruptedOrder?: Order } {
    if (this.status === 'destroyed') {
      return {
        success: false,
        message: `Bot #${this.id} is already destroyed`,
      };
    }

    // 保存当前处理的订单（如果有）
    const interruptedOrder = this.currentOrder;

    // 清理定时器
    if (this.timeoutId) {
      this.timer.clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }

    // 更新状态
    this.status = 'destroyed';
    this.currentOrder = undefined;
    this.processingStartedAt = undefined;

    // 发送事件
    this.emit('bot:destroyed', {
      botId: this.id,
    });

    if (interruptedOrder) {
      return {
        success: true,
        message: `Bot #${this.id} destroyed while BUSY - Order #${interruptedOrder.id} returned to queue`,
        interruptedOrder,
      };
    }

    return {
      success: true,
      message: `Bot #${this.id} destroyed while IDLE`,
    };
  }

  /**
   * 获取剩余处理时间（秒）
   */
  getRemainingSeconds(): number {
    if (this.status !== 'busy' || !this.processingStartedAt) {
      return 0;
    }
    const elapsed = (Date.now() - this.processingStartedAt.getTime()) / 1000;
    return Math.max(0, 10 - Math.floor(elapsed));
  }
}
