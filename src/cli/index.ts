import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { OrderController } from "../core/orderController";
import { printCompletionEvent, printStatusView } from "./view";

const HELP_TEXT = `
Available commands:
- add normal
- add vip
- add bot
- remove bot
- status
- help
- exit
`.trim();

function printWelcome(): void {
  console.log("McDonald's order controller CLI");
  console.log(HELP_TEXT);
}

async function promptForOrderCount(
  question: string,
  ask: (query: string) => Promise<string>,
): Promise<number> {
  while (true) {
    const answer = (await ask(question)).trim();
    const count = Number(answer);

    if (Number.isInteger(count) && count > 0) {
      return count;
    }

    console.log("Please enter a positive whole number.");
  }
}

async function handleCommand(
  command: string,
  ask: (query: string) => Promise<string>,
  controller: OrderController,
): Promise<boolean> {
  switch (command) {
    case "add normal": {
      const count = await promptForOrderCount(
        "How many normal orders do you want to add? ",
        ask,
      );
      const orders = controller.addNormalOrders(count);
      console.log(`Added normal orders: ${orders.map((order) => `#${order.id}`).join(", ")}`);
      printStatusView(controller);
      return true;
    }
    case "add vip": {
      const count = await promptForOrderCount(
        "How many VIP orders do you want to add? ",
        ask,
      );
      const orders = controller.addVipOrders(count);
      console.log(`Added VIP orders: ${orders.map((order) => `#${order.id}`).join(", ")}`);
      printStatusView(controller);
      return true;
    }
    case "add bot": {
      const bot = controller.addBot();
      console.log(`Added bot #${bot.id}.`);
      printStatusView(controller);
      return true;
    }
    case "remove bot": {
      const removedBot = controller.removeBot();

      if (!removedBot) {
        console.log("No bot is available to remove.");
        return true;
      }

      console.log(`Removed bot #${removedBot.id}.`);
      printStatusView(controller);
      return true;
    }
    case "status": {
      printStatusView(controller);
      return true;
    }
    case "help": {
      console.log(HELP_TEXT);
      return true;
    }
    case "exit": {
      console.log("Exiting CLI.");
      return false;
    }
    default: {
      console.log("Unknown command. Type `help` to see available commands.");
      return true;
    }
  }
}

export async function main(): Promise<void> {
  if (!input.isTTY || !output.isTTY) {
    console.log("Interactive CLI requires a terminal session. Run `npm start` in a terminal.");
    return;
  }

  const controller = new OrderController({
    onOrderCompleted: (order) => {
      console.log("");
      printCompletionEvent(order);
      printStatusView(controller);
    },
  });
  const rl = createInterface({ input, output });

  printWelcome();
  printStatusView(controller);

  try {
    let shouldContinue = true;

    while (shouldContinue) {
      const command = (await rl.question("> ")).trim().toLowerCase();

      if (!command) {
        continue;
      }

      shouldContinue = await handleCommand(
        command,
        (query) => rl.question(query),
        controller,
      );
    }
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  void main();
}
