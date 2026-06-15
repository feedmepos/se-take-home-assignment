import { OrderController } from "../core/orderController";
import { Order } from "../core/orderController.types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function timestamp(): string {
  return new Date().toTimeString().slice(0, 8);
}

function logEvent(message: string): void {
  console.log(`[${timestamp()}] ${message}`);
}

function formatOrder(order: Order): string {
  return `#${order.id} (${order.type})`;
}

async function runDemoScenario(): Promise<void> {
  const controller = new OrderController({
    onOrderStarted: (botId, order) => {
      logEvent(`Bot #${botId} started ${formatOrder(order)}`);
    },
    onOrderCompleted: (order) => {
      logEvent(`Order ${formatOrder(order)} completed at ${order.completedAt}`);
    },
    onBotIdle: (botId) => {
      logEvent(`Bot #${botId} is IDLE`);
    },
  });

  logEvent("Demo scenario started");

  const normalOrders = controller.addNormalOrders(2);
  logEvent(`Added NORMAL orders: ${normalOrders.map((order) => `#${order.id}`).join(", ")}`);

  const vipOrders = controller.addVipOrders(1);
  logEvent(`Added VIP order: ${vipOrders.map((order) => `#${order.id}`).join(", ")}`);

  const firstBot = controller.addBot();
  logEvent(`Added bot #${firstBot.id}`);

  const secondBot = controller.addBot();
  logEvent(`Added bot #${secondBot.id}`);

  logEvent("Waiting 2 seconds before removing the newest bot mid-process");
  await sleep(2_000);

  const removedBot = controller.removeBot();
  if (removedBot) {
    logEvent(`Removed bot #${removedBot.id}`);
  }

  const thirdBot = controller.addBot();
  logEvent(`Added bot #${thirdBot.id}`);

  logEvent("Waiting for all remaining orders to finish");
  await sleep(21_000);

  const finalStatus = controller.getStatus();
  logEvent(
    `Final summary: pending=${finalStatus.pendingOrders.length}, completed=${finalStatus.completedOrders.length}, bots=${finalStatus.bots.length}`,
  );
  logEvent(
    `Completed orders: ${
      finalStatus.completedOrders.length > 0
        ? finalStatus.completedOrders
            .map((order) => `#${order.id} (${order.type}) @ ${order.completedAt}`)
            .join(", ")
        : "none"
    }`,
  );
  logEvent(
    `Bot statuses: ${
      finalStatus.bots.length > 0
        ? finalStatus.bots
            .map((bot) => `#${bot.id} ${bot.status}${bot.currentOrder ? ` ${formatOrder(bot.currentOrder)}` : ""}`)
            .join(", ")
        : "none"
    }`,
  );
}

if (require.main === module) {
  void runDemoScenario();
}
