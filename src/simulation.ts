/**
 * Scripted simulation demonstrating all order controller requirements.
 * Uses a 2-second processing time (instead of 10s) so the CI run completes quickly.
 * The interactive CLI (`src/cli.js`) uses the real 10-second processing time.
 */
import { newQueue } from "./orderQueue.js";
import { newBotManager } from "./botManager.js";
import { log } from "./log.js";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function printState(
  queue: ReturnType<typeof newQueue>,
  manager: ReturnType<typeof newBotManager>,
) {
  const { pending, completed } = queue.getState();
  const botList = manager.getState();

  const normalCount = completed.filter((o) => o.type === "normal").length;
  const vipCount = completed.filter((o) => o.type === "vip").length;

  log(
    `-  Total Order Processed  : ${completed.length} (VIP: ${vipCount}, Normal: ${normalCount})`,
  );
  log(`-  Orders Complete : ${completed.length}`);
  log(`-  Active Bots     : ${botList.length}`);
  log(`-  Pending Orders : ${pending.length} `);
}

export async function main() {
  const queue = newQueue(log);
  const manager = newBotManager(log);

  log("McDonald's Order Management System - Simulation Results");

  log(`System initialized with ${manager.botCount()} bots`);

  queue.addOrder("normal");
  manager.pingIdleBot(queue);
  await sleep(1000);
  queue.addOrder("vip");
  manager.pingIdleBot(queue);
  await sleep(1000);
  queue.addOrder("normal");
  manager.pingIdleBot(queue);
  await sleep(1000);

  manager.addBot(queue);
  await sleep(1000);
  manager.addBot(queue);
  await sleep(11000);


  queue.addOrder("vip");
  manager.pingIdleBot(queue);
  await sleep(10000);

  manager.removeBot(queue);
  await sleep(1000);

  // ── Final state ────────────────────────────────────────────────────────────
  log("Final Status:");
  printState(queue, manager);
}
