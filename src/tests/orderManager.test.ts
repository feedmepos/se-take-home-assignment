import { describe, expect, test } from "@jest/globals";
import { OrderManager } from "../order/orderManager";

jest.setTimeout(60000);

test("Add / Remove Order & Bots in OrderManager", async () => {
  // Add 3 orders
  const orderManager = new OrderManager();
  orderManager.addOrder();
  orderManager.addVipOrder();
  orderManager.addBot(); // Bot working on VIP order
  orderManager.addVipOrder();
  orderManager.addBot(); // Bot working on VIP order
  orderManager.addBot(); // Bot working on Normal order

  // Check statistics are correctly updated
  expect(orderManager.completedOrders).toBe(0);
  expect(orderManager.pendingOrders).toBe(3);
  expect(orderManager.normalOrders).toBe(1);
  expect(orderManager.vipOrders).toBe(2);
  expect(orderManager.botManager.activeCount()).toBe(3);

  await new Promise((resolve) => setTimeout(resolve, 5000));
  orderManager.removeBot();
  expect(orderManager.botManager.activeCount()).toBe(2);

  await new Promise((resolve) => setTimeout(resolve, 20000));
  expect(orderManager.completedOrders).toBe(3);
  expect(orderManager.pendingOrders).toBe(0);
});
