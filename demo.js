const fs = require("fs");
const { Order } = require("./src/entities/order");
const { format, printState } = require("./src/utils");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runDemo(queue, workerManager) {
  const logs = [];
  const push = (msg) => {
    logs.push(msg);
    console.log(msg);
  };
  const spacer = () => push("", "");

  // inject worker event handler
  workerManager.onEvent = push;

  push(format("=== DEMO START ==="));

  // Step 1: Add 1 worker
  spacer();
  push("Step 1: Add 1 worker");
  workerManager.addWorker();
  printState(queue, workerManager).forEach(push);
  await sleep(2000);

  // Step 2: Add 1 NORMAL orders
  spacer();
  push("Step 2: Add 1 NORMAL orders");

  const o1 = new Order("normal");
  push(o1.createMessage());
  queue.enqueue(o1);

  printState(queue, workerManager).forEach(push);
  await sleep(2000);

  // Step 3: Add VIP & Normal - Queue Priority Showcase
  spacer();
  push("Step 3: Add VIP & Normal - Queue Priority Showcase");

  const o2 = new Order("normal");
  push(o2.createMessage());
  queue.enqueue(o2);

  const v2 = new Order("vip");
  push(v2.createMessage());
  queue.enqueue(v2);

  const v3 = new Order("vip");
  push(v3.createMessage());
  queue.enqueue(v3);

  printState(queue, workerManager).forEach(push);
  await sleep(2000);

  // Step 4: Add & Remove Worker
  spacer();
  push("Step 4: Add & Remove Worker");
  push("Add one worker");
  workerManager.addWorker();
  printState(queue, workerManager).forEach(push);

  await sleep(5000);

  push("Removing one worker during processing");
  push(workerManager.removeWorker());
  printState(queue, workerManager).forEach(push);

  await sleep(5000);

  push("Add one worker for faster processing");
  workerManager.addWorker();
  printState(queue, workerManager).forEach(push);

  await sleep(20000);

  printState(queue, workerManager).forEach(push);
  spacer();
  push(format("=== DEMO END ==="));

  fs.writeFileSync("./scripts/result.txt", logs.join("\n"));
}

module.exports = { runDemo };
