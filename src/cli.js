#!/usr/bin/env node
"use strict";

const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { OrderController, ORDER_TYPE } = require("./OrderController");

const OUTPUT_FILE = path.join(process.cwd(), "scripts", "result.txt");
const LINES = [];

function ts() {
  const d = new Date();
  return [
    String(d.getHours()).padStart(2, "0"),
    String(d.getMinutes()).padStart(2, "0"),
    String(d.getSeconds()).padStart(2, "0"),
  ].join(":");
}

function log(message) {
  const line = `[${ts()}] ${message}`;
  console.log(line);
  LINES.push(line);
}

function printState(ctrl) {
  const pending = ctrl.pendingOrders
    .map((o) => `#${o.id}(${o.type})`)
    .join(", ") || "(empty)";
  const processing = ctrl.bots
    .filter((b) => !b.isIdle)
    .map((b) => `Bot${b.id}→#${b.currentOrder.id}`)
    .join(", ") || "(none)";
  const complete = ctrl.completeOrders
    .map((o) => `#${o.id}`)
    .join(", ") || "(none)";
  log(`  PENDING=[${pending}]  PROCESSING=[${processing}]  COMPLETE=[${complete}]`);
}

function printMenu() {
  console.log("\n┌─────────────────────────────────────┐");
  console.log("│   McDonald's Order Controller        │");
  console.log("├─────────────────────────────────────┤");
  console.log("│  1. New Normal Order                 │");
  console.log("│  2. New VIP Order                    │");
  console.log("│  3. + Bot                            │");
  console.log("│  4. - Bot                            │");
  console.log("│  5. Exit                             │");
  console.log("└─────────────────────────────────────┘");
  process.stdout.write("> ");
}

// ─── Setup ───────────────────────────────────────────────────────────────────

const ctrl = new OrderController({
  processingTimeMs: 10_000,
  onEvent(event, data) {
    switch (event) {
      case "ORDER_ADDED":
        log(`ORDER ADDED    → #${data.order.id} [${data.order.type}]`);
        break;
      case "ORDER_PROCESSING":
        log(`ORDER PICKUP   → Bot#${data.bot.id} picked up Order#${data.order.id} [${data.order.type}]`);
        break;
      case "ORDER_COMPLETE":
        log(`ORDER COMPLETE → Order#${data.order.id} [${data.order.type}] is DONE`);
        break;
      case "ORDER_RETURNED":
        log(`ORDER RETURNED → Order#${data.order.id} [${data.order.type}] back to PENDING`);
        break;
      case "BOT_ADDED":
        log(`BOT ADDED      → Bot#${data.bot.id} created`);
        break;
      case "BOT_REMOVED":
        log(`BOT REMOVED    → Bot#${data.bot.id} destroyed`);
        break;
    }
    printState(ctrl);
    process.stdout.write("\n> ");
  },
});

// ─── Interactive CLI ──────────────────────────────────────────────────────────

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

console.log("\n🍔 Welcome to McDonald's Order Controller!");
console.log("Each order takes 10 seconds to process.\n");
printMenu();

rl.on("line", (input) => {
  const choice = input.trim();

  switch (choice) {
    case "1":
      ctrl.addOrder(ORDER_TYPE.NORMAL);
      break;
    case "2":
      ctrl.addOrder(ORDER_TYPE.VIP);
      break;
    case "3":
      ctrl.addBot();
      break;
    case "4":
      ctrl.removeBot();
      break;
    case "5":
      log("=== Session ended ===");
      fs.writeFileSync(OUTPUT_FILE, LINES.join("\n") + "\n", "utf8");
      console.log(`\nResults written to: ${OUTPUT_FILE}`);
      process.exit(0);
      break;
    default:
      console.log("Invalid input. Please enter 1, 2, 3, 4, or 5.");
      process.stdout.write("> ");
  }
});

rl.on("close", () => {
  // Handle piped input (used in CI / run.sh)
  log("=== Session ended ===");
  fs.writeFileSync(OUTPUT_FILE, LINES.join("\n") + "\n", "utf8");
  console.log(`\nResults written to: ${OUTPUT_FILE}`);
  process.exit(0);
});