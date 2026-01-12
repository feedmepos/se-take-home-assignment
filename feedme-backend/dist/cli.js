import { getOrderController } from './services/OrderControllerSingleton.js';
// CLI simulation mode for result.txt output
async function simulate() {
    const controller = getOrderController();
    console.log("McDonald's Order Management System - Simulation Results");
    console.log("");
    controller.log("System initialized with 0 bots");
    // Wait helper function
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    // Simulate a sequence of events matching the expected output
    await wait(1000);
    controller.createNormalOrder();
    await wait(1000);
    controller.createVIPOrder();
    await wait(1000);
    controller.createNormalOrder();
    await wait(1000);
    controller.addBot();
    await wait(1000);
    controller.addBot();
    // Wait for orders to complete (10 seconds processing time)
    // First bot picks VIP order, second bot picks first normal order
    await wait(12000);
    // Bot 1 should pick up the remaining normal order
    await wait(1000);
    // Create VIP order while bot 2 is idle
    controller.createVIPOrder();
    // Wait for remaining orders to complete
    await wait(12000);
    // Remove bot (should be bot 2 which is idle)
    await wait(1000);
    controller.removeBot();
    // Wait a bit more to ensure everything is processed
    await wait(2000);
    // Final status
    const status = controller.getStatus();
    const orders = controller.getAllOrders();
    const vipCount = orders.filter(o => o.type === 'VIP').length;
    const normalCount = orders.filter(o => o.type === 'NORMAL').length;
    controller.log('');
    controller.log('Final Status:');
    controller.log(`- Total Orders Processed: ${status.orders.total} (${vipCount} VIP, ${normalCount} Normal)`);
    controller.log(`- Orders Completed: ${status.orders.complete}`);
    controller.log(`- Active Bots: ${status.bots.active}`);
    controller.log(`- Pending Orders: ${status.orders.pending}`);
}
// Run simulation
simulate().catch(console.error);
export { simulate };
//# sourceMappingURL=cli.js.map