#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const readline = require("node:readline");
const {
  ORDER_KINDS,
  OrderController,
  runDemoScenario,
} = require("./order-controller");

function printHelp() {
  return [
    "Commands:",
    "  normal             Create a Normal order",
    "  vip                Create a VIP order",
    "  add-bot            Add one cooking bot",
    "  remove-bot         Remove the latest bot",
    "  tick <seconds>     Advance the virtual kitchen clock",
    "  status             Print the current kitchen state",
    "  help               Show this help",
    "  exit               Stop interactive mode",
  ].join("\n");
}

function executeCommand(controller, rawCommand) {
  const line = rawCommand.trim();

  if (line.length === 0 || line.startsWith("#")) {
    return [];
  }

  const [command, argument] = line.split(/\s+/, 2);

  switch (command.toLowerCase()) {
    case "normal":
    case "new-normal":
      controller.createOrder(ORDER_KINDS.NORMAL);
      return [];

    case "vip":
    case "new-vip":
      controller.createOrder(ORDER_KINDS.VIP);
      return [];

    case "add-bot":
    case "+bot":
    case "+robot":
      controller.addBot();
      return [];

    case "remove-bot":
    case "-bot":
    case "-robot":
      controller.removeLatestBot();
      return [];

    case "tick": {
      const seconds = Number(argument ?? "1");

      if (!Number.isInteger(seconds) || seconds < 0) {
        throw new Error("tick expects a non-negative integer number of seconds.");
      }

      controller.tick(seconds);
      return [];
    }

    case "status":
      return [`[${controller.timeLabel()}] ${controller.status()}`];

    case "help":
      return [printHelp()];

    case "exit":
    case "quit":
      return ["__EXIT__"];

    default:
      throw new Error(`Unknown command "${command}". Type "help" for commands.`);
  }
}

function runCommands(commands) {
  const controller = new OrderController();
  const output = [];

  for (const command of commands) {
    const eventStart = controller.events.length;
    const commandOutput = executeCommand(controller, command);

    if (commandOutput.includes("__EXIT__")) {
      break;
    }

    output.push(...controller.events.slice(eventStart));
    output.push(...commandOutput);
  }

  const finalStatus = `[${controller.timeLabel()}] ${controller.status()}`;

  if (output.at(-1) !== finalStatus) {
    output.push(finalStatus);
  }

  return output.filter(Boolean).join("\n");
}

function readCommandsFromStdin() {
  return fs.readFileSync(0, "utf8").split(/\r?\n/);
}

async function runInteractive() {
  const controller = new OrderController();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "kitchen> ",
  });

  console.log("Interactive order controller. Type help for commands.");
  rl.prompt();

  for await (const line of rl) {
    try {
      const commandOutput = executeCommand(controller, line);

      if (commandOutput.includes("__EXIT__")) {
        break;
      }

      for (const item of commandOutput) {
        console.log(item);
      }
    } catch (error) {
      console.error(error.message);
    }

    rl.prompt();
  }

  rl.close();
  console.log(controller.output());
}

async function main(argv) {
  const args = new Set(argv);
  const scriptIndex = argv.indexOf("--script");

  if (args.has("--help") || args.has("-h")) {
    console.log(printHelp());
    return;
  }

  if (args.has("--demo")) {
    console.log(runDemoScenario());
    return;
  }

  if (scriptIndex !== -1) {
    const scriptPath = argv[scriptIndex + 1];

    if (!scriptPath) {
      throw new Error("--script requires a file path.");
    }

    const commands = fs.readFileSync(scriptPath, "utf8").split(/\r?\n/);
    console.log(runCommands(commands));
    return;
  }

  if (!process.stdin.isTTY) {
    console.log(runCommands(readCommandsFromStdin()));
    return;
  }

  await runInteractive();
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  executeCommand,
  printHelp,
  runCommands,
};
