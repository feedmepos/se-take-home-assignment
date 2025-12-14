import { parentPort } from "worker_threads";
import { OrderState } from "./enum/state.js";
import { setTimeout as delay } from "timers/promises";

parentPort.on("message", async (order) => {
  const processedOrder = await processOrder(order);
  parentPort.postMessage({
    ...processedOrder,
  });
});

async function processOrder(order) {
  await delay(order.orderProcessTime * 1000)  //emulate work time
  order.completeTimestamp = Date.now();
  order.state = OrderState.COMPLETE;
  return order;
}
