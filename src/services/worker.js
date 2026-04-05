const { format } = require("../utils");

class Worker {
  constructor(id, queue, onEvent) {
    this.id = id;
    this.queue = queue;
    this.onEvent = onEvent;

    this.currentOrder = null;
    this.timer = null;
  }

  process() {
    if (this.currentOrder) return;

    const order = this.queue.dequeue();
    if (!order) return;

    this.currentOrder = order;

    this.onEvent(
      format(
        `Bot ${this.id} started processing Order #${order.id} (${order.type.toUpperCase()})`,
      ),
    );

    this.timer = setTimeout(() => {
      this.onEvent(order.completeMessage());

      this.onEvent(
        format(
          `Bot ${this.id} completed processing Order #${order.id} (${order.type.toUpperCase()})`,
        ),
      );

      this.queue.finishedProcessing(order);

      this.currentOrder = null;

      this.process();
    }, 10000);
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);

    if (this.currentOrder) {
      this.onEvent(
        format(
          `Bot ${this.id} interrupted - Order #${this.currentOrder.id} is requeued to front`,
        ),
      );

      this.queue.requeueFront(this.currentOrder);
      this.currentOrder = null;
    }
  }

  completeOrder(order) {
    if (this.timer) clearTimeout(this.timer);

    this.onEvent(order.completeMessage());

    this.onEvent(
      format(
        `Bot ${this.id} completed processing Order #${order.id} (${order.type.toUpperCase()})`,
      ),
    );

    this.queue.finishedProcessing(order);

    this.currentOrder = null;

    this.process();

    return;
  }

  isBusy() {
    return this.currentOrder !== null;
  }
}

module.exports = { Worker };
