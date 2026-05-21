class Processor {
  constructor(logger, processTime = 10000) {
    this.logger = logger
    this.orders = []
    this.bots = []
    this.processTime = processTime
  }

  addOrder(order) {
    this.orders.push(order)
    this.dispatch()
  }

  addBot(bot) {
    this.bots.push(bot)

    this.logger.log(`Bot #${bot.id} created`)
    this.dispatch()
  }

  removeBot(botId) {
    const index = this.bots.findIndex(b => b.id === botId)
    if (index === -1) return
    const bot = this.bots[index]
    if (bot.timer) {
      clearTimeout(bot.timer)
      if (bot.order && bot.order.status === 'PROCESSING') {
        bot.order.status = 'PENDING'
      }
    }
    bot.order = null
    this.logger.log(`Bot #${bot.id} removed`)
    this.bots.splice(index, 1)
    this.dispatch()
  }

  nextOrder() {
    const pending = this.orders.filter(o => o.status === 'PENDING')
    if (!pending.length) return null
    pending.sort((a, b) => {
      if (a.type === 'VIP' && b.type === 'Normal') return -1
      if (a.type === 'Normal' && b.type === 'VIP') return 1
      return a.id - b.id
    })
    return pending[0]
  }

  getIdleBot() {
    return this.bots.find(b => b.status === 'IDLE')
  }

  assign(bot, order) {
    bot.status = 'PROCESSING'
    bot.order = order
    order.status = 'PROCESSING'

    this.logger.log(
      `Bot #${bot.id} picked up ${order.type} Order #${order.id}`
    )

    bot.timer = setTimeout(() => {
      order.status = 'COMPLETED'
      bot.status = 'IDLE'
      bot.order = null
      bot.timer = null

      this.logger.log(
        `Bot #${bot.id} completed Order #${order.id}`
      )

      this.dispatch()
    }, this.processTime)
  }

  dispatch() {
    let bot = this.getIdleBot()
    let order = this.nextOrder()

    while (bot && order) {
      this.assign(bot, order)

      bot = this.getIdleBot()
      order = this.nextOrder()
    }
  }
}

module.exports = Processor