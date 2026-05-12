class OrderQueue {
  constructor() {
    this.vipQueue = [];
    this.normalQueue = [];
  }

  addOrder(order) {
    if (order.type === 'VIP') {
      this.vipQueue.push(order);
    } else {
      this.normalQueue.push(order);
    }
  }

  getNextOrder() {
    if (this.vipQueue.length > 0) {
      return this.vipQueue.shift();
    }
    return this.normalQueue.shift();
  }

  returnOrder(order) {
    if (order.type === 'VIP') {
      this.vipQueue.unshift(order);
    } else {
      this.normalQueue.unshift(order);
    }
  }

  isEmpty() {
    return this.vipQueue.length === 0 && this.normalQueue.length === 0;
  }

  printQueue() {
    const vip = this.vipQueue.map(o => `VIP${o.id}`);
    const normal = this.normalQueue.map(o => `N${o.id}`);
    console.log("Queue:", [...vip, ...normal]);
  }
}

module.exports = OrderQueue;