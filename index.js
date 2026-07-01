'use strict';

const readline = require('node:readline');
const { OrderController } = require('./src/orderController');

/**
 * Interactive CLI for the McDonald's order controller.
 * Uses real timers (10s per order). Type `help` for the command list.
 */
const controller = new OrderController({
  onLog: (line) => console.log(line),
});

const HELP = `
Commands:
  normal   - create a new Normal order
  vip      - create a new VIP order
  +bot     - add a cooking bot
  -bot     - remove the newest cooking bot
  status   - show pending / processing / complete state
  help     - show this message
  exit     - quit
`;

function printStatus() {
  const s = controller.status();
  const pending = s.pending.map((o) => `${o.type}#${o.id}`).join(', ') || '(none)';
  const complete = s.complete.map((o) => `${o.type}#${o.id}`).join(', ') || '(none)';
  const bots =
    s.bots.map((b) => `Bot#${b.id}:${b.status}${b.order ? `(#${b.order})` : ''}`).join(', ') ||
    '(none)';
  console.log('--- STATUS ---');
  console.log(`  PENDING : ${pending}`);
  console.log(`  BOTS    : ${bots}`);
  console.log(`  COMPLETE: ${complete}`);
  console.log('--------------');
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> ',
});

console.log("McDonald's Order Controller (interactive CLI)");
console.log(HELP);
rl.prompt();

rl.on('line', (input) => {
  const cmd = input.trim().toLowerCase();
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
      console.log(`Unknown command: "${cmd}". Type "help" for options.`);
  }
  rl.prompt();
});

rl.on('close', () => {
  console.log('Goodbye!');
  process.exit(0);
});
