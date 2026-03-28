import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { newBotManager } from "../src/botManager.js";
import { newQueue } from "../src/orderQueue.js";

const log = () => {};

describe("BotManager", () => {
  test("add and retrieve bots correctly", () => {
    const queue = newQueue(log);
    const manager = newBotManager(log);

    manager.addBot(queue);
    manager.addBot(queue);

    assert.strictEqual(manager.botCount(), 2);
  });

  test("remove bots correctly (newest first)", () => {
    const queue = newQueue(log);
    const manager = newBotManager(log);

    manager.addBot(queue);
    manager.addBot(queue);

    const removedBot1 = manager.removeBot(queue);
    assert.strictEqual(removedBot1?.id, 2);
  });

  test("handle removing bots when none are available", () => {
    const queue = newQueue(log);
    const manager = newBotManager(log);

    const removedBot = manager.removeBot(queue);
    assert.strictEqual(removedBot, null);
  });

  test("bots process orders and handle removals correctly", () => {
    const queue = newQueue(log);
    const manager = newBotManager(log, 10);

    // Add some orders to the queue
    queue.addOrder("normal");
    queue.addOrder("vip");
    queue.addOrder("normal");

    // Add a bot to process orders
    const bot = manager.addBot(queue);

    assert.strictEqual(bot.currentOrder?.type, "vip");
    manager.removeBot(queue);
    assert.strictEqual(bot.currentOrder, null);
    assert.strictEqual(queue.pendingCounts(), 3);
  });

  test("bots pick up new orders after completing current ones", (t, done) => {
    const queue = newQueue(log);
    const manager = newBotManager(log, 10);

    // Add some orders to the queue
    queue.addOrder("normal");
    queue.addOrder("vip");

    // Add a bot to process orders
    manager.addBot(queue);

    setTimeout(() => {
      assert.strictEqual(queue.getState().completed.length, 2);
      done();
    }, 30);
  });

  test("removing bots while processing orders stops them correctly", (t, done) => {
    const queue = newQueue(log);
    const manager = newBotManager(log, 10);

    // Add some orders to the queue
    queue.addOrder("normal");
    queue.addOrder("vip");

    // Add a bot to process orders
    const bot = manager.addBot(queue);

    setTimeout(() => {
      manager.removeBot(queue);
      assert.strictEqual(bot.currentOrder, null);
      assert.strictEqual(queue.pendingCounts(), 2);
      done();
    }, 5);
  });
});
