import * as readline from 'readline';
import { OrderController } from './order.controller';

function createController(): OrderController {
  return new OrderController((msg) => console.log(msg));
}

async function runInteractiveMode(controller: OrderController): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const getStatus = (): void => {
    const stats = controller.getStatus();
    console.log(`- Total Orders Processed: ${stats.totalOrders} (${stats.vipOrders} VIP, ${stats.normalOrders} Normal)`);
    console.log(`- Pending Orders: ${stats.pendingOrders}`);
    console.log(`- Completed Orders: ${stats.completedOrders}`);
    console.log(`- Active Bots: ${stats.activeBots}`);
  };

  const prompt = (): void => {
    rl.question('> ', (cmd) => {
      const command = cmd.trim().toUpperCase();

      if (command === 'N') {
        controller.createOrder('Normal');
      } else if (command === 'V') {
        controller.createOrder('VIP');
      } else if (command === '+') {
        controller.addBot();
      } else if (command === '-') {
        controller.removeBot();
      } else if (command === 'S') {
        console.log('\nCurrent Status:');
        getStatus();
      }else if (command === 'Q') {
        console.log('\nFinal Status:');
        getStatus();
        rl.close();
        return;
      } else if (command !== '') {
        console.log('Unknown command. Available: N (Normal Order), V (VIP Order), + (Add Bot), - (Remove Bot), S (Show Status), Q (Exit)');
      }

      prompt();
    });
  };

  console.log("McDonald's Order Management System");
  console.log('Commands: N (Normal Order), V (VIP Order), + (Add Bot), - (Remove Bot), S (Show Status), Q (Exit)');
  prompt();
}

async function runAutomatedMode(controller: OrderController): Promise<void> {
  console.log("McDonald's Order Management System - Simulation Results\n");

  const ts = controller.getTimestamp();
  const stats = controller.getStatus();
  console.log(`${ts} System initialized with ${stats.activeBots} bots`);

  controller.createOrder('Normal');
  controller.createOrder('VIP');
  controller.createOrder('Normal');

  await new Promise((resolve) => setTimeout(resolve, 1000));
  controller.addBot();
  await new Promise((resolve) => setTimeout(resolve, 3000));
  controller.addBot();

  await new Promise((resolve) => setTimeout(resolve, 5000));
  controller.createOrder('VIP');

  await new Promise((resolve) => setTimeout(resolve, 16000));
  controller.removeBot();

  const finalStats = controller.getStatus();

  console.log('\nFinal Status:');
  console.log(`- Total Orders Processed: ${finalStats.totalOrders} (${finalStats.vipOrders} VIP, ${finalStats.normalOrders} Normal)`);
  console.log(`- Orders Completed: ${finalStats.completedOrders}`);
  console.log(`- Active Bots: ${finalStats.activeBots}`);
  console.log(`- Pending Orders: ${finalStats.pendingOrders}`);
}

async function main(): Promise<void> {
  const controller = createController();
  if (process.argv.includes('--run')) {
    await runAutomatedMode(controller);
  } else {
    await runInteractiveMode(controller);
  }
}

main().catch(console.error);