import { CUSTOMER_TYPES, BOT_STATUS } from './enums';
import { ORDER_ID_PADDING } from './constants';

/**
 * Assign pending orders to idle bots with VIP priority
 */
export const assignOrdersToBots = (bots, pendingOrders) => {
  let remainingOrders = [...pendingOrders];

  const updatedBots = bots.map(bot => {
    if (bot.status !== BOT_STATUS.IDLE) return bot;
    if (!remainingOrders.length) return bot;

    const vipIndex = remainingOrders.findIndex(
      order => order.customerType === CUSTOMER_TYPES.VIP
    );

    const orderIndex = vipIndex !== -1 ? vipIndex : 0;
    const [assignedOrder] = remainingOrders.splice(orderIndex, 1);

    return {
      ...bot,
      status: BOT_STATUS.BUSY,
      currentOrder: assignedOrder,
    };
  });

  return { bots: updatedBots, pending: remainingOrders };
};

/**
 * Create a new order with unique ID
 */
export const createOrder = (customerType, vipCounter, normalCounter) => {
  const isVip = customerType === CUSTOMER_TYPES.VIP;
  const counter = isVip ? vipCounter + 1 : normalCounter + 1;

  const idPrefix = isVip ? 'V' : 'N';
  const id = `${idPrefix}-${counter.toString().padStart(ORDER_ID_PADDING, '0')}`;

  return {
    order: { id, customerType },
    vipCounter: isVip ? counter : vipCounter,
    normalCounter: !isVip ? counter : normalCounter,
  };
};
