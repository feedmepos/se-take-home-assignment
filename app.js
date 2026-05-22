import readline from "readline";
import AddBot from "./bot/AddBot.js";
import RemoveBot from "./bot/RemoveBot.js";
import FileLogger from "./FileLogger.js";
import AddOrder from "./order/AddOrder.js";
import OrderType from "./order/OrderType.js";
import ProcessOrders from "./ProcessOrders.js";
import Storage from "./Storage.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const storage = new Storage();
const fileLogger = new FileLogger();

function prompt() {
  rl.question("Command (normal, vip, +bot, -bot, exit): ", (answer) => {
    switch (answer.trim()) {
      case "normal":
        const addNormalOrder = new AddOrder(
          storage,
          fileLogger,
          OrderType.NORMAL
        );
        addNormalOrder.execute();
        const po = new ProcessOrders(storage, fileLogger);
        po.execute();
        break;
      case "vip":
        const addVipOrder = new AddOrder(storage, fileLogger, OrderType.VIP);
        addVipOrder.execute();
        const po2 = new ProcessOrders(storage, fileLogger);
        po2.execute();
        break;
      case "+bot":
        const ab = new AddBot(storage, fileLogger);
        ab.execute();
        const po3 = new ProcessOrders(storage, fileLogger);
        po3.execute();
        break;
      case "-bot":
        const rb = new RemoveBot(storage, fileLogger);
        rb.execute();
        const po4 = new ProcessOrders(storage, fileLogger);
        po4.execute();
        break;
      case "exit":
        rl.close();
        logFinalResult();
        process.exit(0);
      default:
        console.log("Unknown command.");
    }
    prompt();
  });
}

function logFinalResult() {
  const completedOrderArray = storage.getCompletedOrderArray();
  const numberOfActiveBot = storage.getBotArray().length;
  const pendingOrderArray = storage.getPendingOrderArray();
  let numberOfCompletedVipOrder = 0;
  let numberOfCompletedNormalOrder = 0;
  let numberOfPendingVipOrder = 0;
  let numberOfPendingNormalOrder = 0;

  completedOrderArray.forEach((order) => {
    if (order.type === OrderType.NORMAL) {
      numberOfCompletedNormalOrder++;
    } else {
      numberOfCompletedVipOrder++;
    }
  });

  pendingOrderArray.forEach((order) => {
    if (order.type === OrderType.NORMAL) {
      numberOfPendingNormalOrder++;
    } else {
      numberOfPendingVipOrder++;
    }
  });

  fileLogger.log(
    `Final Status:\n` +
      `- Total Orders Processed: ${completedOrderArray.length} (${numberOfCompletedVipOrder} VIP, ${numberOfCompletedNormalOrder} Normal)\n` +
      `- Orders Completed: ${completedOrderArray.length}\n` +
      `- Active Bots: ${numberOfActiveBot}\n` +
      `- Pending Orders: ${pendingOrderArray.length} (${numberOfPendingVipOrder} VIP, ${numberOfPendingNormalOrder} Normal)\n`
  );
}

console.log("Welcome to McDonald's Order & Bot CLI!");
prompt();
