import { OrderController } from './modules/order/order.controller'
import { closeLogger, logLine } from './utils/logger'

async function main() {
  logLine('=== McD Bot Demo Started ===')
  const oc = new OrderController()

  setTimeout(() => {
    oc.createOrder('NORMAL')
  }, 1000)

  setTimeout(() => {
    oc.createOrder('VIP')
    oc.createOrder('NORMAL')
  }, 2000)

  setTimeout(() => {
    oc.createBot()
  }, 3000)

  setTimeout(() => {
    oc.createBot()
  }, 4000)

  setTimeout(() => {
    oc.createOrder('VIP')
  }, 15000)

  // t=8s remove bot
  setTimeout(() => {
    oc.removeBot()
  }, 25100)

  // t=20s finish
  setTimeout(() => {
    logLine('=== Demo Finished ===')
    closeLogger()
    setTimeout(() => process.exit(0), 200) // ensure flush
  }, 26000)
}

main().catch((err) => {
  process.exit(1)
})
