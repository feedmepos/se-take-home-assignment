import { OrderController } from "../services/orderController";
import { ORDER_TYPES } from "../domain/types";
import { Logger } from "../utils/logger";

export function runSimulation(): string {
  const baseTimeSeconds = getCurrentTimeInSeconds();
  const logger = new Logger({ baseTimeSeconds });
  const controller = new OrderController({ logger });

  controller.logger.log(0, "System initialized with 0 bots");

  controller.advanceTo(1);
  controller.createOrder(ORDER_TYPES.NORMAL);

  controller.advanceTo(2);
  controller.createOrder(ORDER_TYPES.VIP);
  controller.createOrder(ORDER_TYPES.NORMAL);

  controller.advanceTo(3);
  controller.addBot();

  controller.advanceTo(4);
  controller.addBot();

  controller.advanceTo(5);
  controller.createOrder(ORDER_TYPES.NORMAL);

  controller.advanceTo(6);
  controller.removeBot();

  controller.advanceTo(7);
  controller.createOrder(ORDER_TYPES.VIP);

  controller.advanceTo(15);
  controller.addBot();

  controller.advanceTo(36);
  controller.removeBot();

  controller.finalize();

  return logger.toString();
}

function getCurrentTimeInSeconds(): number {
  const now = new Date();
  return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
}
