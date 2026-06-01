import { BotStatus } from '../types';
import type { Order } from './Order';

/**
 * 机器人实体。只负责自身状态(IDLE/PROCESSING)与当前订单引用,
 * 不持有计时器、不操作队列 —— 调度与计时由 Kitchen 用 Clock 统一管理,
 * 保持 Bot 为纯粹、易测的状态对象。
 */
export class Bot {
  private _status: BotStatus = BotStatus.IDLE;
  private _currentOrder: Order | null = null;

  constructor(readonly id: number) {}

  get status(): BotStatus {
    return this._status;
  }

  get currentOrder(): Order | null {
    return this._currentOrder;
  }

  assign(order: Order): void {
    this._currentOrder = order;
    this._status = BotStatus.PROCESSING;
  }

  finish(): void {
    this._currentOrder = null;
    this._status = BotStatus.IDLE;
  }

  abort(): Order | null {
    const order = this._currentOrder;
    this._currentOrder = null;
    this._status = BotStatus.IDLE;
    return order;
  }
}
