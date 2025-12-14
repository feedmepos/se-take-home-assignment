import { Kitchen } from "./src/kitchen.js";
import { EventType, OrderType } from "./src/enum/type.js";
import { eventQueue } from "./commands.js";
const kitchen = new Kitchen();

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

//process
for (let i = 0; i < eventQueue.length; i++) {
  let promise = new Promise(function (resolve, reject) {
    setTimeout(() => {
      resolve(eventQueue[i]);
    }, (eventQueue[i].delay * 1000));
  });
  promise.then((eventQueue) => {
    if (eventQueue.eventType === EventType.BOT_CREATE) {
      kitchen.buildBots(1);
    } else if (eventQueue.eventType === EventType.BOT_KILL) {
      kitchen.killBot(eventQueue.options.id ?? 0);
    } else if (eventQueue.eventType === EventType.ORDER_CREATE) {
      kitchen.createOrder(
        eventQueue.options.orderType ?? OrderType.NORMAL,
        eventQueue.options.orderProcessTime
      );
    }
  });
}

//
let orderExists = true;
function wait() {
  if (orderExists) {
    orderExists = kitchen.checkFinish();
    setTimeout(wait, 100);
  } else {
    gracefulShutdown();
  }
}
wait();

function gracefulShutdown() {
  kitchen.shutdownKitchen(); //we start stopping bots
  process.exit(0); // Exit cleanly
  setTimeout(() => {
    console.error(
      "Graceful shutdown timeout exceeded. Forcefully shutting down."
    );
    process.exit(1);
  }, 2); // 2 second timeout
}
