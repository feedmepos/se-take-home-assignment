import { OrderSystem } from './orderSystem.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const ORDER_DURATION_MS = parseInt(process.env.ORDER_DURATION_MS || "200", 10);
const RESULT_FILE = process.env.RESULT_FILE || "result.txt";

console.log("=== McDonald's Order Controller Demo ===");
console.log("Order duration:", ORDER_DURATION_MS, "ms");
console.log("Result file:", RESULT_FILE);
console.log("");

const system = new OrderSystem({
  orderDurationMs: ORDER_DURATION_MS,
  now: () => new Date(),
  setTimer: (fn, ms) => setTimeout(fn, ms),
  clearTimer: (t) => clearTimeout(t),
});

console.log("Adding robots...");
system.addRobot();
system.addRobot();

console.log("Creating demo orders...");
system.addOrder("normal");
system.addOrder("vip");
system.addOrder("normal");
system.addOrder("vip");

console.log("Waiting for all orders to complete...");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  await wait(ORDER_DURATION_MS * 5);

  console.log("\n=== Final State ===");
  console.log(system.renderState());

  console.log("\nWriting result.txt...");
  fs.writeFileSync(path.join(rootDir, RESULT_FILE), system.writeResult(), "utf8");

  console.log("Demo complete!");
})();
