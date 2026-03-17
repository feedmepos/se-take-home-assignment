const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Global state management
let orderCounter = 1; // Unique incremental order ID
const pendingOrders = []; // Pending order queue [ { id, type, position }, ... ]
const completedOrders = []; // Completed orders
const bots = []; // Cooking bots list [ { id, status: 'IDLE'/'PROCESSING', currentOrder, timer }, ... ]
const resultFile = path.join(__dirname, '../result.txt');

// Utility: Get timestamp in HH:MM:SS format
const getTimestamp = () => {
    const now = new Date();
    return now.toTimeString().split(' ')[0].substring(0, 8); // Format: HH:MM:SS
};

// Utility: Write logs to result.txt (with timestamp)
const logToFile = (message) => {
    const log = `[${getTimestamp()}] ${message}\n`;
    fs.appendFileSync(resultFile, log);
    console.log(log.trim()); // Print to console simultaneously
};

// Initialize log file (clear existing content)
fs.writeFileSync(resultFile, '');
logToFile('=== McDonald\'s Order Management System Started ===');

// Sort pending orders: VIP first, then Normal; same type sorted by creation order
const sortPendingOrders = () => {
    pendingOrders.sort((a, b) => {
        if (a.type === 'VIP' && b.type === 'NORMAL') return -1;
        if (a.type === 'NORMAL' && b.type === 'VIP') return 1;
        return a.id - b.id; // Same type: ascending by order ID
    });
};

// Create new order (NORMAL/VIP)
const createOrder = (type) => {
    const orderId = orderCounter++;
    const order = { id: orderId, type };
    pendingOrders.push(order);
    sortPendingOrders(); // Re-sort queue to maintain priority
    const msg = `Created ${type} Order #${orderId}, Pending Queue: ${pendingOrders.map(o => `${o.type}#${o.id}`).join(', ')}`;
    logToFile(msg);
    // Notify idle bots to process new order
    bots.forEach(bot => {
        if (bot.status === 'IDLE') processOrder(bot);
    });
};

// Bot process order logic (10 seconds per order)
const processOrder = (bot) => {
    if (pendingOrders.length === 0) {
        bot.status = 'IDLE';
        logToFile(`Bot #${bot.id} has no orders to process, status changed to IDLE`);
        return;
    }

    // Pick first order from queue
    const order = pendingOrders.shift();
    bot.status = 'PROCESSING';
    bot.currentOrder = order;
    logToFile(`Bot #${bot.id} started processing ${order.type} Order #${order.id}, expected completion in 10 seconds`);

    // Complete order after 10 seconds
    bot.timer = setTimeout(() => {
        completedOrders.push(order);
        bot.currentOrder = null;
        bot.status = 'IDLE';
        logToFile(`Bot #${bot.id} completed ${order.type} Order #${order.id}, moved to Completed Queue`);
        // Process next order if available
        processOrder(bot);
    }, 10000); // 10 seconds processing time
};

// Add new cooking bot
const addBot = () => {
    const botId = bots.length + 1;
    const newBot = {
        id: botId,
        status: 'IDLE',
        currentOrder: null,
        timer: null
    };
    bots.push(newBot);
    logToFile(`Added new Bot #${botId}, Total Bots: ${bots.length}`);
    // Start processing orders immediately
    processOrder(newBot);
};

// Remove the newest bot (last added)
const removeBot = () => {
    if (bots.length === 0) {
        logToFile('No bots to remove');
        return;
    }
    const removedBot = bots.pop();
    logToFile(`Removed Bot #${removedBot.id}, Total Bots: ${bots.length}`);

    // If bot is processing order: interrupt and return order to pending queue
    if (removedBot.status === 'PROCESSING') {
        clearTimeout(removedBot.timer);
        const order = removedBot.currentOrder;
        if (order) {
            pendingOrders.unshift(order); // Return to original position (queue front)
            sortPendingOrders(); // Re-sort to maintain VIP priority
            logToFile(`Bot #${removedBot.id} was destroyed, interrupted ${order.type} Order #${order.id}, returned to Pending Queue`);
        }
        removedBot.currentOrder = null;
        removedBot.timer = null;
    }
};

// Show current system status (orders + bots)
const showStatus = () => {
    const pendingStr = pendingOrders.length > 0
        ? pendingOrders.map(o => `${o.type}#${o.id}`).join(', ')
        : 'Empty';
    const completedStr = completedOrders.length > 0
        ? completedOrders.map(o => `${o.type}#${o.id}`).join(', ')
        : 'Empty';
    const botsStr = bots.map(b => `#${b.id}(${b.status}${b.currentOrder ? `:Processing ${b.currentOrder.type}#${b.currentOrder.id}` : ''})`).join(', ') || 'None';

    const statusMsg = `
===== Current System Status =====
Pending Orders: ${pendingStr}
Completed Orders: ${completedStr}
Bots Status: ${botsStr}
=================================
  `;
    logToFile(statusMsg.trim());
};

// Initialize interactive CLI interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'Enter command (normal/vip/addbot/rmbot/status/exit): '
});

// Command handler
rl.on('line', (input) => {
    const cmd = input.trim().toLowerCase();
    switch (cmd) {
        case 'normal':
            createOrder('NORMAL');
            break;
        case 'vip':
            createOrder('VIP');
            break;
        case 'addbot':
            addBot();
            break;
        case 'rmbot':
            removeBot();
            break;
        case 'status':
            showStatus();
            break;
        case 'exit':
            logToFile('=== McDonald\'s Order Management System Exited ===');
            rl.close();
            process.exit(0);
            break;
        default:
            logToFile(`Invalid command: ${cmd}, Supported commands: normal/vip/addbot/rmbot/status/exit`);
    }
    rl.prompt();
});

// Start CLI
logToFile('System ready, use the following commands to operate:');
logToFile('normal - Create Normal Order | vip - Create VIP Order | addbot - Add Cooking Bot | rmbot - Remove Newest Bot | status - View Status | exit - Exit System');
rl.prompt();
