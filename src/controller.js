// OrderController class

const { Order } = require('./order');
const { Bot } = require('./bot');

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

    requeuePending(order) {
        // Requeue order at front of its type
        if (order.type === 'VIP') {
            // Insert at front of VIP section (becomes first VIP)
            // Find where VIP section starts (should be at index 0 if VIPs exist)
            let vipCount = 0;
            while (vipCount < this.pendingOrders.length && 
                   this.pendingOrders[vipCount].type === 'VIP') {
                vipCount++;
            }
            // Insert at the beginning (index 0) - becomes first VIP
            this.pendingOrders.splice(0, 0, order);
        } else {
            // Normal order: insert after all VIPs, at start of Normal section (becomes first Normal)
            let insertIndex = 0;
            while (insertIndex < this.pendingOrders.length && 
                   this.pendingOrders[insertIndex].type === 'VIP') {
                insertIndex++;
            }
            // Insert at the start of Normal section
            this.pendingOrders.splice(insertIndex, 0, order);
        }
    }

    addBot() {
        const bot = new Bot(this.nextBotId++);
        this.bots.push(bot);
        console.log(`Added Bot #${bot.id}`);
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
            this.requeuePending(returnedOrder);
        }
        
        console.log(`Removed Bot #${bot.id}`);
        this.processNextOrder(); // Try to assign the requeued order to another bot
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

module.exports = { OrderController };

