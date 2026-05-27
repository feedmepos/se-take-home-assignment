import { ORDER_PROCESSING_MS } from './scheduler'
import type { Bot, Order } from './types'

/**
 * Finds the order currently assigned to a bot.
 *
 * @example
 * const order = getBotOrder(bot, state.orders)
 */
export const getBotOrder = (bot: Bot, orders: Order[]) =>
  orders.find((order) => order.id === bot.currentOrderId)

/**
 * Calculates the remaining processing time for a bot in milliseconds.
 *
 * @example
 * getRemainingMs(bot, Date.now()) // 7500
 */
export const getRemainingMs = (bot: Bot, now: number) => {
  if (bot.status !== 'PROCESSING' || typeof bot.startedAt !== 'number') {
    return 0
  }

  return Math.max(0, ORDER_PROCESSING_MS - (now - bot.startedAt))
}

/**
 * Converts elapsed bot work into a progress percentage for the UI bar.
 *
 * @example
 * getProgressPercent(bot, bot.startedAt + 5000) // 50
 */
export const getProgressPercent = (bot: Bot, now: number) => {
  if (bot.status !== 'PROCESSING' || typeof bot.startedAt !== 'number') {
    return 0
  }

  const elapsed = Math.min(ORDER_PROCESSING_MS, Math.max(0, now - bot.startedAt))
  return Math.round((elapsed / ORDER_PROCESSING_MS) * 100)
}

/**
 * Formats a millisecond duration as a compact remaining-seconds label.
 *
 * @example
 * formatRemainingSeconds(9500) // "10s"
 */
export const formatRemainingSeconds = (remainingMs: number) =>
  `${Math.ceil(remainingMs / 1_000).toString().padStart(2, '0')}s`
