import { BotManager } from "../src/engine/botManager";
import { OrderQueue } from "../src/engine/orderQueue";
import type { Clock } from "../src/engine/clock";
import type { Order, EngineEvent } from "../src/engine/types";

class FakeClock implements Clock {
  private t = 0;

  nowMs(): number {
    return this.t;
  }

  async sleep(ms: number): Promise<void> {
    this.t += ms;
  }
}

test("removing newest bot during processing returns order to pending and emits BOT_CANCELLED", async () => {
  const clock = new FakeClock();
  const queue = new OrderQueue();

  const events: EngineEvent[] = [];
  const onEvent = (e: EngineEvent) => events.push(e);

  // processMs doesn't matter here because we cancel immediately
  const botManager = new BotManager(queue, clock, onEvent, 10_000);

  const order: Order = {
    id: 1,
    privilege: "Normal",
    status: "PENDING",
    createdAtMs: clock.nowMs(),
  };
  queue.enqueue(order);

  botManager.addBot(); // bot picks up the order
  botManager.removeNewestBot(); // cancel + return to pending

  // ✅ order should be back in pending queue
  expect(queue.snapshotPendingIds()).toEqual([1]);

  // ✅ event should be emitted for cancellation
  expect(
    events.some((e) => e.type === "BOT_CANCELLED" && e.orderId === 1)
  ).toBe(true);
});
