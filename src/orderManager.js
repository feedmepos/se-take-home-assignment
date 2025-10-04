const fs = require("fs");
const path = require("path");

class OrderManager {
  constructor() {
    this.pending = [];
    this.complete = [];
    this.inProcess = [];
    this.lastOrderId = 0;
    this.outputFile = path.join(__dirname, "../scripts/result.txt");
    fs.writeFileSync(this.outputFile, "");
  }

  log(message) {
    const time = new Date().toLocaleTimeString("en-GB", { hour12: false });
    const line = `[${time}] STATUS -- ${message}\n`;
    fs.appendFileSync(this.outputFile, line);
    console.log(line.trim());
  }

  createOrder(type) {
    const id = ++this.lastOrderId;
    const order = {
      id,
      type,
      status: "PENDING",
      createdAt: new Date(),
    };

    // VIP orders go before normal orders
    if (type === "VIP") {
      const normalIndex = this.pending.findIndex((o) => o.type === "NORMAL");
      if (normalIndex === -1) {
        this.pending.push(order);
        this.log(`Order#${id} (VIP) created.`);
      } else {
        this.pending.splice(normalIndex, 0, order);
        this.log(
          `Order#${id} (VIP) created and prioritized before NORMAL orders.`
        );
      }
    } else {
      this.pending.push(order);
      this.log(`Order#${id} (NORMAL) created.`);
    }

    return order;
  }

  getNextOrder() {
    const shifted = this.pending.shift();
    if (shifted) {
      shifted.status = "IN_PROCESS";
      shifted.startedAt = new Date();
      this.inProcess.push(shifted);
      return shifted;
    }
  }

  moveToComplete(order) {
    order.status = "COMPLETE";
    order.completedAt = new Date();
    this.complete.push(order);
    this.inProcess = this.inProcess.filter((o) => o.id !== order.id);
  }

  returnToPending(order) {
    order.status = "PENDING";
    this.pending.unshift(order);
    this.inProcess = this.inProcess.filter((o) => o.id !== order.id);
  }

  printStatus() {
    this.log(
      `Pending Orders: ${
        this.pending.map((o) => `${o.type}#${o.id}`).join(", ") || "none"
      }`
    );
    this.log(
      `In Process Orders: ${
        this.inProcess.map((o) => `${o.type}#${o.id}`).join(", ") || "none"
      }`
    );
    this.log(
      `Complete Orders: ${
        this.complete.map((o) => `${o.type}#${o.id}`).join(", ") || "none"
      }`
    );
  }
}

module.exports = OrderManager;
