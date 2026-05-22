/**
 * McDonald's Order Controller - CLI Application
 * Main entry point for the order management system
 * 
 * This CLI application demonstrates the McDonald's order management system
 * with automated cooking bots through a simulation scenario.
 */

import { OrderController } from './orderController.js';
import { getCurrentTime } from './utils/timeFormatter.js';

/**
 * Simulation mode - Automated demo demonstrating all system features
 */
async function runSimulation() {
  const controller = new OrderController((message) => {
    console.log(message);
  });

  console.log("McDonald's Order Management System - Simulation Results\n");
  console.log(`[${getCurrentTime()}] System initialized with 0 bots\n`);

  // Step 1: Create a normal order
  console.log("Step 1: Creating a normal order...");
  await sleep(1000);
  controller.createNormalOrder();
  console.log("");

  // Step 2: Create a VIP order (should be prioritized over normal orders)
  console.log("Step 2: Creating a VIP order (VIP orders have priority over normal orders)...");
  await sleep(1000);
  controller.createVIPOrder();
  console.log("");

  // Step 3: Create another normal order
  console.log("Step 3: Creating another normal order...");
  await sleep(1000);
  controller.createNormalOrder();
  console.log("");

  // Step 4: Add first bot (should automatically pick up the VIP order first)
  console.log("Step 4: Adding first bot (will automatically pick up VIP order due to priority)...");
  await sleep(1000);
  controller.addBot();
  console.log("");

  // Step 5: Add second bot (should pick up the next order)
  console.log("Step 5: Adding second bot (will pick up next available order)...");
  await sleep(1000);
  controller.addBot();
  console.log("");

  // Step 6: Wait for orders to complete (processing takes 10 seconds)
  console.log("Step 6: Waiting for orders to complete (processing time: 10 seconds)...");
  await sleep(11000);
  console.log("");

  // Step 7: Create another VIP order while system is processing
  console.log("Step 7: Creating another VIP order while bots are processing...");
  await sleep(1000);
  controller.createVIPOrder();
  console.log("");

  // Step 8: Wait for remaining orders to complete
  console.log("Step 8: Waiting for remaining orders to complete...");
  await sleep(11000);
  console.log("");

  // Step 9: Remove a bot (removes the most recently added bot)
  console.log("Step 9: Removing a bot (removes the most recently added bot)...");
  await sleep(1000);
  controller.removeBot();
  console.log("");

  // Step 10: Wait for system to stabilize
  console.log("Step 10: Waiting for any other orders, if any...");
  await sleep(5000);
  console.log("");

  // Final status summary
  const status = controller.getStatus();
  console.log("Simulation Complete - Final Status:");
  console.log(`- Total Orders Processed: ${status.totalOrders} (${status.vipOrders} VIP, ${status.normalOrders} Normal)`);
  console.log(`- Orders Completed: ${status.completedOrders}`);
  console.log(`- Active Bots: ${status.activeBots}`);
  console.log(`- Pending Orders: ${status.pendingOrders}`);
}

/**
 * Utility function to sleep for a specified number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after the sleep duration
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run simulation
runSimulation();
