import {
  ControllerEvent,
  ORDER_TYPES,
  OrderController,
} from './domain/order-controller';
import { formatTimestamp } from './scenarios/demo-scenario';

declare const process: {
  stdin: unknown;
  stdout: unknown;
};
declare function setInterval(handler: () => void, timeout: number): unknown;
declare function clearInterval(intervalId: unknown): void;
declare function require(moduleName: string): {
  createInterface(options: {
    input: unknown;
    output: unknown;
    prompt: string;
  }): {
    prompt(): void;
    on(eventName: 'line', listener: (line: string) => void): void;
    on(eventName: 'close', listener: () => void): void;
    close(): void;
  };
};

type InteractivePrinter = (line: string) => void;

type InteractiveSessionOptions = {
  autoAdvance?: boolean;
  intervalMs?: number;
  nowMs?: () => number;
};

const HELP_LINES = [
  'Commands:',
  '  normal        create a normal order',
  '  vip           create a VIP order',
  '  bot+          add a cooking bot',
  '  bot-          remove the newest cooking bot',
  '  tick <sec>    advance simulated time immediately, e.g. tick 10',
  '  status        print current state',
  '  help          show commands',
  '  exit          quit interactive mode',
];

export function createInteractiveSession(
  print: InteractivePrinter = console.log,
  {
    autoAdvance = false,
    intervalMs = 250,
    nowMs = () => Date.now(),
  }: InteractiveSessionOptions = {},
) {
  const controller = new OrderController();
  const startedAtMs = nowMs();
  let timer: unknown = null;

  function printEvents(events: ControllerEvent[]): void {
    for (const event of events) {
      print(`[${formatTimestamp(event.at)}] ${event.message}`);
    }
  }

  function printStatus(): void {
    const snapshot = controller.snapshot();
    const pending = snapshot.pendingOrders
      .map((order) => `${order.type}#${order.id}`)
      .join(', ') || 'none';
    const processing = snapshot.processingOrders
      .map((entry) => (
        entry.order
          ? `Bot#${entry.botId}:${entry.order.type}#${entry.order.id}->${formatTimestamp(entry.completesAt ?? snapshot.now)}`
          : `Bot#${entry.botId}:none`
      ))
      .join(', ') || 'none';
    const bots = snapshot.bots
      .map((bot) => `Bot#${bot.id}:${bot.status}`)
      .join(', ') || 'none';

    print(`[${formatTimestamp(snapshot.now)}] Status`);
    print(`  Bots: ${bots}`);
    print(`  Pending: ${pending}`);
    print(`  Processing: ${processing}`);
    print(`  Completed: ${snapshot.completedOrders.length}`);
  }

  function syncWithRealTime(): void {
    if (!autoAdvance) {
      return;
    }

    const elapsedSeconds = Math.floor((nowMs() - startedAtMs) / 1000);
    if (elapsedSeconds <= controller.now) {
      return;
    }

    controller.advanceTo(elapsedSeconds);
    printEvents(controller.drainEvents());
  }

  function stop(): void {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function handleCommand(input: string): boolean {
    syncWithRealTime();
    const [command, value] = input.trim().split(/\s+/);

    switch (command) {
      case '':
        return true;
      case 'normal':
        controller.createOrder(ORDER_TYPES.NORMAL);
        printEvents(controller.drainEvents());
        return true;
      case 'vip':
        controller.createOrder(ORDER_TYPES.VIP);
        printEvents(controller.drainEvents());
        return true;
      case 'bot+':
        controller.addBot();
        printEvents(controller.drainEvents());
        return true;
      case 'bot-':
        controller.removeNewestBot();
        printEvents(controller.drainEvents());
        return true;
      case 'tick': {
        const seconds = Number(value);
        if (!Number.isInteger(seconds) || seconds < 0) {
          print('Usage: tick <non-negative seconds>');
          return true;
        }

        controller.advanceTo(controller.now + seconds);
        printEvents(controller.drainEvents());
        return true;
      }
      case 'status':
        syncWithRealTime();
        printStatus();
        return true;
      case 'help':
        for (const line of HELP_LINES) {
          print(line);
        }
        return true;
      case 'exit':
      case 'quit':
        return false;
      default:
        print(`Unknown command: ${command}`);
        print('Type "help" to list available commands.');
        return true;
    }
  }

  print('Hermes Order Controller - Interactive CLI');
  print('Type "help" to list commands.');
  printEvents(controller.drainEvents());

  if (autoAdvance) {
    timer = setInterval(syncWithRealTime, intervalMs);
  }

  return {
    handleCommand,
    printStatus,
    stop,
    syncWithRealTime,
  };
}

export function runInteractiveCli(): void {
  const readline = require('node:readline');
  const session = createInteractiveSession(console.log, { autoAdvance: true });
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'hermes> ',
  });

  rl.prompt();
  rl.on('line', (line: string) => {
    const shouldContinue = session.handleCommand(line);
    if (!shouldContinue) {
      session.stop();
      rl.close();
      return;
    }

    rl.prompt();
  });
  rl.on('close', () => {
    session.stop();
    console.log('Bye.');
  });
}
