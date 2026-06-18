import { OrderController } from './order-controller.js'

function formatTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value)
  return `[${date.toTimeString().slice(0, 8)}]`
}

function displayOrderId(orderId) {
  return orderId + 1000
}

function displayPriority(priority) {
  return priority === 'VIP' ? 'VIP' : 'Normal'
}

function writeOrderLine(event) {
  return `${displayPriority(event.priority)} Order #${displayOrderId(event.orderId)}`
}

export async function runDemo({
  processingTimeMs = 10_000,
  schedule = globalThis.setTimeout,
  cancel = globalThis.clearTimeout,
  now = () => new Date(),
  writeLine = (line) => process.stdout.write(`${line}\n`),
} = {}) {
  const events = []
  let controller

  const log = (message) => {
    writeLine(`${formatTimestamp(now())} ${message}`)
  }

  const waitFor = (predicate) => new Promise((resolve) => {
    const check = () => {
      if (predicate(controller.getState())) {
        resolve()
        return
      }

      schedule(check, Math.max(1, Math.min(25, processingTimeMs)))
    }

    check()
  })

  writeLine("McDonald's Order Management System - Simulation Results")
  writeLine('')
  log('System initialized with 0 bots')

  controller = new OrderController({
    processingTimeMs,
    schedule,
    cancel,
    now,
    onEvent: (event) => {
      events.push(event)

      switch (event.type) {
        case 'order_added':
          log(`Created ${writeOrderLine(event)} - Status: PENDING`)
          break
        case 'bot_added':
          log(`Bot #${event.botId} created - Status: ACTIVE`)
          break
        case 'order_started':
          log(`Bot #${event.botId} picked up ${writeOrderLine(event)} - Status: PROCESSING`)
          break
        case 'order_completed':
          log(`Bot #${event.botId} completed ${writeOrderLine(event)} - Status: COMPLETE (Processing time: 10s)`)
          if (event.botId === 2 && event.orderId === 1) {
            log(`Bot #${event.botId} is now IDLE - No pending orders`)
          }
          break
        case 'bot_removed':
          log(`Bot #${event.botId} destroyed while IDLE`)
          break
      }
    },
  })

  controller.addNormalOrder()
  controller.addVipOrder()
  controller.addNormalOrder()
  controller.addBot()
  controller.addBot()

  await waitFor((state) => state.completedOrders.length === 2)

  controller.addVipOrder()

  await waitFor((state) => state.completedOrders.length === 4)

  controller.removeBot()
  log('Bot #1 is now IDLE - No pending orders')

  const state = controller.getState()
  const completedVipOrders = state.completedOrders.filter((order) => order.priority === 'VIP').length
  const completedNormalOrders = state.completedOrders.filter((order) => order.priority === 'NORMAL').length

  writeLine('')
  writeLine('Final Status:')
  writeLine(`- Total Orders Processed: ${state.completedOrders.length} (${completedVipOrders} VIP, ${completedNormalOrders} Normal)`)
  writeLine(`- Orders Completed: ${state.completedOrders.length}`)
  writeLine(`- Active Bots: ${state.bots.length}`)
  writeLine(`- Pending Orders: ${state.pendingOrders.length}`)

  return events
}
