import { Bot } from '../../interface/bot'
import { Order } from '../../interface/order'
import { logLine } from '../../utils/logger'
import { OrderQueue } from '../order/order-queue'

const PROCESS_MS = 10_000

export class BotManager {
  private bots: Bot[] = []
  private nextBotId = 1

  constructor(private queue: OrderQueue) {}

  createBot() {
    const bot: Bot = { id: this.nextBotId++, state: 'IDLE' }
    this.bots.push(bot)
    logLine(`+ Bot #${bot.id} created (IDLE)`)
    this.trySchedule(bot)
    return bot
  }

  deleteBot() {
    const bot = this.bots.pop()
    if (!bot) {
      logLine(`- Bot requested but none exist`)
      return
    }
    if (bot.state === 'BUSY' && bot.current) {
      clearTimeout(bot.current.timer)
      this.queue.requeue(bot.current.order)
      logLine(`- Bot #${bot.id} destroyed while processing order #${bot.current.order.id}`)
    } else {
      logLine(`- Bot #${bot.id} destroyed (was IDLE)`)
    }
  }

  private trySchedule(bot: Bot) {
    if (bot.state !== 'IDLE') return
    
    const order = this.queue.dequeue()
    if (order) {
      this.startProcessing(bot, order)
    } else {
      logLine(`Bot #${bot.id} is now IDLE - No pending orders`)
    }
  }

  private startProcessing(bot: Bot, order: Order) {
    bot.state = 'BUSY'
    logLine(`Bot #${bot.id} START order #${order.id} (${order.type})`)

    const timer = setTimeout(() => {
      logLine(`Bot #${bot.id} COMPLETE order #${order.id} -> COMPLETE`)
      bot.state = 'IDLE'
      delete bot.current
      this.trySchedule(bot) // pick up next if available
    }, PROCESS_MS)

    bot.current = { order, timer, startedAt: Date.now() }
  }

  scheduleAll() {
    for (const bot of this.bots) {
      if (bot.state === 'IDLE') this.trySchedule(bot)
    }
  }

  botCount() {
    return this.bots.length
  }

  busyCount() {
    return this.bots.filter((b) => b.state === 'BUSY').length
  }
}
