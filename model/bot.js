// Define bot class
module.exports = class Bot {
    constructor(botNumber) {
        this.botNumber = botNumber;
        this.status = 'IDLE';
        this.currentOrder = null;
        this.timeoutId = null; // initialize timeout ID to null
    }

    processOrder(order, checkPendingOrders, completedOrders) {
        this.status = 'PROCESSING';
        this.currentOrder = order;
        console.log(`Bot ${this.botNumber} is now processing order ${order.orderNumber} (${order.type})`);
        this.timeoutId = setTimeout(() => {
            this.currentOrder.status = 'COMPLETE';
            completedOrders.push(this.currentOrder)
            console.log(`Bot ${this.botNumber} has completed processing order ${order.orderNumber} (${order.type})`);
            this.currentOrder = null;
            this.status = 'IDLE';
            checkPendingOrders();
        }, this.currentOrder.processingTime);
    }

    cancelOrder(addOrder) {
        if (this.currentOrder && this.status === 'PROCESSING') {
            clearTimeout(this.timeoutId);
            this.currentOrder.status = 'PENDING';
            console.log(`Order ${this.currentOrder.orderNumber} (${this.currentOrder.type}) has been cancelled`);
            addOrder(this.currentOrder.type, this.currentOrder.orderNumber, true)
            this.currentOrder = null;
            this.status = 'IDLE';
        } else {
            console.log(`Bot ${this.botNumber} has no order to cancel`);
        }
    }
}