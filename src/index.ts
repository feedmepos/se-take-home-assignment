import logger from "./lib/util/logger";
import { OrderManager } from "./order/orderManager";

function runExample() {
  logger.info("----------------");
  const orderManager = new OrderManager();
  // Create 10 orders
  for (let i = 0; i < 10; i++) {
    if (i % 2 === 0) {
      orderManager.addOrder();
    } else {
      orderManager.addVipOrder();
    }
  }
  // Create 10 bots; Each bot is handling one order
  for (let i = 0; i < 10; i++) {
    orderManager.addBot();
  }
  // 5 seconds into the example, we remove the half the bots
  setTimeout(() => {
    for (let i = 0; i < 5; i++) {
      orderManager.removeBot();
    }
  }, 5000);
  // Mark OrderManager to gracefully shutdown by processing last orders
  orderManager.gracefulShutdown();
}

runExample();
