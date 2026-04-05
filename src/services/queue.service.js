class QueueService {
  constructor() {
    this.vipQueue = [];
    this.normalQueue = [];
    this.finishedQueue = [];
    this.workerNotifier = null;
  }

  registerWorkerNotifier(fn) {
    this.workerNotifier = fn;
  }

  enqueue(order) {
    if (order.type === "vip") {
      this.vipQueue.push(order);
    } else {
      this.normalQueue.push(order);
    }
    if (this.workerNotifier) {
      this.workerNotifier();
    }
  }

  dequeue() {
    if (this.vipQueue.length) {
      return this.vipQueue.shift();
    }
    if (this.normalQueue.length) {
      return this.normalQueue.shift();
    }
    return null;
  }

  requeueFront(order) {
    if (order.type === "vip") {
      this.vipQueue.unshift(order);
    } else {
      this.normalQueue.unshift(order);
    }
  }

  finishedProcessing(order) {
    this.finishedQueue.push(order);
  }

  getStats() {
    return {
      vip: this.vipQueue.length,
      normal: this.normalQueue.length,
      finished: this.finishedQueue.length,
    };
  }

  getQueueStructure() {
    return [...this.vipQueue, ...this.normalQueue].map(
      (o) => `Order #${o.id} (${o.type.toUpperCase()})`,
    );
  }

  getProcessedOrders() {
    return [...this.finishedQueue].map(
      (o) => `Order #${o.id} (${o.type.toUpperCase()})`,
    );
  }
}

module.exports = { QueueService };
