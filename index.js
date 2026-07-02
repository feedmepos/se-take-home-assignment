'use strict';

const { OrderController } = require('./src/order-controller');
const logger = require('./src/logger');

const PROCESS_TIME = 10000; // 10 seconds

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForAllBots(controller) {
  return new Promise(resolve => {
    function check() {
      const hasProcessing = controller.bots.some(b => b.status === 'PROCESSING');
      if (!hasProcessing) {
        resolve();
      } else {
        setTimeout(check, 100);
      }
    }
    check();
  });
}

async function run() {
  const controller = new OrderController(PROCESS_TIME);
  const output = [];

  function print(text) {
    output.push(text);
  }

  function printTimestampBlock(...lines) {
    print(logger.logTimestamp());
    lines.forEach(line => print(line));
    print('');
  }

  // Set up event callbacks for bot completion events
  const pendingCompletionLogs = [];

  controller.onBotCompleted = (bot, order) => {
    const processSeconds = Math.round(controller.processingTime / 1000);
    const completedLine = logger.logBotCompleted(bot, order, processSeconds);
    pendingCompletionLogs.push({ bot, completedLine });
  };

  controller.onBotIdle = (bot) => {
    // Attach idle info to pending completion log for this bot
    const entry = pendingCompletionLogs.find(e => e.bot === bot && !e.idleLine);
    if (entry) {
      entry.idleLine = logger.logBotIdle(bot);
    }
  };

  controller.onBotPickup = (bot, order, waitSeconds) => {
    // Attach pickup info to pending completion log for this bot
    const entry = pendingCompletionLogs.find(e => e.bot === bot && !e.pickupLine && !e.idleLine);
    if (entry) {
      entry.pickupLine = logger.logBotPickup(bot, order, waitSeconds);
    }
  };

  function flushCompletionLogs() {
    while (pendingCompletionLogs.length > 0) {
      const entry = pendingCompletionLogs.shift();
      const lines = [entry.completedLine];
      if (entry.pickupLine) {
        lines.push(entry.pickupLine);
      } else if (entry.idleLine) {
        lines.push(entry.idleLine);
      }
      printTimestampBlock(...lines);
    }
  }

  // Print header
  print(logger.renderHeader());
  print('');

  // --- Order Creation ---
  print('--- Order Creation ---');
  print('');

  // Step 1: Create Normal Order #1
  const order1 = controller.addNormalOrder();
  printTimestampBlock(logger.logOrderCreated(order1));

  // Step 2: Create VIP Order #2
  const order2 = controller.addVipOrder();
  printTimestampBlock(logger.logOrderCreated(order2));

  // Step 3: Create Normal Order #3
  const order3 = controller.addNormalOrder();
  printTimestampBlock(logger.logOrderCreated(order3));

  // Step 4: Show queue snapshot
  printTimestampBlock(logger.logQueueSnapshot(controller.queue.toArray()));

  // --- Bot Processing ---
  print('--- Bot Processing ---');
  print('');

  // Reset event callbacks for bot creation logging
  // We need to handle bot pickups during addBot separately
  const botPickupBuffer = [];
  controller.onBotPickup = (bot, order, waitSeconds) => {
    botPickupBuffer.push({ bot, order, waitSeconds });
  };

  // Step 5: Add Bot #1
  const bot1 = controller.addBot();
  {
    const lines = [logger.logBotCreated(bot1)];
    if (botPickupBuffer.length > 0) {
      const pickup = botPickupBuffer.shift();
      lines.push(logger.logBotPickup(pickup.bot, pickup.order, pickup.waitSeconds));
    } else {
      lines.push(logger.logBotIdle(bot1));
    }
    printTimestampBlock(...lines);
  }

  // Step 6: Add Bot #2
  const bot2 = controller.addBot();
  {
    const lines = [logger.logBotCreated(bot2)];
    if (botPickupBuffer.length > 0) {
      const pickup = botPickupBuffer.shift();
      lines.push(logger.logBotPickup(pickup.bot, pickup.order, pickup.waitSeconds));
    } else {
      lines.push(logger.logBotIdle(bot2));
    }
    printTimestampBlock(...lines);
  }

  // Restore original pickup handler for completion-triggered pickups
  controller.onBotPickup = (bot, order, waitSeconds) => {
    const entry = pendingCompletionLogs.find(e => e.bot === bot && !e.pickupLine && !e.idleLine);
    if (entry) {
      entry.pickupLine = logger.logBotPickup(bot, order, waitSeconds);
    }
  };

  // Step 7: Wait for 10s processing to complete
  await sleep(PROCESS_TIME + 500);
  flushCompletionLogs();

  // --- New Order While Processing ---
  print('--- New Order While Processing ---');
  print('');

  // Step 9: Create VIP Order #4 (idle bot picks it up)
  controller.onBotPickup = (bot, order, waitSeconds) => {
    botPickupBuffer.push({ bot, order, waitSeconds });
  };

  const order4 = controller.addVipOrder();
  {
    const lines = [logger.logOrderCreated(order4)];
    if (botPickupBuffer.length > 0) {
      const pickup = botPickupBuffer.shift();
      lines.push(logger.logBotPickup(pickup.bot, pickup.order, pickup.waitSeconds));
    }
    printTimestampBlock(...lines);
  }

  // Restore completion pickup handler
  controller.onBotPickup = (bot, order, waitSeconds) => {
    const entry = pendingCompletionLogs.find(e => e.bot === bot && !e.pickupLine && !e.idleLine);
    if (entry) {
      entry.pickupLine = logger.logBotPickup(bot, order, waitSeconds);
    }
  };

  // Step 8: Wait for remaining processing
  await waitForAllBots(controller);
  await sleep(200);
  flushCompletionLogs();

  // --- Bot Removal ---
  print('--- Bot Removal ---');
  print('');

  // Step 10: Remove Bot #2 (idle)
  const removed = controller.removeBot();
  if (removed) {
    const reason = removed.returnedOrder
      ? `was processing ${removed.returnedOrder.toString()}`
      : 'was idle';
    printTimestampBlock(logger.logBotDestroyed(removed.bot, reason));
  }

  // --- Additional Scenario (Steps 10-14 from PROPOSAL) ---
  // Step 10: Create Normal Order #5
  controller.onBotPickup = (bot, order, waitSeconds) => {
    botPickupBuffer.push({ bot, order, waitSeconds });
  };

  const order5 = controller.addNormalOrder();
  {
    const lines = [logger.logOrderCreated(order5)];
    if (botPickupBuffer.length > 0) {
      const pickup = botPickupBuffer.shift();
      lines.push(logger.logBotPickup(pickup.bot, pickup.order, pickup.waitSeconds));
    }
    printTimestampBlock(...lines);
  }

  // Restore completion pickup handler
  controller.onBotPickup = (bot, order, waitSeconds) => {
    const entry = pendingCompletionLogs.find(e => e.bot === bot && !e.pickupLine && !e.idleLine);
    if (entry) {
      entry.pickupLine = logger.logBotPickup(bot, order, waitSeconds);
    }
  };

  // Step 11: Add Bot #3
  controller.onBotPickup = (bot, order, waitSeconds) => {
    botPickupBuffer.push({ bot, order, waitSeconds });
  };

  const bot3 = controller.addBot();
  {
    const lines = [logger.logBotCreated(bot3)];
    if (botPickupBuffer.length > 0) {
      const pickup = botPickupBuffer.shift();
      lines.push(logger.logBotPickup(pickup.bot, pickup.order, pickup.waitSeconds));
    } else {
      lines.push(logger.logBotIdle(bot3));
    }
    printTimestampBlock(...lines);
  }

  // Restore completion pickup handler
  controller.onBotPickup = (bot, order, waitSeconds) => {
    const entry = pendingCompletionLogs.find(e => e.bot === bot && !e.pickupLine && !e.idleLine);
    if (entry) {
      entry.pickupLine = logger.logBotPickup(bot, order, waitSeconds);
    }
  };

  // Step 12: Remove Bot #3 (idle)
  const removed3 = controller.removeBot();
  if (removed3) {
    const reason = removed3.returnedOrder
      ? `was processing ${removed3.returnedOrder.toString()}`
      : 'was idle';
    printTimestampBlock(logger.logBotDestroyed(removed3.bot, reason));
  }

  // Step 13: Wait for Bot #1 to complete Normal Order #5
  await waitForAllBots(controller);
  await sleep(200);
  flushCompletionLogs();

  // Step 14: Final summary
  const status = controller.getStatus();
  print(logger.renderSummary(status));

  // Print all output
  console.log(output.join('\n'));
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
