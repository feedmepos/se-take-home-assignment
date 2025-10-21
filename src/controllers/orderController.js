const botService = require("../services/botService.js");
const { orderService } = require("../services/orderService.js");
const { logFinalSummary } = require("../utils/logger.js");

function createOrderHandler(req, res) {
  const { type } = req.body;
  if (!["vip", "normal"].includes(type.toLowerCase())) {
    return res.status(400).json({ error: "Invalid order type" });
  }

  const order = orderService.createOrder(type);
  res.status(201).json(order);
}

function getOrdersHandler(req, res) {
  res.json(orderService.getOrders());
}

function getSummaryHandler(req, res) {
  const orderStats = orderService.getStats();
  const botStats = botService.getBots();
  logFinalSummary(orderStats, botStats);
  res.status(201).json({ orderStats, botStats });
}

module.exports = { createOrderHandler, getOrdersHandler, getSummaryHandler };
