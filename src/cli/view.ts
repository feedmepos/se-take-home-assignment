import { OrderController } from "../core/orderController";
import {
  BotSnapshot,
  CompletedOrder,
  Order,
} from "../core/orderController.types";

const DIVIDER = "■".repeat(64);
const TITLE_DIVIDER = "=".repeat(48);
const UP_SECTION_DIVIDER = ">".repeat(48);
const DOWN_SECTION_DIVIDER = "<".repeat(48);

export function formatOrder(order: Order): string {
  return `#${order.id} (${order.type})`;
}

export function formatCompletedOrder(order: CompletedOrder): string {
  return `[DONE] ${formatOrder(order)} at ${order.completedAt}`;
}

export function printCompletionEvent(order: CompletedOrder): void {
  console.log("");
  console.log(UP_SECTION_DIVIDER);
  console.log(`COMPLETED: ${formatOrder(order)} at ${order.completedAt}`);
  console.log(DOWN_SECTION_DIVIDER);
}

export function formatBot(bot: BotSnapshot): string {
  if (bot.currentOrder) {
    return `Bot #${bot.id} | ${bot.status} | ${formatOrder(bot.currentOrder)}`;
  }

  return `Bot #${bot.id} | ${bot.status}`;
}

function formatList(title: string, items: string[]): string {
  if (items.length === 0) {
    return `${title}\n  none`;
  }

  return `${title}\n${items.map((item) => `  - ${item}`).join("\n")}`;
}

export function printStatusView(controller: OrderController): void {
  const status = controller.getStatus();

  console.log("");
  console.log(DIVIDER);
  console.log("ORDER CONTROLLER STATUS");
  console.log('');
  console.log(
    `Pending: ${status.pendingOrders.length} | Completed: ${status.completedOrders.length} | Bots: ${status.bots.length}`,
  );
  console.log(TITLE_DIVIDER);
  console.log(
    formatList(
      "[PENDING ORDERS]",
      status.pendingOrders.map((order) => formatOrder(order)),
    ),
  );
  console.log('\n');
  console.log(
    formatList(
      "[COMPLETED ORDERS]",
      status.completedOrders.map((order) => formatCompletedOrder(order)),
    ),
  );
  console.log('\n');
  console.log(
    formatList(
      "[BOTS]",
      status.bots.map((bot) => formatBot(bot)),
    ),
  );
  console.log('');
  console.log(DIVIDER);
  console.log('\n');
}
