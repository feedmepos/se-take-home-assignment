'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { Controller } = require('./controller');
const { OrderType } = require('./order');
const { timestamp, describeEvent, renderState } = require('./logger');

const RESULT_FILE = path.join(__dirname, '..', 'scripts', 'result.txt');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Everything written to stdout is kept so it can be saved to result.txt at the end. */
const lines = [];

const write = (line = '') => {
  lines.push(line);
  console.log(line);
};

const step = (title) => {
  write();
  write(`[${timestamp()}] === ${title} ===`);
};

const showState = (controller) => write(renderState(controller));

async function main() {
  const controller = new Controller({
    onEvent: (event) => {
      const message = describeEvent(event);
      if (message) {
        write(`[${timestamp()}] ${message}`);
      }
    },
  });

  const cookSeconds = controller.processingMs / 1000;
  const settle = controller.processingMs + 1000;

  write("McDonald's Automated Cooking Bot - Order Controller Demo");
  write(`Each order takes ${cookSeconds}s to cook. One bot cooks one order at a time.`);

  step('Two normal customers and two VIP members submit orders');
  controller.newOrder(OrderType.NORMAL);
  controller.newOrder(OrderType.NORMAL);
  controller.newOrder(OrderType.VIP);
  controller.newOrder(OrderType.VIP);
  showState(controller);
  write('  -> Both VIP orders jumped ahead of the normal orders, and VIP#4 queued behind VIP#3.');

  step('Manager adds the first bot');
  controller.addBot();
  showState(controller);

  step(`Waiting ${cookSeconds}s for the first order to finish`);
  await wait(settle);
  showState(controller);

  step('Manager removes the bot while it is still cooking');
  await wait(3000);
  controller.removeBot();
  showState(controller);
  write('  -> The interrupted order went back to PENDING, still ahead of the normal orders.');

  step('Manager adds two bots to catch up');
  controller.addBot();
  controller.addBot();
  showState(controller);

  step(`Waiting ${cookSeconds}s while both bots cook in parallel`);
  await wait(settle);
  showState(controller);

  step(`Waiting ${cookSeconds}s for the last order`);
  await wait(settle);
  showState(controller);

  step('Summary');
  const completed = controller.completedOrders;
  const vipCount = completed.filter((order) => order.type === OrderType.VIP).length;
  write(`  Orders completed : ${completed.length} (${vipCount} VIP, ${completed.length - vipCount} normal)`);
  write(`  Orders pending   : ${controller.pendingOrders.length}`);
  write(`  Bots alive       : ${controller.bots.length} (all idle)`);

  fs.writeFileSync(RESULT_FILE, `${lines.join('\n')}\n`, 'utf8');
  console.log(`\nResult written to ${RESULT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
