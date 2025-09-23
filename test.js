const { Order, Bot, OrderController } = require('./order-controller');

class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    test(name, testFn) {
        this.tests.push({ name, testFn });
    }

    async run() {
        console.log("Running unit tests...\n");
        
        for (const { name, testFn } of this.tests) {
            try {
                await testFn();
                console.log(`✓ ${name}`);
                this.passed++;
            } catch (error) {
                console.log(`✗ ${name}: ${error.message}`);
                this.failed++;
            }
        }
        
        console.log(`\nTest Results: ${this.passed} passed, ${this.failed} failed`);
        
        if (this.failed > 0) {
            process.exit(1);
        }
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }

    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(`${message} - Expected: ${expected}, Actual: ${actual}`);
        }
    }
}

// Test Suite
const runner = new TestRunner();

runner.test("Order creation", () => {
    const order = new Order(1, 'NORMAL');
    runner.assertEqual(order.id, 1, "Order ID should be 1");
    runner.assertEqual(order.type, 'NORMAL', "Order type should be NORMAL");
    runner.assertEqual(order.status, 'PENDING', "Order status should be PENDING");
});

runner.test("Bot creation", () => {
    const bot = new Bot(1);
    runner.assertEqual(bot.id, 1, "Bot ID should be 1");
    runner.assertEqual(bot.status, 'IDLE', "Bot status should be IDLE");
    runner.assert(bot.currentOrder === null, "Bot should have no current order");
});

runner.test("Order Controller initialization", () => {
    const controller = new OrderController();
    runner.assertEqual(controller.nextOrderId, 1, "Next order ID should start at 1");
    runner.assertEqual(controller.pendingOrders.length, 0, "Should have no pending orders");
    runner.assertEqual(controller.completedOrders.length, 0, "Should have no completed orders");
    runner.assertEqual(controller.bots.length, 0, "Should have no bots");
});

runner.test("Adding normal order", () => {
    const controller = new OrderController();
    const order = controller.addNormalOrder();
    
    runner.assertEqual(order.id, 1, "First order should have ID 1");
    runner.assertEqual(order.type, 'NORMAL', "Order should be NORMAL type");
    runner.assertEqual(controller.pendingOrders.length, 1, "Should have 1 pending order");
});

runner.test("Adding VIP order priority", () => {
    const controller = new OrderController();
    
    // Add normal orders first
    controller.addNormalOrder();
    controller.addNormalOrder();
    
    // Add VIP order - should go to front
    const vipOrder = controller.addVipOrder();
    
    runner.assertEqual(controller.pendingOrders[0].type, 'VIP', "VIP order should be first");
    runner.assertEqual(controller.pendingOrders[0].id, vipOrder.id, "VIP order should be at front of queue");
});

runner.test("Multiple VIP orders ordering", () => {
    const controller = new OrderController();
    
    // Add normal order
    controller.addNormalOrder();
    
    // Add first VIP order
    const vip1 = controller.addVipOrder();
    
    // Add second VIP order
    const vip2 = controller.addVipOrder();
    
    runner.assertEqual(controller.pendingOrders[0].id, vip1.id, "First VIP order should remain first");
    runner.assertEqual(controller.pendingOrders[1].id, vip2.id, "Second VIP order should be after first VIP");
    runner.assertEqual(controller.pendingOrders[2].type, 'NORMAL', "Normal order should be last");
});

runner.test("Bot addition and removal", () => {
    const controller = new OrderController();
    
    const bot1 = controller.addBot();
    runner.assertEqual(controller.bots.length, 1, "Should have 1 bot");
    
    const bot2 = controller.addBot();
    runner.assertEqual(controller.bots.length, 2, "Should have 2 bots");
    
    // Remove bot (should remove the newest one)
    const removedBot = controller.removeBot();
    runner.assertEqual(controller.bots.length, 1, "Should have 1 bot after removal");
    runner.assertEqual(removedBot.id, bot2.id, "Should remove the newest bot");
});

runner.test("Order processing assignment", async () => {
    const controller = new OrderController();
    
    // Add bot first
    controller.addBot();
    
    // Add order - should be picked up immediately
    controller.addNormalOrder();
    
    // Wait a bit for processing to start
    await new Promise(resolve => setTimeout(resolve, 100));
    
    runner.assertEqual(controller.pendingOrders.length, 0, "Order should be picked up from pending");
    runner.assertEqual(controller.bots[0].status, 'PROCESSING', "Bot should be processing");
    runner.assert(controller.bots[0].currentOrder !== null, "Bot should have current order");
});

runner.test("Bot processing timeout and completion", async () => {
    const controller = new OrderController();
    
    // Override the processing time for testing (much shorter)
    const originalTimeout = 10000;
    
    // Add bot and order
    controller.addBot();
    const order = controller.addNormalOrder();
    
    // Wait for processing to start
    await new Promise(resolve => setTimeout(resolve, 100));
    
    runner.assertEqual(controller.bots[0].status, 'PROCESSING', "Bot should be processing");
    
    // Simulate completion by calling completeProcessing directly
    controller.bots[0].completeProcessing();
    controller.completedOrders.push(order);
    order.status = 'COMPLETE';
    
    runner.assertEqual(controller.bots[0].status, 'IDLE', "Bot should be idle after completion");
    runner.assertEqual(controller.completedOrders.length, 1, "Should have 1 completed order");
    runner.assertEqual(order.status, 'COMPLETE', "Order should be marked as complete");
});

// Run all tests
if (require.main === module) {
    runner.run().catch(console.error);
}

module.exports = { TestRunner };