import { BotStatus } from '../types';
import type { Order } from './Order';

/**
 * 机器人实体。只负责自身状态(IDLE/PROCESSING)、当前订单引用与本次开工时刻,
 * 不持有计时器、不操作队列 —— 调度与计时由 Kitchen 用 Clock 统一管理,
 * 保持 Bot 为纯粹、易测的状态对象。
 */
export class Bot {
  private _status: BotStatus = BotStatus.IDLE;
  private _currentOrder: Order | null = null;
  // 各 bot 处理时长可不同(如 5s / 10s),由构造注入。
  private readonly _processingTime: number;
  // 当前任务的开工时刻;空闲时为 null。用于推算「还差几秒完成」。
  private _startedAt: number | null = null;

  constructor(
    readonly id: number,
    processingTime: number,
  ) {
    this._processingTime = processingTime;
  }

  get status(): BotStatus {
    return this._status;
  }

  get currentOrder(): Order | null {
    return this._currentOrder;
  }

  get processingTime(): number {
    return this._processingTime;
  }

  get startedAt(): number | null {
    return this._startedAt;
  }

  /** 当前任务的预计完成时刻(开工时刻 + 处理时长);空闲时为 null。 */
  get expectedFinishAt(): number | null {
    return this._startedAt === null ? null : this._startedAt + this._processingTime;
  }

  assign(order: Order, now: number): void {
    this._currentOrder = order;
    this._status = BotStatus.PROCESSING;
    this._startedAt = now;
  }

  finish(): void {
    this._currentOrder = null;
    this._status = BotStatus.IDLE;
    this._startedAt = null;
  }

  abort(): Order | null {
    const order = this._currentOrder;
    this._currentOrder = null;
    this._status = BotStatus.IDLE;
    this._startedAt = null;
    return order;
  }
}
