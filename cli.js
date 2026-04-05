const readline = require("readline");
const { Order } = require("./src/entities/order");
const { format, printState } = require("./src/utils");

function initCLI(queue, workerManager) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Hook into worker events (same as demo)
  workerManager.onEvent = (msg) => console.log(msg);

  console.log("Worker Queue CLI started");
  console.log(`
Commands:
  add-worker
  remove-worker
  enqueue vip|normal
  complete <workerId>
  status
  exit
  `);

  rl.on("line", (input) => {
    const [cmd, arg] = input.trim().split(" ");

    switch (cmd) {
      case "add-worker":
        workerManager.addWorker();
        break;

      case "remove-worker":
        console.log(workerManager.removeWorker());
        break;

      case "enqueue":
        if (arg !== "vip" && arg !== "normal") {
          console.log("Use: enqueue vip|normal");
          break;
        }
        const order = new Order(arg);
        console.log(order.createMessage());
        queue.enqueue(order);
        break;

      case "complete": {
        const workerId = Number(arg);

        if (!workerId) {
          console.log("Use: complete <workerId>");
          break;
        }

        const worker = workerManager.workers.find((w) => w.id === workerId);

        if (!worker || !worker.currentOrder) {
          console.log(`Worker ${workerId} has no active order`);
          break;
        }

        const order = worker.currentOrder;

        console.log(workerManager.completeOrder(workerId, order));
        break;
      }

      case "status":
        printState(queue, workerManager).forEach((line) => console.log(line));
        break;

      case "exit":
        console.log("Exiting CLI...");
        rl.close();
        process.exit(0);

      default:
        console.log("Unknown command");
    }
  });
}

module.exports = { initCLI };
