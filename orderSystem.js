// ===== ORDERS =====
export const OrderType = { NORMAL: 'Normal', VIP: 'VIP' };
import fs from 'fs';
import path from 'path';

export let bots = [];

export let orderCounter = 1000;
export let pendingOrders = [];
export let allOrders = [];
export let completedOrders = [];

const RESULT_FILE = path.join('scripts', 'result.txt');

export function log(msg, needTimeStamp = true) {
    const timestamp = new Date().toLocaleTimeString('en-GB'); // HH:MM:SS
    const line = needTimeStamp ? `[${timestamp}] ${msg}` : msg;
    // Only write to result.txt
    fs.appendFileSync(RESULT_FILE, line + '\n', { encoding: 'utf8' });
}

// ===== ADD ORDER FUNCTION =====
export function addOrder(type) {
    orderCounter++;
    const order = { id: orderCounter, type, status: 'PENDING' };
    allOrders.push(order);

    // VIP orders go in front of normal orders but behind other VIPs
    if (type === OrderType.VIP) {
        const firstNormalIndex = pendingOrders.findIndex(o => o.type !== OrderType.VIP);
        if (firstNormalIndex === -1) {
            pendingOrders.push(order);
        } else {
            pendingOrders.splice(firstNormalIndex, 0, order);
        }
    } else {
        pendingOrders.push(order);
    }

    log(`Created ${type} Order #${order.id} - Status: PENDING`);
    processOrders(); // try to assign immediately
}

// ===== ADD BOT FUNCTION =====
export function addBot() {
    const bot = { id: bots.length + 1, currentOrder: null, isIdleLogged: false };
    bots.push(bot);
    log(`Bot #${bot.id} created - Status: ACTIVE`);
    processOrders(); // immediately try to pick up orders
}

// ===== PROCESS ORDERS FUNCTION =====
export function processOrders() {
    bots.forEach(bot => {
        if (!bot.currentOrder) {
            if (pendingOrders.length > 0) {
                // assign next order
                const order = pendingOrders.shift();
                bot.currentOrder = order;
                order.status = 'PROCESSING';
                order.bot = bot.id;

                // reset idle log
                bot.isIdleLogged = false;

                log(`Bot #${bot.id} picked up ${order.type} Order #${order.id} - Status: PROCESSING`);

                bot.timeout = setTimeout(() => {
                    order.status = 'COMPLETE';
                    order.completed = true;
                    completedOrders.push(order);
                    bot.currentOrder = null;
                    order.bot = null;

                    log(`Bot #${bot.id} completed ${order.type} Order #${order.id} - Status: COMPLETE (Processing time: 10s)`);

                    processOrders(); // pick next order if any
                    checkFinalStatus();
                }, 10000);
            } else {
                // no pending orders → log idle once
                if (!bot.isIdleLogged) {
                    log(`Bot #${bot.id} is now IDLE - No pending orders`);
                    bot.isIdleLogged = true;
                    checkFinalStatus();
                }
            }
        }
    });
}

// ===== REMOVE BOT FUNCTION =====
export function removeBot() {
    if (bots.length === 0) return; // no bots to remove

    const bot = bots.pop(); // remove newest bot

    if (bot.currentOrder) {
        // stop the processing
        clearTimeout(bot.timeout);

        // return order to pendingOrders at the front (to be picked quickly)
        pendingOrders.unshift(bot.currentOrder);
        bot.currentOrder.status = 'PENDING';
        bot.currentOrder.bot = null;

        log(`Bot #${bot.id} destroyed while processing - Order #${bot.currentOrder.id} back to PENDING`);
    } else {
        log(`Bot #${bot.id} destroyed while IDLE`);
    }

    processOrders(); // let other bots pick up returned order
}

// ===== FINAL STATUS FUNCTION =====
export function reportFinalStatus() {
    const totalOrders = allOrders.length;
    const vipOrders = allOrders.filter(o => o.type === OrderType.VIP).length;
    const normalOrders = allOrders.filter(o => o.type === OrderType.NORMAL).length;
    const completed = completedOrders.length;
    const activeBots = bots.length;
    const pending = pendingOrders.length;

    log("", false);
    log("Final Status:", false);
    log(`- Total Orders Processed: ${totalOrders} (${vipOrders} VIP, ${normalOrders} Normal)`, false);
    log(`- Orders Completed: ${completed}`, false);
    log(`- Active Bots: ${activeBots}`, false);
    log(`- Pending Orders: ${pending}`, false);
}

// ===== CHECK IF FINAL STATUS SHOULD BE REPORTED =====
let finalStatusReported = false;

function checkFinalStatus() {
    const allOrdersDone = allOrders.length === completedOrders.length;
    const allBotsIdle = bots.every(bot => !bot.currentOrder);

    if (!finalStatusReported && allOrdersDone && allBotsIdle) {
        finalStatusReported = true; // mark it reported
        reportFinalStatus();
    }
}