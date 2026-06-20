import { PROCESS_DURATION_MS } from "./constants";
import { BotController } from "./controllers";
import { Logger } from "./libs";

const printFinalStatus = (botController: BotController) => {
    const { orderController } = botController;
    const allOrders = orderController.findAll();
    const vipCount = allOrders.filter((order) => order.customer === "VIP").length;
    const normalCount = allOrders.filter((order) => order.customer === "Normal").length;
    const completedCount = allOrders.filter((order) => order.status === "COMPLETE").length;
    const pendingCount = allOrders.filter((order) => order.status === "PENDING").length;

    console.log("");
    console.log("Final Status:");
    console.log(`- Total Orders Processed: ${allOrders.length} (${vipCount} VIP, ${normalCount} Normal)`);
    console.log(`- Orders Completed: ${completedCount}`);
    console.log(`- Active Bots: ${botController.findAll().length}`);
    console.log(`- Pending Orders: ${pendingCount}`);
};

export const runDemo = () => {
    console.log("McDonald's Order Management System - Simulation Results");
    console.log("");

    const logger = new Logger();
    const botController = new BotController(logger);
    const { orderController } = botController;

    logger.log(`System initialized with ${botController.findAll().length} bots`);

    orderController.create("Normal");
    orderController.create("VIP");
    orderController.create("Normal");

    botController.addBot();
    botController.addBot();

    setTimeout(() => {
        orderController.create("VIP");
    }, PROCESS_DURATION_MS + 1_000);

    let botRemoved = false;

    // Removes the most recently added bot ~2 processing cycles in; if it's mid-order,
    // that order is reset to PENDING (see BotController.stopProcessing) for another bot to pick up
    setTimeout(() => {
        const bots = botController.findAll();
        const newestBot = bots[bots.length - 1];

        if (newestBot) {
            botController.removeBot(newestBot.id);
        }

        botRemoved = true;
    }, 2 * PROCESS_DURATION_MS + 2_000);

    const checkInterval = setInterval(() => {
        const allDone = orderController.findAll().every((order) => order.status === "COMPLETE");

        if (allDone && botRemoved) {
            clearInterval(checkInterval);
            printFinalStatus(botController);
        }
    }, 500);
};
