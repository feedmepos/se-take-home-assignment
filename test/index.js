const fs = require('fs');
const path = require('path');

const {
  printTitle,
  initSystem,
  newNormalOrder,
  newVIPOrder,
  addBot,
  removeBot,
  log,
  isSystemIdle,
  printFinalSummary
} = require('../src/index');

//--------------------
// Prepare result.txt
//--------------------
const RESULT_FILE = path.join(__dirname, '../scripts/result.txt');
fs.writeFileSync(RESULT_FILE, '');

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
  printTitle();
  initSystem();

  // Initial orders
  newNormalOrder(); // Order#1
  newVIPOrder();    // Order#2
  newNormalOrder(); // Order#3

  // First bot added immediately
  addBot(); // Bot #1

  // Second bot added after 2 seconds
  await wait(2000);
  addBot(); // Bot #2

  // Remove latest bot after 3 seconds
  await wait(3000);
  removeBot();

  // Add another VIP order after 2 more seconds
  await wait(2000);
  newVIPOrder(); // Order#4

  // Wait until all orders are processed
  await waitUntilSystemIdle();

  // Print final summary
  printFinalSummary();
}

// Run simulation
runSimulation();
