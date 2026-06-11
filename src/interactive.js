const readline = require('readline');
const { createLogger } = require('./logger');
const { OrderController } = require('./orderController');

function printHelp() {
  console.log('');
  console.log('Commands:');
  console.log('  normal   - create a normal order');
  console.log('  vip      - create a VIP order');
  console.log('  +bot     - add a cooking bot');
  console.log('  -bot     - remove the newest bot');
  console.log('  status   - show current state');
  console.log('  help     - show this help');
  console.log('  quit     - exit');
  console.log('');
}

function showStatus(controller) {
  const summary = controller.getSummary();
  const pending = controller.pendingOrders.map((order) => `#${order.id}(${order.type})`).join(', ') || 'none';
  const bots = controller.bots
    .map((bot) => {
      if (bot.currentOrder) {
        return `#${bot.id}:${bot.status}(order #${bot.currentOrder.id})`;
      }
      return `#${bot.id}:${bot.status}`;
    })
    .join(', ') || 'none';

  console.log(`Pending: ${pending}`);
  console.log(`Bots: ${bots}`);
  console.log(`Completed: ${summary.totalProcessed}`);
}

function startInteractive() {
  const logger = createLogger((line) => console.log(line));
  const controller = new OrderController(logger);

  logger.log('Interactive Order Controller started');
  logger.log('Type "help" to see commands');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
  });

  rl.prompt();

  rl.on('line', (input) => {
    const command = input.trim().toLowerCase();

    switch (command) {
      case 'normal':
        controller.createOrder('normal');
        break;
      case 'vip':
        controller.createOrder('vip');
        break;
      case '+bot':
        controller.addBot();
        break;
      case '-bot':
        controller.removeBot();
        break;
      case 'status':
        showStatus(controller);
        break;
      case 'help':
        printHelp();
        break;
      case 'quit':
      case 'exit':
        rl.close();
        return;
      default:
        if (command) {
          console.log(`Unknown command: ${command}`);
          printHelp();
        }
        break;
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('Goodbye.');
    process.exit(0);
  });
}

if (require.main === module) {
  startInteractive();
}

module.exports = { startInteractive };
