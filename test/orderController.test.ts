import test from "node:test";
import assert from "node:assert/strict";
import { OrderController } from "../src/services/orderController";
import { ORDER_STATUS, ORDER_TYPES } from "../src/domain/types";
import { Logger } from "../src/utils/logger";

test("VIP orders are processed before normal orders", () => {
  const controller = new OrderController({ logger: new Logger() });

  controller.createOrder(ORDER_TYPES.NORMAL, 0);
  controller.createOrder(ORDER_TYPES.VIP, 0);

  controller.addBot(0);

  const [bot] = controller.getBots();
  assert.ok(bot, "expected a bot to be registered");
  const currentOrder = bot.currentOrder;
  assert.ok(currentOrder, "expected bot to have an order assigned");
  assert.equal(
    currentOrder.type,
    ORDER_TYPES.VIP,
    "VIP order should be processed before normal order"
  );
});

test("Removing a processing bot returns the order to pending queue", () => {
  const controller = new OrderController({ logger: new Logger() });

  const order = controller.createOrder(ORDER_TYPES.NORMAL, 0);
  controller.addBot(0);

  const [bot] = controller.getBots();
  assert.ok(bot.currentOrder);
  assert.equal(bot.currentOrder, order, "Bot should be processing the created order");

  controller.removeBot(5);

  assert.equal(controller.getBots().length, 0, "Bot should be removed");
  assert.equal(
    order.status,
    ORDER_STATUS.PENDING,
    "Order should return to pending after bot removal"
  );
  assert.equal(
    controller.getPendingNormal().length,
    1,
    "Order should be queued back in normal pending queue"
  );
});

test("Bots continue processing subsequent orders after completing", () => {
  const controller = new OrderController({ logger: new Logger() });

  controller.createOrder(ORDER_TYPES.NORMAL, 0);
  controller.createOrder(ORDER_TYPES.NORMAL, 0);
  controller.addBot(0);

  controller.advanceTo(10);

  const completed = controller.getOrders().filter(
    (order) => order.status === ORDER_STATUS.COMPLETE
  );
  assert.equal(completed.length, 1, "One order should be completed after 10s");

  controller.advanceTo(20);

  const secondCompleted = controller.getOrders().filter(
    (order) => order.status === ORDER_STATUS.COMPLETE
  );
  assert.equal(
    secondCompleted.length,
    2,
    "Both orders should be completed after 20s"
  );
});
