const { createOrder } = require('../services/orderService');
const { tryAssignIdleBot } = require('../services/botService');
const { getStateSnapshot } = require('../state');
const { ORDER_TYPE } = require('../constants');

function handleCreateOrder(req, res) {
  const { type } = req.body;
  if (type !== ORDER_TYPE.NORMAL && type !== ORDER_TYPE.VIP) {
    return res.status(400).json({ error: `type must be ${ORDER_TYPE.NORMAL} or ${ORDER_TYPE.VIP}` });
  }
  const order = createOrder(type);
  tryAssignIdleBot();
  res.status(201).json(order);
}

function handleGetOrders(req, res) {
  const { pending, complete } = getStateSnapshot();
  res.json({ pending, complete });
}

module.exports = { handleCreateOrder, handleGetOrders };
