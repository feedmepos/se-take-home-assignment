import * as readline from 'node:readline';
import { BotManagerService } from './manager/bot-manager.service.js';
import { LoggerService } from './logger/logger.service.js';
import { CliService } from './cli/cli.service.js';
import { DemoService } from './demo/demo.service.js';

const logger = new LoggerService();
const manager = new BotManagerService();

manager.on('order:pending', ({ order }) => {
  logger.log(`New ${order.type.toUpperCase()} Order #${order.id} added to PENDING`);
});

manager.on('order:processing', ({ order, bot }) => {
  logger.log(`Bot #${bot.id} started processing Order #${order.id}`);
});

manager.on('order:complete', ({ order, bot }) => {
  logger.log(`Bot #${bot.id} completed Order #${order.id}`);
});

manager.on('bot:added', ({ bot }) => {
  logger.log(`Bot #${bot.id} added`);
});

manager.on('bot:removed', ({ bot, returnedOrder }) => {
  const msg = returnedOrder
    ? ` — Order #${returnedOrder.id} returned to PENDING`
    : '';
  logger.log(`Bot #${bot.id} removed${msg}`);
});

function runInteractive(): void {
  console.clear();
  const cli = new CliService(manager, logger);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
  });

  cli.printMenu();
  rl.prompt();

  rl.on('line', (line) => {
    const command = line.trim();
    if (command === 'q') {
      logger.log('Goodbye!');
      rl.close();
      process.exit(0);
    }
    cli.handleCommand(command);
    rl.prompt();
  });
}

const args = process.argv.slice(2);
const mode = args[0];

if (mode === '--interactive') {
  runInteractive();
} else if (mode === '--demo') {
  const demo = new DemoService(manager, logger);
  demo.run();
} else {
  console.log("Usage: node index.js <mode>\n");
  console.log("Modes:");
  console.log("  --interactive   Start interactive CLI mode");
  console.log("  --demo          Run the automated demo\n");
  console.log("Example:");
  console.log("node index.js --interactive");
  process.exit(1);
}
