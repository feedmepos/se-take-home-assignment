const { log } = require("../utils/logger");

let botServiceRef = null; // will be set externally

class OrderService {
  constructor() {
    this.pending = [];
    this.complete = [];
    this.lastOrderId = 0;
  }

  createOrder(type) {
    const inputType =
      type.toLowerCase() === "vip"
        ? "VIP"
        : type.toLowerCase() === "normal"
        ? "Normal"
        : "-";
    const order = {
      id: ++this.lastOrderId,
      type: inputType,
      status: "PENDING",
      createdAt: Date.now(),
    };

    // VIP orders go before normal orders, after existing VIPs
    if (inputType === "VIP") {
      const firstNormalIndex = this.pending.findIndex(
        (o) => o.type === "Normal"
      );
      if (firstNormalIndex === -1) this.pending.push(order);
      else this.pending.splice(firstNormalIndex, 0, order);
    } else {
      this.pending.push(order);
    }
    log(`Created ${order.type} order #${order.id}: Status: ${order.status}`);

    if (botServiceRef) botServiceRef.processNext(); // trigger bots if set
    return order;
  }

  getNextPending() {
    return this.pending.shift();
  }

  completeOrder(order, botId, duration) {
    order.status = "COMPLETE";
    this.complete.push(order);
    log(
      `Bot #${botId} completed ${order.type} Order #${order.id} - Status: ${order.status} (Processing time: ${duration}s)`
    );
  }

  returnToPending(order) {
    order.status = "PENDING";
    this.pending.unshift(order);
  }

  getOrders() {
    return {
      pending: this.pending,
      complete: this.complete,
    };
  }

  getStats() {
    const vipCount =
      this.pending.filter((order) => order.type === "VIP").length +
      this.complete.filter((order) => order.type === "VIP").length;
    const normalCount =
      this.pending.filter((order) => order.type === "Normal").length +
      this.complete.filter((order) => order.type === "Normal").length;
    const totalOrders = this.pending.length + this.complete.length;
    return {
      totalOrders,
      vipCount,
      normalCount,
      completed: this.complete.length,
      pending: this.pending.length,
    };
  }
}

function setBotService(service) {
  botServiceRef = service;
}

const orderService = new OrderService();
module.exports = { setBotService, orderService };
