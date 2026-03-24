const readline = require('readline');
const { createOrder, getPendingOrders, getCompleteOrders } = require('./services/orderService');
const { addBot, removeNewestBot, tryAssignIdleBot } = require('./services/botService');
const { state } = require('./state');
const { log } = require('./logger');

function startCLI() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  if (process.stdin.isTTY) {
    process.stdout.write('> ');
  }

  rl.on('line', (line) => {
    const cmd = line.trim().toLowerCase();

    switch (cmd) {
      case '+order':
        createOrder('NORMAL');
        tryAssignIdleBot();
        break;
      case '+vip':
        createOrder('VIP');
        tryAssignIdleBot();
        break;
      case '+bot':
        addBot();
        break;
      case '-bot':
        removeNewestBot();
        break;
      case 'status': {
        const pending = getPendingOrders();
        const complete = getCompleteOrders();
        const bots = state.bots;
        log(`--- STATUS: pending=${pending.length} complete=${complete.length} bots=${bots.length} ---`);
        pending.forEach(o => log(`  PENDING  [${o.type}] ${o.displayId}`));
        complete.forEach(o => log(`  COMPLETE [${o.type}] ${o.displayId} at ${o.completedAt.toTimeString().slice(0, 8)}`));
        bots.forEach(b => log(`  BOT ${b.displayId} [${b.status}]`));
        break;
      }
      case 'exit':
        console.log('Exiting...');
        rl.close();
        setTimeout(() => process.exit(0), 100);
        return;
      default:
        if (cmd) console.log('Commands: +order, +vip, +bot, -bot, status, exit');
    }

    if (process.stdin.isTTY) {
      process.stdout.write('> ');
    }
  });

  rl.on('close', () => {
    // stdin closed (EOF in non-interactive/CI mode) — exit cleanly
    setTimeout(() => process.exit(0), 100);
  });
}

module.exports = { startCLI };
