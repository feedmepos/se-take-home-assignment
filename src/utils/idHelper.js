const { randomUUID } = require('crypto');
const { ORDER_COUNTER_START, BOT_COUNTER_START } = require('../constants');

let orderCounter = ORDER_COUNTER_START;
let botCounter = BOT_COUNTER_START;

function generateSystemId() {
  return randomUUID();
}

function generateOrderDisplayId() {
  return String(orderCounter++);
}

function generateBotDisplayId() {
  return `Bot-${botCounter++}`;
}

module.exports = { generateSystemId, generateOrderDisplayId, generateBotDisplayId };
