const readline = require('readline');
const { Order, Bot } = require("./model")

let orderNumber = 0;
let botNumber = 0;
let bots = [];
let pendingOrders = [];

function checkPendingOrders() {
    // Look for idle bot to process order
    const idleBot = bots.find(bot => bot.status === 'IDLE');
    if (idleBot && pendingOrders.length > 0) {
        const nextOrder = pendingOrders.shift();
        idleBot.processOrder(nextOrder, checkPendingOrders);
    }
}

function addOrder(type, customOrderNumber = null, cancel = false) {
    const order = new Order(customOrderNumber == null ? ++orderNumber : customOrderNumber, type);
    if (cancel) {
        pendingOrders.unshift(order)
    }
    else if (order.type === 'VIP') {
        const vipIndex = pendingOrders.findIndex(order => order.type !== 'VIP');
        if (vipIndex === -1) {
            pendingOrders.push(order);
        } else {
            pendingOrders.splice(vipIndex, 0, order);
        }
    } else {
        pendingOrders.push(order);
    }
    console.log(`New ${order.type} order added with order number ${order.orderNumber} and status ${order.status}`);
    checkPendingOrders();
}

function addBot() {
    botNumber++;
    const bot = new Bot(botNumber);
    bots.push(bot);
    console.log(`New bot added with number ${bot.botNumber}`);
    checkPendingOrders();
}

function removeBot() {
    if (bots.length === 0) {
        console.log('There are no bots to remove');
        return;
    }
    const botToRemove = bots.pop();
    const processingOrder = botToRemove.currentOrder?.orderNumber
    if (botToRemove.status === 'PROCESSING') {
        botToRemove.cancelOrder(addOrder); // cancel the current order before removing the bot
        console.log(`Bot ${botToRemove.botNumber} was removed while processing order ${processingOrder}`);
    } else {
        console.log(`Bot ${botToRemove.botNumber} was removed while idle`);
    }
    checkPendingOrders();
}


function showBots() {
    if (bots.length === 0) {
        console.log('There are no bots');
        return;
    }
    bots.forEach(bot => {
        if (bot.status === 'IDLE') {
            console.log(`Bot ${bot.botNumber} is idle`);
        } else {
            console.log(`Bot ${bot.botNumber} is processing order ${bot.currentOrder.orderNumber} (${bot.currentOrder.type})`);
        }
    });
}

function showPendingOrder() {
    if (pendingOrders.length === 0) {
        console.log('There are no pending order');
        return;
    }
    pendingOrders.forEach(pendingOrder => console.log(`Order No : ${pendingOrder.orderNumber}(${pendingOrder.type}) `))
}

function promptUser(rl) {
    // Prompt for user input
    process.stdout.write("Please enter a command (n for normal order, v for VIP order, + to add bot, - to remove bot, show to display bots, p to show pending orders, exit to exit): ");
    rl.on('line', (input) => {
        switch (input.trim().toLowerCase()) {
            case 'n':
                addOrder('Normal');
                break;
            case 'v':
                addOrder('VIP');
                break;
            case '+':
                addBot();
                break;
            case '-':
                removeBot();
                break;
            case 'show':
                showBots();
                break;
            case 'p':
                showPendingOrder();
                break;
            case 'exit':
                rl.close();
                break;
            default:
                console.log(`Invalid input: ${input}`);
                break;
        }
    }).on('close', () => { console.log('Closing the system, bye...'); rl.close() });
}

function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    promptUser(rl)
}

main()