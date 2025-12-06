// Order class

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

module.exports = { Order };

