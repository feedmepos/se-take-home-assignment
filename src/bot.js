// Bot class

const { getTimestamp } = require('./helper');

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
        
        console.log(`[${getTimestamp()}] Bot #${this.id} started processing ${order.toString()}`);
        
        // Simulate 10-second processing time
        this.processingTimer = setTimeout(() => {
            this.completeProcessing();
            onComplete(order);
        }, 10000);
    }

    completeProcessing() {
        if (this.currentOrder) {
            console.log(`[${getTimestamp()}] Bot #${this.id} completed processing ${this.currentOrder.toString()}`);
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
            console.log(`Bot #${this.id} stopped processing ${order.toString()}`);
            order.status = 'PENDING'; // Return order to pending
        }
        
        this.status = 'IDLE';
        this.currentOrder = null;
        return order;
    }

    toString() {
        const orderInfo = this.currentOrder ? ` (processing ${this.currentOrder.toString()})` : '';
        return `Bot #${this.id} [${this.status}]${orderInfo}`;
    }
}

module.exports = { Bot };

