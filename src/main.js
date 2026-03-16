#!/usr/bin/env node
import readline from 'readline';
import { OrderController } from './orderController.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const controller = new OrderController();
controller.addBot();

console.log("=== McDonald's Order Controller CLI ===");
console.log("Commands:");
console.log("  normal  → Create new normal order");
console.log("  vip     → Create new VIP order");
console.log("  +       → Add a cooking bot");
console.log("  -       → Remove a cooking bot");
console.log("  exit    → Quit CLI");

rl.on('line', (cmd) => {
  if (cmd === 'normal') controller.addOrder('Normal');
  else if (cmd === 'vip') controller.addOrder('VIP');
  else if (cmd === '+') controller.addBot();
  else if (cmd === '-') controller.removeBot();
  else if (cmd === 'exit') rl.close();
  else console.log("Unknown command. Try: normal, vip, +, -, exit");
});