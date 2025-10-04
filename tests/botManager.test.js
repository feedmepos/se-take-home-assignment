const assert = require("assert");
const OrderManager = require("../src/orderManager");
const BotManager = require("../src/botManager");

console.log("\n🔶 Running BotManager tests...");

const om = new OrderManager();
const bm = new BotManager(om);

// Speed up the 10s delay to 50ms for testing
const originalSetTimeout = global.setTimeout;
global.setTimeout = (fn, ms) => originalSetTimeout(fn, 50);

// Add some orders
om.createOrder("NORMAL");
om.createOrder("VIP");
om.createOrder("NORMAL");

// Add a bot
bm.addBot();
assert.strictEqual(bm.bots.length, 1, "Bot should be added");

// Add another bot
bm.addBot();
assert.strictEqual(bm.bots.length, 2, "Second bot should be added");

// Remove one bot
bm.removeBot();
assert.strictEqual(bm.bots.length, 1, "Bot should be removed");
