/**
 * Interactive Mode - Optional menu-driven interface
 * Run with: node src/interactive.js
 */

import { OrderController } from './orderController.js';
import { getCurrentTime } from './utils/timeFormatter.js';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RESULT_FILE = path.join(__dirname, '../scripts/result.txt');

/**
 * Creates a file logger that writes only action events to result.txt
 */
function createFileLogger() {
  try {
    fs.writeFileSync(RESULT_FILE, '');
  } catch (error) {
    // If file doesn't exist or can't be written, continue
  }

  return (message) => {
    try {
      fs.appendFileSync(RESULT_FILE, message + '\n');
    } catch (error) {
      // If file write fails, continue without failing the app
    }
  };
}

/**
 * Interactive mode - Menu-driven interface for user commands
 */
function runInteractive() {
  const fileLogger = createFileLogger();
  
  const actionLogger = (message) => {
    console.log(message);
    fileLogger(message);
  };
  
  const controller = new OrderController(actionLogger);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n' + '='.repeat(60));
  console.log("  McDonald's Order Management System - Interactive Mode");
  console.log('='.repeat(60));
  
  fileLogger(`McDonald's Order Management System - Interactive Results\n`);
  fileLogger(`[${getCurrentTime()}] System initialized with 0 bots`);
  
  displayStatus(controller);
  displayMenu();

  rl.on('line', (input) => {
    const command = input.trim().toLowerCase();

    switch (command) {
      case '1':
        controller.createNormalOrder();
        displayStatus(controller);
        displayMenu();
        break;
      case '2':
        controller.createVIPOrder();
        displayStatus(controller);
        displayMenu();
        break;
      case '3':
        controller.addBot();
        displayStatus(controller);
        displayMenu();
        break;
      case '4':
        const removedBot = controller.removeBot();
        if (!removedBot) {
          console.log(`\n[${getCurrentTime()}] ⚠️  No bots available to remove`);
        }
        displayStatus(controller);
        displayMenu();
        break;
      case '5':
        displayStatus(controller);
        displayMenu();
        break;
      case '6':
      case 'exit':
      case 'quit':
        console.log('\n' + '='.repeat(60));
        console.log(`[${getCurrentTime()}] Exiting system...`);
        console.log('='.repeat(60) + '\n');
        
        const status = controller.getStatus();
        fileLogger('');
        fileLogger('Final Status:');
        fileLogger(`- Total Orders Processed: ${status.totalOrders} (${status.vipOrders} VIP, ${status.normalOrders} Normal)`);
        fileLogger(`- Orders Completed: ${status.completedOrders}`);
        fileLogger(`- Active Bots: ${status.activeBots}`);
        fileLogger(`- Pending Orders: ${status.pendingOrders}`);
        
        rl.close();
        process.exit(0);
        break;
      default:
        console.log('\n⚠️  Invalid command. Please enter 1-6.\n');
        displayMenu();
        break;
    }
  });

  rl.on('close', () => {
    process.exit(0);
  });
}

/**
 * Display the interactive menu
 */
function displayMenu() {
  console.log('\n' + '-'.repeat(60));
  console.log('  MENU');
  console.log('-'.repeat(60));
  console.log('  1. Create Normal Order');
  console.log('  2. Create VIP Order');
  console.log('  3. Add Bot');
  console.log('  4. Remove Bot');
  console.log('  5. Show Status');
  console.log('  6. Exit');
  console.log('-'.repeat(60));
  console.log('Enter your choice (1-6): ');
}

/**
 * Display current system status
 */
function displayStatus(controller) {
  const status = controller.getStatus();
  const pendingOrders = controller.getPendingOrders();
  const completedOrders = controller.getCompletedOrders();
  const bots = controller.getBots();

  console.log('\n' + '='.repeat(60));
  console.log(`  SYSTEM STATUS - [${getCurrentTime()}]`);
  console.log('='.repeat(60));
  
  console.log('\n🤖 BOTS:');
  console.log(`  Total: ${status.activeBots} | Idle: ${status.idleBots} | Processing: ${status.processingBots}`);
  if (bots.length > 0) {
    bots.forEach(bot => {
      const statusIcon = bot.isIdle() ? '💤' : '⚙️ ';
      const orderInfo = bot.currentOrder 
        ? ` → Processing Order #${bot.currentOrder.orderNumber}`
        : '';
      console.log(`    ${statusIcon} Bot #${bot.botId} (${bot.status})${orderInfo}`);
    });
  }

  console.log('\n📋 PENDING ORDERS' + ' '.repeat(25) + '✅ COMPLETED ORDERS');
  console.log('-'.repeat(28) + '  ' + '-'.repeat(28));
  
  const maxRows = Math.max(pendingOrders.length, completedOrders.length);
  
  if (maxRows === 0) {
    console.log('  (No pending orders)' + ' '.repeat(12) + '(No completed orders)');
  } else {
    const pendingTotal = `Total: ${status.pendingOrders}`;
    const completedTotal = `Total: ${status.completedOrders}`;
    console.log(`  ${pendingTotal.padEnd(26)}  ${completedTotal}`);
    console.log('');
    
    for (let i = 0; i < maxRows; i++) {
      let pendingLine = '';
      let completedLine = '';
      
      if (i < pendingOrders.length) {
        const order = pendingOrders[i];
        const priorityIcon = order.isVIP() ? '⭐' : '📦';
        pendingLine = `  ${i + 1}. ${priorityIcon} ${order.type} Order #${order.orderNumber}`;
      } else {
        pendingLine = '  ';
      }
      
      if (i < completedOrders.length) {
        const order = completedOrders[i];
        const icon = order.isVIP() ? '⭐' : '📦';
        completedLine = `${i + 1}. ${icon} ${order.type} Order #${order.orderNumber}`;
      } else {
        completedLine = '';
      }
      
      console.log(pendingLine.padEnd(30) + '  ' + completedLine);
    }
  }
  
  console.log('='.repeat(60));
}

// Run interactive mode
runInteractive();

