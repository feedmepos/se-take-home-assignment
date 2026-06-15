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
  const rows = [
    ["normal", "n", "Create a Normal order"],
    ["vip", "v", "Create a VIP order"],
    ["+bot", "+", "Add one cooking bot"],
    ["-bot", "-", "Remove the latest bot"],
    ["status", "s", "Print the current kitchen state"],
    ["help", "h, ?", "Show this help"],
    ["exit", "q", "Stop interactive mode"],
  ];
  const commandWidth = Math.max(...rows.map(([command]) => command.length));
  const shortcutWidth = Math.max(...rows.map(([, shortcut]) => shortcut.length));

  return [
    "Commands:",
    ...rows.map(
      ([command, shortcut, description]) =>
        `  ${command.padEnd(commandWidth)}  ${shortcut.padEnd(shortcutWidth)}  ${description}`,
    ),
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
    case "n":
      controller.createOrder(ORDER_KINDS.NORMAL);
      return [];

    case "vip":
    case "new-vip":
    case "v":
      controller.createOrder(ORDER_KINDS.VIP);
      return [];

    case "add-bot":
    case "+bot":
    case "+robot":
    case "+":
    case "a":
    case "add":
      controller.addBot();
      return [];

    case "remove-bot":
    case "-bot":
    case "-robot":
    case "-":
    case "r":
    case "remove":
      controller.removeLatestBot();
      return [];

    case "tick":
    case "t": {
      const seconds = Number(argument ?? "1");

      if (!Number.isInteger(seconds) || seconds < 0) {
        throw new Error("tick expects a non-negative integer number of seconds.");
      }

      controller.tick(seconds);
      return [];
    }

    case "status":
    case "s":
      return [`[${controller.timeLabel()}] ${controller.status()}`];

    case "help":
    case "h":
    case "?":
      return [printHelp()];

    case "exit":
    case "quit":
    case "q":
    case "e":
      return ["__EXIT__"];

    default:
      throw new Error(`Unknown command "${command}". Type "help" for commands.`);
  }
}

function formatStatusLine(controller) {
  return `[${controller.timeLabel()}] ${controller.status()}`;
}

function isStateChangingCommand(rawCommand) {
  const line = rawCommand.trim();

  if (line.length === 0 || line.startsWith("#")) {
    return false;
  }

  const [command] = line.split(/\s+/, 1);

  return [
    "normal",
    "new-normal",
    "n",
    "vip",
    "new-vip",
    "v",
    "add-bot",
    "+bot",
    "+robot",
    "+",
    "a",
    "add",
    "remove-bot",
    "-bot",
    "-robot",
    "-",
    "r",
    "remove",
    "tick",
    "t",
  ].includes(command.toLowerCase());
}

function executeCommandWithOutput(controller, rawCommand, options = {}) {
  const eventStart = controller.events.length;
  const commandOutput = executeCommand(controller, rawCommand);

  if (commandOutput.includes("__EXIT__")) {
    return commandOutput;
  }

  const output = [
    ...controller.events.slice(eventStart),
    ...commandOutput,
  ];

  if (options.includeStatus && isStateChangingCommand(rawCommand)) {
    const statusLine = formatStatusLine(controller);

    if (output.at(-1) !== statusLine) {
      output.push(statusLine);
    }
  }

  return output;
}

function advanceClockWithOutput(controller, seconds = 1) {
  const eventStart = controller.events.length;
  controller.tick(seconds);

  const output = controller.events.slice(eventStart);

  if (output.length > 0) {
    output.push(formatStatusLine(controller));
  }

  return output;
}

function runCommands(commands, options = {}) {
  const controller = new OrderController(options);
  const output = [];

  for (const command of commands) {
    const commandOutput = executeCommandWithOutput(controller, command);

    if (commandOutput.includes("__EXIT__")) {
      break;
    }

    output.push(...commandOutput);
  }

  const finalStatus = formatStatusLine(controller);

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

  console.log("Interactive order controller. Cooking time advances automatically.");
  console.log(printHelp());
  rl.prompt();
  let lastPrintedLine = "";
  const clockInterval = setInterval(() => {
    const clockOutput = advanceClockWithOutput(controller);

    if (clockOutput.length === 0) {
      return;
    }

    for (const item of clockOutput) {
      console.log(item);
      lastPrintedLine = item;
    }

    rl.prompt(true);
  }, 1000);

  for await (const line of rl) {
    try {
      const commandOutput = executeCommandWithOutput(controller, line, {
        includeStatus: true,
      });

      if (commandOutput.includes("__EXIT__")) {
        break;
      }

      for (const item of commandOutput) {
        console.log(item);
        lastPrintedLine = item;
      }
    } catch (error) {
      console.error(error.message);
    }

    rl.prompt();
  }

  clearInterval(clockInterval);
  rl.close();
  const finalStatus = formatStatusLine(controller);

  if (lastPrintedLine !== finalStatus) {
    console.log(finalStatus);
  }
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
  advanceClockWithOutput,
  executeCommand,
  executeCommandWithOutput,
  printHelp,
  runCommands,
};
