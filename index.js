const readline = require("node:readline");
const { createQueue } = require("./src/queue");
const { createController } = require("./src/controller");

const isInteractive = process.argv.includes("--interactive");

function timestamp() {
  return new Date().toTimeString().slice(0, 8);
}

function log(msg = "") {
  process.stdout.write(`[${timestamp()}] ${msg}\n`);
}

function printSystemSummary(controller) {
  const { completed, bots, pending } = controller.getStatus();
  const vipCount = completed.filter((o) => o.type === "VIP").length;
  const normalCount = completed.filter((o) => o.type === "NORMAL").length;

  log("System Summary:");
  log(
    `- Total Orders Processed: ${completed.length} (${vipCount} VIP, ${normalCount} Normal)`,
  );
  log(`- Orders Completed: ${completed.length}`);
  log(`- Active Bots: ${bots.length}`);
  log(`- Pending Orders: ${pending.length}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setupController() {
  const queue = createQueue();
  return createController({
    queue,
    onLog: (msg) => process.stdout.write(msg + "\n"),
  });
}

async function runSimulation() {
  const controller = setupController();

  log("=== McDonald's Order Controller Simulation ===");
  log("System initialized with 0 bots");

  // Add initial orders - queue becomes [VIP#1003, Normal#1001, Normal#1002, Normal#1004]
  controller.addOrder("NORMAL"); // #1001
  controller.addOrder("NORMAL"); // #1002
  controller.addOrder("VIP"); // #1003
  controller.addOrder("NORMAL"); // #1004, to show that 1004 will be returned to queue after bot2 is removed mid-processing

  await delay(1000);
  controller.addBot(); // Bot#1 picks VIP#1003

  await delay(1000);
  controller.addBot(); // Bot#2 picks Normal#1001

  await delay(3000);
  controller.addOrder("VIP"); // #1005 - slots before Normal#1002

  // t=13s: destroy Bot#2 mid-processing, Normal#1002 returns to queue
  await delay(8000);
  controller.removeBot();

  // wait for Bot#1 to finish VIP#1005, Normal#1002, and Normal#1004
  await delay(30000);

  printSystemSummary(controller);
}

function runInteractive() {
  const controller = setupController();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  log("McDonald's Order Controller - Interactive Mode");
  log("Commands: +order | +vip | +bot | -bot | status | help | quit");

  rl.on("line", (line) => {
    const cmd = line.trim().toLowerCase();

    switch (cmd) {
      case "+order":
      case "order":
        controller.addOrder("NORMAL");
        break;

      case "+vip":
      case "vip":
        controller.addOrder("VIP");
        break;

      case "+bot":
      case "bot":
        controller.addBot();
        break;

      case "-bot":
        controller.removeBot();
        break;

      case "help":
        log("Commands:");
        log("- +order | order: Add a NORMAL order");
        log("- +vip | vip: Add a VIP order");
        log("- +bot | bot: Add a new bot");
        log("- -bot: Remove the newest bot");
        log("- status: Show current system status");
        log("- help: Show this help message");
        log("- quit | exit: Exit the application");
        break;

      case "status": {
        const { bots, completed, pending } = controller.getStatus();
        log(
          `Pending:   [${pending.map((o) => `#${o.id}(${o.type})`).join(", ")}]`,
        );
        log(`Completed: [${completed.map((o) => `#${o.id}`).join(", ")}]`);
        log(
          `Bots: ${bots.length} total, ${bots.filter((b) => b.currentOrder).length} processing`,
        );
        break;
      }

      case "quit":
      case "exit":
        printSystemSummary(controller);
        rl.close();
        process.exit(0);
        break;

      case "":
        break;

      default:
        log(
          "Unknown command. Try: +order | +vip | +bot | -bot | status | quit",
        );
    }
  });
}

if (isInteractive) {
  runInteractive();
} else {
  runSimulation();
}
