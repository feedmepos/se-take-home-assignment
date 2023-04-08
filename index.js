const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// initialize variables
let orderNumber = 0;
let normalOrders = [];
let vipOrders = [];
let pendingOrders = [];
let processingOrders = [];
let completeOrders = [];
let botCount = 0;
let idle = true;

// define functions
function printStatus() {
  console.log('==========');
  console.log(`Normal Orders: ${normalOrders.length}`);
  console.log(`VIP Orders: ${vipOrders.length}`);
  console.log(`Pending Orders: ${pendingOrders.length}`);
  console.log(`Processing Orders: ${processingOrders.length}`);
  console.log(`Complete Orders: ${completeOrders.length}`);
  console.log(`Bots: ${botCount}`);
  console.log('==========');
}

function addNormalOrder() {
  const order = { number: ++orderNumber, type: 'Normal', timestamp: new Date() };
  normalOrders.push(order);
  pendingOrders.push(order);
  console.log(`New Normal Order: ${order.number}`);
  // Re-execute bot if bot idle
  if(idle)  processPendingOrders()
}

function addVipOrder() {
  const order = { number: ++orderNumber, type: 'VIP', timestamp: new Date() };
  vipOrders.push(order);
  // find the index of the last VIP order
  const lastVipIndex = pendingOrders.findIndex(o => o.type === 'VIP');
  // insert the new VIP order after the last VIP order, or at the beginning if there are no VIP orders
  pendingOrders.splice(lastVipIndex + 1, 0, order);
  console.log(`New VIP Order: ${order.number}`);
   // Re-execute bot if bot idle
   if(idle)  processPendingOrders()
}

function addBot() {
  botCount++;
  console.log(`Added Bot: ${botCount}`);
  processPendingOrders();
}

function removeBot() {
  if (botCount === 0) {
    console.log('No bots to remove');
    return;
  }
  botCount--;
  console.log(`Removed Bot: ${botCount + 1}`);
  // if the bot is currently processing an order, move it back to the pending queue
  if (pendingOrders.length === 0) {
    console.log('No pending orders');
    return;
  }
  const currentOrder = pendingOrders[0];
  if (currentOrder.bot) {
    currentOrder.bot = undefined;
    pendingOrders.unshift(currentOrder);
    console.log(`Order ${currentOrder.number} moved back to pending`);
  }
}

function processPendingOrders() {
  if (botCount === 0 || pendingOrders.length === 0) {
    idle = true
    return;
  }
  const order = pendingOrders.shift();
  processingOrders.push(order)
  order.status = 'Processing';
  console.log(`Bot processing Order ${order.number}`);
  // simulate bot processing time
  setTimeout(() => {
    order.status = 'Complete';
    processingOrders.shift();
    completeOrders.push(order);
    console.log(`Order ${order.number} complete`);
    // process the next order
    processPendingOrders();
  }, 10000);
  order.bot = botCount;
}

// define command line interface
rl.setPrompt('> ');
rl.prompt();

rl.on('line', (line) => {
  const command = line.trim().toLowerCase();
  switch (command) {
    case 'status':
      printStatus();
      break;
    case 'normal':
      addNormalOrder();
      break;
    case 'vip':
      addVipOrder();
      break;
    case '+bot':
      addBot();
      break;
    case '-bot':
      removeBot();
      break;
    case 'exit':
      rl.close();
      break;
    default:
      console.log('Invalid command');
  }
  rl.prompt();
}).on('close', () => {console.log('Closing the system, bye...')});
