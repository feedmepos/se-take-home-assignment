'use strict';

const readline = require('node:readline');
const { OrderController } = require('./order-controller');
const { timestamp, formatEvent, formatStatus } = require('./format');

const controller = new OrderController({ onEvent: event => console.log(formatEvent(event)) });
const terminal = process.stdin.isTTY;
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal });

const log = message => console.log(`[${timestamp(new Date())}] ${message}`);
const stopBots = () => { while (controller.removeBot() !== null) {} };
let quitting = false;

log('Commands: normal, vip, + bot, - bot, status, help, quit');
if (terminal) rl.setPrompt('order> ');
if (terminal) rl.prompt();

rl.on('line', line => {
  const command = line.trim().toLowerCase();
  switch (command) {
    case 'normal':
    case 'new normal order': controller.addOrder('Normal'); break;
    case 'vip':
    case 'new vip order': controller.addOrder('VIP'); break;
    case '+ bot':
    case 'add bot': controller.addBot(); break;
    case '- bot':
    case 'remove bot':
      if (controller.removeBot() === null) log('No bots to remove');
      break;
    case 'status':
      console.log(formatStatus(controller.snapshot(), new Date()));
      break;
    case 'help':
      log('Commands: normal, vip, + bot, - bot, status, help, quit');
      break;
    case 'quit':
    case 'exit':
      quitting = true;
      stopBots();
      rl.close();
      break;
    case '': break;
    default: log('Unknown command. Type help.');
  }
  if (terminal && !rl.closed) rl.prompt();
});

rl.on('close', () => {
  // EOF on piped input leaves cooks running; closing an interactive terminal exits.
  if (terminal && !quitting) stopBots();
});
