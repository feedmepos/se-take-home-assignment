const { QueueService } = require("./src/services/queue.service");
const { WorkerManager } = require("./src/services/worker.manager");
const { runDemo } = require("./demo");

const queue = new QueueService();

const workerManager = new WorkerManager(queue, () => {});

runDemo(queue, workerManager);
