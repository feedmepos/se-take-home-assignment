import * as readline from 'readline';
import { OrderController } from './OrderController';

function timestamp(): string {
  return new Date().toTimeString().slice(0, 8);
}

function printStatus(controller: OrderController): void {
  const { pendingOrders, completedOrders, bots } = controller.getStatus();

  console.log('\n┌─────────────────────────────────────────┐');
  console.log('│              Current Status              │');
  console.log('├─────────────────────────────────────────┤');

  // Bots
  if (bots.length === 0) {
    console.log('│ Bots    : (none)                         │');
  } else {
    bots.forEach(b => {
      const label = b.status === 'PROCESSING'
        ? `Bot #${b.id} → PROCESSING Order #${b.currentOrderId}`
        : `Bot #${b.id} → IDLE`;
      console.log(`│ ${label.padEnd(41)}│`);
    });
  }

  console.log('├─────────────────────────────────────────┤');

  // Pending queue
  if (pendingOrders.length === 0) {
    console.log('│ Pending : (empty)                        │');
  } else {
    const pendingStr = pendingOrders.map(o => `${o.type}#${o.id}`).join(' → ');
    console.log(`│ Pending : ${pendingStr.padEnd(31)}│`);
  }

  // Completed
  const completedStr = completedOrders.length === 0
    ? '(none)'
    : completedOrders.map(o => `${o.type}#${o.id}`).join(', ');
  console.log(`│ Done    : ${completedStr.substring(0, 31).padEnd(31)}│`);

  console.log('└─────────────────────────────────────────┘\n');
}

function printHelp(): void {
  console.log(`
Commands:
  normal    Add a new Normal order
  vip       Add a new VIP order
  +bot      Add a cooking bot
  -bot      Remove the newest bot
  status    Show current status
  help      Show this help
  exit      Quit
`);
}

async function main(): Promise<void> {
  const log = (msg: string) => console.log(`\n[${timestamp()}] ${msg}`);
  const controller = new OrderController(log);

  console.log("===========================================");
  console.log("  McDonald's Order Management System CLI  ");
  console.log("===========================================");
  printHelp();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> ',
  });

  rl.prompt();

  rl.on('line', (line: string) => {
    const cmd = line.trim().toLowerCase();

    switch (cmd) {
      case 'normal':
        controller.addOrder('NORMAL');
        break;
      case 'vip':
        controller.addOrder('VIP');
        break;
      case '+bot':
        controller.addBot();
        break;
      case '-bot':
        controller.removeBot();
        break;
      case 'status':
        break;
      case 'help':
        printHelp();
        rl.prompt();
        return;
      case 'exit':
      case 'quit':
        console.log('Goodbye!');
        rl.close();
        process.exit(0);
        return;
      case '':
        rl.prompt();
        return;
      default:
        console.log(`Unknown command: "${cmd}". Type "help" for available commands.`);
        rl.prompt();
        return;
    }

    printStatus(controller);
    rl.prompt();
  });

  rl.on('close', () => {
    process.exit(0);
  });
}

main();
