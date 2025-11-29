// index.js

const { OrderController } = require("./src/orderController");

function runSimulation() {
  const c = new OrderController(10);

  c.logPlain("McDonald's Order Management System - Simulation Results");
  c.logPlain("");

  // t = 0
  c.log("System initialized with 0 bots");
  c.createNormalOrder(); // Order #1 - NORMAL
  c.createNormalOrder(); // Order #2 - NORMAL
  c.addBot();            // Bot #1 picks up Order #1

  // t = 1: VIP order arrives, should be prioritized over pending Normal
  c.advanceTimeTo(1);
  c.createVipOrder();    // Order #3 - VIP

  // t = 2: Add second bot, it should pick VIP order first
  c.advanceTimeTo(2);
  c.addBot();            // Bot #2 picks up Order #3 (VIP)

  // t = 3: Another normal order
  c.advanceTimeTo(3);
  c.createNormalOrder(); // Order #4 - NORMAL

  // t = 5: Manager removes newest bot while it's BUSY
  // The in-progress VIP order should return to PENDING
  c.advanceTimeTo(5);
  c.removeBot();         // removes Bot #2, re-queues Order #3 (VIP)

  // t = 10: Bot #1 completes first normal order and should pick VIP next
  c.advanceTimeTo(10);

  // t = 12: Add another bot; it should pick pending Normal order
  c.advanceTimeTo(12);
  c.addBot();            // Bot #3 picks up next Normal (Order #2)

  // t = 15: Another VIP arrives, queued behind existing VIP
  c.advanceTimeTo(15);
  c.createVipOrder();    // Order #5 - VIP

  // t = 20: Bot #1 completes VIP Order #3 and should pick VIP Order #5
  c.advanceTimeTo(20);

  // t = 22: Bot #3 completes Normal Order #2 and should pick Normal Order #4
  c.advanceTimeTo(22);

  // t = 32: Remaining processing completes
  c.advanceTimeTo(32);

  // Manager removes newest idle bot
  c.removeBot(); // removes Bot #3 while IDLE

  // Final summary
  c.logFinalSummary();

  return c.getLogs();
}

if (require.main === module) {
  const lines = runSimulation();
  for (const line of lines) {
    console.log(line);
  }
}

module.exports = { runSimulation };
