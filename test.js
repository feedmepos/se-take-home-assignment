const { Order } = require("./src/entities/order");
const { QueueService } = require("./src/services/queue.service");
const { WorkerManager } = require("./src/services/worker.manager");

class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async run() {
    console.log("Running unit tests...\n");

    for (const { name, testFn } of this.tests) {
      try {
        await testFn();
        console.log(`✓ ${name}`);
        this.passed++;
      } catch (error) {
        console.log(`✗ ${name}: ${error.message}`);
        this.failed++;
      }
    }

    console.log(`\nTest Results: ${this.passed} passed, ${this.failed} failed`);

    if (this.failed > 0) {
      process.exit(1);
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message} - Expected: ${expected}, Actual: ${actual}`);
    }
  }
}

//Unit Tests
const runner = new TestRunner();

//Order Creation Test
runner.test("Order creation", () => {
  const order = new Order("normal");

  runner.assertEqual(order.id, 1, "Order ID should start at 1");
  runner.assertEqual(order.type, "normal", "Order type should be normal");
  runner.assertEqual(order.status, "pending", "Order status should be pending");
});

//Queue Enqueue Test
runner.test("Queue enqueue", () => {
  const queue = new QueueService();

  const order = new Order("normal");
  queue.enqueue(order);

  runner.assertEqual(
    queue.getStats().normal,
    1,
    "Normal queue should have 1 item",
  );
});

//Queue Dequeue Test
runner.test("Queue dequeue", () => {
  const queue = new QueueService();

  const order = new Order("normal");
  queue.enqueue(order);

  const dequeued = queue.dequeue();

  runner.assertEqual(
    dequeued.id,
    order.id,
    "Dequeued order should match enqueued order",
  );
});

//Queue Priority Test
runner.test("Queue priority", () => {
  const queue = new QueueService();

  const vip1 = new Order("vip");
  const normal1 = new Order("normal");
  const vip2 = new Order("vip");

  queue.enqueue(vip1);
  queue.enqueue(normal1);
  queue.enqueue(vip2);

  const first = queue.dequeue();
  const second = queue.dequeue();
  const third = queue.dequeue();

  runner.assertEqual(first.id, vip1.id, "First VIP should come first");
  runner.assertEqual(second.id, vip2.id, "Second VIP should come second");
  runner.assertEqual(third.id, normal1.id, "Normal order should come last");
});

//Worker Adding Test
runner.test("Add worker", () => {
  const queue = new QueueService();
  const manager = new WorkerManager(queue, () => {});

  manager.addWorker();

  runner.assertEqual(
    manager.listWorkers().length,
    1,
    "Should have 1 worker after adding",
  );
});

//Worker Removal Test
runner.test("Remove worker ", () => {
  const queue = new QueueService();
  const manager = new WorkerManager(queue, () => {});

  manager.addWorker();

  manager.removeWorker();

  runner.assertEqual(
    manager.listWorkers().length,
    0,
    "Should have 0 workers after removal",
  );
});

//Worker Job Pickup Test
runner.test("Worker picks up job", async () => {
  const queue = new QueueService();

  let events = [];
  const manager = new WorkerManager(queue, (msg) => events.push(msg));

  manager.addWorker();

  const order = new Order("normal");
  queue.enqueue(order);

  const workers = manager.listWorkers();

  runner.assert(workers[0].busy === true, "Worker should be busy processing");
});

//Worker Removal with Requeue Test
runner.test("Removing worker requeues job to front", async () => {
  const queue = new QueueService();

  let events = [];
  const manager = new WorkerManager(queue, (msg) => events.push(msg));

  manager.addWorker();

  const order = new Order("vip");
  queue.enqueue(order);

  manager.removeWorker();

  const stats = queue.getStats();

  runner.assert(stats.vip === 1, "VIP order should be requeued");
});

//Order Completion Test
runner.test("Complete order", async () => {
  const queue = new QueueService();

  let events = [];
  const manager = new WorkerManager(queue, (msg) => events.push(msg));

  manager.addWorker();
  const workers = manager.listWorkers();

  const order = new Order("normal");
  queue.enqueue(order);

  manager.completeOrder(workers[0].id, order);

  const stats = queue.getStats();

  runner.assert(stats.finished === 1, "Should have 1 finished order");
});

//Run tests
if (require.main === module) {
  runner.run().catch(console.error);
}

module.exports = { TestRunner };
