'use strict';

const readline = require('node:readline');

const { Controller, OrderType } = require('./controller');
const { timestamp, describeEvent, renderState } = require('./logger');

const HELP = `Commands:
  normal   Submit a new normal order
  vip      Submit a new VIP order
  bot+     Add a cooking bot
  bot-     Remove the newest cooking bot
  status   Show PENDING / COMPLETE / bots
  help     Show this help
  exit     Quit`;

function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
  });

  /**
   * Bot events arrive from timers, so they can land while the user is midway
   * through typing a command. Wipe the prompt line before writing, then redraw
   * the prompt along with whatever was already typed.
   */
  const printEvent = (line) => {
    if (process.stdout.isTTY) {
      readline.cursorTo(process.stdout, 0);
      readline.clearLine(process.stdout, 0);
    }
    console.log(line);
    rl.prompt(true);
  };

  const controller = new Controller({
    onEvent: (event) => {
      const message = describeEvent(event);
      if (!message) {
        return;
      }
      printEvent(`[${timestamp()}] ${message}`);
    },
  });

  const handlers = {
    normal: () => controller.newOrder(OrderType.NORMAL),
    vip: () => controller.newOrder(OrderType.VIP),
    'bot+': () => controller.addBot(),
    'bot-': () => controller.removeBot(),
    status: () => console.log(renderState(controller)),
    help: () => console.log(HELP),
    exit: () => rl.close(),
  };

  console.log("McDonald's Automated Cooking Bot - Interactive CLI");
  console.log(HELP);
  rl.prompt();

  rl.on('line', (line) => {
    const command = line.trim().toLowerCase();
    if (command !== '') {
      const handler = handlers[command];
      if (handler) {
        handler();
      } else {
        console.log(`Unknown command: ${command}. Type "help" for the command list.`);
      }
    }
    rl.prompt();
  });

  rl.on('close', () => {
    console.log('Bye.');
    process.exit(0);
  });
}

main();
