export class Order {
    id;
    type;
    status;
    createdAt;
    constructor(id, type) {
        this.id = id;
        this.type = type;
        this.status = 'PENDING';
        this.createdAt = new Date();
    }
    toString() {
        return `${this.type} Order #${this.id}`;
    }
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            status: this.status,
            createdAt: this.createdAt,
        };
    }
}
//# sourceMappingURL=Order.js.map