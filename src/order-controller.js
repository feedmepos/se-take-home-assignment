const { EventEmitter } = require('events');

/**
 * McDonald's order controller: pending queue, completed orders, and cooking bots.
 *
 * Rules:
 * - Pending queue: all VIP orders first (ascending by order id), then normal orders (ascending by id).
 * - New VIP is placed after existing VIPs and before all normals; new normal is inserted in the normal segment by id.
 * - Each bot handles one order at a time; each order takes `processingTime` ms (default 10s).
 * - Removing a bot destroys the newest one; if busy, cancel the timer and re-insert the order with the same rules.
 */
class OrderController extends EventEmitter {
  constructor(processingTime = 10000) {
    super();
    /**
     * Pending queue (priority-sorted).
     * @type {Array<{id:number,type:string,status:string}>}
     */
    this.pendingOrders = [];
    /**
     * Completed orders.
     * @type {Array<{id:number,type:string,status:string}>}
     */
    this.completedOrders = [];
    /**
     * Active bots (creation order; pop removes newest).
     * @type {Array<{id:number,status:string,currentOrder:any,timer:ReturnType<typeof setTimeout>|null}>}
     */
    this.bots = [];
    this._nextOrderId = 1;
    this._nextBotId = 1;
    /**
     * Per-order duration in milliseconds; tests may use a smaller value with fake timers.
     */
    this.processingTime = processingTime;
  }

  /**
   * Create an order, enqueue as pending, then try to assign idle bots.
   * @param {'normal'|'vip'} type
   */
  createOrder(type) {
    const order = { id: this._nextOrderId++, type, status: 'PENDING' };
    this._insertPending(order);
    const typeLabel = type === 'vip' ? 'VIP' : 'Normal';
    this.emit('log', `Created ${typeLabel} order #${order.id} — status: PENDING`);
    // After enqueue, assign in case any bot is idle (order may leave pending immediately).
    this._assignPendingOrders();
    return order;
  }

  /**
   * Insert into pending: VIP segment first (by id), then normal segment (by id).
   * Same logic for new orders and orders returned when a bot is removed.
   */
  _insertPending(order) {
    order.status = 'PENDING';
    if (order.type === 'vip') {
      // Within VIP segment, insert by id (newer VIP id after older VIPs).
      let i = 0;
      while (
        i < this.pendingOrders.length &&
        this.pendingOrders[i].type === 'vip' &&
        this.pendingOrders[i].id < order.id
      ) {
        i++;
      }
      this.pendingOrders.splice(i, 0, order);
    } else {
      // Start at first normal slot, then insert by id.
      const normalStart = this.pendingOrders.findIndex(o => o.type !== 'vip');
      let i = normalStart === -1 ? this.pendingOrders.length : normalStart;
      while (i < this.pendingOrders.length && this.pendingOrders[i].id < order.id) {
        i++;
      }
      this.pendingOrders.splice(i, 0, order);
    }
  }

  /**
   * Add a bot and try to take from the front of the pending queue (highest priority).
   */
  addBot() {
    const bot = {
      id: this._nextBotId++,
      status: 'IDLE',
      currentOrder: null,
      timer: null,
    };
    this.bots.push(bot);
    this.emit('log', `Bot #${bot.id} created — status: ACTIVE`);
    this._tryAssign(bot);
    return bot;
  }

  /**
   * Remove newest bot (array tail). If processing, clear timer and re-insert order (not completed).
   */
  removeBot() {
    if (this.bots.length === 0) return null;
    const bot = this.bots.pop();
    if (bot.timer) {
      clearTimeout(bot.timer);
      bot.timer = null;
    }
    if (bot.currentOrder) {
      const order = bot.currentOrder;
      bot.currentOrder = null;
      this._insertPending(order);
      this.emit(
        'log',
        `Bot #${bot.id} destroyed while processing order #${order.id} — order #${order.id} returned to PENDING`
      );
    } else {
      this.emit('log', `Bot #${bot.id} destroyed while IDLE`);
    }
    return bot;
  }

  /**
   * Each idle bot tries to take the queue head in array order.
   */
  _assignPendingOrders() {
    for (const bot of this.bots) {
      if (bot.status === 'IDLE' && this.pendingOrders.length > 0) {
        this._tryAssign(bot);
      }
    }
  }

  /**
   * Dequeue front (`shift`) and start cooking timer. Only when IDLE and queue non-empty.
   */
  _tryAssign(bot) {
    if (bot.status !== 'IDLE' || this.pendingOrders.length === 0) return;
    const order = this.pendingOrders.shift();
    order.status = 'PROCESSING';
    bot.currentOrder = order;
    bot.status = 'PROCESSING';
    const typeLabel = order.type === 'vip' ? 'VIP' : 'Normal';
    this.emit('log', `Bot #${bot.id} picked up ${typeLabel} order #${order.id} — status: PROCESSING`);
    bot.timer = setTimeout(() => {
      this._completeOrder(bot);
    }, this.processingTime);
  }

  /**
   * Cooking done: move to completed, bot IDLE; if pending remains, take next order.
   */
  _completeOrder(bot) {
    const order = bot.currentOrder;
    order.status = 'COMPLETE';
    bot.currentOrder = null;
    bot.timer = null;
    bot.status = 'IDLE';
    this.completedOrders.push(order);
    const typeLabel = order.type === 'vip' ? 'VIP' : 'Normal';
    this.emit('log', `Bot #${bot.id} completed ${typeLabel} order #${order.id} — status: COMPLETE`);
    if (this.pendingOrders.length > 0) {
      this._tryAssign(bot);
    } else {
      this.emit('log', `Bot #${bot.id} is now IDLE — no pending orders`);
    }
  }
}

module.exports = { OrderController };
