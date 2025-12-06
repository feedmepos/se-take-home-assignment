// Main CLI application - Simulation sequence

const { OrderController } = require('./controller');

async function runSimulation() {
    const controller = new OrderController();

    console.log('=== EXECUTION STARTED: ' + new Date().toISOString().replace('T', ' ').substring(0, 19) + ' ===\n');
    console.log('=== McDonald\'s Order Management System Demo ===\n');

    // 1. Add 1 bot (show IDLE)
    console.log('1. Adding initial bot');
    controller.addBot();
    controller.printStatus();

    // 2. Add 2 normal orders
    console.log('2. Adding normal orders');
    controller.addNormalOrder();
    await new Promise(resolve => setTimeout(resolve, 1000));
    controller.addNormalOrder();
    await new Promise(resolve => setTimeout(resolve, 1000));
    controller.printStatus();

    // 3. Add 2 VIP orders (should go before normal but follow first VIP)
    console.log('3. Adding VIP order (should go to front)');
    controller.addVipOrder();
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('4. Adding another VIP order (should go after first VIP)');
    controller.addVipOrder();
    await new Promise(resolve => setTimeout(resolve, 1000));
    controller.printStatus();

    // 4. Add 2 more bots
    console.log('5. Adding more bots to handle orders faster');
    controller.addBot();
    await new Promise(resolve => setTimeout(resolve, 1000));
    controller.addBot();
    await new Promise(resolve => setTimeout(resolve, 1000));
    controller.printStatus();

    // 5. Add 2 normal + 1 VIP
    console.log('6. Adding more orders while processing');
    controller.addNormalOrder();
    await new Promise(resolve => setTimeout(resolve, 1000));
    controller.addNormalOrder();
    await new Promise(resolve => setTimeout(resolve, 1000));
    controller.addVipOrder();
    await new Promise(resolve => setTimeout(resolve, 1000));
    controller.printStatus();

    // Wait a bit for some processing to happen
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 6. Remove 1 bot (while processing)
    console.log('7. Removing a bot (newest one)');
    controller.removeBot();
    controller.printStatus();

    // 7. Wait for all orders to complete
    console.log('8. Waiting for all orders to complete...');
    
    // Wait until all orders are completed (max 60 seconds)
    let waitCount = 0;
    while (controller.pendingOrders.length > 0 && waitCount < 60) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        waitCount++;
    }

    // Final status
    controller.printStatus();
    console.log('Demo completed!');
    console.log(`FINAL STATUS: bots: [${controller.bots.length}], pending: [${controller.pendingOrders.length}], completed: [${controller.completedOrders.length}]`);
    
    // Wait a bit more for any final completions
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n=== EXECUTION COMPLETED: ' + new Date().toISOString().replace('T', ' ').substring(0, 19) + ' ===');
}

runSimulation().catch(console.error);

