'use strict';

/**
 * Interactive CLI for the McDonald's order controller.
 *
 * Commands (type and press Enter):
 *   normal | n     New NORMAL order
 *   vip    | v     New VIP order
 *   +bot   | +     Add a cooking bot
 *   -bot   | -     Remove the newest cooking bot
 *   status | s     Print current PENDING / COMPLETE / BOTS state
 *   help   | h     Show this help
 *   exit   | quit  Quit
 *
 * Each order takes 10 seconds to cook (override with PROCESS_MS for demos).
 */

const readline = require('readline');
const { OrderController } = require('./orderController');
const { logLine, formatState, attachLogging } = require('./logger');

const PROCESS_MS = Number(process.env.PROCESS_MS) || 10000;
const controller = new OrderController({ processMs: PROCESS_MS });
attachLogging(controller);

const HELP = [
  'Commands:',
  '  normal | n     New NORMAL order',
  '  vip    | v     New VIP order',
  '  +bot   | +     Add a cooking bot',
  '  -bot   | -     Remove the newest cooking bot',
  '  status | s     Print current state',
  '  help   | h     Show this help',
  '  exit   | quit  Quit',
].join('\n');

function printStatus() {
  logLine(`STATUS -> ${formatState(controller)}`);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'order> ',
});

console.log("McDonald's Order Controller (interactive)");
console.log(`Each order takes ${PROCESS_MS / 1000}s to cook.`);
console.log(HELP);
rl.prompt();

rl.on('line', (line) => {
  const cmd = line.trim().toLowerCase();
  switch (cmd) {
    case 'normal':
    case 'n':
      controller.addNormalOrder();
      break;
    case 'vip':
    case 'v':
      controller.addVipOrder();
      break;
    case '+bot':
    case '+':
      controller.addBot();
      break;
    case '-bot':
    case '-':
      if (!controller.removeBot()) logLine('No bots to remove.');
      break;
    case 'status':
    case 's':
      printStatus();
      break;
    case 'help':
    case 'h':
    case '?':
      console.log(HELP);
      break;
    case 'exit':
    case 'quit':
    case 'q':
      rl.close();
      return;
    case '':
      break;
    default:
      logLine(`Unknown command: "${cmd}" (type "help")`);
  }
  rl.prompt();
});

rl.on('close', () => {
  console.log('Bye.');
  process.exit(0);
});
