const newOrderBtn = document.getElementById('new-order-btn');
const newVipOrderBtn = document.getElementById('new-vip-order-btn');
const createBotBtn = document.getElementById('create-bot-btn');
const removeBotBtn = document.getElementById('remove-bot-btn');
const pendingOrders = document.getElementById('pending-orders');
const completedOrders = document.getElementById('completed-orders');
const botStatusArea = document.getElementById('bot-status');

let botCount = 0; // Keep track of how many bots are created
let activeBots = []; // Track all active bots and their status

// Function to create a new normal or VIP order
function createNewOrder(type) {
    const newOrder = document.createElement('div');
    const orderNumber = pendingOrders.children.length + 1;
    newOrder.className = `order ${type === 'VIP' ? 'vip-order' : ''}`;
    newOrder.textContent = `${type} Order #${orderNumber} - PENDING`;

    type === 'VIP' ? insertVipOrder(newOrder) : pendingOrders.appendChild(newOrder);

    assignOrderToIdleBot(); // Check for idle bots to process the new order
}

// Function to insert a VIP order in the right position
function insertVipOrder(newOrder) {
    const orders = Array.from(pendingOrders.children);
    const vipIndex = orders.findIndex(order => !order.classList.contains('vip-order'));

    vipIndex === -1 ? pendingOrders.appendChild(newOrder) : pendingOrders.insertBefore(newOrder, orders[vipIndex]);
}

// Process orders for a specific bot
function processOrders(botId) {
    const botObj = activeBots.find(bot => bot.id === botId);
    const pendingOrder = Array.from(pendingOrders.children).find(order => order.textContent.includes('PENDING'));

    if (pendingOrder) {
        startProcessingOrder(botObj, pendingOrder);
    } else {
        updateBotStatus(botId, 'Idle'); // No pending orders, bot remains idle
    }
}

// Start processing the order for the bot
function startProcessingOrder(botObj, order) {
    order.textContent = order.textContent.replace('PENDING', 'PROCESSING');
    botObj.processingOrder = order;
    updateBotStatus(botObj.id, 'Processing');

    botObj.timeoutId = setTimeout(() => {
        completeOrder(botObj, order);
    }, 10000);
}

// Complete the order and update bot status
function completeOrder(botObj, order) {
    order.textContent = order.textContent.replace('PROCESSING', 'COMPLETE');
    completedOrders.appendChild(order);
    botObj.processingOrder = null; // Clear the processing order
    updateBotStatus(botObj.id, 'Idle');

    assignOrderToIdleBot(); // Check if there are more orders to process
}

function assignOrderToIdleBot() {
    // Loop through the active bots to find the first idle one
    for (let i = 0; i < activeBots.length; i++) {
        const botObj = activeBots[i];

        // If the bot is idle, assign it the first pending order
        if (botObj.processingOrder === null) {
            processOrders(botObj.id);
            break; // Exit the loop after assigning the order
        }
    }
}

// Create a new bot and start processing orders
function createBot() {
    botCount += 1;
    const botId = botCount;
    const botElement = document.createElement('div');
    botElement.className = 'bot';
    botElement.id = `bot-${botId}`;
    botElement.textContent = `Bot #${botId} - Idle`;
    botStatusArea.appendChild(botElement);

    activeBots.push({ id: botId, processingOrder: null, timeoutId: null });
    assignOrderToIdleBot(); // Check for orders immediately when a new bot is created
}

// Function to update the status of a bot
function updateBotStatus(botId, status) {
    const botElement = document.getElementById(`bot-${botId}`);
    if (botElement) {
        botElement.textContent = `Bot #${botId} - ${status}`;
    }
}

// Function to remove the newest bot
function removeBot() {
    if (activeBots.length === 0) return; // No bots to remove

    const botToRemove = activeBots.pop(); // Get the latest bot added
    const botElement = document.getElementById(`bot-${botToRemove.id}`);

    // If the bot is processing an order, return the order to PENDING
    if (botToRemove.processingOrder) {
        botToRemove.processingOrder.textContent = botToRemove.processingOrder.textContent.replace('PROCESSING', 'PENDING');
        clearTimeout(botToRemove.timeoutId); // Cancel the ongoing processing
    }

    // Remove the bot element from the DOM
    botElement.remove();
}

// Add event listeners to buttons
newOrderBtn.addEventListener('click', () => createNewOrder('Normal'));
newVipOrderBtn.addEventListener('click', () => createNewOrder('VIP'));
createBotBtn.addEventListener('click', createBot);
removeBotBtn.addEventListener('click', removeBot);
