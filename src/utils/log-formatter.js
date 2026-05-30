function formatOrderCreated(order) {
  return `Created ${order.type} Order #${order.id} - Status: ${order.status}`;
}

function formatBotCreated(bot, status = bot.status) {
  return `Bot #${bot.id} created - Status: ${status}`;
}

function formatOrderPickedUp(bot, order) {
  return `Bot #${bot.id} picked up ${order.type} Order #${order.id} - Status: ${order.status}`;
}

function formatOrderCompleted(bot, order, processingTime) {
  return `Bot #${bot.id} completed ${order.type} Order #${order.id} - Status: ${order.status} (Processing time: ${processingTime / 1000}s)`;
}

function formatBotIdle(bot) {
  return `Bot #${bot.id} is now ${bot.status} - No pending orders`;
}

function formatBotRemovedWhileProcessing(bot, order) {
  return `Bot #${bot.id} destroyed while processing ${order.type} Order #${order.id} - Order returned to ${order.status}`;
}

function formatBotRemoved(bot) {
  return `Bot #${bot.id} destroyed while ${bot.status}`;
}

module.exports = {
  formatOrderCreated,
  formatBotCreated,
  formatOrderPickedUp,
  formatOrderCompleted,
  formatBotIdle,
  formatBotRemovedWhileProcessing,
  formatBotRemoved,
};
