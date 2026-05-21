const Logger = require('./src/logger')
const Bot = require('./src/models/bot')
const Order = require('./src/models/order')
const Processor = require('./src/services/processor')

const logger = new Logger()
const processor = new Processor(logger)

processor.addBot(new Bot(1))
processor.addBot(new Bot(2))

processor.addOrder(new Order(1001, 'Normal'))
processor.addOrder(new Order(1002, 'VIP'))
processor.addOrder(new Order(1003, 'Normal'))
processor.addOrder(new Order(1004, 'VIP'))

setTimeout(() => {
  processor.removeBot(2)
}, 12000)

setTimeout(() => {
  const totalOrders = processor.orders.length;
  const vipCount = processor.orders.filter(o => o.type === 'VIP').length;
  const normalCount = processor.orders.filter(o => o.type === 'Normal').length;
  const completedCount = processor.orders.filter(o => o.status === 'COMPLETED').length;
  const pendingCount = processor.orders.filter(o => o.status === 'PENDING').length;

  logger.log('\nFinal Status:')
  logger.log(`- Total Orders Processed: ${totalOrders} (${vipCount} VIP, ${normalCount} Normal)`)
  logger.log(`- Orders Completed: ${completedCount}`)
  logger.log(`- Active Bots: ${processor.bots.length}`)
  logger.log(`- Pending Orders: ${pendingCount}`)

  process.exit(0)
}, 31000)