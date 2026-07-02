import * as readline from "node:readline";
import { OrderController } from "./domain/OrderController.js";
import { createTimestampedLogger } from "./domain/logger.js";
import { runSimulation } from "./simulate.js";

function printHelp(): void {
  const logger = createTimestampedLogger();
  logger("Available commands:");
  console.log("  new normal   - Create a new Normal order");
  console.log("  new vip      - Create a new VIP order");
  console.log("  + bot        - Add a cooking bot");
  console.log("  - bot        - Remove the newest cooking bot");
  console.log("  status       - Show current system status");
  console.log("  help         - Show this help");
  console.log("  exit         - Quit the CLI");
}

function printStatus(controller: OrderController): void {
  const snap = controller.snapshot();
  const logger = createTimestampedLogger();
  logger("Current status:");
  console.log(`  Pending orders:   ${snap.pending.map((o) => `#${o.id}(${o.type})`).join(", ") || "none"}`);
  console.log(`  Processing:       ${snap.processing.map((p) => `Bot#${p.botId}->Order#${p.orderId}`).join(", ") || "none"}`);
  console.log(`  Completed orders: ${snap.complete.map((o) => `#${o.id}(${o.type})`).join(", ") || "none"}`);
  console.log(`  Bots:             ${snap.bots.map((b) => `#${b.id}(${b.status})`).join(", ") || "none"}`);
}

async function runInteractive(): Promise<void> {
  const controller = new OrderController({
    logger: createTimestampedLogger(),
  });
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });
  console.log("McDonald's Order Controller CLI");
  console.log("Type 'help' for available commands.");
  const handle = (line: string): void => {
    const cmd = line.trim().toLowerCase();
    switch (cmd) {
      case "new normal":
        controller.createOrder("NORMAL");
        break;
      case "new vip":
        controller.createOrder("VIP");
        break;
      case "+ bot":
      case "add bot":
        controller.addBot();
        break;
      case "- bot":
      case "remove bot":
        controller.removeBot();
        break;
      case "status":
        printStatus(controller);
        break;
      case "help":
        printHelp();
        break;
      case "exit":
      case "quit":
        rl.close();
        return;
      default:
        console.log(`Unknown command: '${cmd}'. Type 'help' for available commands.`);
    }
    rl.prompt();
  };
  rl.on("line", handle);
  await new Promise<void>((resolve) => rl.on("close", resolve));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--simulate")) {
    await runSimulation();
    return;
  }
  await runInteractive();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
