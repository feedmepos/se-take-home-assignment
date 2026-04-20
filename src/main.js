const { OrderController } = require('./order-controller');

/** Local time HH:MM:SS for stdout / result.txt (assignment timestamp format). */
function timestamp() {
  return new Date().toTimeString().slice(0, 8);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** One log line with a leading timestamp; run.sh redirects stdout to scripts/result.txt. */
function log(msg) {
  console.log(`[${timestamp()}] ${msg}`);
}

/**
 * CLI demo: orders → add bots → sleep → new VIP → sleep → remove bot.
 * ~22s wall clock (10s per order).
 */
async function main() {
  const controller = new OrderController(10000);
  controller.on('log', msg => log(msg));

  console.log("McDonald's Order Management System — simulation output");
  console.log('');
  log('System initialized with 0 bots');

  // Phase 1: mixed orders — pending [VIP#2, normal#1, normal#3]
  controller.createOrder('normal');
  controller.createOrder('vip');
  controller.createOrder('normal');

  // Phase 2: two bots — VIP#2 and normal#1 in parallel
  controller.addBot();
  controller.addBot();

  // Wait ~10s for first batch to finish
  await sleep(11000);

  // Phase 3: new VIP — idle bot picks VIP#4
  controller.createOrder('vip');

  await sleep(11000);

  // Phase 4: remove newest bot (idle)
  controller.removeBot();

  await sleep(500);

  console.log('');
  console.log('Final status:');
  const vipCount = controller.completedOrders.filter(o => o.type === 'vip').length;
  const normalCount = controller.completedOrders.filter(o => o.type === 'normal').length;
  console.log(
    `- Total orders processed: ${controller.completedOrders.length} (${vipCount} VIP, ${normalCount} Normal)`
  );
  console.log(`- Orders completed: ${controller.completedOrders.length}`);
  console.log(`- Active bots: ${controller.bots.length}`);
  console.log(`- Pending orders: ${controller.pendingOrders.length}`);
}

main().catch(console.error);
