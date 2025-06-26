import { format } from 'date-fns'

import { CreateOrderPayload, Order, ORDER_STATUS } from './order.type'
import { Bot, BOT_STATUS } from '../bots/bot.type'

// in memory db
const orders: Order[] = [];
let dailyOrderSeq = 0;
const bots: Bot[] = [];
let botId = 1

// Requirements 3.The order number should be unique and increasing.
// order id format: YYYYMMDD******
function generateOrderID(): string {
  const nowPrefix = format(new Date(), 'yyyyMMdd');
  dailyOrderSeq ++;
  return `${nowPrefix}${dailyOrderSeq.toString().padStart(6, '0')}`
}

// ORDER services
function createOrder(payload: CreateOrderPayload): Order {
  const { type } = payload;
  const newOrder: Order = {
    id: generateOrderID(),
    type,
    status: ORDER_STATUS.PENDING,
    createdAt: Date.now()
  }
  orders.push(newOrder);
  assignOrder()
  return newOrder;
}

function getOrders(): Order[] {
  return [...orders].sort((a, b) => {
    if (a.type === 'VIP' && b.type !== 'VIP') return -1;
    if (a.type !== 'VIP' && b.type === 'VIP') return 1;
    return a.createdAt - b.createdAt;
  });
}

function updateOrder(id: string, updateAttrs: any): Order | null {
  const idx = orders.findIndex(o => o.id === id);
  if (idx > -1) {
    orders[idx] = { ...orders[idx], ...updateAttrs, updatedAt: Date.now() };
    return orders[idx];
  }
  return null;
}


// BOT services
async function createBot(): Promise<Bot> {
  const newBot: Bot = {
    id: botId,
    status: BOT_STATUS.IDLE,
    createdAt: Date.now(),
    orderId: null,
  }
  bots.push(newBot);
  assignOrder();
  return newBot;
}

function processOrder(bot: Bot, order: Order) {
  return new Promise(resolve => {
    bot.status = BOT_STATUS.WORKING;
    bot.orderId = order.id
    order.status = ORDER_STATUS.PROCESSING;
    setTimeout(() => {
      if (order.status === ORDER_STATUS.PROCESSING) {
        order.status = ORDER_STATUS.COMPLETE;
        bot.status = BOT_STATUS.IDLE;
      }
    }, 10000)
  })
}

function assignOrder() {
  const idleBots = bots.filter(b => b.status == BOT_STATUS.IDLE);
  const orders = getOrders();
  const pendingOrder = orders.filter(o => o.status == ORDER_STATUS.PENDING);
  
  for(let i = 0; i < Math.min(idleBots.length, pendingOrder.length); i++) {
    const bot = idleBots[i];
    const order = pendingOrder[i];
    
    if (bot.status === BOT_STATUS.IDLE && order.status === ORDER_STATUS.PENDING) {
      processOrder(bot, order);
    }
  }
}

async function getBots(): Promise<Bot[]> {
  return bots;
}

async function removeLatestBot(): Promise<void>{
  const bot = bots.pop();
  if((bot?.status != BOT_STATUS.IDLE) && bot?.orderId) {
    updateOrder(bot.orderId, {status: ORDER_STATUS.PENDING})
  }
}


setInterval(() => {
  assignOrder();
}, 1000);

export {
  createOrder, 
  getOrders,
  createBot, 
  getBots,
  removeLatestBot
}