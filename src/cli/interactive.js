const readline = require('readline');
const OrderController = require('../controllers/order-controller');

// ANSI escape codes for coloring (safe and zero-dependency)
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function getTimestamp() {
  const now = new Date();
  return [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const controller = new OrderController({
  processingTime: 10000,
  onLog: (message) => {
    // Determine color based on message content
    let coloredMessage = message;
    if (message.includes('completed')) {
      coloredMessage = `${COLORS.green}${message}${COLORS.reset}`;
    } else if (message.includes('picked up') || message.includes('processing')) {
      coloredMessage = `${COLORS.yellow}${message}${COLORS.reset}`;
    } else if (message.includes('created') || message.includes('Bot #')) {
      coloredMessage = `${COLORS.cyan}${message}${COLORS.reset}`;
    } else if (message.includes('destroyed') || message.includes('removed')) {
      coloredMessage = `${COLORS.red}${message}${COLORS.reset}`;
    }

    console.log(`[${getTimestamp()}] ${coloredMessage}`);
  },
});

function printStatus() {
  const status = controller.getStatus();
  console.log(`\n${COLORS.bold}${COLORS.cyan}========== Current Status ==========${COLORS.reset}`);

  console.log(`\n${COLORS.bold}Bots (${status.totalBots}):${COLORS.reset}`);
  if (status.bots.length === 0) {
    console.log(`  ${COLORS.dim}(none)${COLORS.reset}`);
  }
  status.bots.forEach((bot) => {
    const detail = bot.currentOrder 
      ? `${COLORS.yellow}Processing Order #${bot.currentOrder}${COLORS.reset}` 
      : `${COLORS.dim}Idle${COLORS.reset}`;
    console.log(`  Bot #${bot.id}: ${COLORS.bold}${bot.status}${COLORS.reset} - ${detail}`);
  });

  console.log(`\n${COLORS.bold}Pending Orders (${status.totalPending}):${COLORS.reset}`);
  if (status.pendingOrders.length === 0) {
    console.log(`  ${COLORS.dim}(none)${COLORS.reset}`);
  }
  status.pendingOrders.forEach((order) => {
    const typeColor = order.type === 'VIP' ? COLORS.yellow : COLORS.reset;
    console.log(`  Order #${order.id} [${typeColor}${order.type}${COLORS.reset}]`);
  });

  console.log(`\n${COLORS.bold}Completed Orders (${status.totalCompleted}):${COLORS.reset}`);
  if (status.completedOrders.length === 0) {
    console.log(`  ${COLORS.dim}(none)${COLORS.reset}`);
  }
  status.completedOrders.forEach((order) => {
    const typeColor = order.type === 'VIP' ? COLORS.yellow : COLORS.reset;
    console.log(`  Order #${order.id} [${typeColor}${order.type}${COLORS.reset}] - ${COLORS.green}COMPLETE${COLORS.reset}`);
  });

  console.log(`\n${COLORS.bold}${COLORS.cyan}====================================${COLORS.reset}\n`);
}

function showMenu() {
  const status = controller.getStatus();
  console.log(`\n${COLORS.bold}${COLORS.cyan}--- McDonald's Order Controller ---${COLORS.reset}`);
  console.log(
    `${COLORS.dim}[Active Bots: ${COLORS.cyan}${status.totalBots}${COLORS.dim} | ` +
    `Pending Orders: ${COLORS.yellow}${status.totalPending}${COLORS.dim} | ` +
    `Completed: ${COLORS.green}${status.totalCompleted}${COLORS.dim}]${COLORS.reset}`
  );
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
      console.log(`\n${COLORS.green}Thank you for using the McDonald's Order Management System. Goodbye!${COLORS.reset}`);
      rl.close();
      process.exit(0);
      return;
    default:
      console.log(`${COLORS.red}Invalid option. Please try again.${COLORS.reset}`);
  }

  showMenu();
}

// Initial start
console.log(`${COLORS.bold}${COLORS.green}[${getTimestamp()}] McDonald's Order Management System - Interactive Mode${COLORS.reset}\n`);
showMenu();
