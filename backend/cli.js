import { OrderController } from './order-controller.js'

// Result output must include timestamps in HH:MM:SS format to satisfy the
// assignment and the GitHub Actions verification workflow.
function formatTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value)
  return date.toTimeString().slice(0, 8)
}

// Orders are rendered in a short human-readable form so queue snapshots remain
// compact even when a single log line includes pending, completed, and bot state.
function formatOrder(order) {
  return `#${order.id}-${order.priority}`
}

// Bots show either idle status or the specific order they are working on.
// This makes it easy to understand parallel processing from result.txt alone.
function formatBot(bot) {
  if (bot.currentOrder) {
    return `bot-${bot.id}:BUSY(${formatOrder(bot.currentOrder)})`
  }

  return `bot-${bot.id}:${bot.status}`
}

// Every event line includes a full state snapshot so the output can serve as a
// self-contained execution trace instead of requiring a separate debugger.
function formatState(state) {
  const pending = state.pendingOrders.map(formatOrder).join(', ') || '-'
  const completed = state.completedOrders.map(formatOrder).join(', ') || '-'
  const bots = state.bots.map(formatBot).join(', ') || '-'

  return `pending=[${pending}] completed=[${completed}] bots=[${bots}]`
}

// Event descriptions translate internal controller events into readable CLI text.
function describeEvent(event) {
  switch (event.type) {
    case 'order_added':
      return `accepted ${formatOrder({ id: event.orderId, priority: event.priority })}`
    case 'bot_added':
      return `added bot-${event.botId}`
    case 'order_started':
      return `bot-${event.botId} started ${formatOrder({ id: event.orderId, priority: event.priority })}`
    case 'order_completed':
      return `bot-${event.botId} completed ${formatOrder({ id: event.orderId, priority: event.priority })}`
    case 'order_requeued':
      return `bot-${event.botId} requeued ${formatOrder({ id: event.orderId, priority: event.priority })}`
    case 'bot_removed':
      return `removed bot-${event.botId}`
    default:
      return event.type
  }
}

// The CI flow does not require an interactive CLI, so the backend runs a fixed demo
// scenario that intentionally exercises the assignment's critical behaviors:
// - normal order creation
// - VIP priority insertion
// - immediate bot pickup
// - removing a busy bot and re-queueing its order
// - continuing until all work is complete
export async function runDemo({
  processingTimeMs = 10_000,
  schedule = globalThis.setTimeout,
  cancel = globalThis.clearTimeout,
  now = () => new Date(),
  writeLine = (line) => process.stdout.write(`${line}\n`),
} = {}) {
  const events = []
  const controller = new OrderController({
    processingTimeMs,
    schedule,
    cancel,
    now,
    onEvent: (event) => {
      events.push(event)
      writeLine(`${formatTimestamp(event.timestamp)} ${describeEvent(event)} | ${formatState(event.state)}`)
    },
  })

  // This scripted sequence is designed to touch each important requirement with a
  // minimal number of commands while still producing meaningful result output.
  controller.addNormalOrder()
  controller.addNormalOrder()
  controller.addVipOrder()
  controller.addBot()
  controller.addBot()
  controller.addVipOrder()
  controller.removeBot()
  controller.addBot()

  // Wait until there are no busy bots and no pending orders left.
  // Polling is sufficient here because the CLI is only a thin demo runner and the
  // controller itself already owns the real scheduling logic.
  await new Promise((resolve) => {
    const waitForCompletion = () => {
      const state = controller.getState()
      const activeBots = state.bots.some((bot) => bot.status === 'BUSY')
      if (!activeBots && state.pendingOrders.length === 0) {
        resolve()
        return
      }

      schedule(waitForCompletion, Math.max(1, Math.min(25, processingTimeMs)))
    }

    waitForCompletion()
  })

  return events
}
