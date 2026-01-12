export class Bot {
    id;
    status;
    currentOrderId;
    processingTimeout;
    constructor(id) {
        this.id = id;
        this.status = 'IDLE';
        this.currentOrderId = null;
        this.processingTimeout = null;
    }
    toString() {
        return `Bot #${this.id}`;
    }
    toJSON() {
        return {
            id: this.id,
            status: this.status,
            currentOrderId: this.currentOrderId,
        };
    }
}
//# sourceMappingURL=Bot.js.map