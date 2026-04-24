'use strict';

const { OrderController } = require('./orderController');

function ts() {
  return new Date().toTimeString().slice(0, 8); // HH:MM:SS
}

function log(msg = '') {
  process.stdout.write(`[${ts()}] ${msg}\n`);
}

function printState(ctrl) {
  const pending = ctrl.pending.length > 0
    ? ctrl.pending.map(String).join(', ')
    : '(empty)';
  const complete = ctrl.complete.length > 0
    ? ctrl.complete.map(String).join(', ')
    : '(empty)';
  log(`  PENDING : ${pending}`);
  log(`  COMPLETE: ${complete}`);
  ctrl.bots.forEach(b =>
    log(`  Bot #${b.id}  : ${b.currentOrder ? `processing ${b.currentOrder}` : 'IDLE'}`)
  );
}

// Resolves once pending is empty and all bots are idle.
function waitForIdle(ctrl) {
  return new Promise(resolve => {
    function check() {
      if (ctrl.pending.length === 0 && ctrl.bots.every(b => b.idle)) {
        ctrl.off('orderCompleted', check);
        ctrl.off('botIdle', check);
        resolve();
      }
    }
    ctrl.on('orderCompleted', check);
    ctrl.on('botIdle', check);
    check();
  });
}

async function main() {
  log('=== McDonald\'s Order Controller Simulation ===');

  const ctrl = new OrderController(10000);

  ctrl.on('botPickedUp',    (bot, order) => log(`Bot #${bot.id} picks up Order ${order}`));
  ctrl.on('orderCompleted', (bot, order) => log(`Bot #${bot.id} completed Order ${order} → COMPLETE`));
  ctrl.on('orderReturned',  (bot, order) => log(`Order ${order} returned to PENDING`));
  ctrl.on('botIdle',        (bot)        => log(`Bot #${bot.id} is IDLE`));

  // ── Phase 1: Order priority ──────────────────────────────────────────────
  log('');
  log('--- Phase 1: Order Priority ---');
  const o1 = ctrl.addNormalOrder();
  log(`Added Normal Order ${o1}`);
  const o2 = ctrl.addVIPOrder();
  log(`Added VIP Order ${o2}  → placed before Normal orders`);
  const o3 = ctrl.addVIPOrder();
  log(`Added VIP Order ${o3}  → placed after ${o2}, before Normal orders`);
  printState(ctrl);

  // ── Phase 2: Add bots ────────────────────────────────────────────────────
  log('');
  log('--- Phase 2: Adding Bots ---');
  ctrl.addBot(); // Bot #1 picks up #2(VIP) — event fires here
  ctrl.addBot(); // Bot #2 picks up #3(VIP) — event fires here
  printState(ctrl);

  // ── Phase 3: Remove newest bot while processing ──────────────────────────
  log('');
  log('--- Phase 3: Removing Newest Bot (Bot #2) ---');
  ctrl.removeBot(); // order #3(VIP) returned — event fires here
  printState(ctrl);

  // ── Phase 4: Wait for all orders to complete ─────────────────────────────
  log('');
  log('--- Phase 4: Processing Orders (10s per order) ---');
  await waitForIdle(ctrl);

  log('');
  log('=== Simulation Complete ===');
  printState(ctrl);
}

main().catch(err => {
  process.stderr.write(`[${ts()}] ERROR: ${err.message}\n`);
  process.exit(1);
});
