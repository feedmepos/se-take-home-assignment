'use strict'

class Bot {
  constructor(id) {
    this.id = id
    this.status = 'idle'      // 'idle' | 'working'
    this.currentOrder = null
    this._timer = null
  }
}

class BotManager {
  constructor(orderManager, processingTime = 10000) {
    this.bots = []
    this._counter = 0
    this._orderManager = orderManager
    this.processingTime = processingTime

    // Callbacks — set by the CLI to log events
    this.onOrderAssigned = null   // (bot, order) => void
    this.onOrderCompleted = null  // (order, bot) => void
  }

  addBot() {
    const bot = new Bot(++this._counter)
    this.bots.push(bot)
    this._tryAssign(bot)
    return bot
  }

  /** Remove the most recently added bot. Returns { bot, returnedOrder|null }. */
  removeLatestBot() {
    if (this.bots.length === 0) return null
    const bot = this.bots.pop()
    if (bot._timer) {
      clearTimeout(bot._timer)
      bot._timer = null
    }
    let returnedOrder = null
    if (bot.currentOrder) {
      returnedOrder = this._orderManager.returnOrder(bot.currentOrder)
      bot.currentOrder = null
    }
    bot.status = 'idle'
    return { bot, returnedOrder }
  }

  /** Try to assign the next pending order to any idle bot. */
  notifyNewOrder() {
    for (const bot of this.bots) {
      if (bot.status === 'idle') {
        if (this._tryAssign(bot)) break
      }
    }
  }

  _tryAssign(bot) {
    const order = this._orderManager.getNextPendingOrder()
    if (!order) return false

    this._orderManager.markProcessing(order.id, bot.id)
    bot.status = 'working'
    bot.currentOrder = order

    if (this.onOrderAssigned) this.onOrderAssigned(bot, order)

    bot._timer = setTimeout(() => this._completeOrder(bot), this.processingTime)
    return true
  }

  _completeOrder(bot) {
    const order = bot.currentOrder
    if (!order) return

    const completed = this._orderManager.completeOrder(order.id)
    bot.currentOrder = null
    bot.status = 'idle'
    bot._timer = null

    if (this.onOrderCompleted) this.onOrderCompleted(completed, bot)

    // Immediately try to grab next order
    this._tryAssign(bot)
  }

  getBotsSnapshot() {
    return this.bots.map(b => ({
      id: b.id,
      status: b.status,
      orderId: b.currentOrder ? b.currentOrder.id : null,
    }))
  }
}

module.exports = { BotManager, Bot }
