import fs from 'fs';
import path from 'path';

export type OrderType = 'VIP' | 'Normal';

export interface Order {
    id: number;
    type: OrderType;
}


function logResult(message: string) {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const logMessage = `[${timestamp}] ${message}`;

    console.log(logMessage);

    // Write inside scripts/result.txt
    const resultPath = path.join(__dirname, '../scripts/result.txt');
    fs.appendFileSync(resultPath, logMessage + '\n');
}

export class OrderManager {
    private orderCounter: number = 1;
    private orders: Order[] = [];
    private completedOrders: Order[] = [];
    private bots: Bot[] = [];

    // Add new order from type
    public addOrder(type: OrderType) {
        const order: Order = { id: this.orderCounter++, type };
        this.addOrderToQueue(order);
        this.triggerIdleBots();
    }

    // Requeue an existing order (e.g., stopped bot)
    public requeueOrder(order: Order) {
        this.addOrderToQueue(order);
        this.triggerIdleBots();
    }

    private addOrderToQueue(order: Order) {
        if (order.type === 'VIP') {
            const lastVIPIndex = this.orders.map(o => o.type).lastIndexOf('VIP');
            this.orders.splice(lastVIPIndex + 1, 0, order);
        } else {
            this.orders.push(order);
        }
        logResult(`Order ${order.id} (${order.type}) added to pending`);
    }

    private triggerIdleBots() {
        this.bots
            .filter(bot => bot.active && !bot.currentOrder)
            .forEach(bot => bot.processNext());
    }

    public getNextOrder(): Order | undefined {
        return this.orders.shift();
    }

    public completeOrder(order: Order) {
        this.completedOrders.push(order);
    }

    public addBot() {
        const botId = this.bots.length + 1;
        const bot = new Bot(botId, this);
        this.bots.push(bot);
        logResult(`Bot ${botId} added`);
    }

    public removeBot() {
        if (this.bots.length === 0) {
            logResult('No bots to remove');
            return;
        }
        const bot = this.bots.pop()!;
        bot.stop();
        logResult(`Bot ${bot.id} removed`);
    }

    public getPendingOrders() {
        return this.orders;
    }

    public getCompletedOrders() {
        return this.completedOrders;
    }
}

export class Bot {
    public currentOrder: Order | null = null;
    public active: boolean = true;

    constructor(public id: number, private manager: OrderManager) {
        this.processNext();
    }

    // Process orders concurrently
    public async processNext() {
        while (this.active) {
            const nextOrder = this.manager.getNextOrder();
            if (!nextOrder) break; // No pending order

            this.currentOrder = nextOrder;
            logResult(`Bot ${this.id} started processing Order ${nextOrder.id} (${nextOrder.type})`);
            await new Promise(resolve => setTimeout(resolve, 10000)); // 10 sec
            this.manager.completeOrder(nextOrder);
            logResult(`Bot ${this.id} completed Order ${nextOrder.id} (${nextOrder.type})`);
            this.currentOrder = null;
        }
    }

    public stop() {
        this.active = false;
        if (this.currentOrder) {
            logResult(`Bot ${this.id} stopped processing Order ${this.currentOrder.id}, returning to pending queue`);
            this.manager.requeueOrder(this.currentOrder);
            this.currentOrder = null;
        }
    }
}