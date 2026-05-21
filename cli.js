const readline = require('readline')

const Processor = require('./src/services/processor')
const Bot = require('./src/models/bot')
const Order = require('./src/models/order')
const Logger = require('./src/logger')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const logger = new Logger()
const processor = new Processor(logger)

let orderId = 1000
let botId = 1

console.log("McDonald's Order Management CLI")

function menu() {
  console.log('\nChoose option:')
  console.log('1 - Add Order')
  console.log('2 - Add Bot')
  console.log('3 - Remove Bot')
  console.log('4 - Exit')

  rl.question('> ', handleInput)
}

function handleInput(input) {
  switch (input.trim()) {

    case '1':
      rl.question('Order type (VIP/Normal): ', type => {

        type = type.trim().toUpperCase()

        if (type !== 'VIP' && type !== 'NORMAL') {
          console.log('Invalid order type. Please enter VIP or Normal.')
          return menu()
        }

        orderId++

        const order = new Order(
          orderId,
          type === 'VIP' ? 'VIP' : 'Normal'
        )

        processor.addOrder(order)

        console.log(`Order #${orderId} added`)
        menu()
      })
      break

    case '2':
      const bot = new Bot(botId++)
      processor.addBot(bot)
      menu()
      break

    case '3':
      rl.question('Bot ID to remove: ', id => {

        const botIdNum = parseInt(id)

        if (isNaN(botIdNum)) {
          console.log('Invalid bot id')
          return menu()
        }

        processor.removeBot(botIdNum)
        menu()
      })
      break

    case '4':
      console.log('Exiting...')
      rl.close()
      break

    default:
      console.log('Invalid option')
      menu()
  }
}

menu()