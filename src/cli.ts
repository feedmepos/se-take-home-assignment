import { stdout as output, stdin as input } from "node:process";
import { createInterface } from "node:readline";
import type { BotSnapshot, ControllerSnapshot, OrderSnapshot } from "./domain.js";
import { OrderController } from "./orderController.js";

function runDemo(): string {
  const controller = new OrderController({
    startTime: "14:32:00",
    firstOrderId: 1001,
  });

  controller.addNormalOrder();
  controller.advanceTime(1);
  controller.addNormalOrder();
  controller.addVipOrder();
  controller.addBot();
  controller.addBot();
  controller.advanceTime(5);
  controller.removeBot();
  controller.addVipOrder();
  controller.advanceTime(5);
  controller.addBot();
  controller.advanceTime(10);
  controller.advanceTime(10);
  controller.removeBot();

  return renderReport(controller);
}

async function runInteractive(): Promise<void> {
  const controller = new OrderController({
    startTime: "09:00:00",
    firstOrderId: 1001,
  });
  const rl = createInterface({ input, output });
  let lastMessage = "Ready.";

  output.write(renderDashboard(controller, lastMessage));

  for await (const line of rl) {
    const answer = line.trim();
    const [command = "", value] = answer.split(/\s+/);

    try {
      if (command === "normal" || command === "n") {
        controller.addNormalOrder();
        lastMessage = controller.formatEvents().at(-1) ?? "Created normal order.";
      } else if (command === "vip" || command === "v") {
        controller.addVipOrder();
        lastMessage = controller.formatEvents().at(-1) ?? "Created VIP order.";
      } else if (command === "+bot" || command === "+") {
        controller.addBot();
        lastMessage = controller.formatEvents().at(-1) ?? "Added bot.";
      } else if (command === "-bot" || command === "-") {
        controller.removeBot();
        lastMessage = controller.formatEvents().at(-1) ?? "Removed bot.";
      } else if (command === "tick" || command === "t") {
        const seconds = Number(value ?? 10);
        controller.advanceTime(seconds);
        lastMessage = `Advanced time by ${seconds}s.`;
      } else if (command === "status" || command === "s" || command === "") {
        lastMessage = "Status refreshed.";
      } else if (command === "help" || command === "h" || command === "?") {
        lastMessage = "Use n, v, +, -, t [seconds], s, or q.";
      } else if (command === "exit" || command === "quit" || command === "q") {
        break;
      } else {
        lastMessage = `Unknown command "${command}". Type h for help.`;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      lastMessage = `Error: ${message}`;
    }

    output.write(renderDashboard(controller, lastMessage));
  }

  rl.close();
}

function renderReport(controller: OrderController): string {
  const snapshot = controller.getSnapshot();
  const vipCompleted = countCompleted(snapshot, "VIP");
  const normalCompleted = countCompleted(snapshot, "NORMAL");

  return [
    timestampLine(snapshot.time, "McDonald's Order Management System - Simulation Results"),
    ...controller.formatEvents(),
    timestampLine(snapshot.time, "Final Status:"),
    timestampLine(snapshot.time, `- Simulated Time: ${snapshot.time}`),
    timestampLine(
      snapshot.time,
      `- Total Orders Processed: ${snapshot.completedOrders.length} (${vipCompleted} VIP, ${normalCompleted} Normal)`
    ),
    timestampLine(snapshot.time, `- Orders Completed: ${snapshot.completedOrders.length}`),
    timestampLine(snapshot.time, `- Active Bots: ${snapshot.bots.length}`),
    timestampLine(snapshot.time, `- Pending Orders: ${snapshot.pendingOrders.length}`),
    timestampLine(snapshot.time, `- Processing Orders: ${snapshot.processingOrders.length}`),
  ].join("\n");
}

function renderDashboard(controller: OrderController, message: string): string {
  const snapshot = controller.getSnapshot();
  const recentEvents = controller.formatEvents().slice(-5);

  return [
    clearScreen(),
    "FeedMe Order Controller - Interactive CLI",
    line(),
    `Time: ${snapshot.time}`,
    `Message: ${message}`,
    "",
    renderMetrics(snapshot),
    "",
    renderBots(snapshot.bots),
    "",
    renderOrderLane("Pending", snapshot.pendingOrders),
    "",
    renderOrderLane("Complete", snapshot.completedOrders),
    "",
    renderEvents(recentEvents),
    "",
    "Commands: [n] normal  [v] vip  [+] add bot  [-] remove bot  [t 10] tick  [s] status  [h] help  [q] quit",
    "> ",
  ].join("\n");
}

function renderMetrics(snapshot: ControllerSnapshot): string {
  return [
    "Summary",
    line(),
    `Bots: ${snapshot.bots.length} | Pending: ${snapshot.pendingOrders.length} | Processing: ${snapshot.processingOrders.length} | Complete: ${snapshot.completedOrders.length}`,
  ].join("\n");
}

function renderBots(bots: BotSnapshot[]): string {
  const rows = bots.length === 0 ? ["  No bots yet."] : bots.map(formatBot);
  return ["Bots", line(), ...rows].join("\n");
}

function renderOrderLane(title: string, orders: OrderSnapshot[]): string {
  const rows = orders.length === 0 ? ["  None"] : orders.map((order) => `  ${formatOrderSummary(order)}`);
  return [title, line(), ...rows].join("\n");
}

function renderEvents(events: string[]): string {
  const rows = events.length === 0 ? ["  None"] : events.map((event) => `  ${event}`);
  return ["Recent Events", line(), ...rows].join("\n");
}

function formatBot(bot: BotSnapshot): string {
  if (bot.status === "IDLE") {
    return `  Bot #${bot.id} | IDLE`;
  }

  const orderType = bot.orderType === "VIP" ? "VIP" : "NORMAL";
  return `  Bot #${bot.id} | PROCESSING | ${orderType} #${bot.orderId} | ${bot.remainingSeconds}s left`;
}

function countCompleted(snapshot: ControllerSnapshot, type: OrderSnapshot["type"]): number {
  return snapshot.completedOrders.filter((order) => order.type === type).length;
}

function formatOrderSummary(order: OrderSnapshot): string {
  const type = order.type === "VIP" ? "VIP" : "NORMAL";
  return `${type} #${order.id}`;
}

function line(): string {
  return "----------------------------------------";
}

function timestampLine(time: string, message: string): string {
  return `[${time}] ${message}`;
}

function clearScreen(): string {
  return process.stdout.isTTY ? "\x1Bc" : "";
}

if (process.argv.includes("--interactive")) {
  await runInteractive();
} else {
  output.write(runDemo());
}
