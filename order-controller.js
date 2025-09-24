class Order {
    constructor(id, type = 'NORMAL') {
        this.id = id;
        this.type = type; // 'NORMAL' or 'VIP'
        this.status = 'PENDING'; // 'PENDING' or 'COMPLETE'
        this.createdAt = Date.now();
    }

    toString() {
        return `Order #${this.id} (${this.type})`;
    }
}

// Helper function to get formatted timestamp
function getTimestamp() {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substring(0, 19);
}

class Bot {
    constructor(id) {
        this.id = id;
        this.status = 'IDLE'; // 'IDLE' or 'PROCESSING'
        this.currentOrder = null;
        this.processingTimer = null;
    }

    startProcessing(order, onComplete) {
        this.status = 'PROCESSING';
        this.currentOrder = order;
        
        console.log(`[${getTimestamp()}] Bot ${this.id} started processing ${order.toString()}`);
        
        // Simulate 10-second processing time
        this.processingTimer = setTimeout(() => {
            this.completeProcessing();
            onComplete(order);
        }, 10000);
    }

    completeProcessing() {
        if (this.currentOrder) {
            console.log(`[${getTimestamp()}] Bot ${this.id} completed processing ${this.currentOrder.toString()}`);
            this.currentOrder.status = 'COMPLETE';
            this.currentOrder = null;
        }
        this.status = 'IDLE';
        this.processingTimer = null;
    }

    stopProcessing() {
        if (this.processingTimer) {
            clearTimeout(this.processingTimer);
            this.processingTimer = null;
        }
        
        const order = this.currentOrder;
        if (order) {
            console.log(`Bot ${this.id} stopped processing ${order.toString()}`);
            order.status = 'PENDING'; // Return order to pending
        }
        
        this.status = 'IDLE';
        this.currentOrder = null;
        return order;
    }

    toString() {
        const orderInfo = this.currentOrder ? ` (processing ${this.currentOrder.toString()})` : '';
        return `Bot ${this.id} [${this.status}]${orderInfo}`;
    }
}

class OrderController {
    constructor() {
        this.nextOrderId = 1;
        this.pendingOrders = [];
        this.completedOrders = [];
        this.bots = [];
        this.nextBotId = 1;
    }

    addNormalOrder() {
        const order = new Order(this.nextOrderId++, 'NORMAL');
        this.pendingOrders.push(order);
        console.log(`Added ${order.toString()}`);
        this.processNextOrder();
        return order;
    }

    addVipOrder() {
        const order = new Order(this.nextOrderId++, 'VIP');
        
        // Find the position to insert VIP order (after other VIPs but before normal orders)
        let insertIndex = 0;
        while (insertIndex < this.pendingOrders.length && 
               this.pendingOrders[insertIndex].type === 'VIP') {
            insertIndex++;
        }
        
        this.pendingOrders.splice(insertIndex, 0, order);
        console.log(`Added ${order.toString()}`);
        this.processNextOrder();
        return order;
    }

    addBot() {
        const bot = new Bot(this.nextBotId++);
        this.bots.push(bot);
        console.log(`Added Bot ${bot.id}`);
        this.processNextOrder();
        return bot;
    }

    removeBot() {
        if (this.bots.length === 0) {
            console.log("No bots to remove");
            return null;
        }

        // Remove the newest bot (last added)
        const bot = this.bots.pop();
        const returnedOrder = bot.stopProcessing();
        
        // If the bot was processing an order, return it to pending queue
        if (returnedOrder) {
            // Insert at the appropriate position based on order type
            if (returnedOrder.type === 'VIP') {
                let insertIndex = 0;
                while (insertIndex < this.pendingOrders.length && 
                       this.pendingOrders[insertIndex].type === 'VIP') {
                    insertIndex++;
                }
                this.pendingOrders.splice(insertIndex, 0, returnedOrder);
            } else {
                this.pendingOrders.push(returnedOrder);
            }
        }
        
        console.log(`Removed Bot ${bot.id}`);
        return bot;
    }

    processNextOrder() {
        // Find idle bots and assign them orders
        const idleBots = this.bots.filter(bot => bot.status === 'IDLE');
        
        for (const bot of idleBots) {
            if (this.pendingOrders.length > 0) {
                const order = this.pendingOrders.shift(); // Take first order (highest priority)
                bot.startProcessing(order, (completedOrder) => {
                    this.completedOrders.push(completedOrder);
                    // Try to process next order after completion
                    setTimeout(() => this.processNextOrder(), 100);
                });
            }
        }
    }

    getStatus() {
        const botStatus = this.bots.map(bot => bot.toString()).join(', ');
        const pendingOrdersStr = this.pendingOrders.map(order => order.toString()).join(', ');
        const completedOrdersStr = this.completedOrders.map(order => order.toString()).join(', ');
        
        return {
            bots: this.bots.length,
            botsDetail: botStatus || 'None',
            pendingOrders: this.pendingOrders.length,
            pendingOrdersDetail: pendingOrdersStr || 'None',
            completedOrders: this.completedOrders.length,
            completedOrdersDetail: completedOrdersStr || 'None'
        };
    }

    printStatus() {
        const status = this.getStatus();
        console.log('\n=== ORDER CONTROLLER STATUS ===');
        console.log(`Bots (${status.bots}): ${status.botsDetail}`);
        console.log(`Pending Orders (${status.pendingOrders}): ${status.pendingOrdersDetail}`);
        console.log(`Completed Orders (${status.completedOrders}): ${status.completedOrdersDetail}`);
        console.log('===============================\n');
    }
}

module.exports = { Order, Bot, OrderController };