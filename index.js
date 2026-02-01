import { log, addOrder, addBot, removeBot, OrderType } from './orderSystem.js';
import fs from 'fs';
import path from 'path';

// ===== RESULT FILE SETUP =====
const RESULT_FILE = path.join('scripts', 'result.txt');
// Clear previous content
fs.writeFileSync(RESULT_FILE, '', { flag: 'w' });

// ===== SIMULATION =====
log("McDonald's Order Management System - Simulation Results", false);
log("", false);

// Example simulation actions
addOrder(OrderType.NORMAL); // Order #1001
addOrder(OrderType.VIP);    // Order #1002
addOrder(OrderType.VIP);    // Order #1003 //EXPECTED Q: #1002, #1003, #1001

setTimeout(() => addOrder(OrderType.NORMAL), 2000); // Order #1004

addBot(); // Bot #1
addBot(); // Bot #2

setTimeout(() => addOrder(OrderType.VIP), 5000);    // Order #1005

// Remove newest bot after 15 seconds
setTimeout(() => removeBot(), 15000);

