import { Order } from "../src/models/order";
import { OrderQueue } from "../src/services/order-queue";
import { OrderType, OrderStatus } from "../src/types";

describe("Order", () => {
  // 1. 建立訂單 - 基本屬性測試
  it("should create order with correct type and status", () => {
    const order = new Order(1, OrderType.NORMAL);
    expect(order.id).toBe(1);
    expect(order.type).toBe(OrderType.NORMAL);
    expect(order.status).toBe(OrderStatus.PENDING);
  });

  // 2. 優先權 - VIP 優先於 NORMAL
  it("should have correct priority (VIP < NORMAL)", () => {
    const vipOrder = new Order(1, OrderType.VIP);
    const normalOrder = new Order(2, OrderType.NORMAL);
    expect(vipOrder.priority).toBeLessThan(normalOrder.priority);
  });

  // 3. 狀態轉換 - 完整生命週期
  it("should transition status: PENDING -> PROCESSING -> COMPLETE", () => {
    const order = new Order(1, OrderType.VIP);
    expect(order.status).toBe(OrderStatus.PENDING);

    order.process();
    expect(order.status).toBe(OrderStatus.PROCESSING);

    order.complete();
    expect(order.status).toBe(OrderStatus.COMPLETE);
  });

  // 4. 重置狀態 - Bot 被移除時使用
  it("should reset status back to PENDING", () => {
    const order = new Order(1, OrderType.NORMAL);
    order.process();
    expect(order.status).toBe(OrderStatus.PROCESSING);

    order.reset();
    expect(order.status).toBe(OrderStatus.PENDING);
  });
});

describe("OrderQueue", () => {
  // === 基本操作 ===

  // 1. 空 queue 處理
  it("should return null when queue is empty", () => {
    const queue = new OrderQueue();
    expect(queue.next()).toBeNull();
  });

  // 2. 基本 FIFO - 同類型先進先出
  it("should return orders in FIFO order for same type", () => {
    const queue = new OrderQueue();
    const order1 = new Order(1, OrderType.NORMAL);
    const order2 = new Order(2, OrderType.NORMAL);

    queue.add(order1);
    queue.add(order2);

    expect(queue.next()).toBe(order1);
    expect(queue.next()).toBe(order2);
  });

  // === 優先權處理 ===

  // 3. VIP 優先於 NORMAL
  it("should prioritize VIP orders over NORMAL orders", () => {
    const queue = new OrderQueue();
    const normalOrder = new Order(1, OrderType.NORMAL);
    const vipOrder = new Order(2, OrderType.VIP);

    queue.add(normalOrder);
    queue.add(vipOrder); // VIP 後加入但應該先處理

    expect(queue.next()).toBe(vipOrder);
    expect(queue.next()).toBe(normalOrder);
  });

  // 4. 同優先權內維持 FIFO
  it("should maintain FIFO within same priority", () => {
    const queue = new OrderQueue();
    const vip1 = new Order(1, OrderType.VIP);
    const vip2 = new Order(2, OrderType.VIP);
    const normal1 = new Order(3, OrderType.NORMAL);

    queue.add(normal1);
    queue.add(vip1);
    queue.add(vip2);

    // 預期順序: vip1 -> vip2 -> normal1
    expect(queue.next()).toBe(vip1);
    expect(queue.next()).toBe(vip2);
    expect(queue.next()).toBe(normal1);
  });

  // === 狀態追蹤 ===

  // 5. pendingCount 正確追蹤
  it("should track pending count correctly", () => {
    const queue = new OrderQueue();
    expect(queue.pendingCount).toBe(0);

    queue.add(new Order(1, OrderType.NORMAL));
    expect(queue.pendingCount).toBe(1);

    queue.add(new Order(2, OrderType.VIP));
    expect(queue.pendingCount).toBe(2);

    queue.next();
    expect(queue.pendingCount).toBe(1);
  });

  // === Requeue 功能 (Bot 被移除時) ===

  // 6. requeue 應重置狀態為 PENDING
  it("should requeue order and reset status to PENDING", () => {
    const queue = new OrderQueue();
    const order = new Order(1, OrderType.NORMAL);

    order.process(); // 模擬 Bot 正在處理
    expect(order.status).toBe(OrderStatus.PROCESSING);

    queue.requeue(order); // Bot 被移除，訂單回到 queue

    expect(order.status).toBe(OrderStatus.PENDING);
    expect(queue.pendingCount).toBe(1);
    expect(queue.next()).toBe(order);
  });
});
