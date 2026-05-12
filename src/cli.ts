import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { OrderController } from './OrderController';
import { Logger } from './types';

// Resolve result.txt path: always write to scripts/result.txt relative to project root
const RESULT_FILE = path.resolve(__dirname, '..', 'scripts', 'result.txt');

/**
 * Logger that writes to both console and result.txt in real-time
 */
class FileLogger implements Logger {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    // Clear or create the file at start
    fs.writeFileSync(filePath, '');
  }

  log(message: string): void {
    // Write to file immediately (sync, so no buffering issues)
    fs.appendFileSync(this.filePath, message + '\n');
    // Also print to console
    console.log(message);
  }
}

/**
 * Interactive CLI for McDonald's Order Management System
 */
function main(): void {
  const args = process.argv.slice(2);
  const isDemo = args.includes('--demo');

  const logger = new FileLogger(RESULT_FILE);
  const controller = new OrderController(logger);

  logger.log('');
  logger.log('========================================');
  logger.log("  McDonald's Order Management System");
  logger.log('========================================');
  logger.log('');

  if (isDemo) {
    runDemo(controller, logger);
    return;
  }

  runInteractive(controller, logger);
}

/**
 * Run interactive CLI mode
 */
function runInteractive(controller: OrderController, logger: Logger): void {
  logger.log('Commands:');
  logger.log('  n, normal     - Create a new Normal order');
  logger.log('  v, vip        - Create a new VIP order');
  logger.log('  +, bot+       - Add a new cooking bot');
  logger.log('  -, bot-       - Remove the newest cooking bot');
  logger.log('  s, status     - Show current status');
  logger.log('  h, help       - Show this help message');
  logger.log('  q, exit       - Exit the application');
  logger.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
  });

  rl.prompt();

  const helpText = () => {
    logger.log('');
    logger.log('Commands:');
    logger.log('  n, normal     - Create a new Normal order');
    logger.log('  v, vip        - Create a new VIP order');
    logger.log('  +, bot+       - Add a new cooking bot');
    logger.log('  -, bot-       - Remove the newest cooking bot');
    logger.log('  s, status     - Show current status');
    logger.log('  h, help       - Show this help message');
    logger.log('  q, exit       - Exit the application');
    logger.log('');
  };

  rl.on('line', (line: string) => {
    const cmd = line.trim().toLowerCase();

    switch (cmd) {
      case 'n':
      case 'normal':
        controller.createNormalOrder();
        controller.printStatus();
        break;
      case 'v':
      case 'vip':
        controller.createVIPOrder();
        controller.printStatus();
        break;
      case '+':
      case 'bot+':
        controller.addBot();
        controller.printStatus();
        break;
      case '-':
      case 'bot-':
        controller.removeBot();
        controller.printStatus();
        break;
      case 's':
      case 'status':
        controller.printStatus();
        break;
      case 'h':
      case 'help':
        helpText();
        break;
      case 'q':
      case 'exit':
      case 'quit':
        logger.log('Shutting down...');
        controller.cleanup();
        rl.close();
        return;
      case '':
        break;
      default:
        logger.log(`Unknown command: "${cmd}". Type "help" for available commands.`);
    }

    rl.prompt();
  }).on('close', () => {
    controller.cleanup();
    process.exit(0);
  });
}

/**
 * Run demo mode for automated testing / GitHub Actions
 * Simulates a full order flow scenario
 */
function runDemo(controller: OrderController, logger: Logger): void {
  const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

  logger.log('[DEMO MODE] Running automated simulation...');
  logger.log('');

  (async () => {
    // Step 1: Create orders
    logger.log('--- Step 1: Create orders ---');
    controller.createNormalOrder(); // #1001
    await delay(1000);
    controller.createVIPOrder();    // #1002
    await delay(1000);
    controller.createNormalOrder(); // #1003
    controller.printStatus();
    await delay(1000);

    // Step 2: Add bots to process orders
    logger.log('--- Step 2: Add bots ---');
    controller.addBot(); // Bot #1 picks up VIP #1002 (VIP priority!)
    await delay(1000);
    controller.addBot(); // Bot #2 picks up Normal #1001
    controller.printStatus();

    // Step 3: Wait for first orders to complete (~10s)
    logger.log('--- Step 3: Waiting for orders to complete (10s)... ---');
    await delay(11000);
    controller.printStatus();

    // Step 4: Create a new VIP order while bot is idle
    logger.log('--- Step 4: Create new VIP order ---');
    controller.createVIPOrder(); // #1004
    controller.printStatus();

    // Step 5: Wait for remaining orders
    logger.log('--- Step 5: Waiting for remaining orders (10s)... ---');
    await delay(11000);
    controller.printStatus();

    // Step 6: Remove a bot
    logger.log('--- Step 6: Remove a bot ---');
    controller.removeBot(); // Remove Bot #2 (newest)
    controller.printStatus();

    // Step 7: Final status
    logger.log('--- Final Status ---');
    controller.printStatus();

    // Summary
    const status = controller.getStatus();
    const vipCompleted = status.completedOrders.filter(o => o.type === 'VIP').length;
    const normalCompleted = status.completedOrders.filter(o => o.type === 'NORMAL').length;
    logger.log('Summary:');
    logger.log(`- Total Orders Processed: ${status.completedOrders.length} (${vipCompleted} VIP, ${normalCompleted} Normal)`);
    logger.log(`- Orders Completed: ${status.completedOrders.length}`);
    logger.log(`- Active Bots: ${status.bots.length}`);
    logger.log(`- Pending Orders: ${status.pendingOrders.length}`);

    controller.cleanup();
    process.exit(0);
  })();
}

main();
