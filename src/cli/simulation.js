const fs = require('fs');
const path = require('path');
const OrderController = require('../controllers/order-controller');

function getTimestamp() {
  const now = new Date();
  return [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runSimulation() {
  const output = [];

  function log(message) {
    const line = `[${getTimestamp()}] ${message}`;
    output.push(line);
    process.stdout.write(line + '\n');
  }

  const controller = new OrderController({
    processingTime: 10000,
    onLog: log,
  });

  output.push("McDonald's Order Management System - Simulation Results");
  output.push('');
  log('System initialized with 0 bots');

  // The 500ms delays between operations are purely cosmetic.
  // They make the timestamped logs show time progression between actions,
  // making the output look more realistic.
  controller.addOrder('Normal');
  await sleep(500);
  controller.addOrder('VIP');
  await sleep(500);
  controller.addOrder('Normal');
  await sleep(500);

  controller.addBot();
  await sleep(500);
  controller.addBot();

  await sleep(10500);

  controller.addOrder('VIP');
  await sleep(500);

  await sleep(10500);

  controller.removeBot();
  await sleep(500);

  const status = controller.getStatus();
  const vipCount = controller.completedOrders.filter(
    (order) => order.type === 'VIP'
  ).length;
  const normalCount = controller.completedOrders.filter(
    (order) => order.type === 'Normal'
  ).length;

  output.push('');
  output.push('Final Status:');
  output.push(
    `- Total Orders Processed: ${controller.completedOrders.length} (${vipCount} VIP, ${normalCount} Normal)`
  );
  output.push(`- Orders Completed: ${controller.completedOrders.length}`);
  output.push(`- Active Bots: ${status.totalBots}`);
  output.push(`- Pending Orders: ${status.totalPending}`);

  const resultPath = path.join(__dirname, '..', '..', 'scripts', 'result.txt');
  fs.writeFileSync(resultPath, output.join('\n') + '\n');
  process.stderr.write(`\nResults written to ${resultPath}\n`);
}

runSimulation().catch(console.error);
