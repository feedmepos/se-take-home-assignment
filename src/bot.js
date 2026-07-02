'use strict';

class Bot {
  constructor(id, processingTime = 10000) {
    this.id = id;
    this.status = 'IDLE';
    this.currentOrder = null;
    this.processingTime = processingTime;
    this.idleSince = new Date();
    this.timer = null;
  }

  startProcessing(order, onComplete) {
    this.status = 'PROCESSING';
    this.currentOrder = order;
    this.idleSince = null;
    order.status = 'PROCESSING';
    order.pickedUpAt = new Date();

    this.timer = setTimeout(() => {
      order.status = 'COMPLETE';
      order.completedAt = new Date();
      this.currentOrder = null;
      this.timer = null;
      this.status = 'IDLE';
      this.idleSince = new Date();
      onComplete(order);
    }, this.processingTime);
  }

  stopProcessing() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const order = this.currentOrder;
    if (order) {
      order.status = 'PENDING';
      order.pickedUpAt = null;
      this.currentOrder = null;
    }

    this.status = 'IDLE';
    this.idleSince = new Date();
    return order;
  }
}

module.exports = { Bot };
