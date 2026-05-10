const { QueueService } = require("./src/services/queue.service");
const { WorkerManager } = require("./src/services/worker.manager");
const { initCLI } = require("./cli");

const queue = new QueueService();

const workerManager = new WorkerManager(queue, () => {});

initCLI(queue, workerManager);
