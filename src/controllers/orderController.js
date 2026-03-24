const { createOrder } = require('../services/orderService');
const { tryAssignIdleBot } = require('../services/botService');
const { getStateSnapshot } = require('../state');

function handleCreateOrder(req, res) {
  const { type } = req.body;
  if (type !== 'NORMAL' && type !== 'VIP') {
    return res.status(400).json({ error: 'type must be NORMAL or VIP' });
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
