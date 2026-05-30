const readline = require('readline');
const OrderController = require('../controllers/order-controller');

function getTimestamp() {
  const now = new Date();
  console.log(now.getHours(), now.getMinutes(), now.getSeconds());
  return [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

const controller = new OrderController({
  processingTime: 10000,
  onLog: (message) => console.log(`[${getTimestamp()}] ${message}`),
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function printStatus() {
  const status = controller.getStatus();
  console.log('\n========== Current Status ==========');

  console.log(`\nBots (${status.totalBots}):`);
  if (status.bots.length === 0) {
    console.log('  (none)');
  }
  status.bots.forEach((bot) => {
    const detail = bot.currentOrder ? `Processing Order #${bot.currentOrder}` : '';
    console.log(`  Bot #${bot.id}: ${bot.status} ${detail}`);
  });

  console.log(`\nPending Orders (${status.totalPending}):`);
  if (status.pendingOrders.length === 0) {
    console.log('  (none)');
  }
  status.pendingOrders.forEach((order) => {
    console.log(`  Order #${order.id} [${order.type}]`);
  });

  console.log(`\nCompleted Orders (${status.totalCompleted}):`);
  if (status.completedOrders.length === 0) {
    console.log('  (none)');
  }
  status.completedOrders.forEach((order) => {
    console.log(`  Order #${order.id} [${order.type}]`);
  });

  console.log('====================================\n');
}

function showMenu() {
  console.log("--- McDonald's Order Controller ---");
  console.log('1. New Normal Order');
  console.log('2. New VIP Order');
  console.log('3. + Bot  (Add Bot)');
  console.log('4. - Bot  (Remove Bot)');
  console.log('5. Show Status');
  console.log('q. Quit');
  rl.question('\n==> Select an option: ', handleInput);
}

function handleInput(input) {
  const choice = input.trim().toLowerCase();

  switch (choice) {
    case '1':
      controller.addOrder('Normal');
      break;
    case '2':
      controller.addOrder('VIP');
      break;
    case '3':
      controller.addBot();
      break;
    case '4':
      controller.removeBot();
      break;
    case '5':
      printStatus();
      break;
    case 'q':
      console.log('Thank you for using the McDonald\'s Order Management System, Goodbye!');
      rl.close();
      process.exit(0);
      return;
    default:
      console.log('Invalid option. Please try again.');
  }

  showMenu();
}

console.log(`[${getTimestamp()}] McDonald's Order Management System - Interactive Mode\n`);
showMenu();
