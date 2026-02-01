//unit tests of addOrder()
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { addOrder, OrderType, pendingOrders, allOrders, completedOrders } from '../orderSystem.js';

const RESULT_FILE = path.join('scripts', 'result.txt');

// Reset queues and log file
function resetSystem() {
  fs.writeFileSync(RESULT_FILE, '', { encoding: 'utf8' });
  pendingOrders.length = 0;
  allOrders.length = 0;
  completedOrders.length = 0;
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
runTest('Normal order is added to the queue', () => {
  addOrder(OrderType.NORMAL);

  // Check pendingOrders queue
  assert.strictEqual(pendingOrders.length, 1);
  assert.strictEqual(pendingOrders[0].type, 'Normal');
  assert.strictEqual(pendingOrders[0].status, 'PENDING');

  // Check allOrders
  assert.strictEqual(allOrders.length, 1);
  assert.strictEqual(allOrders[0].type, 'Normal');

  // Check log
  const logs = fs.readFileSync(RESULT_FILE, 'utf8');
  assert.ok(logs.includes('Normal Order'), 'Log should mention Normal Order');
});

runTest('VIP orders are placed before normal orders', () => {
  addOrder(OrderType.NORMAL); 
  addOrder(OrderType.VIP);    
  addOrder(OrderType.NORMAL); 
  addOrder(OrderType.VIP);

  const types = pendingOrders.map(o => o.type);
  
  assert.deepStrictEqual(types, ['VIP', 'VIP', 'Normal', 'Normal']);
});