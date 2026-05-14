import { OrderController } from "./services/order-controller";
import { log } from "./utils/logger";
import { LogType, OrderType } from "./types";

const { VIP, NORMAL } = OrderType;
const { SYSTEM_INIT } = LogType;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("=== McDonald's Order Management System Demo ===\n");
  log(SYSTEM_INIT);

  const controller = new OrderController();

  // Create bot
  controller.addBot();

  await delay(1000);

  // Create orders
  controller.addOrder(NORMAL);
  controller.addOrder(VIP);
  controller.addOrder(NORMAL);

  await delay(1000);

  // Create bot
  controller.addBot();
  controller.addBot();

  await delay(1000);

  // Create orders
  controller.addOrder(NORMAL);
  controller.addOrder(VIP);
  controller.addOrder(VIP);

  await delay(1000);

  // Remove bot
  controller.removeBot();

  // Wait for all orders to complete
  await delay(60000);

  const stats = controller.getStats();
  console.log("\nFinal Status:");
  console.log(
    `- Total Orders Processed: ${stats.totalOrders} (${stats.countByType[VIP]} VIP, ${stats.countByType[NORMAL]} Normal)`,
  );
  console.log(`- Orders Completed: ${stats.completedCount}`);
  console.log(`- Active Bots: ${stats.activeBots}`);
  console.log(`- Destroyed Bots: ${stats.destroyedBots}`);
  console.log(`- Pending Orders: ${stats.pendingOrders}`);
}

main();
