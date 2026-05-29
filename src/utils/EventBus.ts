import { EventEmitter } from 'node:events';

class EventBusSingleton extends EventEmitter {
  private static instance: EventBusSingleton;

  private constructor() {
    super();
    // 设置最大监听器数，避免警告
    this.setMaxListeners(100);
  }

  public static getInstance(): EventBusSingleton {
    if (!EventBusSingleton.instance) {
      EventBusSingleton.instance = new EventBusSingleton();
    }
    return EventBusSingleton.instance;
  }
}

// 导出单例实例
export const eventBus = EventBusSingleton.getInstance();

// 导出类型
export type { EventEmitter };
