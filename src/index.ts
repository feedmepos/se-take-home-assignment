import { OrderController } from "./orderController/OrderController";
import { OrderType } from "./orderController/Order";
import { clearResult, write } from "./orderController/resultWriter";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runSimulation1(): Promise<void> {
  write("=== Simulation 1: Basic Flow Start ===");

  const controller = new OrderController();

  controller.newOrder(OrderType.NORMAL); 
  controller.newOrder(OrderType.VIP);   
  controller.newOrder(OrderType.NORMAL);

  controller.addBot(); 
  controller.addBot(); 

  await delay(10_500);

  controller.newOrder(OrderType.VIP); 

  await delay(10_500);

  controller.removeBot();

  controller.newOrder(OrderType.NORMAL);

  await delay(10_500);

  write("=== Simulation 1 Complete ===\n");
}

async function runSimulation2(): Promise<void> {
  write("=== Simulation 2: Bot Destroyed While Processing ===");
  const controller = new OrderController();

  controller.newOrder(OrderType.NORMAL);
  controller.addBot(); 

  // Wait 2 seconds, while bot is middle of processing
  await delay(2_000);
  controller.removeBot();

  // Wait 1 second just to see the status in the UI/Logs
  await delay(1_000);

  controller.addBot();

  await delay(10_500);

  write("=== Simulation 2 Complete ===\n");
}

async function runSimulation3(): Promise<void> {
  write("=== Simulation 3: VIP Starving Normal Orders ===");
  const controller = new OrderController();

  controller.addBot();

  controller.newOrder(OrderType.NORMAL); // Order #1

  controller.newOrder(OrderType.NORMAL); // Order #2

  await delay(2_000);
  controller.newOrder(OrderType.VIP); // Order #3

  await delay(2_000);
  controller.newOrder(OrderType.VIP); // Order #4

  await delay(2_000);
  controller.newOrder(OrderType.VIP); // Order #5

  await delay(55_000);

  write("=== Simulation 3 Complete ===\n");
}

async function main() {
  clearResult();
  
  await runSimulation1();
  await runSimulation2();
  await runSimulation3();
}

main().catch((err) => {
  console.error("Simulation error:", err);
  process.exit(1);
});
