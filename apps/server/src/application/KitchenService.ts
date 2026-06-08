import { Kitchen, RealClock, OrderType } from '@feedme/core';
import type { Clock, StateSnapshot, DomainEventListener, Order, Bot } from '@feedme/core';

/**
 * 应用层服务。把领域聚合根 Kitchen 与传输层(HTTP/WS)解耦,
 * 对外暴露稳定的命令与查询接口。注入 Clock 以便测试用 FakeClock 确定性验证。
 */
export class KitchenService {
  private readonly kitchen: Kitchen;

  constructor(clock: Clock = new RealClock()) {
    this.kitchen = new Kitchen(clock, 1001);
  }

  createOrder(type: OrderType): Order {
    return this.kitchen.createOrder(type);
  }

  addBot(processingTimeMs?: number): Bot {
    return this.kitchen.addBot(processingTimeMs);
  }

  removeBot(): Bot | null {
    return this.kitchen.removeBot();
  }

  getState(): StateSnapshot {
    return this.kitchen.snapshot();
  }

  onEvent(listener: DomainEventListener): () => void {
    return this.kitchen.on(listener);
  }
}
