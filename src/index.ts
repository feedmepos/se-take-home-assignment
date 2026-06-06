import { OrderQueue } from './services/OrderQueue';
import { BotManager } from './services/BotManager';
import { FileLogger } from './services/Logger';
import { Menu } from './cli/Menu';
import { runDemo } from './demo';

const isDemo = process.argv.includes('--demo');

if (isDemo) {
  runDemo().catch(console.error);
} else {
  const logger = new FileLogger();
  const queue = new OrderQueue();
  const processingTimeMs = parseInt(process.env.PROCESSING_TIME_MS ?? '10000');
  const botManager = new BotManager(queue, logger, processingTimeMs);
  const menu = new Menu(queue, botManager, logger);
  menu.start();
}
