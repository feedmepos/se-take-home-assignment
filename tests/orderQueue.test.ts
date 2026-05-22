import { OrderQueue } from "../src/engine/orderQueue";
import { Order } from "../src/engine/types";

test("VIP orders are dequeued before Normal, preserving FIFO within each type", () => {
  const q = new OrderQueue();
  const mk = (id: number, privilege: "VIP" | "Normal"): Order => ({
    id,
    privilege,
    status: "PENDING",
    createdAtMs: 0,
  });

  q.enqueue(mk(1, "Normal"));
  q.enqueue(mk(2, "VIP"));
  q.enqueue(mk(3, "Normal"));
  q.enqueue(mk(4, "VIP"));

  expect(q.dequeue()?.id).toBe(2);
  expect(q.dequeue()?.id).toBe(4);
  expect(q.dequeue()?.id).toBe(1);
  expect(q.dequeue()?.id).toBe(3);
});
