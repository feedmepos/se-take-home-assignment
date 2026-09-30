#!/usr/bin/env node
'use strict';

const readline = require('node:readline');
const { OrderController } = require('./order-controller');
const { ManualClock } = require('./manual-clock');

function stamp(time) {
  return new Date(time).toISOString().slice(11, 19);
}

function createConsole(clock) {
  return (message) => process.stdout.write(`[${stamp(clock.now())}] ${message}\n`);
}

function describe(order) {
  return `${order.type} #${order.id}`;
}

function printState(controller, print) {
  const state = controller.getState();
  print(`PENDING: ${state.pending.map(describe).join(', ') || '(empty)'}`);
  print(`PROCESSING: ${state.processing.map(({ botId, order }) => `Bot #${botId}: ${describe(order)}`).join(', ') || '(empty)'}`);
  print(`COMPLETE: ${state.complete.map(describe).join(', ') || '(empty)'}`);
  print(`BOTS: ${state.bots.map((bot) => `#${bot.id} ${bot.status}`).join(', ') || '(none)'}`);
}

function execute(input, controller, print) {
  const command = input.trim().toLowerCase().replace(/\s+/g, ' ');
  switch (command) {
    case 'normal':
    case 'new normal order':
      controller.addOrder('Normal');
      break;
    case 'vip':
    case 'new vip order':
      controller.addOrder('VIP');
      break;
    case '+ bot':
    case '+bot':
      controller.addBot();
      break;
    case '- bot':
    case '-bot':
      controller.removeBot();
      break;
    case 'status':
      printState(controller, print);
      break;
    case 'help':
      print('Commands: normal, vip, + bot, - bot, status, help, exit');
      break;
    case 'exit':
    case 'quit':
      controller.shutdown();
      print('Goodbye');
      return false;
    case '':
      break;
    default:
      print(`Unknown command: ${input.trim()}. Type help for commands.`);
  }
  return true;
}

function demo() {
  const clock = new ManualClock();
  const print = createConsole(clock);
  const controller = new OrderController({ clock, onEvent: ({ message }) => print(message) });
  print('Order controller demonstration (simulated clock; 10 seconds per order)');
  execute('normal', controller, print);
  execute('vip', controller, print);
  execute('normal', controller, print);
  execute('vip', controller, print);
  execute('status', controller, print);
  execute('+ bot', controller, print);
  execute('+ bot', controller, print);
  clock.advance(3_000);
  execute('- bot', controller, print);
  execute('status', controller, print);
  clock.advance(7_000);
  clock.advance(10_000);
  clock.advance(10_000);
  clock.advance(10_000);
  execute('status', controller, print);
  execute('normal', controller, print);
  clock.advance(10_000);
  execute('status', controller, print);
}

function interactive() {
  const clock = { now: () => Date.now() };
  const print = createConsole(clock);
  const controller = new OrderController({ onEvent: ({ message }) => print(message) });
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
  print('Order controller ready. Type help for commands.');
  const prompt = () => {
    if (process.stdin.isTTY) {
      rl.setPrompt(`[${stamp(clock.now())}] > `);
      rl.prompt();
    }
  };
  prompt();
  rl.on('line', (line) => {
    if (!execute(line, controller, print)) {
      rl.close();
      return;
    }
    prompt();
  });
}

if (require.main === module) {
  if (process.argv[2] === '--demo') demo();
  else if (process.argv.length === 2) interactive();
  else {
    process.stderr.write('Usage: node src/cli.js [--demo]\n');
    process.exitCode = 1;
  }
}

module.exports = { execute, printState, stamp };
