import readline from "node:readline";
import { stdin as input, stdout as output } from "node:process";

import {
  ControllerError,
  FakeScheduler,
  createOrderController,
  type DomainEvent,
  type Order,
  type SystemSnapshot,
  type Bot,
} from "@feedme/core";

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(timestamp);
}

function renderSnapshot(snapshot: SystemSnapshot): string {
  const pending =
    snapshot.pendingOrders
      .map((order: Order) => `#${order.id}:${order.priority}`)
      .join(", ") || "none";
  const processing =
    snapshot.processingOrders
      .map((order: Order) => `#${order.id}->Bot#${order.assignedBotId}`)
      .join(", ") || "none";
  const complete =
    snapshot.completedOrders.map((order: Order) => `#${order.id}`).join(", ") ||
    "none";
  const bots =
    snapshot.bots
      .map(
        (bot: Bot) =>
          `Bot#${bot.id}:${bot.status}${bot.currentOrderId ? `(Order#${bot.currentOrderId})` : ""}`,
      )
      .join(", ") || "none";

  return [
    `Pending: ${pending}`,
    `Processing: ${processing}`,
    `Complete: ${complete}`,
    `Bots: ${bots}`,
    `Metrics: pending=${snapshot.metrics.pendingCount}, processing=${snapshot.metrics.processingCount}, complete=${snapshot.metrics.completedCount}, activeBots=${snapshot.metrics.activeBotCount}, idleBots=${snapshot.metrics.idleBotCount}`,
  ].join("\n");
}

function renderEvent(event: DomainEvent): string {
  return `[${formatTime(event.timestamp)}] ${event.message}`;
}

export function runDemo(): string {
  const scheduler = new FakeScheduler();
  const controller = createOrderController({}, scheduler);
  const lines: string[] = [
    "McDonald's Order Management System - Simulation Results",
    "",
  ];

  lines.push(`[${formatTime(scheduler.now())}] System initialized with 0 bots`);
  controller.createNormalOrder();
  scheduler.advanceBy(1000);
  controller.createVipOrder();
  scheduler.advanceBy(1000);
  controller.addBot();
  scheduler.advanceBy(1000);
  controller.createNormalOrder();
  scheduler.advanceBy(1000);
  controller.addBot();
  scheduler.advanceBy(5000);
  controller.removeLatestBot();
  scheduler.advanceBy(1000);
  controller.createVipOrder();
  scheduler.advanceBy(1000);
  controller.addBot();
  scheduler.advanceBy(22_000);

  for (const event of controller.getEvents()) {
    lines.push(renderEvent(event));
  }

  const snapshot = controller.getSnapshot();
  lines.push("");
  lines.push("Final Status:");
  lines.push(renderSnapshot(snapshot));
  return `${lines.join("\n")}\n`;
}

function executeCommand(
  command: string,
  controller = createOrderController(),
): OrderControllerSessionResult {
  const trimmed = command.trim();
  switch (trimmed) {
    case "normal":
      controller.createNormalOrder();
      return { controller, output: "Created a normal order." };
    case "vip":
      controller.createVipOrder();
      return { controller, output: "Created a VIP order." };
    case "bot:add":
      controller.addBot();
      return { controller, output: "Added a bot." };
    case "bot:remove":
      controller.removeLatestBot();
      return { controller, output: "Removed the latest bot." };
    case "status":
      return { controller, output: renderSnapshot(controller.getSnapshot()) };
    case "events":
      return {
        controller,
        output:
          controller.getEvents().slice(-8).map(renderEvent).join("\n") ||
          "No events recorded yet.",
      };
    case "help":
      return {
        controller,
        output:
          "Commands: normal, vip, bot:add, bot:remove, status, events, help, exit",
      };
    default:
      return {
        controller,
        output: `Unknown command: ${trimmed || "(empty)"}. Type "help" for available commands.`,
      };
  }
}

interface OrderControllerSessionResult {
  controller: ReturnType<typeof createOrderController>;
  output: string;
}

export async function runInteractive(): Promise<void> {
  const controller = createOrderController();
  controller.subscribe((event: DomainEvent) => {
    output.write(`${renderEvent(event)}\n`);
  });

  const rl = readline.createInterface({ input, output, prompt: "feedme> " });
  output.write('Interactive FeedMe CLI. Type "help" for commands.\n');
  rl.prompt();

  rl.on("line", (line) => {
    if (line.trim() === "exit") {
      rl.close();
      return;
    }
    try {
      const result = executeCommand(line, controller);
      output.write(`${result.output}\n`);
    } catch (error: unknown) {
      const message =
        error instanceof ControllerError ? error.message : "Unexpected error.";
      output.write(`${message}\n`);
    }
    rl.prompt();
  });

  await new Promise<void>((resolve) => {
    rl.on("close", () => {
      output.write("Goodbye.\n");
      resolve();
    });
  });
}

const mode = process.argv[2] ?? "demo";

if (mode === "interactive") {
  void runInteractive();
} else if (mode === "demo") {
  process.stdout.write(runDemo());
} else {
  process.stderr.write(`Unknown mode: ${mode}\n`);
  process.exitCode = 1;
}
