import { Bot } from "../src/models/bot";
import { Order } from "../src/models/order";
import { OrderType, OrderStatus } from "../src/types";

describe("Bot", () => {
  // 使用 Jest 假計時器，避免真的等 10 秒
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // === 建立與 Idle 狀態 ===

  // 1. 建立時是 idle
  it("should be idle when created", () => {
    const bot = new Bot(1, jest.fn());

    expect(bot.id).toBe(1);
    expect(bot.isIdle).toBe(true);
  });

  // 2. 處理訂單時不是 idle
  it("should not be idle when processing order", () => {
    const bot = new Bot(1, jest.fn());
    const order = new Order(1001, OrderType.NORMAL);

    bot.process(order);

    expect(bot.isIdle).toBe(false);
  });

  // === 處理訂單流程 (10 秒計時器) ===

  // 3. 10 秒後完成訂單並觸發 callback
  it("should complete order after 10 seconds", () => {
    const onComplete = jest.fn();
    const bot = new Bot(1, onComplete);
    const order = new Order(1001, OrderType.VIP);

    bot.process(order);

    // 還沒到 10 秒
    expect(order.status).toBe(OrderStatus.PROCESSING);
    expect(onComplete).not.toHaveBeenCalled();

    // 快進 10 秒
    jest.advanceTimersByTime(10000);

    // 完成了
    expect(order.status).toBe(OrderStatus.COMPLETE);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(bot.isIdle).toBe(true);
  });

  // === Stop 功能 ===

  // 4. stop 返回正在處理的訂單
  it("should stop processing and return order", () => {
    const bot = new Bot(1, jest.fn());
    const order = new Order(1001, OrderType.NORMAL);

    bot.process(order);
    const stoppedOrder = bot.stop();

    expect(stoppedOrder).toBe(order);
    expect(bot.isIdle).toBe(true);
    expect(order.status).toBe(OrderStatus.PROCESSING); // 狀態未變（由 queue.requeue 處理）
  });

  // 5. idle 時 stop 返回 null
  it("should return null when stop called on idle bot", () => {
    const bot = new Bot(1, jest.fn());

    const stoppedOrder = bot.stop();

    expect(stoppedOrder).toBeNull();
  });

  // 6. stop 後計時器被取消，不會觸發 onComplete
  it("should not call onComplete after stop", () => {
    const onComplete = jest.fn();
    const bot = new Bot(1, onComplete);
    const order = new Order(1001, OrderType.NORMAL);

    bot.process(order);
    bot.stop();

    // 快進 10 秒，onComplete 不應該被調用
    jest.advanceTimersByTime(10000);

    expect(onComplete).not.toHaveBeenCalled();
  });
});
