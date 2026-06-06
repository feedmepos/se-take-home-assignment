import readline from 'node:readline';
import { OrderController } from './order-controller.js';
import { createPrinter, timestamp } from './format.js';

const controller = new OrderController({ processingMs: 10_000 });
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '> ' });

controller.on((event) => {
  createPrinter((line) => {
    process.stdout.write(`\r${line}\n`);
  })(event);
  rl.prompt(true);
});

function printHelp(): void {
  console.log('Commands: normal | vip | addbot | removebot | status | help | exit');
}

function printStatus(): void {
  const pending = controller.pending.map((o) => `${o.type} #${o.id}`).join(', ') || '(none)';
  const processing = controller.bots
    .filter((b) => b.currentOrder)
    .map((b) => `Bot#${b.id}->${b.currentOrder!.type} #${b.currentOrder!.id}`)
    .join(', ') || '(none)';
  const completed = controller.completed.map((o) => `#${o.id}`).join(', ') || '(none)';
  console.log(`[${timestamp()}] PENDING: ${pending}`);
  console.log(`[${timestamp()}] PROCESSING: ${processing}`);
  console.log(`[${timestamp()}] COMPLETE: ${completed}`);
}

console.log("McDonald's Order Controller — interactive CLI");
printHelp();
rl.prompt();

rl.on('line', (line) => {
  switch (line.trim().toLowerCase()) {
    case 'normal':
      controller.newOrder('NORMAL');
      break;
    case 'vip':
      controller.newOrder('VIP');
      break;
    case 'addbot':
      controller.addBot();
      break;
    case 'removebot':
      controller.removeBot();
      break;
    case 'status':
      printStatus();
      break;
    case 'help':
      printHelp();
      break;
    case 'exit':
    case 'quit':
      rl.close();
      return;
    case '':
      break;
    default:
      console.log(`Unknown command: "${line.trim()}" (type "help")`);
  }
  rl.prompt();
});

rl.on('close', () => process.exit(0));
