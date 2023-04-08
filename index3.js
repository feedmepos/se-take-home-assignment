const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let orderId = 0;
let vipOrders = [];
let normalOrders = [];
let pendingOrders = [];
let completedOrders = [];
let botCount = 0;
let idleBots = [];

class Order {
  constructor(type, id) {
    this.type = type;
    this.id = id;
  }
}

class Bot {
  constructor(id) {
    this.id = id;
    this.busy = false;
  }

  start(order) {
    this.busy = true;
    console.log(`Bot ${this.id} started processing order ${order.id}`);
    setTimeout(() => {
      completedOrders.push(order);
      console.log(`Bot ${this.id} completed processing order ${order.id}`);
      this.busy = false;
      processNextOrder();
    }, 10000);
  }
}

function addOrder(type) {
  const order = new Order(type, ++orderId);
  if (type === 'VIP') {
    vipOrders.push(order);
    console.log(`VIP Order ${order.id} added to PENDING area`);
  } else {
    normalOrders.push(order);
    console.log(`Normal Order ${order.id} added to PENDING area`);
  }
  pendingOrders.push(order);
  processNextOrder();
}

function processNextOrder() {
    console.log('pending Order', pendingOrders)
    console.log('idleBots', idleBots)
  if (idleBots.length === 0 || pendingOrders.length === 0) {
    return;
  }

  const bot = idleBots.shift();
  const order = pendingOrders.shift();

  if (order.type === 'VIP') {
    console.log(`Bot ${bot.id} started processing VIP Order ${order.id}`);
  } else {
    console.log(`Bot ${bot.id} started processing Normal Order ${order.id}`);
  }

  bot.start(order);
}

function addBot() {
  const bot = new Bot(++botCount);
  idleBots.push(bot);
  console.log(`Bot ${bot.id} added. Total bots: ${botCount}`);
  processNextOrder();
}

function removeBot() {
  if (botCount === 0) {
    console.log(`No bots to remove.`);
    return;
  }

  const bot = idleBots.pop() || new Bot(++botCount);
  console.log(`Bot ${bot.id} removed. Total bots: ${--botCount}`);
  if (bot.busy) {
    console.log(`Processing order ${bot.currentOrder.id} moved back to PENDING area.`);
    pendingOrders.unshift(bot.currentOrder);
  }
}

rl.on('line', (input) => {
  const command = input.trim();
  switch (command) {
    case 'n':
      addOrder('NORMAL');
      break;
    case 'v':
      addOrder('VIP');
      break;
    case '+ Bot':
      addBot();
      break;
    case '- Bot':
      removeBot();
      break;
    case 'Exit':
      rl.close();
      break;
    default:
      console.log('Invalid command.');
  }
});
