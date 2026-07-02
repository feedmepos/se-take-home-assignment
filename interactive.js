'use strict';

const { OrderController } = require('./src/order-controller');
const logger = require('./src/logger');
const { getTimestamp } = require('./src/timestamp');

const controller = new OrderController(10000);
let inStatusBoard = false;
let clockInterval = null;
let statusInterval = null;

function clearScreen() {
  process.stdout.write('\x1B[2J\x1B[H');
}

function printEventLog(...lines) {
  console.log('');
  console.log(logger.logTimestamp());
  lines.forEach(line => console.log(line));
  console.log('');
}

function showMenu() {
  clearScreen();
  console.log(logger.renderMenu(getTimestamp()));
}

function showStatusBoard() {
  clearScreen();
  const state = controller.getStatus();
  console.log(logger.renderStatusBoard(state));
}

// Event callbacks
controller.onBotCompleted = (bot, order) => {
  const processSeconds = Math.round(controller.processingTime / 1000);
  if (inStatusBoard) {
    showStatusBoard();
  } else {
    console.log('');
    console.log(logger.logTimestamp());
    console.log(logger.logBotCompleted(bot, order, processSeconds));
  }
};

controller.onBotIdle = (bot) => {
  if (!inStatusBoard) {
    console.log(logger.logBotIdle(bot));
    console.log('');
  }
};

controller.onBotPickup = (bot, order, waitSeconds) => {
  if (!inStatusBoard) {
    console.log(logger.logBotPickup(bot, order, waitSeconds));
  }
};

function handleCommand(key) {
  if (inStatusBoard) {
    // Any key returns to menu
    inStatusBoard = false;
    if (statusInterval) {
      clearInterval(statusInterval);
      statusInterval = null;
    }
    showMenu();
    return;
  }

  switch (key) {
    case '1': {
      const order = controller.addNormalOrder();
      printEventLog(logger.logOrderCreated(order));
      break;
    }
    case '2': {
      const order = controller.addVipOrder();
      const lines = [logger.logOrderCreated(order)];
      lines.push(logger.logQueueSnapshot(controller.queue.toArray()));
      printEventLog(...lines);
      break;
    }
    case '3': {
      const bot = controller.addBot();
      const lines = [logger.logBotCreated(bot)];
      if (bot.status === 'PROCESSING') {
        // Pickup was already logged via callback
      } else {
        lines.push(logger.logBotIdle(bot));
      }
      printEventLog(...lines);
      break;
    }
    case '4': {
      // Capture pickedUpAt before removeBot() resets it via stopProcessing()
      const botToRemove = controller.bots.length > 0 ? controller.bots[controller.bots.length - 1] : null;
      const pickedUpAt = botToRemove && botToRemove.currentOrder ? botToRemove.currentOrder.pickedUpAt : null;
      const removed = controller.removeBot();
      if (!removed) {
        printEventLog('No bots to remove');
      } else {
        const lines = [];
        if (removed.returnedOrder) {
          const waitSeconds = pickedUpAt
            ? Math.round((Date.now() - pickedUpAt.getTime()) / 1000)
            : 0;
          lines.push(logger.logBotDestroyed(removed.bot, `was processing ${removed.returnedOrder.toString()}`));
          lines.push(logger.logOrderReturned(removed.returnedOrder, waitSeconds));
        } else {
          lines.push(logger.logBotDestroyed(removed.bot, 'was idle'));
        }
        printEventLog(...lines);
      }
      break;
    }
    case '5': {
      inStatusBoard = true;
      showStatusBoard();
      statusInterval = setInterval(() => {
        if (inStatusBoard) {
          showStatusBoard();
        }
      }, 1000);
      break;
    }
    case '0': {
      cleanup();
      console.log('\nGoodbye!');
      process.exit(0);
      break;
    }
    default: {
      console.log(`\nInvalid command: '${key}'. Use [1]-[5] or [0].`);
      break;
    }
  }
}

function cleanup() {
  if (clockInterval) {
    clearInterval(clockInterval);
    clockInterval = null;
  }
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
  // Clear all bot timers
  controller.bots.forEach(bot => {
    if (bot.timer) {
      clearTimeout(bot.timer);
    }
  });
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
}

// Start
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true);
}
process.stdin.resume();
process.stdin.setEncoding('utf8');

showMenu();

// Live clock update
clockInterval = setInterval(() => {
  if (!inStatusBoard) {
    // Update clock in-place: move cursor up to clock line and rewrite
    // For simplicity, we just note it updates on next menu redraw
  }
}, 1000);

process.stdin.on('data', (key) => {
  // Handle Ctrl+C
  if (key === '') {
    cleanup();
    process.exit(0);
  }
  handleCommand(key);
});

process.on('exit', cleanup);
