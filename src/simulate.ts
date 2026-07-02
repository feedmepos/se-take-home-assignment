import { OrderController } from "./domain/OrderController.js";
import { createTimestampedLogger } from "./domain/logger.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runSimulation(): Promise<void> {
  console.log("McDonald's Order Management System - Simulation Results\n");
  const logger = createTimestampedLogger();
  const controller = new OrderController({ logger });

  // Requirement 1 & 2: create Normal then VIP then Normal orders.
  // VIP must place ahead of all Normal orders but behind existing VIP.
  controller.createOrder("NORMAL");
  controller.createOrder("VIP");
  controller.createOrder("NORMAL");

  // Requirement 4: add a bot; it immediately picks the highest-priority pending order.
  controller.addBot();
  controller.addBot();

  // Wait for the first batch to finish (real 10s processing time).
  await sleep(10_000);

  // Requirement 5: after completing, bots pick up remaining pending orders
  // or become IDLE. Now create a VIP order; an idle bot should pick it up.
  controller.createOrder("VIP");

  // Requirement 6: while both bots are busy, create a Normal order so it stays
  // pending, then add a bot that immediately picks it up. Destroy that newest
  // bot mid-process; the order returns to pending and is picked up once a bot
  // becomes free. Do this before the sleep so no bot is idle yet.
  controller.createOrder("NORMAL");
  controller.addBot();
  controller.removeBot();

  // Wait for the in-progress orders to finish and the returned order to complete.
  await sleep(10_000);

  // Wait for the re-picked-up order (#1005) to finish processing.
  await sleep(10_000);

  // Requirement: manager decreases bots; destroy an idle bot.
  controller.removeBot();

  console.log("");
  console.log("Final Status:");
  const total = controller.completedCount + controller.pendingCount;
  const vip = controller.vipCompletedCount();
  const normal = controller.normalCompletedCount();
  console.log(`- Total Orders Processed: ${total} (${vip} VIP, ${normal} Normal)`);
  console.log(`- Orders Completed: ${controller.completedCount}`);
  console.log(`- Active Bots: ${controller.botCount}`);
  console.log(`- Pending Orders: ${controller.pendingCount}`);
}
