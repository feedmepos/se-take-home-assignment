#!/usr/bin/env node
'use strict';

const readline = require('node:readline');
const { OrderController } = require('./order-controller');

const stamp = () => new Date().toISOString().slice(11, 19);
const output = message => process.stdout.write(`[${stamp()}] ${message}\n`);
const controller = new OrderController({ log: message => process.stdout.write(`${message}\n`) });

function showStatus() {
  const state = controller.getState();
  const orders = list => list.length ? list.map(o => `#${o.id} ${o.type}`).join(', ') : '(none)';
  output(`PENDING: ${orders(state.pending)}`);
  output(`PROCESSING: ${state.processing.length ? state.processing.map(o => `#${o.orderId} ${o.type} by Bot #${o.botId}`).join(', ') : '(none)'}`);
  output(`COMPLETE: ${orders(state.complete)}`);
  output(`BOTS: ${state.bots.length ? state.bots.map(b => `#${b.id} ${b.status}`).join(', ') : '(none)'}`);
}

function command(raw) {
  const input = raw.trim().toLowerCase();
  switch (input) {
    case 'normal': case 'new normal order': controller.addOrder('Normal'); break;
    case 'vip': case 'new vip order': controller.addOrder('VIP'); break;
    case '+': case '+ bot': controller.addBot(); break;
    case '-': case '- bot': controller.removeBot(); break;
    case 'status': showStatus(); break;
    case 'help': output('Commands: normal | vip | + | - | status | help | quit'); break;
    case 'quit': case 'exit': return false;
    case '': break;
    default: output(`Unknown command: ${raw.trim()}. Type help.`);
  }
  return true;
}

async function demo() {
  output('Demo started');
  controller.addOrder('Normal');
  controller.addOrder('VIP');
  controller.addOrder('Normal');
  showStatus();
  controller.addBot();
  controller.addBot();
  controller.addBot();
  controller.removeBot();
  showStatus();
  controller.addBot();
  await new Promise(resolve => setTimeout(resolve, 10_100));
  showStatus();
  output('Demo finished');
  controller.shutdown();
}

function interactive() {
  output('Order controller ready. Commands: normal | vip | + | - | status | help | quit');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  rl.on('line', line => {
    if (!command(line)) rl.close();
  });
  rl.on('close', () => {
    controller.shutdown();
    output('Session ended');
  });
}

if (process.argv.includes('--demo')) {
  demo().catch(error => { console.error(error); process.exitCode = 1; });
} else {
  interactive();
}
