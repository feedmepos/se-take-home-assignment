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

function insertPending(order, status) {
  if (status === ORDER_STATUS.ABORT) {
    order.displayId = Number(order.displayId);
  }

  const isVip = order.type === ORDER_TYPE.VIP;

  let insertAt = state.orders.findIndex((o) => {
    if (o.status !== ORDER_STATUS.PENDING) return false;

    if (isVip) {
      return (o.type === ORDER_TYPE.VIP && Number(o.displayId) > order.displayId) || 
             (o.type !== ORDER_TYPE.VIP);
    } else {
      return o.type !== ORDER_TYPE.VIP && Number(o.displayId) > order.displayId;
    }
  });

  if (insertAt === -1) {
    if (isVip) {
      const firstRegularIdx = state.orders.findIndex(o => o.type !== ORDER_TYPE.VIP && o.status === ORDER_STATUS.PENDING);
      insertAt = firstRegularIdx === -1 ? state.orders.length : firstRegularIdx;
    } else {
      let lastPendingIdx = -1;
      for (let i = 0; i < state.orders.length; i++) {
        if (state.orders[i].status === ORDER_STATUS.PENDING) lastPendingIdx = i;
      }
      insertAt = lastPendingIdx + 1;
    }
  }

  state.orders.splice(insertAt, 0, order);
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
