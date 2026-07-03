#!/usr/bin/env node
// Interactive CLI for the McDonald's order controller.
// Uses real wall-clock timers (default scheduler) so each order takes 10s.
import readline from 'node:readline';
import { OrderController } from '../src/OrderController.js';

function formatTime(ms) {
  return new Date(ms).toTimeString().slice(0, 8); // HH:MM:SS
}

const controller = new OrderController({
  onEvent: (msg, ms) => console.log(`[${formatTime(ms)}] ${msg}`),
});

function printStatus() {
  const snap = controller.snapshot();
  const fmtOrder = (o) => `${o.type === 'VIP' ? 'V' : 'N'}#${o.number}`;
  const fmtBot = (b) =>
    `#${b.id}:${b.status}${b.order ? `(${fmtOrder(b.order)})` : ''}`;
  console.log('--- STATUS ---');
  console.log('PENDING :', snap.pending.map(fmtOrder).join(', ') || '(none)');
  console.log('BOTS    :', snap.bots.map(fmtBot).join(', ') || '(none)');
  console.log('COMPLETE:', snap.completed.map(fmtOrder).join(', ') || '(none)');
  console.log('--------------');
}

const HELP = `Commands:
  normal    Create a new Normal order
  vip       Create a new VIP order
  +bot      Add a cooking bot
  -bot      Remove the newest cooking bot
  status    Show PENDING / BOTS / COMPLETE
  help      Show this help
  exit      Quit`;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> ',
});

console.log("McDonald's Order Controller (interactive) - each order takes 10s.");
console.log(HELP);
rl.prompt();

rl.on('line', (line) => {
  const cmd = line.trim().toLowerCase();
  switch (cmd) {
    case 'normal':
      controller.newNormalOrder();
      break;
    case 'vip':
      controller.newVipOrder();
      break;
    case '+bot':
      controller.addBot();
      break;
    case '-bot':
      controller.removeBot();
      break;
    case 'status':
      printStatus();
      break;
    case 'help':
      console.log(HELP);
      break;
    case 'exit':
    case 'quit':
      rl.close();
      return;
    case '':
      break;
    default:
      console.log(`Unknown command: "${cmd}". Type "help" for commands.`);
  }
  rl.prompt();
});

rl.on('close', () => {
  console.log('Goodbye.');
  process.exit(0);
});