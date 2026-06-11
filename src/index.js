const { createLogger } = require('./logger');
const { OrderController, sleep } = require('./orderController');

async function wait(seconds) {
  await sleep(seconds * 1000);
}

async function runSimulation() {
  const lines = [];
  const logger = createLogger((line) => lines.push(line));
  const controller = new OrderController(logger);

  logger.log('System initialized with 0 bots');

  controller.createOrder('normal');
  await wait(1);

  controller.createOrder('vip');
  await wait(1);
  controller.createOrder('normal');
  await wait(1);

  controller.addBot();
  await wait(1);
  controller.addBot();
  await wait(11);

  controller.createOrder('vip');
  await wait(12);

  controller.removeBot();
  await wait(2);

  const summary = controller.getSummary();

  return [
    "McDonald's Order Management System - Simulation Results",
    '',
    lines.join('\n'),
    '',
    'Final Status:',
    `- Total Orders Processed: ${summary.totalProcessed} (${summary.vipCompleted} VIP, ${summary.normalCompleted} Normal)`,
    `- Orders Completed: ${summary.totalProcessed}`,
    `- Active Bots: ${summary.activeBots}`,
    `- Pending Orders: ${summary.pendingOrders}`,
  ].join('\n');
}

if (require.main === module) {
  runSimulation()
    .then((output) => {
      process.stdout.write(`${output}\n`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runSimulation };
