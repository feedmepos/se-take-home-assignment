'use strict';

const readline = require('node:readline');
const { OrderController } = require('./controller');

const timestamp = date => date.toISOString().slice(11, 19);
const log = (message, time = new Date()) => console.log(`[${timestamp(time)}] ${message}`);
const controller = new OrderController({ onEvent: ({ time, message }) => log(message, time) });

function status() {
  const state = controller.getState();
  const orders = list => list.map(order => `${order.type}#${order.id}`).join(', ') || 'none';
  log(`PENDING: ${orders(state.pending)}`);
  log(`PROCESSING: ${state.processing.map(item => `Bot#${item.botId}:${item.order.type}#${item.order.id}`).join(', ') || 'none'}`);
  log(`COMPLETE: ${orders(state.complete)}`);
  log(`BOTS: ${state.bots.map(bot => `#${bot.id}:${bot.status}`).join(', ') || 'none'}`);
}

function command(line) {
  switch (line.trim().toLowerCase()) {
    case 'normal': controller.addOrder('NORMAL'); break;
    case 'vip': controller.addOrder('VIP'); break;
    case '+ bot': case '+bot': case 'add bot': controller.addBot(); break;
    case '- bot': case '-bot': case 'remove bot': controller.removeNewestBot(); break;
    case 'status': status(); break;
    case 'help': log('Commands: normal, vip, + bot, - bot, status, help, quit'); break;
    case 'quit': case 'exit': return false;
    case '': break;
    default: log(`Unknown command: ${line.trim()}. Type help.`);
  }
  return true;
}

async function demo() {
  log('Demo started');
  controller.addOrder('NORMAL');
  controller.addOrder('NORMAL');
  controller.addOrder('VIP');
  controller.addOrder('VIP');
  controller.addBot();
  controller.addBot();
  controller.removeNewestBot();
  status();
  controller.addBot();
  await new Promise((resolve, reject) => {
    const poll = setInterval(() => {
      if (controller.getState().complete.length === 4) {
        clearInterval(poll);
        clearTimeout(limit);
        resolve();
      }
    }, 50);
    const limit = setTimeout(() => {
      clearInterval(poll);
      reject(new Error('Demo did not complete within 30 seconds'));
    }, 30_000);
  });
  status();
  log('Demo finished');
}

function interactive() {
  log('Order controller ready. Type help for commands.');
  const input = readline.createInterface({ input: process.stdin, output: process.stdout,
    terminal: process.stdin.isTTY });
  if (process.stdin.isTTY) {
    input.setPrompt('> ');
    input.prompt();
  }
  input.on('line', line => {
    if (!command(line)) return input.close();
    if (process.stdin.isTTY) input.prompt();
  });
  input.on('close', () => {
    while (controller.getState().bots.length) controller.removeNewestBot();
    log('CLI stopped');
  });
}

if (require.main === module) {
  if (process.argv[2] === '--demo') demo().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
  else interactive();
}
