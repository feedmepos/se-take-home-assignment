import { OrderController } from './OrderController';

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

function timestamp(): string {
  return new Date().toTimeString().slice(0, 8);
}

async function runSimulation(): Promise<void> {
  const log = (msg: string) => console.log(`[${timestamp()}] ${msg}`);

  console.log("McDonald's Order Management System - Simulation Results\n");

  const controller = new OrderController(log);

  log('System initialized with 0 bots and 0 orders');

  // --- Demonstrate Normal and VIP order priority ---
  controller.addOrder('NORMAL'); // #1 → goes to end
  controller.addOrder('VIP');   // #2 → jumps in front of Normal #1
  // Queue: [VIP#2, Normal#1]

  // --- Add 2 bots; each immediately picks up a pending order ---
  controller.addBot(); // Bot#1 → picks VIP#2
  controller.addBot(); // Bot#2 → picks Normal#1
  // Queue: []

  await delay(2000);

  // --- VIP#3 arrives; demonstrate VIP ordering ---
  controller.addOrder('VIP'); // #3 → queue: [VIP#3]

  // --- Bot#3 picks it up immediately ---
  controller.addBot(); // Bot#3 → picks VIP#3
  // Queue: []

  await delay(3000); // t = 5s

  // --- Remove Bot#3 (newest); VIP#3 returns to its correct position ---
  controller.removeBot(); // Bot#3 stopped → VIP#3 back in queue
  // Queue: [VIP#3]  (Bot#1/Bot#2 still processing; 5s left each)

  // --- Wait until all bots finish and queue is empty ---
  await controller.waitForCompletion();

  // --- Final summary ---
  const status = controller.getStatus();
  const vipDone = status.completedOrders.filter(o => o.type === 'VIP').length;
  const normalDone = status.completedOrders.filter(o => o.type === 'NORMAL').length;

  console.log('\nFinal Status:');
  console.log(`- Total Orders Processed: ${status.completedOrders.length} (${vipDone} VIP, ${normalDone} Normal)`);
  console.log(`- Orders Completed: ${status.completedOrders.length}`);
  console.log(`- Active Bots: ${status.bots.length}`);
  console.log(`- Pending Orders: ${status.pendingOrders.length}`);
}

runSimulation().catch(err => {
  console.error('Simulation failed:', err);
  process.exit(1);
});
