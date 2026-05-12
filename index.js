const readline = require('readline');
const fs = require('fs');

const OrderQueue = require('./queue');
const BotManager = require('./botManager');
const OrderController = require('./orderController');


fs.writeFileSync("scripts/result.txt", ""); // reset file

const queue = new OrderQueue();
const botManager = new BotManager(queue);
const controller = new OrderController(queue, botManager);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("Please write the Commands: new-normal, new-vip, add-bot, remove-bot, status, exit");

console.log("System initialized");
fs.appendFileSync("scripts/result.txt", `System initialized\n`);

rl.on('line', (input) => {
    switch (input.trim()) {
    case 'new-normal':
      controller.newNormalOrder();
      break;

    case 'new-vip':
      controller.newVIPOrder();
      break;

    case 'add-bot':
      botManager.addBot();
      break;

    case 'remove-bot':
      botManager.removeBot();
      break;

    case 'status':
      controller.status();
      break;

    case 'exit':
        const stats = controller.getStats();
      console.log("\n========== Final Status ==========");
      console.log(`Total Orders Processed: ${stats.totalOrders} (${stats.vipOrders} VIP, ${stats.normalOrders} Normal)`);
      console.log(`Orders Completed: ${stats.completedOrders}`);
      console.log(`Active Bots: ${stats.activeBots}`);
      console.log(`Pending Orders: ${stats.pendingOrders}`);
      console.log("==================================\n");

      fs.appendFileSync("scripts/result.txt", "\n========== Final Status ==========\n");
      fs.appendFileSync("scripts/result.txt", `Total Orders Processed: ${stats.totalOrders} (${stats.vipOrders} VIP, ${stats.normalOrders} Normal)\n`);
      fs.appendFileSync("scripts/result.txt", `Orders Completed: ${stats.completedOrders}\n`);
      fs.appendFileSync("scripts/result.txt", `Active Bots: ${stats.activeBots}\n`);
      fs.appendFileSync("scripts/result.txt", `Pending Orders: ${stats.pendingOrders}\n`);
      fs.appendFileSync("scripts/result.txt", "==================================\n");
      rl.close();
      process.exit(0);

    default:
      console.log("Unknown command");
  }
});