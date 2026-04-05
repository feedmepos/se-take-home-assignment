const { Worker } = require("./worker");
const { format } = require("../utils");

class WorkerManager {
  constructor(queue, onEvent) {
    this.queue = queue;
    this.onEvent = onEvent;
    this.workers = [];
    this.nextId = 1;

    this.queue.registerWorkerNotifier(() => this.notifyWorkers());
  }

  addWorker() {
    const worker = new Worker(this.nextId++, this.queue, this.onEvent);
    this.workers.push(worker);

    this.onEvent(format(`Worker ${worker.id} added`));

    worker.process();
  }

  removeWorker() {
    if (!this.workers.length) {
      return format("No workers to remove");
    }

    const worker = this.workers.pop();
    worker.stop();

    return format(`Worker ${worker.id} removed`);
  }

  notifyWorkers() {
    this.workers.forEach((w) => {
      if (!w.isBusy()) {
        w.process();
      }
    });
  }

  listWorkers() {
    return this.workers.map((w) => ({
      id: w.id,
      busy: w.isBusy(),
      currentOrderId: w.currentOrder ? w.currentOrder.id : null,
    }));
  }

  completeOrder(workerId, order) {
    const worker = this.workers.find((w) => w.id === workerId);
    return worker
      ? worker.completeOrder(order)
      : format(`Worker ${workerId} not found`);
  }
}

module.exports = { WorkerManager };
