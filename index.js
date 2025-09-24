#!/usr/bin/env node

const { OrderController } = require('./order-controller');

// Function to add delay for demonstration purposes
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function demonstrateOrderSystem() {
    console.log("=== McDonald's Order Management System Demo ===\n");
    
    const controller = new OrderController();
    
    // Demonstrate all requirements
    console.log("1. Adding initial bot");
    controller.addBot();
    controller.printStatus();
    
    await delay(1000);
    
    console.log("2. Adding normal orders");
    controller.addNormalOrder();
    controller.addNormalOrder();
    controller.printStatus();
    
    await delay(1000);
    
    console.log("3. Adding VIP order (should go to front)");
    controller.addVipOrder();
    controller.printStatus();
    
    await delay(1000);
    
    console.log("4. Adding another VIP order (should go after first VIP)");
    controller.addVipOrder();
    controller.printStatus();
    
    await delay(2000);
    
    console.log("5. Adding more bots to handle orders faster");
    controller.addBot();
    controller.addBot();
    controller.printStatus();
    
    await delay(5000);
    
    console.log("6. Adding more orders while processing");
    controller.addNormalOrder();
    controller.addVipOrder();
    controller.printStatus();
    
    await delay(3000);
    
    console.log("7. Removing a bot (newest one)");
    controller.removeBot();
    controller.printStatus();
    
    // Wait for remaining orders to process
    console.log("8. Waiting for all orders to complete...");
    await delay(12000);
    
    controller.printStatus();
    
    console.log("Demo completed!");
    
    // Output final status to result.txt format
    const finalStatus = controller.getStatus();
    console.log(`\nFINAL STATUS: bots: [${finalStatus.bots}], pending: [${finalStatus.pendingOrders}], completed: [${finalStatus.completedOrders}]`);
    
    return controller;
}

// Run the demonstration if this file is executed directly
if (require.main === module) {
    demonstrateOrderSystem().catch(console.error);
}

module.exports = { demonstrateOrderSystem };