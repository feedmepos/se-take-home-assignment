'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { OrderManager } = require('./src/orderManager');

function timestamp() {
  return new Date().toTimeString().slice(0, 8); // HH:MM:SS
}

function log(msg) {
  console.log(`[${timestamp()}] ${msg}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function printStatus(manager, logger) {
  const s = manager.getStatus();
  const botStr = manager.bots.map(b => {
    if (b.status === 'PROCESSING') {
      return `Bot #${b.id} PROCESSING → #${b.currentOrder.id} ${b.currentOrder.type}`;
    }
    return `Bot #${b.id} IDLE`;
  }).join(', ');
  logger('--- Status ---');
  logger(`Bots:      [${botStr || 'none'}]`);
  logger(`Pending:   [${s.pending.join(', ')}]`);
  logger(`Completed: [${s.completed.join(', ')}]`);
}

function runInteractive() {
  const resultPath = path.join(__dirname, 'scripts', 'result.txt');
  const fileStream = fs.createWriteStream(resultPath, { flags: 'w' });

  function logBoth(msg) {
    const line = `[${timestamp()}] ${msg}`;
    console.log(line);
    fileStream.write(line + '\n');
  }

  const manager = new OrderManager({ processingTime: 10000, log: logBoth });
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '> ' });

  logBoth("=== McDonald's Order Management System (Interactive) ===");
  logBoth('Commands: new normal (nn), new vip (nv), add bot (+bot), remove bot (-bot), status (s), exit (q)');

  rl.prompt();

  rl.on('line', line => {
    const cmd = line.trim().toLowerCase();
    switch (cmd) {
      case 'new normal':
      case 'nn':
        manager.addNormalOrder();
        break;
      case 'new vip':
      case 'nv':
        manager.addVipOrder();
        break;
      case 'add bot':
      case '+bot':
        manager.addBot();
        break;
      case 'remove bot':
      case '-bot':
        manager.removeBot();
        break;
      case 'status':
      case 's':
        printStatus(manager, logBoth);
        break;
      case 'exit':
      case 'quit':
      case 'q':
        logBoth('Goodbye!');
        rl.close();
        fileStream.end();
        process.exit(0);
        break;
      default:
        if (cmd !== '') {
          logBoth(`Unknown command: "${cmd}". Try: nn, nv, +bot, -bot, s, q`);
        }
    }
    rl.prompt();
  });

  rl.on('close', () => { fileStream.end(); process.exit(0); });
}

async function main() {
  const manager = new OrderManager({ processingTime: 10000, log });

  log('=== McDonald\'s Order Management System ===');
  log('');

  // Step 1: Add orders before any bots
  log('-- Step 1: Adding orders --');
  manager.addNormalOrder(); // #1001
  manager.addNormalOrder(); // #1002
  manager.addVipOrder();    // #1003 → inserts before normals

  const status1 = manager.getStatus();
  log(`Queue: [${status1.pending.join(', ')}]`);
  log('');

  // Step 2: Add Bot #1 → should pick VIP order first
  log('-- Step 2: Adding Bot #1 --');
  manager.addBot();
  log('');

  // Step 3: Add Bot #2 → should pick next pending (Normal #1001)
  log('-- Step 3: Adding Bot #2 --');
  manager.addBot();
  log('');

  const status2 = manager.getStatus();
  log(`Bots: [${status2.bots.join(', ')}]`);
  log(`Pending: [${status2.pending.join(', ')}]`);
  log(`Processing: [${status2.processing.join(', ')}]`);
  log('');

  // Step 4: Add a new order while bots are running
  await sleep(2000);
  log('-- Step 4: Adding Order #1004 while bots are running --');
  manager.addVipOrder(); // #1004 VIP → goes to front of pending
  const status3 = manager.getStatus();
  log(`Pending: [${status3.pending.join(', ')}]`);
  log('');

  // Step 5: Remove Bot #2 mid-processing → its order returns to PENDING
  await sleep(1000);
  log('-- Step 5: Removing Bot #2 (mid-processing) --');
  manager.removeBot();
  const status4 = manager.getStatus();
  log(`Pending: [${status4.pending.join(', ')}]`);
  log(`Bots: [${status4.bots.join(', ')}]`);
  log('');

  // Wait for Bot #1 to finish its current order (~7s remaining)
  log('-- Waiting for Bot #1 to finish processing... --');
  await sleep(8000);

  const status5 = manager.getStatus();
  log('');
  log('=== Final Status ===');
  log(`Bots: [${status5.bots.join(', ')}]`);
  log(`Pending: [${status5.pending.join(', ')}]`);
  log(`Processing: [${status5.processing.join(', ')}]`);
  log(`Completed: [${status5.completed.join(', ')}]`);
}

if (process.argv.includes('--interactive') || process.argv.includes('-i')) {
  runInteractive();
} else {
  main().catch(err => {
    log(`ERROR: ${err.message}`);
    process.exit(1);
  });
}
