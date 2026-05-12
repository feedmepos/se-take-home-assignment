const fs = require('fs');
class OrderController {
  constructor(queue, botManager) {
    this.queue = queue;
    this.botManager = botManager;
    this.orderId = 1;
    this.vipOrderCount = 0;  
    this.normalOrderCount = 0;
  }

  newNormalOrder() {
    const order = { id: this.orderId++, type: 'NORMAL' };
    this.normalOrderCount++;
    this.queue.addOrder(order);
    const time = new Date().toLocaleString('en-GB', { hour12: false });
    console.log(`[${time}] Normal Order ${order.id} added`);
    fs.appendFileSync("scripts/result.txt", `[${time}] Normal Order ${order.id} added\n`);
    this.botManager.triggerAll();
  }

  newVIPOrder() {
    const order = { id: this.orderId++, type: 'VIP' };
    this.vipOrderCount++;
    this.queue.addOrder(order);
    const time = new Date().toLocaleString('en-GB', { hour12: false });
    console.log(`[${time}] VIP Order ${order.id} added`);
    fs.appendFileSync("scripts/result.txt", `[${time}] VIP Order ${order.id} added\n`);
    this.botManager.triggerAll();
  }

  status() {
    this.queue.printQueue();
    }
    
    getStats() {
    const totalOrders = this.vipOrderCount + this.normalOrderCount;
    const completedOrders = this.botManager.getCompletedOrders();
    const activeBots = this.botManager.getActiveBots();
    const pendingOrders = this.queue.vipQueue.length + this.queue.normalQueue.length;

    return {
      totalOrders,
      vipOrders: this.vipOrderCount,
      normalOrders: this.normalOrderCount,
      completedOrders,
      activeBots,
      pendingOrders
    };
  }
}

module.exports = OrderController;