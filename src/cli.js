import fs from 'node:fs';
import readline from 'node:readline';
import { OrderSystem } from './orderSystem.js';

const outputFile = process.env.RESULT_FILE || 'result.txt';
const orderDurationMs = Number(process.env.ORDER_DURATION_MS || '10000');
const demoMode = process.argv.includes('--demo');

function writeResult(system) {
  fs.writeFileSync(outputFile, `${system.writeResult()}\n`, 'utf8');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runDemo() {
  const system = new OrderSystem({ orderDurationMs: Number(process.env.ORDER_DURATION_MS || '200') });
  system.addRobot();
  system.addOrder('VIP');
  system.addOrder('NORMAL');
  system.addOrder('VIP');
  await sleep(system.orderDurationMs * 3 + 100);
  writeResult(system);
  system.shutdown();
  console.log(system.renderState());
  console.log(`\nresult written to ${outputFile}`);
}

function startInteractive() {
  const system = new OrderSystem({ orderDurationMs });
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'mcd> ' });

  const printHelp = () => {
    console.log([
      'Commands:',
      '  add normal   - create a normal order',
      '  add vip      - create a VIP order',
      '  add robot    - add a robot',
      '  remove robot - remove newest robot',
      '  list pending - show pending orders',
      '  list completed - show completed orders',
      '  state        - show full state',
      '  help         - show help',
      '  exit         - write result.txt and quit',
    ].join('\n'));
  };

  const showState = () => {
    console.log(system.renderState());
  };

  rl.on('line', (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    try {
      const parts = input.split(/\s+/);
      const [cmd, arg1, arg2] = parts;
      const command = `${cmd}${arg1 ? ` ${arg1}` : ''}`.toLowerCase();

      switch (command) {
        case 'add normal':
          system.addOrder('NORMAL');
          console.log('created normal order');
          break;
        case 'add vip':
          system.addOrder('VIP');
          console.log('created VIP order');
          break;
        case 'add robot':
          system.addRobot();
          console.log('added robot');
          break;
        case 'remove robot':
          if (!system.removeRobot()) console.log('no robot to remove');
          else console.log('removed newest robot');
          break;
        case 'list pending':
          console.log(JSON.stringify(system.listPending(), null, 2));
          break;
        case 'list completed':
          console.log(JSON.stringify(system.listCompleted(), null, 2));
          break;
        case 'state':
          showState();
          break;
        case 'help':
          printHelp();
          break;
        case 'exit':
          writeResult(system);
          system.shutdown();
          rl.close();
          return;
        default:
          console.log(`unknown command: ${input}`);
          printHelp();
      }
    } catch (error) {
      console.error(error.message);
    }

    rl.prompt();
  });

  rl.on('SIGINT', () => {
    writeResult(system);
    system.shutdown();
    rl.close();
  });

  rl.on('close', () => {
    console.log(`result written to ${outputFile}`);
    process.exit(0);
  });

  console.log('McDonald Order Controller CLI');
  printHelp();
  rl.prompt();
}

if (demoMode) {
  runDemo().catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else {
  startInteractive();
}
