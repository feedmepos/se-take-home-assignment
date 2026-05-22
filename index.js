import { Orders, Bot, BotStaff } from './objects.js';
import { pause } from './util.js';

/** @import { Order, Bot } from './objects.js' */


const PICKUP_ORDER_DELAY_MS = 500;

/** @type {HTMLElement} */ const $pendingArea = document.getElementById('pendingArea');
/** @type {HTMLElement} */ const $processingArea = document.getElementById('processingArea');
/** @type {HTMLElement} */ const $completedArea = document.getElementById('completedArea');
/** @type {HTMLElement} */ const $orderTemplate = document.getElementById('order-');
/** @type {HTMLElement} */ const $botTemplate = document.getElementById('bot-');

/**
 * Handles DOM element operations.
 * Used for manipulating UI components to reflect state of business objects.
 */
const UI = {
  /** @typedef {HTMLElement & { $orderSlot: HTMLElement }} BotElement */

  /**
   * Create an order item and place it in the pending area.
   * @param {Order} order
   * @returns {HTMLElement}
   */
  addOrderItem(order) {
    /** @type {HTMLElement} */
    const $order = $orderTemplate.cloneNode(true);
    $order.id = `order-${order.id}`;
    $order.hidden = false;
    $order.querySelector('.order-id').textContent = order.id;
    if (order.vip) {
      $order.querySelector('.order-vip').hidden = false;
    }
    $pendingArea.append($order);
    return $order;
  },

  /**
   * Move order item to a bot item, the pending area or the completed area.
   * @param {Order} order
   * @param {Bot | Order[]} destination
   * @returns {Promise<HTMLElement>}
   */
  async moveOrderItem(order, destination) {
    /** @type {HTMLElement} */
    const $order = document.getElementById(`order-${order.id}`);
    if (destination instanceof Bot) {
      /** @type {BotElement} */
      const $bot = document.getElementById(`bot-${destination.id}`);
      // Slight delay allows progress-bars to reset correctly between order item releases and pickups
      // Also makes multiple order item movements visually easier to follow
      await pause(PICKUP_ORDER_DELAY_MS);
      $bot.$orderSlot.append($order);
      return $bot;
    }
    if (destination === Orders.pending || destination === Orders.pendingVIP) {
      $orderTemplate.insertAdjacentElement('afterend', $order);
      return $pendingArea;
    }
    if (destination === Orders.completed) {
      $completedArea.append($order);
      return $completedArea;
    }
  },

  /**
   * Create bot item and place it in the bot area.
   * @param {Bot} bot
   * @returns {BotElement}
   */
  addBotItem(bot) {
    /** @type {BotElement} */
    const $bot = $botTemplate.cloneNode(true);
    $bot.id = `bot-${bot.id}`;
    $bot.hidden = false;
    $bot.$orderSlot = $bot.querySelector('.bot-order');
    $processingArea.append($bot);
    return $bot;
  },

  /**
   * Remove the associated bot item.
   * @param {Bot} bot
   */
  removeBotItem(bot) {
    const $bot = document.getElementById(`bot-${bot.id}`);
    $bot.remove();
  },
}


//--- Event listeners ---//

document.body.addEventListener('click', handleClick);
document.body.addEventListener('order:complete', handleCompleteOrder);

/**
 * @param {Event & { target: HTMLElement }} event
 */
function handleClick({ target }) {
  const targetId = target.closest('button')?.id || '';

  switch (targetId) {
    case 'addOrder':
      runAddOrder();
    break;
    case 'addOrderVIP':
      runAddOrder('vip');
    break;
    case 'addBot':
      runPickupOrder(runAddBot());
    break;
    case 'removeBot':
      runRemoveBot();
    break;
  }
}

/**
 * @param {object} event
 * @param {Order} event.order
 * @param {Bot} event.bot
 */
async function handleCompleteOrder({ order, bot }) {
  await UI.moveOrderItem(order, Orders.completed);
  runPickupOrder(bot);
}


//--- Actions ---//

/**
 * @param {any} [vip]
 */
function runAddOrder(vip = '') {
  const order = vip ? Orders.addVIP() : Orders.add();
  UI.addOrderItem(order);
  const bot = BotStaff.findIdle();
  if (bot) {
    runPickupOrder(bot);
  }
}

/**
 * @param {Bot} bot
 */
async function runPickupOrder(bot) {
  bot.pickupOrder();
  if (bot.order) {
    await UI.moveOrderItem(bot.order, bot);
  }
}

/**
 * @returns {Promise<Bot>}
 */
function runAddBot() {
  const bot = BotStaff.add();
  UI.addBotItem(bot);
  return bot;
}

function runRemoveBot() {
  const [bot, order] = BotStaff.remove();
  if (order) {
    UI.moveOrderItem(order, Orders.pending);
  }
  UI.removeBotItem(bot);
}
