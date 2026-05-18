const { log, writePlain } = require("./logger");
const readline = require("readline");

const {
  createVipOrder,
  createNormalOrder,
  addBot,
  removeBot,
  getState,
} = require("./botController");

function printFinalStatus() {
  const {
    completedOrders,
    vipQueue,
    normalQueue,
    bots,
  } = getState();

  const vipCompleted = completedOrders.filter(
    o => o.type === "VIP"
  ).length;

  const normalCompleted = completedOrders.filter(
    o => o.type === "NORMAL"
  ).length;

  const pendingOrders =
    vipQueue.length + normalQueue.length;

  writePlain("\nFinal Status:");

  writePlain(
    `- Total Orders Processed: ${completedOrders.length} (${vipCompleted} VIP, ${normalCompleted} Normal)`
  );

  writePlain(
    `- Orders Completed: ${completedOrders.length}`
  );

  writePlain(
    `- Active Bots: ${bots.length}`
  );

  writePlain(
    `- Pending Orders: ${pendingOrders}`
  );
}

function runSimulation() {
  writePlain(
    "McDonald's Order Management System\n"
  );

  log("System initialized with 0 bots");

  createNormalOrder();
  createVipOrder();
  createNormalOrder();

  setTimeout(() => {
    addBot();
  }, 1000);

  setTimeout(() => {
    addBot();
  }, 2000);

  setTimeout(() => {
    createVipOrder();
  }, 5000);

  setTimeout(() => {
    removeBot();
  }, 8000);

  setTimeout(() => {
    addBot();
  }, 12000);

  setTimeout(() => {
    printFinalStatus();
    process.exit(0);
  }, 40000);
}

runSimulation();

function printState() {
  const state = getState();

  console.log("\n===== CURRENT STATE =====");

  console.log("VIP Queue:", state.vipQueue.map(o => o.id));
  console.log("Normal Queue:", state.normalQueue.map(o => o.id));

  console.log("Processing:", state.processingQueue.map(o => ({
    id: o.id,
    type: o.type
  })));

  console.log("Completed:", state.completedOrders.map(o => o.id));

  console.log("Bots:", state.bots.map(b => ({
    id: b.id,
    status: b.status,
    currentOrder: b.currentOrder?.id || null
  })));

  console.log("=========================\n");
}


//CLI
// const rl = readline.createInterface({
//   input: process.stdin,
//   output: process.stdout,
// });

// console.log("Commands: new vip | new normal | +bot | -bot | exit");

// rl.on("line", (input) => {
//   const command = input.trim().toLowerCase();

//   if (command === "new vip") {
//     createVipOrder();
//   }

//   else if (command === "new normal") {
//     createNormalOrder();
//   }

//   else if (command === "+bot") {
//     addBot();
//   }

//   else if (command === "-bot") {
//     removeBot();
//   }

//   else if (command === "exit") {
//     rl.close();
//     process.exit(0);
//   }

//   else {
//     console.log("Unknown command");
//   }

//   printState();
// });