const fs = require('fs');
const path = require('path');

const {
  newNormalOrder,
  newVIPOrder,
  addBot,
  removeBot,
  printQueues,
  log,
  isSystemIdle
} = require('../src/index');

//--------------------
// Prepare result.txt
//--------------------
// const RESULT_FILE = path.join(__dirname, '../result.txt');
const RESULT_FILE = path.join(__dirname, '../scripts/result.txt');
fs.writeFileSync(RESULT_FILE, "");

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Wait until no pending orders and all bots are idle
async function waitUntilSystemIdle() {
  while (!isSystemIdle()) {
    await wait(500); // poll every 0.5s
  }
}

//------------
// Simulation
//------------
async function runSimulation() {
  log("=== Simulation Started ===");

  // Step 1: Add orders
  newNormalOrder();  // Order#1
  newVIPOrder();     // Order#2
  newNormalOrder();  // Order#3

  printQueues();

  // Step 2: First bot
  addBot(); // Bot#1

  // Step 3: Second bot after 2 seconds
  await wait(2000);
  addBot(); // Bot#2

  // Step 4: Remove newest bot after total 5 seconds
  await wait(3000);
  removeBot();

  // Step 5: Add VIP order after total 7 seconds
  await wait(2000);
  newVIPOrder(); // Order#4

  // Step 6: Wait until all processing is done
  await waitUntilSystemIdle();

  log("=== Simulation Completed ===");
}

runSimulation();
