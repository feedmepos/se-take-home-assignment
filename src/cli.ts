/**
 * Interactive CLI for the McDonald's Order Controller.
 *
 * Commands:
 *   order normal  — Add a normal order
 *   order vip     — Add a VIP order (priority)
 *   bot add       — Add a cooking bot
 *   bot remove    — Remove the newest bot
 *   status        — Show pending / completed / bots
 *   help          — List available commands
 *   exit          — Quit
 */

import readline from "node:readline";
import { newQueue } from "./orderQueue.js";
import { newBotManager } from "./botManager.js";

export function run() {
  function timestamp() {
    return new Date().toTimeString().slice(0, 8);
  }

  // Declares rl before log so the closure can reference it once assigned.
  let rl: readline.Interface;

  // Clears the current prompt line before printing so async bot logs don't
  // interleave with partial user input, then re-displays the prompt.
  function log(msg: string) {
    process.stdout.write("\r\x1b[K"); // move to start of line and clear it
    console.log(`[${timestamp()}] ${msg}`);
    rl.prompt(true);
  }

  const queue = newQueue(log);
  const manager = newBotManager(log);

  function printStatus() {
    const { pending, completed } = queue.getState();
    const botList = manager.getState();
    console.log("");
    console.log(
      "  Pending  :",
      pending.map((o) => `${o.type.toUpperCase()}#${o.id}`).join(", ") ||
        "(empty)",
    );
    console.log(
      "  Completed :",
      completed.map((o) => `${o.type.toUpperCase()}#${o.id}`).join(", ") ||
        "(empty)",
    );
    console.log(
      "  Bots     :",
      botList
        .map(
          (b) =>
            `Bot#${b.id}(${b.status}${b.currentOrderId != null ? ` → Order#${b.currentOrderId}` : ""})`,
        )
        .join(", ") || "(none)",
    );
    console.log("");
  }

  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  });

  console.log("McDonald's Order Controller — Interactive CLI");
  console.log('Type "help" for available commands.\n');
  rl.prompt();

  rl.on("line", (line) => {
    const cmd = line.trim().toLowerCase();

    switch (cmd) {
      case "order normal": {
        const order = queue.addOrder("normal");
        log(`Normal Order #${order.id} added → PENDING`);
        manager.pingIdleBot(queue);
        break;
      }
      case "order vip": {
        const order = queue.addOrder("vip");
        log(`VIP Order #${order.id} added → PENDING (priority)`);
        manager.pingIdleBot(queue);
        break;
      }
      case "bot add":
        manager.addBot(queue);
        break;
      case "bot remove":
        manager.removeBot(queue);
        break;
      case "status":
        printStatus();
        rl.prompt();
        break;
      case "help":
        console.log("\n  order normal  — Add a normal order");
        console.log("  order vip     — Add a VIP order (priority)");
        console.log("  bot add       — Add a cooking bot (+Bot)");
        console.log("  bot remove    — Remove the newest bot (-Bot)");
        console.log("  status        — Show current state");
        console.log("  exit          — Exit the program\n");
        rl.prompt();
        break;
      case "exit":
        console.log("Goodbye!");
        process.exit(0);
        break;
      default:
        if (cmd)
          console.log(`Unknown command: "${cmd}". Type "help" for commands.`);
        rl.prompt();
    }
  });

  rl.on("close", () => process.exit(0));
}
