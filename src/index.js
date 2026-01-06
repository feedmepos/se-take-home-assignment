const fs = require('fs');
const path = require('path');

// Result log file
const RESULT_FILE = path.join(__dirname, '../scripts/result.txt');
fs.writeFileSync(RESULT_FILE, ''); // reset log on each run

//------------------
// Global variables
//------------------
let orderId = 1;
let vipQueue = [];
let normalQueue = [];
let completedOrders = [];
let bots = [];

//-------------
// Data Models
//-------------
// Creates a new order object
function createOrder(type) {
  return {
    id: orderId++,
    type,               // 'VIP' or 'NORMAL'
    status: 'PENDING',
    createdAt: Date.now(),
    startedAt: null,
    completedAt: null
  };
}

function createBot(id) {
  return {
    id,
    currentOrder: null,
    timer: null,
    status: 'IDLE'
  };
}

//------------------
// Helper Functions
//------------------
// Logs message to result.txt with timestamp
function log(message, withTimestamp = true) {
  let line;

  if (withTimestamp) {
    const time = new Date().toLocaleTimeString('en-GB'); // HH:MM:SS
    line = `[${time}] ${message}`;
  } else {
    line = message;
  }

  console.log(line);
  fs.appendFileSync(RESULT_FILE, line + '\n');
}

//------------------
// Order Functions
//------------------
function getNextOrder() {
  if (vipQueue.length > 0) return vipQueue.shift();
  if (normalQueue.length > 0) return normalQueue.shift();
  return null;
}

// Add a new Normal order
function newNormalOrder() {
  const order = createOrder('NORMAL');
  normalQueue.push(order);
  log(`Created Normal Order #${order.id} - Status: PENDING`);
  return order;
}

// Add a new VIP order
function newVIPOrder() {
  const order = createOrder('VIP');
  vipQueue.push(order);
  log(`Created VIP Order #${order.id} - Status: PENDING`);
  return order;
}

// Print current queues
function printQueues() {
  console.log(
    `VIP Queue: [${vipQueue.map(o => o.id).join(', ')}], Normal Queue: [${normalQueue.map(o => o.id).join(', ')}]`
  );
}

//----------------
// Bot Functions
//----------------
// Start processing next order for a bot
function startBot(bot) {
  const order = getNextOrder();

  if (!order) {
    bot.status = 'IDLE';
    log(`Bot #${bot.id} is now IDLE - No pending orders`);
    return;
  }

  order.status = 'PROCESSING';
  order.startedAt = Date.now();
  bot.currentOrder = order;
  bot.status = 'ACTIVE';

  log(
    `Bot #${bot.id} picked up ${order.type} Order #${order.id} - Status: PROCESSING`
  );

  bot.timer = setTimeout(() => {
    order.status = 'COMPLETE';
    order.completedAt = Date.now();
    completedOrders.push(order);

    const processingTime = Math.round(
      (order.completedAt - order.startedAt) / 1000
    );

    log(
      `Bot #${bot.id} completed ${order.type} Order #${order.id} - Status: COMPLETE (Processing time: ${processingTime}s)`
    );

    bot.currentOrder = null;
    bot.timer = null;

    // Automatically pick next order after completing current one
    startBot(bot);
  }, 10000);
}

function addBot() {
  const bot = createBot(bots.length + 1);
  bots.push(bot);

  log(`Bot #${bot.id} created - Status: ACTIVE`);
  startBot(bot);

  return bot;
}

function removeBot() {
  // Remove the newest bot
  const bot = bots.pop();

  if (!bot) {
    log(`No bots available to remove`);
    return;
  }

  // If bot is processing, stop it and return order status to PENDING
  if (bot.timer) {
    clearTimeout(bot.timer);
    const order = bot.currentOrder;

    order.status = 'PENDING';
    order.startedAt = null;

    if (order.type === 'VIP') vipQueue.unshift(order);
    else normalQueue.unshift(order);

    log(
      `Bot #${bot.id} destroyed while PROCESSING - Order #${order.id} returned to PENDING`
    );
  } else {
    log(`Bot #${bot.id} destroyed while IDLE`);
  }
}

function isSystemIdle() {
  const noPendingOrders = vipQueue.length === 0 && normalQueue.length === 0;
  const allBotsIdle = bots.every(bot => bot.currentOrder === null);
  return noPendingOrders && allBotsIdle;
}

function printTitle() {
  log('McDonald’s Order Management System - Simulation Results', false);
  log('--------------------------------------------------------', false);
}

function initSystem() {
  log(`System initialized with ${bots.length} bots`);
}

function printFinalSummary() {
  log('===== Final Summary =====', false);
  log(`Total Orders Processed: ${completedOrders.length}`, false);
  log(
    `VIP Orders: ${completedOrders.filter(o => o.type === 'VIP').length}, ` +
    `Normal Orders: ${completedOrders.filter(o => o.type === 'NORMAL').length}`
  , false);
  log(`Active Bots: ${bots.filter(b => b.status === 'ACTIVE').length}`, false);
  log(`Idle Bots: ${bots.filter(b => b.status === 'IDLE').length}`, false);
  log(`Pending Orders: ${vipQueue.length + normalQueue.length}`, false);
}

//---------
// Exports
//---------
module.exports = {
  printTitle,
  initSystem,
  newNormalOrder,
  newVIPOrder,
  addBot,
  removeBot,
  printQueues,
  log,
  isSystemIdle,
  printFinalSummary
};
