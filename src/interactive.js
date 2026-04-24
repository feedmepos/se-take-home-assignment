'use strict';

const readline = require('readline');
const { OrderController } = require('./orderController');

const ctrl = new OrderController(10000);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '\n> ',
});

function ts() {
  return new Date().toTimeString().slice(0, 8);
}

// Clear the current prompt line before printing async events,
// then reprint the prompt so the cursor stays usable.
function log(msg) {
  process.stdout.write(`\r\x1b[K[${ts()}] ${msg}\n`);
  rl.prompt(true);
}

function printState() {
  const pending  = ctrl.pending.length  ? ctrl.pending.map(String).join(', ')  : '(empty)';
  const complete = ctrl.complete.length ? ctrl.complete.map(String).join(', ') : '(empty)';
  const bots     = ctrl.bots.length
    ? ctrl.bots.map(b => `Bot#${b.id}:${b.currentOrder ? `processing ${b.currentOrder}` : 'IDLE'}`).join('  ')
    : '(no bots)';
  process.stdout.write(`\r\x1b[K`);
  console.log(`  PENDING  : ${pending}`);
  console.log(`  COMPLETE : ${complete}`);
  console.log(`  BOTS     : ${bots}`);
  rl.prompt(true);
}

// ── Async event output ───────────────────────────────────────────────────────
ctrl.on('botPickedUp',    (bot, order) => log(`Bot #${bot.id} picks up Order ${order}`));
ctrl.on('orderCompleted', (bot, order) => log(`Bot #${bot.id} completed Order ${order} → COMPLETE`));
ctrl.on('orderReturned',  (bot, order) => log(`Order ${order} returned to PENDING`));
ctrl.on('botIdle',        (bot)        => log(`Bot #${bot.id} is IDLE`));

// ── Command handler ──────────────────────────────────────────────────────────
const COMMANDS = `
  normal  (n)   — add a Normal order
  vip     (v)   — add a VIP order
  +bot    (+)   — add a cooking bot
  -bot    (-)   — remove the newest bot
  status  (s)   — show current state
  help    (h)   — show this help
  quit    (q)   — exit`;

rl.on('line', line => {
  const cmd = line.trim().toLowerCase();
  switch (cmd) {
    case 'normal': case 'n': {
      const order = ctrl.addNormalOrder();
      log(`Added Normal Order ${order}`);
      break;
    }
    case 'vip': case 'v': {
      const order = ctrl.addVIPOrder();
      log(`Added VIP Order ${order}`);
      break;
    }
    case '+bot': case '+': {
      const bot = ctrl.addBot();
      log(`Bot #${bot.id} added`);
      break;
    }
    case '-bot': case '-': {
      const bot = ctrl.removeBot();
      log(bot ? `Bot #${bot.id} removed` : 'No bots to remove');
      break;
    }
    case 'status': case 's':
      printState();
      break;
    case 'help': case 'h': case '':
      console.log(COMMANDS);
      rl.prompt(true);
      break;
    case 'quit': case 'q': case 'exit':
      console.log('Goodbye.');
      process.exit(0);
      break;
    default:
      log(`Unknown command "${cmd}". Type "help" to see available commands.`);
  }
});

rl.on('close', () => process.exit(0));

// ── Startup ──────────────────────────────────────────────────────────────────
console.log("McDonald's Order Controller — Interactive Mode");
console.log(COMMANDS);
rl.prompt();
