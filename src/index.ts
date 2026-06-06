import { OrderController } from './order-controller.js';
import { createPrinter, timestamp } from './format.js';

const PROCESSING_MS = 10_000;
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function printSummary(controller: OrderController): void {
  const vip = controller.completed.filter((o) => o.type === 'VIP').length;
  const normal = controller.completed.filter((o) => o.type === 'NORMAL').length;
  console.log('');
  console.log('Final Status:');
  console.log(`- Total Orders Processed: ${controller.completed.length} (${vip} VIP, ${normal} Normal)`);
  console.log(`- Orders Completed: ${controller.completed.length}`);
  console.log(`- Active Bots: ${controller.bots.length}`);
  console.log(`- Pending Orders: ${controller.pending.length}`);
}

function waitUntilDrained(controller: OrderController): Promise<void> {
  return new Promise((resolve) => {
    controller.on((event) => {
      if (
        (event.type === 'ORDER_COMPLETED' || event.type === 'BOT_IDLE') &&
        controller.isDrained()
      ) {
        resolve();
      }
    });
  });
}

async function main(): Promise<void> {
  const controller = new OrderController({ processingMs: PROCESSING_MS });
  controller.on(createPrinter((line) => console.log(line), PROCESSING_MS / 1000));

  console.log(`[${timestamp()}] System initialized with 0 bots`);

  controller.newOrder('NORMAL'); 
  controller.newOrder('NORMAL'); 
  controller.newOrder('VIP'); 
  controller.newOrder('VIP'); 
  controller.newOrder('NORMAL'); 

  controller.addBot(); 
  controller.addBot(); 

  const drained = waitUntilDrained(controller);

  await sleep(3000);
  controller.removeBot(); 

  await sleep(1000);
  controller.addBot(); 

  await drained;
  printSummary(controller);
}

main();
