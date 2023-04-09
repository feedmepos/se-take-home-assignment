// Define order class
module.exports = class Order {
    constructor(orderNumber, type) {
        this.orderNumber = orderNumber;
        this.type = type;
        this.status = 'PENDING';
        this.processingTime = 10000; // 10 seconds
    }
}