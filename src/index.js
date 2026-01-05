const fs = require('fs');
const path = require('path');

// Result log file
const RESULT_FILE = path.join(__dirname, '../scripts/result.txt');

//------------------
// Global variables
//------------------
let orderId = 1;
let vipQueue = [];             // pending VIP orders
let normalQueue = [];          // pending Normal orders
let completedOrders = [];
let bots = [];                 // all active bots

//-------------
// Data Models
//-------------
// Creates a new order object
function createOrder(type) {
  return {
    id: orderId++,
    type, // 'VIP' or 'normal'
    status: 'PENDING'
  };
}

// Creates a new bot object
function createBot(id) {
  return {
    id,
    currentOrder: null, // order currently being processed
    timer: null         // processing timer
  };
}

//------------------
// Helper Functions
//------------------
// Logs message to result.txt with timestamp
function log(message) {
  const time = new Date().toLocaleTimeString('en-GB'); // HH:MM:SS
  const line = `${time} ${message}`;
  console.log(line);
  fs.appendFileSync(RESULT_FILE, line + "\n");
}

// Picks the next order: VIP first, then Normal
function getNextOrder() {
  if (vipQueue.length > 0) return vipQueue.shift();
  if (normalQueue.length > 0) return normalQueue.shift();
  return null;
}

//---------------
// Core Functions
//---------------
// Add a new Normal order
function newNormalOrder() {
  const order = createOrder('NORMAL');
  normalQueue.push(order);
  log(`New NORMAL Order#${order.id} added to PENDING`);
  return order;
}

// Add a new VIP order
function newVIPOrder() {
  const order = createOrder('VIP');
  vipQueue.push(order);
  log(`New VIP Order#${order.id} added to PENDING`);
  return order;
}

// Print current queues (useful for debugging/testing)
function printQueues() {
  console.log(
    `VIP Queue: [${vipQueue.map(o => o.id).join(', ')}], Normal Queue: [${normalQueue.map(o => o.id).join(', ')}]`
  );
}

// Start processing next order for a bot
function startBot(bot) {
  console.log(`Bot#${bot.id} is checking for orders...`);
  const order = getNextOrder();

  if (!order) {
    log(`No pending orders found. Bot#${bot.id} is idle.`);
    return;
  }

  // Mark order status as processing
  order.status = 'PROCESSING';
  bot.currentOrder = order;
  log(`Bot#${bot.id} picked ${order.type} Order#${order.id}`);

  // Simulate 10-second processing
  bot.timer = setTimeout(() => {
    order.status = 'COMPLETE';
    completedOrders.push(order);
    log(`Bot#${bot.id} completed Order#${order.id}`);

    bot.currentOrder = null;
    bot.timer = null;

    console.log(`Completed Orders: [${completedOrders.map(o => o.id).join(', ')}]`);

    // Automatically pick next order after completing current one
    startBot(bot);
  }, 10000);
}

// Add a new bot and start processing immediately
function addBot() {
  const bot = createBot(bots.length + 1);
  bots.push(bot);

  log(`+ Bot#${bot.id} created`);
  startBot(bot);

  return bot;
}

// Remove the newest bot
function removeBot() {
  const bot = bots.pop();

  if (!bot) {
    log(`No bots to remove`);
    return;
  }

  // If bot is processing, stop it and return order status to PENDING
  if (bot.timer) {
    clearTimeout(bot.timer);
    const order = bot.currentOrder;
    order.status = 'PENDING';

    if (order.type === 'VIP') vipQueue.unshift(order);
    else normalQueue.unshift(order);

    log(`- Bot#${bot.id} removed. Order#${order.id} returned to PENDING`);
  } else {
    log(`- Bot#${bot.id} removed (was idle)`);
  }
}

function isSystemIdle() {
  const noPendingOrders = vipQueue.length === 0 && normalQueue.length === 0;
  const allBotsIdle = bots.every(bot => bot.currentOrder === null);

  return noPendingOrders && allBotsIdle;
}

//---------------------------
// Exports (for testing / CI)
//---------------------------
module.exports = {
  newNormalOrder,
  newVIPOrder,
  addBot,
  removeBot,
  printQueues,
  log,
  isSystemIdle
};
