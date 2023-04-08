const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const PENDING = 'PENDING';
const COMPLETE = 'COMPLETE';

let orderCount = 0;
let vipQueue = [];
let normalQueue = [];
let botCount = 0;
let botList = [];

function getOrderNumber() {
    orderCount++;
    return orderCount;
}

function createOrder(type) {
    let order = {
        type: type,
        number: getOrderNumber(),
        status: PENDING
    };
    if (type === 'VIP') {
        vipQueue.push(order);
    } else {
        normalQueue.push(order);
    }
    console.log(`Order ${order.number} (${order.type}) has been created and added to the ${PENDING} area.`);
}

function showBot() {
    console.log(`There are ${botList.length} bot(s) in the kitchen.`);
    botList.forEach((bot) => {
        if (bot.order) {
            console.log(`Bot ${bot.id} is processing order ${bot.order.number} (${bot.order.type}).`);
        } else {
            console.log(`Bot ${bot.id} is idle.`);
        }
    });
}

function addBot() {
    botCount++;
    let bot = {
        id: botCount,
        order: null
    };
    botList.push(bot);
    console.log(`Bot ${bot.id} has been created and added to the kitchen.`);
    processOrder();
}

function removeBot() {
    if (botList.length === 0) {
        console.log(`There are no bots in the kitchen.`);
    } else {
        let bot = botList.pop();
        if (bot.order) {
            console.log(`Bot ${bot.id} is processing order ${bot.order.number} (${bot.order.type}). The order has been moved back to the ${PENDING} area.`);
            bot.order.status = PENDING;
        } else {
            console.log(`Bot ${bot.id} is idle.`);
        }
        console.log(`Bot ${bot.id} has been removed from the kitchen.`);
    }
}

function processOrder() {
    let bot = botList.find(bot => !bot.order);
    if (bot) {
        let order = vipQueue.shift() || normalQueue.shift();
        if (order) {
            order.status = COMPLETE;
            bot.order = order;
            console.log(`Order ${order.number} (${order.type}) is being processed by bot ${bot.id}.`);
            setTimeout(() => {
                bot.order = null;
                console.log(`Order ${order.number} (${order.type}) has been processed by bot ${bot.id} and moved to the ${COMPLETE} area.`);
                processOrder();
            }, 10000);
        }
    }
}

function assignOrderToIdleBot(order) {
    for (let i = 0; i < botList.length; i++) {
        if (botList[i].status === "IDLE") {
            botList[i].processOrder(order);
            return;
        }
    }
}


rl.on('line', (input) => {
    switch (input) {
        case 'New Normal Order':
            createOrder('Normal');
            break;
        case 'New VIP Order':
            createOrder('VIP');
            break;
        case '+ Bot':
            addBot();
            break;
        case '- Bot':
            removeBot();
            break;
        case 'Show Bot':
            showBot();
            break;
        default:
            console.log(`Invalid input: ${input}`);
    }
});
