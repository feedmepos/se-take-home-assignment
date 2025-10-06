import { BotManager } from "../order/botManager";
import { OrderType } from "../lib/model";
import { Order } from "../lib/model/order";
import { OrderQueue } from "../lib/queue/orderQueue";
import { describe, expect, test } from "@jest/globals";

jest.setTimeout(60000);

test("Add / Remove Bots in BotManager", async () => {
  // Add 3 orders
  const q = new OrderQueue();
  const o1 = new Order(1, OrderType.NORMAL);
  const o2 = new Order(2, OrderType.NORMAL);
  const o3 = new Order(3, OrderType.VIP);
  q.enqueue(o1);
  q.enqueue(o2);
  q.enqueue(o3);

  // Add 3 bots
  const completed: Order[] = [];
  const bm = new BotManager(q, (order, id) => {
    completed.push(order);
  });
  bm.addBot();
  bm.addBot();
  bm.addBot();
  expect(bm.activeCount()).toBe(3);

  // Remove bot while halfway done processing order
  await new Promise((resolve) => setTimeout(resolve, 5000));
  bm.removeBot();
  expect(bm.activeCount()).toBe(2);
  expect(completed.length).toBe(0);

  // Wait for all orders to be processed
  await new Promise((resolve) => setTimeout(resolve, 20000));
  // Make sure all orders are present
  expect(bm.activeCount()).toBe(2);
  expect(completed.length).toBe(3);
  expect(completed).toContain(o1);
  expect(completed).toContain(o2);
  expect(completed).toContain(o3);
});