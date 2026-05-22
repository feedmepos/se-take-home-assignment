const fs = require("fs");

// --- State Management ---
// Using a simple object to manage state (No classes used)
let state = {
  orders: [], // Array of { id, type, status: 'PENDING' | 'PROCESSING' | 'COMPLETE' }
  bots: [], // Array of { id, currentOrderId, timeoutRef }
  orderCounter: 1,
  botCounter: 1,
  results: [],
};

// --- Utilities ---
// Strict HH:MM:SS format to satisfy the GitHub Action grep [0-9]{2}:[0-9]{2}:[0-9]{2}
const getTimestamp = () => {
  const now = new Date();
  const pad = (num) => String(num).padStart(2, "0");
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
};

const log = (msg) => {
  const entry = `[${getTimestamp()}] ${msg}`;
  state.results.push(entry);
  // We use console.log so the shell script can redirect output to scripts/result.txt
  console.log(entry);
};

// --- Core Logic ---

const createOrder = (type) => {
  const newOrder = { id: state.orderCounter++, type, status: "PENDING" };

  if (type === "VIP") {
    // 1. Find the index of the last VIP order that is still PENDING
    const lastVipPendingIndex = [...state.orders]
      .reverse()
      .findIndex((o) => o.type === "VIP" && o.status === "PENDING");

    if (lastVipPendingIndex === -1) {
      // 2. No pending VIPs. Find the first NORMAL order that is still PENDING
      const firstNormalPendingIndex = state.orders.findIndex(
        (o) => o.type === "NORMAL" && o.status === "PENDING",
      );

      if (firstNormalPendingIndex === -1) {
        state.orders.push(newOrder);
      } else {
        // Jump ahead of all pending Normal orders
        state.orders.splice(firstNormalPendingIndex, 0, newOrder);
      }
    } else {
      // 3. Queue behind the last pending VIP order
      const actualIndex = state.orders.length - lastVipPendingIndex;
      state.orders.splice(actualIndex, 0, newOrder);
    }
  } else {
    // Normal orders just go to the end
    state.orders.push(newOrder);
  }

  log(`New ${type} Order #${newOrder.id} added.`);
  triggerIdleBots();
};

const processNextOrder = (bot) => {
  const nextOrder = state.orders.find((o) => o.status === "PENDING");

  if (!nextOrder) {
    bot.currentOrderId = null;
    return;
  }

  nextOrder.status = "PROCESSING";
  bot.currentOrderId = nextOrder.id;
  log(`Bot ${bot.id} started processing Order #${nextOrder.id}`);

  // Bot takes 10 seconds to process
  bot.timeoutRef = setTimeout(() => {
    nextOrder.status = "COMPLETE";
    bot.currentOrderId = null;
    bot.timeoutRef = null;
    log(`Order #${nextOrder.id} COMPLETE (by Bot ${bot.id})`);

    // Immediately look for the next order
    processNextOrder(bot);
  }, 10000);
};

const addBot = () => {
  const bot = {
    id: state.botCounter++,
    currentOrderId: null,
    timeoutRef: null,
  };
  state.bots.push(bot);
  log(`Added Bot ${bot.id}`);
  processNextOrder(bot);
};

const removeBot = () => {
  const bot = state.bots.pop();
  if (!bot) return;

  if (bot.currentOrderId) {
    // Stop the timer
    clearTimeout(bot.timeoutRef);

    // Revert the order status to PENDING
    const order = state.orders.find((o) => o.id === bot.currentOrderId);
    if (order) order.status = "PENDING";

    log(
      `Removed Bot ${bot.id}. Order #${bot.currentOrderId} reverted to PENDING.`,
    );
  } else {
    log(`Removed IDLE Bot ${bot.id}`);
  }
};

const triggerIdleBots = () => {
  state.bots.forEach((bot) => {
    if (!bot.currentOrderId) processNextOrder(bot);
  });
};

const resetState = () => {
  state.orders.length = 0; // Clears the array without changing the object reference
  state.bots.length = 0;
  state.orderCounter = 1;
  state.botCounter = 1;
  state.results = [];
};

// --- CLI Simulation Execution ---
if (require.main === module) {
  (async () => {
    log(`System initialized with 0 bots`);
    
    // Simulate the exact flow from the sample
    createOrder("NORMAL"); // 1001
    createOrder("VIP");    // 1002
    createOrder("NORMAL"); // 1003
    addBot();              // Bot 1
    addBot();              // Bot 2
    
    // Wait for initial orders to process
    await new Promise(r => setTimeout(r, 11000));
    
    createOrder("VIP");    // 1004
    await new Promise(r => setTimeout(r, 11000));
    
    removeBot(); // Destroy newest bot
    
    // Generate Final Status
    const completed = state.orders.filter(o => o.status === 'COMPLETE').length;
    const vips = state.orders.filter(o => o.type === 'VIP' && o.status === 'COMPLETE').length;
    const normals = state.orders.filter(o => o.type === 'NORMAL' && o.status === 'COMPLETE').length;

    state.results.push(`\nFinal Status:`);
    state.results.push(`- Total Orders Processed: ${state.orders.length} (${vips} VIP, ${normals} Normal)`);
    state.results.push(`- Orders Completed: ${completed}`);
    state.results.push(`- Active Bots: ${state.bots.length}`);
    state.results.push(`- Pending Orders: ${state.orders.filter(o => o.status === 'PENDING').length}`);

    // Write to file
    const fs = require('fs');
    if (!fs.existsSync('scripts')) fs.mkdirSync('scripts');
    fs.writeFileSync('scripts/result.txt', state.results.join('\n'));
    
    process.exit(0);
  })();
}

const getState = () => state;

// --- Exports for Jest ---
module.exports = { createOrder, addBot, removeBot, resetState, getState };
