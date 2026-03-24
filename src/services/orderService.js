const { state, getStateSnapshot } = require('../state');
const { generateSystemId, generateDisplayId } = require('../utils/idHelper');
const { log, broadcastState } = require('../logger');

function getPendingOrders() {
  return state.orders.filter(o => o.status === 'PENDING');
}

function getCompleteOrders() {
  return state.orders.filter(o => o.status === 'COMPLETE');
}

// Insert order into state.orders at the correct priority position
function insertPending(order) {
  const pending = getPendingOrders();

  if (order.type === 'VIP') {
    const vipCount = pending.filter(o => o.type === 'VIP').length;
    let seen = 0;
    let insertAt = state.orders.length;
    for (let i = 0; i < state.orders.length; i++) {
      if (state.orders[i].status === 'PENDING') {
        if (seen === vipCount) { insertAt = i; break; }
        seen++;
      }
    }
    state.orders.splice(insertAt, 0, order);
  } else {
    let lastPendingIdx = -1;
    for (let i = 0; i < state.orders.length; i++) {
      if (state.orders[i].status === 'PENDING') lastPendingIdx = i;
    }
    state.orders.splice(lastPendingIdx + 1, 0, order);
  }
}

function createOrder(type) {
  const order = {
    systemId: generateSystemId(),
    displayId: generateDisplayId(),
    type,
    status: 'PENDING',
    createdAt: new Date(),
    completedAt: null,
    processingBotId: null,
  };

  insertPending(order);
  log(`Order ${order.displayId} (${order.type}) created [PENDING]`);
  broadcastState(getStateSnapshot());
  return order;
}

module.exports = { createOrder, insertPending, getPendingOrders, getCompleteOrders };
