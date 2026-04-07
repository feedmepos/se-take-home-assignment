import readline from 'readline';
import { OrderManager } from './orderManager';
import fs from 'fs';
import path from 'path';

const manager = new OrderManager();
const resultPath = path.join(__dirname, '../scripts/result.txt');

function logCLI(message: string) {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(resultPath, logMessage + '\n');
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

logCLI('=== McDonald Order CLI (TypeScript) ===');
logCLI('Commands:');
logCLI('1 - New Normal Order');
logCLI('2 - New VIP Order');
logCLI('+ - Add Bot');
logCLI('- - Remove Bot');
logCLI('p - Show Pending Orders');
logCLI('c - Show Completed Orders');
logCLI('q - Quit');

rl.on('line', (input: string) => {
    switch (input.trim()) {
        case '1':
            manager.addOrder('Normal');
            break;
        case '2':
            manager.addOrder('VIP');
            break;
        case '+':
            manager.addBot();
            break;
        case '-':
            manager.removeBot();
            break;
        case 'p':
            logCLI('Pending Orders: ' + manager.getPendingOrders().map(o => `${o.id}(${o.type})`).join(', '));
            break;
        case 'c':
            logCLI('Completed Orders: ' + manager.getCompletedOrders().map(o => `${o.id}(${o.type})`).join(', '));
            break;
        case 'q':
            logCLI('Exiting...');
            process.exit(0);
        default:
            logCLI('Unknown command');
    }
});