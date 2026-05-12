const { OrderController } = require("./controller");

function timestamp() {
  return new Date().toTimeString().slice(0, 8);
}

function log(msg) {
  console.log(`[${timestamp()}] ${msg}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const ctrl = new OrderController(10000, log);

  console.log("McDonald's Order Management System - Simulation Results");
  console.log();
  log("System initialized with 0 bots");

  ctrl.newNormalOrder();
  ctrl.newVIPOrder();
  ctrl.newNormalOrder();

  ctrl.addBot();
  ctrl.addBot();

  await sleep(3000);
  ctrl.removeBot();

  await sleep(8000);
  ctrl.newVIPOrder();

  await sleep(1000);
  ctrl.addBot();

  await sleep(20000);

  const status = ctrl.getStatus();
  console.log();
  console.log("Final Status:");
  console.log(
    `- Total Orders Processed: ${status.totalCompleted} (${status.vipCompleted} VIP, ${status.normalCompleted} Normal)`,
  );
  console.log(`- Orders Completed: ${status.totalCompleted}`);
  console.log(`- Active Bots: ${status.activeBots}`);
  console.log(`- Pending Orders: ${status.pendingOrders}`);
}

main();
