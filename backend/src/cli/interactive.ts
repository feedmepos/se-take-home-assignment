import * as readline from 'node:readline';
import { OrderController } from '../domain/order-controller';
import { SystemClock, RealScheduler } from '../domain/time';
import { runCommand } from './dispatcher';
import { formatEvent } from './format';

const ctrl = new OrderController(new SystemClock(), new RealScheduler());
ctrl.subscribe((e) => console.log(formatEvent(e)));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> ',
});

console.log("Interactive order controller. Type 'help' for available commands.");
rl.prompt();

rl.on('line', (line) => {
  const out = runCommand(ctrl, line.trim());
  if (out === '__EXIT__') {
    rl.close();
    return;
  }
  if (out) console.log(out);
  rl.prompt();
});

rl.on('close', () => {
  console.log('Goodbye.');
  process.exit(0);
});
