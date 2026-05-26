#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');

const VIP = 'VIP';
const NORMAL = 'Normal';
const IDLE = 'IDLE';
const WORKING = 'WORKING';
const PENDING = 'PENDING';
const PROCESSING = 'PROCESSING';
const COMPLETE = 'COMPLETE';
const TEST_FLAG = '--test';
const PROCESSING_SECONDS = 10;
const EMPTY_LINE = '';
const SYSTEM_INITIALIZED = 'System initialized with 0 bots';
const NO_BOT_AVAILABLE_TO_REMOVE = 'No bot available to remove';
const SECONDS_ERROR = 'seconds must be a non-negative integer';
const ALL_TESTS_PASSED = 'All tests passed';
const RESULT_TITLE = "McDonald's Order Management System - Simulation Results";
const FINAL_STATUS = 'Final Status:';

class OrderController {
  constructor() {
    this.vipQueue = [];
    this.normalQueue = [];
    this.bots = [];
    this.completedOrders = [];
    this.completionEvents = [];
    this.nextOrderId = 1;
    this.nextBotId = 1;
    this.currentTimeSeconds = 0;
    this.logs = [];
  }

  addOrder(type) {
    this.validateOrderType(type);
    const order = {
      id: this.nextOrderId,
      type,
      status: PENDING,
      createdAt: this.currentTimeSeconds
    };
    this.nextOrderId += 1;

    if (type === VIP) {
      this.vipQueue.push(order);
    } else {
      this.normalQueue.push(order);
    }

    this.log(`Created ${type} Order #${order.id} - Status: ${PENDING}`);
    this.dispatch();
    return order;
  }

  addBot() {
    const bot = {
      id: this.nextBotId,
      status: IDLE,
      order: null,
      startedAt: null
    };
    this.nextBotId += 1;
    this.bots.push(bot);
    this.log(`Bot #${bot.id} created - Status: ${IDLE}`);
    this.dispatch();
    return bot;
  }

  removeBot() {
    const bot = this.bots.pop();
    if (!bot) {
      this.log(NO_BOT_AVAILABLE_TO_REMOVE);
      return null;
    }

    if (bot.status === WORKING && bot.order) {
      this.completionEvents = this.completionEvents.filter((event) => event.botId !== bot.id);
      const order = {
        ...bot.order,
        status: PENDING
      };

      if (order.type === VIP) {
        this.vipQueue.unshift(order);
      } else {
        this.normalQueue.unshift(order);
      }
      this.log(`Bot #${bot.id} destroyed while processing ${order.type} Order #${order.id}; order returned to ${PENDING}`);
    } else {
      this.log(`Bot #${bot.id} destroyed while ${IDLE}`);
    }

    return bot;
  }

  dispatch() {
    for (const bot of this.bots) {
      if (bot.status !== IDLE) {
        continue;
      }

      const order = this.vipQueue.shift() || this.normalQueue.shift();
      if (!order) {
        continue;
      }

      bot.status = WORKING;
      bot.order = {
        ...order,
        status: PROCESSING
      };
      bot.startedAt = this.currentTimeSeconds;
      this.completionEvents.push({
        botId: bot.id,
        orderId: order.id,
        completeAt: this.currentTimeSeconds + PROCESSING_SECONDS
      });
      this.sortCompletionEvents();
      this.log(`Bot #${bot.id} picked up ${order.type} Order #${order.id} - Status: ${PROCESSING}`);
    }
  }

  tick(seconds) {
    if (!Number.isInteger(seconds) || seconds < 0) {
      throw new Error(SECONDS_ERROR);
    }

    const targetTime = this.currentTimeSeconds + seconds;
    while (this.completionEvents.length > 0 && this.completionEvents[0].completeAt <= targetTime) {
      const event = this.completionEvents.shift();
      this.currentTimeSeconds = event.completeAt;
      this.completeEvent(event);
      this.dispatch();
    }
    this.currentTimeSeconds = targetTime;
  }

  getState() {
    return {
      currentTimeSeconds: this.currentTimeSeconds,
      vipQueue: this.vipQueue.map((order) => ({ ...order })),
      normalQueue: this.normalQueue.map((order) => ({ ...order })),
      pendingOrders: [...this.vipQueue, ...this.normalQueue].map((order) => ({ ...order })),
      bots: this.bots.map((bot) => ({
        ...bot,
        order: bot.order ? { ...bot.order } : null
      })),
      completedOrders: this.completedOrders.map((order) => ({ ...order })),
      completionEvents: this.completionEvents.map((event) => ({ ...event })),
      nextOrderId: this.nextOrderId,
      nextBotId: this.nextBotId,
      logs: [...this.logs]
    };
  }

  completeEvent(event) {
    const bot = this.bots.find((item) => item.id === event.botId);
    if (!bot || bot.status !== WORKING || !bot.order || bot.order.id !== event.orderId) {
      return;
    }

    const completedOrder = {
      ...bot.order,
      status: COMPLETE,
      completedAt: this.currentTimeSeconds,
      botId: bot.id
    };
    this.completedOrders.push(completedOrder);
    this.log(`Bot #${bot.id} completed ${completedOrder.type} Order #${completedOrder.id} - Status: ${COMPLETE} (Processing time: ${PROCESSING_SECONDS}s)`);

    bot.status = IDLE;
    bot.order = null;
    bot.startedAt = null;
  }

  sortCompletionEvents() {
    this.completionEvents.sort((a, b) => a.completeAt - b.completeAt || a.botId - b.botId);
  }

  log(message) {
    this.logs.push(`[${formatTime(this.currentTimeSeconds)}] ${message}`);
  }

  validateOrderType(type) {
    if (type !== VIP && type !== NORMAL) {
      throw new Error(`Unsupported order type: ${type}`);
    }
  }
}

function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600) % 24;
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

function runDemo() {
  const controller = new OrderController();
  controller.log(SYSTEM_INITIALIZED);
  controller.addOrder(NORMAL);
  controller.addOrder(VIP);
  controller.addOrder(NORMAL);
  controller.addBot();
  controller.tick(1);
  controller.addBot();
  controller.tick(9);
  controller.addOrder(VIP);
  controller.tick(1);
  controller.removeBot();
  controller.tick(20);

  const state = controller.getState();
  const vipCompleted = state.completedOrders.filter((order) => order.type === VIP).length;
  const normalCompleted = state.completedOrders.filter((order) => order.type === NORMAL).length;

  console.log(RESULT_TITLE);
  console.log(EMPTY_LINE);
  console.log(state.logs.join('\n'));
  console.log(EMPTY_LINE);
  console.log(FINAL_STATUS);
  console.log(`- Total Orders Processed: ${state.completedOrders.length} (${vipCompleted} ${VIP}, ${normalCompleted} ${NORMAL})`);
  console.log(`- Orders Completed: ${state.completedOrders.length}`);
  console.log(`- Active Bots: ${state.bots.length}`);
  console.log(`- Pending Orders: ${state.pendingOrders.length}`);
}

function runTests() {
  testOrderNumberIncrement();
  testVipPriorityOverNormal();
  testVipFifo();
  testBotProcessesContinuously();
  testRemoveIdleBot();
  testRemoveWorkingNewestBotReturnsOrder();
  testMultipleBotsCompleteConcurrently();
  console.log(ALL_TESTS_PASSED);
}

function testOrderNumberIncrement() {
  const controller = new OrderController();
  const first = controller.addOrder(NORMAL);
  const second = controller.addOrder(VIP);
  assert.equal(first.id, 1);
  assert.equal(second.id, 2);
  assert.equal(controller.getState().nextOrderId, 3);
}

function testVipPriorityOverNormal() {
  const controller = new OrderController();
  const normal = controller.addOrder(NORMAL);
  const vip = controller.addOrder(VIP);
  controller.addBot();
  const bot = controller.getState().bots[0];
  assert.equal(bot.order.id, vip.id);
  assert.deepEqual(controller.getState().pendingOrders.map((order) => order.id), [normal.id]);
}

function testVipFifo() {
  const controller = new OrderController();
  const firstVip = controller.addOrder(VIP);
  const secondVip = controller.addOrder(VIP);
  controller.addBot();
  assert.equal(controller.getState().bots[0].order.id, firstVip.id);
  controller.tick(PROCESSING_SECONDS);
  assert.deepEqual(controller.getState().completedOrders.map((order) => order.id), [firstVip.id]);
  assert.equal(controller.getState().bots[0].order.id, secondVip.id);
}

function testBotProcessesContinuously() {
  const controller = new OrderController();
  controller.addBot();
  const first = controller.addOrder(NORMAL);
  const second = controller.addOrder(NORMAL);
  controller.tick(PROCESSING_SECONDS);
  let state = controller.getState();
  assert.deepEqual(state.completedOrders.map((order) => order.id), [first.id]);
  assert.equal(state.bots[0].order.id, second.id);
  controller.tick(PROCESSING_SECONDS);
  state = controller.getState();
  assert.deepEqual(state.completedOrders.map((order) => order.id), [first.id, second.id]);
  assert.equal(state.bots[0].status, IDLE);
}

function testRemoveIdleBot() {
  const controller = new OrderController();
  const bot = controller.addBot();
  const removed = controller.removeBot();
  const state = controller.getState();
  assert.equal(removed.id, bot.id);
  assert.equal(state.bots.length, 0);
  assert.equal(state.pendingOrders.length, 0);
}

function testRemoveWorkingNewestBotReturnsOrder() {
  const controller = new OrderController();
  const firstBot = controller.addBot();
  const order = controller.addOrder(NORMAL);
  const secondBot = controller.addBot();
  const secondOrder = controller.addOrder(VIP);
  assert.equal(controller.getState().bots.at(-1).id, secondBot.id);
  const removed = controller.removeBot();
  const state = controller.getState();
  assert.equal(removed.id, secondBot.id);
  assert.deepEqual(state.pendingOrders.map((item) => item.id), [secondOrder.id]);
  assert.equal(state.bots.length, 1);
  assert.equal(state.bots[0].id, firstBot.id);
  assert.equal(state.bots[0].order.id, order.id);
  assert.equal(state.completionEvents.length, 1);
}

function testMultipleBotsCompleteConcurrently() {
  const controller = new OrderController();
  const first = controller.addOrder(NORMAL);
  const second = controller.addOrder(NORMAL);
  controller.addBot();
  controller.addBot();
  controller.tick(PROCESSING_SECONDS);
  const state = controller.getState();
  assert.deepEqual(state.completedOrders.map((order) => order.id), [first.id, second.id]);
  assert.equal(state.bots.every((bot) => bot.status === IDLE), true);
}

if (require.main === module) {
  if (process.argv.includes(TEST_FLAG)) {
    runTests();
  } else {
    runDemo();
  }
}

module.exports = {
  OrderController,
  VIP,
  NORMAL,
  IDLE,
  WORKING,
  PENDING,
  PROCESSING,
  COMPLETE,
  PROCESSING_SECONDS,
  formatTime
};
