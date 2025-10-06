import { OrderType } from "../lib/model";
import { Order } from "../lib/model/order";
import { OrderQueue } from "../lib/queue/orderQueue";
import { describe, expect, test } from "@jest/globals";

test("OrderQueue enqueues VIP before NORMAL and preserves FIFO", () => {
  const q = new OrderQueue();
  const o1 = new Order(1, OrderType.NORMAL);
  const o2 = new Order(2, OrderType.NORMAL);
  const o3 = new Order(3, OrderType.VIP);
  q.enqueue(o1);
  q.enqueue(o2);
  q.enqueue(o3);
  const all = q.peek();
  expect(all[0].id).toBe(3);
  expect(all[1].id).toBe(1);
  expect(all[2].id).toBe(2);
});

test("enqueueFront places normal order at front of its own queue", () => {
  const q = new OrderQueue();
  const o1 = new Order(1, OrderType.NORMAL);
  const o2 = new Order(2, OrderType.VIP);
  q.enqueue(o1);
  q.enqueue(o2);
  const o3 = new Order(3, OrderType.NORMAL);
  q.enqueueFront(o3);

  const d1 = q.dequeue();
  const d2 = q.dequeue();
  const d3 = q.dequeue();
  expect(d1!.id).toBe(2); // VIP still first
  expect(d2!.id).toBe(3);
  expect(d3!.id).toBe(1);
});

test("enqueueFront places VIP order at front of its own queue", () => {
  const q = new OrderQueue();
  const o1 = new Order(1, OrderType.NORMAL);
  const o2 = new Order(2, OrderType.VIP);
  q.enqueue(o1);
  q.enqueue(o2);
  const o3 = new Order(3, OrderType.VIP);
  q.enqueueFront(o3);

  const d1 = q.dequeue();
  const d2 = q.dequeue();
  const d3 = q.dequeue();
  expect(d1!.id).toBe(3); // VIP still first
  expect(d2!.id).toBe(2);
  expect(d3!.id).toBe(1);
});
