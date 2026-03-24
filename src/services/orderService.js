const { state, getStateSnapshot } = require('../state');
const { generateSystemId, generateOrderDisplayId } = require('../utils/idHelper');
const { log, broadcastState } = require('../logger');
const { ORDER_TYPE, ORDER_STATUS } = require('../constants');

function getPendingOrders() {
  return state.orders.filter(o => o.status === ORDER_STATUS.PENDING);
}

function getCompleteOrders() {
  return state.orders.filter(o => o.status === ORDER_STATUS.COMPLETE);
}

function insertPending(order) {
  const pending = getPendingOrders();

  if (order.type === ORDER_TYPE.VIP) {
    const vipCount = pending.filter(o => o.type === ORDER_TYPE.VIP).length;
    let seen = 0;
    let insertAt = state.orders.length;
    for (let i = 0; i < state.orders.length; i++) {
      if (state.orders[i].status === ORDER_STATUS.PENDING) {
        if (seen === vipCount) { insertAt = i; break; }
        seen++;
      }
    }
    state.orders.splice(insertAt, 0, order);
  } else {
    let lastPendingIdx = -1;
    for (let i = 0; i < state.orders.length; i++) {
      if (state.orders[i].status === ORDER_STATUS.PENDING) lastPendingIdx = i;
    }
    state.orders.splice(lastPendingIdx + 1, 0, order);
  }
}

function createOrder(type) {
  const order = {
    systemId: generateSystemId(),
    displayId: generateOrderDisplayId(),
    type,
    status: ORDER_STATUS.PENDING,
    createdAt: new Date(),
    completedAt: null,
    processingBotId: null,
  };

  insertPending(order);
  log(`Order ${order.displayId} (${order.type}) created [${ORDER_STATUS.PENDING}]`);
  broadcastState(getStateSnapshot());
  return order;
}

module.exports = { createOrder, insertPending, getPendingOrders, getCompleteOrders };
