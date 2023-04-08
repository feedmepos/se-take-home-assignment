const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Define order class
class Order {
    constructor(orderNumber, type) {
        this.orderNumber = orderNumber;
        this.type = type;
        this.status = 'PENDING';
        this.processingTime = 10000; // 10 seconds
    }
}

// Define bot class
class Bot {
    constructor(botNumber) {
        this.botNumber = botNumber;
        this.status = 'IDLE';
        this.currentOrder = null;
        this.timeoutId = null; // initialize timeout ID to null
    }

    processOrder(order) {
        this.status = 'PROCESSING';
        this.currentOrder = order;
        console.log(`Bot ${this.botNumber} is now processing order ${order.orderNumber} (${order.type})`);
        this.timeoutId = setTimeout(() => {
            this.currentOrder.status = 'COMPLETE';
            console.log(`Bot ${this.botNumber} has completed processing order ${order.orderNumber} (${order.type})`);
            this.currentOrder = null;
            this.status = 'IDLE';
            checkPendingOrders();
        }, this.currentOrder.processingTime);
    }

    cancelOrder() {
        if (this.currentOrder && this.status === 'PROCESSING') {
            clearTimeout(this.timeoutId);
            this.currentOrder.status = 'PENDING';
            console.log(`Order ${this.currentOrder.orderNumber} (${this.currentOrder.type}) has been cancelled`);
            addOrder(this.currentOrder.type, this.currentOrder.orderNumber)
            this.currentOrder = null;
            this.status = 'IDLE';               
        } else {
            console.log(`Bot ${this.botNumber} has no order to cancel`);
        }
    }
}



let orderNumber = 0;
let botNumber = 0;
let bots = [];
let pendingOrders = [];

function checkPendingOrders() {
    // Look for idle bot to process order
    const idleBot = bots.find(bot => bot.status === 'IDLE');
    if (idleBot && pendingOrders.length > 0) {
        const nextOrder = pendingOrders.shift();
        idleBot.processOrder(nextOrder);
    }
}

function addOrder(type, customOrderNumber = null) {
    const order = new Order(customOrderNumber == null ?  ++orderNumber : customOrderNumber, type);
    if (order.type === 'VIP') {
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
        botToRemove.cancelOrder(); // cancel the current order before removing the bot
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
    pendingOrders.forEach(pendingOrder => console.log(`Order No : ${pendingOrder.orderNumber}(${pendingOrder.type}) `))
}

// Prompt for user input
rl.prompt();

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
        default:
            console.log(`Invalid input: ${input}`);
    }
    rl.prompt()
})
