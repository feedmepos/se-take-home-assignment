// Name: Amir hanis bin Azman

const readline = require("readline");
const Order = require("./model/Order");
const Bot = require("./model/Bot");

// Constants
const PROCESSING_TIME_MS = 10000; // 10 seconds for order processing

// System state
let pendingOrders = [];
let completedOrders = [];
let bots = [];
let orderCounter = 0;

// CLI interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Add a new order
function addOrder(isVIP) {
  orderCounter++;
  const order = new Order(`Order-${orderCounter}`, isVIP ? "VIP" : "Normal");

  // Insert VIP orders before normal orders but behind existing VIP orders
  if (isVIP) {
    const normalIndex = pendingOrders.findIndex(
      (order) => order.type === "Normal"
    );
    if (normalIndex === -1) {
      pendingOrders.push(order);
    } else {
      pendingOrders.splice(normalIndex, 0, order);
    }
  } else {
    pendingOrders.push(order);
  }

  console.log(`Added ${order.id} (${order.type}) to PENDING.`);
  processOrders();
}

// Add a bot
function addBot() {
  const botId = bots.length + 1;
  const bot = new Bot(botId);
  bots.push(bot);
  console.log(`${bot.id} added.`);
  processOrders();
}

// Remove a bot
function removeBot() {
  if (bots.length === 0) {
    console.log("No bots to remove.");
    return;
  }

  const bot = bots.pop();
  console.log(`${bot.id} removed.`);

  if (bot.order) {
    clearTimeout(bot.timeoutId); // Cancel the completion timeout
    pendingOrders.unshift(bot.order); // Return the order to the pending queue
    console.log(`Re-added ${bot.order.id} to PENDING.`);
  }
}

// Process orders
function processOrders() {
  bots.forEach((bot) => {
    if (bot.isIdle && pendingOrders.length > 0) {
      const order = pendingOrders.shift();
      bot.processOrder(order, completeOrder, PROCESSING_TIME_MS);
    }
  });
}

// Complete an order
function completeOrder(bot, order) {
  completedOrders.push(order);
  console.log(`${order.id} is COMPLETE.`);
  bot.reset();
  processOrders();
}

// View bots and their statuses
function viewBots() {
  if (bots.length === 0) {
    console.log("No bots available.");
  } else {
    console.log("Bots Status:");
    bots.forEach((bot) => {
      if (bot.isIdle) {
        console.log(`${bot.id} is IDLE.`);
      } else {
        console.log(
          `${bot.id} is processing ${bot.order.id} (${bot.order.type}).`
        );
      }
    });
  }
}

// View pending orders
function viewPendingOrders() {
  if (pendingOrders.length === 0) {
    console.log("No pending orders.");
  } else {
    console.log(
      "Pending Orders:",
      pendingOrders.map((order) => `${order.id} (${order.type})`).join(", ")
    );
  }
}

// Show menu options
function showMenu() {
  console.log(`
1. New Normal Order
2. New VIP Order
3. Add Bot
4. Remove Bot
5. View Pending Orders
6. View Bots
7. Exit
`);
}

// Handle menu input
function handleInput(input) {
  switch (input.trim()) {
    case "1":
      addOrder(false); // Normal order
      break;
    case "2":
      addOrder(true); // VIP order
      break;
    case "3":
      addBot();
      break;
    case "4":
      removeBot();
      break;
    case "5":
      viewPendingOrders();
      break;
    case "6":
      viewBots();
      break;
    case "7":
      console.log("Exiting...");
      rl.close();
      return;
    default:
      console.log("Invalid option. Try again.");
  }
  showMenu();
}

// Start the CLI
console.log("Welcome to McDonald's Order System");
showMenu();
rl.on("line", handleInput);
