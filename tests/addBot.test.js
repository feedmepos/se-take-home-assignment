//unit tests of addBot()

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { addBot, bots, pendingOrders, allOrders, completedOrders, OrderType, addOrder } from '../orderSystem.js';
import { processOrders } from '../orderSystem.js';

const RESULT_FILE = path.join('scripts', 'result.txt');

// Reset system before each test
function resetSystem() {
  fs.writeFileSync(RESULT_FILE, '', { encoding: 'utf8' });
  pendingOrders.length = 0;
  allOrders.length = 0;
  completedOrders.length = 0;
  bots.length = 0;
}

// Helper to run a test
function runTest(name, fn) {
  try {
    resetSystem();
    fn();
    console.log(`[PASS] ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(err);
  }
}

// ===== Tests =====
runTest('Bot is added to the system', () => {
  addBot();

  // Check bots array
  assert.strictEqual(bots.length, 1);
  assert.strictEqual(bots[0].id, 1);
  assert.strictEqual(bots[0].currentOrder, null);
  
  // Check log
  const logs = fs.readFileSync(RESULT_FILE, 'utf8');
  assert.ok(logs.includes('Bot #1 created'), 'Log should mention Bot #1 created');
});

runTest('Bot picks up a pending order immediately', () => {
  // Add a pending order first
  addOrder(OrderType.NORMAL); // #1001

  // Add bot
  addBot(); // #1

  // Bot should immediately pick up the order
  assert.strictEqual(bots[0].currentOrder.id, allOrders[0].id);
  assert.strictEqual(bots[0].currentOrder.status, 'PROCESSING');

  // pendingOrders should now be empty
  assert.strictEqual(pendingOrders.length, 0);

  // Check log mentions picking up the order
  const logs = fs.readFileSync(RESULT_FILE, 'utf8');
  assert.ok(logs.includes('picked up Normal Order'), 'Log should mention the bot picked up the order');
});