#!/usr/bin/env node
'use strict'

/**
 * McDonald's Kitchen Chaos – Node.js CLI
 *
 * Interactive mode (default):
 *   node src/index.js [result.txt]
 *
 * Simulation mode (for GitHub Actions):
 *   node src/index.js --simulate [result.txt]
 *
 * Env:
 *   BOT_PROCESSING_TIME  milliseconds per order (default 10000)
 */

const readline = require('readline')
const path = require('path')
const { OrderManager } = require('./OrderManager')
const { BotManager }   = require('./BotManager')
const Logger           = require('./logger')

// ── Config ────────────────────────────────────────────────────────────────
const SIMULATE        = process.argv.includes('--simulate')
const PROCESSING_TIME = parseInt(process.env.BOT_PROCESSING_TIME, 10) || 10000
const outputArg       = process.argv.find(a => !a.startsWith('--') && a !== process.argv[0] && a !== process.argv[1])
const OUTPUT_FILE     = outputArg || path.resolve(process.cwd(), 'result.txt')

// ── Bootstrap ─────────────────────────────────────────────────────────────
const logger       = new Logger(OUTPUT_FILE)
const orderManager = new OrderManager()
const botManager   = new BotManager(orderManager, PROCESSING_TIME)

botManager.onOrderAssigned = (bot, order) => {
  logger.log(`Bot #${bot.id} started processing Order #${order.id} [${order.type.toUpperCase()}]`)
}
botManager.onOrderCompleted = (order, bot) => {
  logger.log(`✅ Order #${order.id} [${order.type.toUpperCase()}] completed by Bot #${bot.id}`)
  if (bot.currentOrder) {
    // _tryAssign already ran; assignment logged above via onOrderAssigned
  }
}

// ── Command processor ─────────────────────────────────────────────────────
function printStatus() {
  const queue = orderManager.getQueueSnapshot()
  const bots  = botManager.getBotsSnapshot()
  const done  = orderManager.getCompletedSnapshot()

  logger.separator('STATUS')
  logger.log(`Queue    (${queue.length}): ${
    queue.length
      ? queue.map(o => `#${o.id}[${o.type}/${o.status}]`).join(' → ')
      : 'empty'
  }`)
  logger.log(`Bots     (${bots.length}): ${
    bots.length
      ? bots.map(b => `Bot#${b.id}[${b.status}${b.orderId ? '/Ord#' + b.orderId : ''}]`).join('  ')
      : 'none'
  }`)
  logger.log(`Done     (${done.length}): ${
    done.length
      ? done.map(o => `#${o.id}[${o.type}]`).join(' ')
      : 'none yet'
  }`)
  logger.separator()
}

function handleCommand(raw) {
  const cmd = raw.trim().toLowerCase()
  switch (cmd) {
    case 'new_normal_order': {
      const o = orderManager.addNormalOrder()
      logger.log(`📋 New Normal Order #${o.id} → queue`)
      botManager.notifyNewOrder()
      break
    }
    case 'new_vip_order': {
      const o = orderManager.addVIPOrder()
      logger.log(`⭐ New VIP Order #${o.id} → queue (VIP priority)`)
      botManager.notifyNewOrder()
      break
    }
    case 'new_bot': {
      const b = botManager.addBot()
      if (!b.currentOrder) {
        logger.log(`🤖 Bot #${b.id} joined the kitchen (idle – no pending orders)`)
      }
      // assignment log is emitted by onOrderAssigned callback
      break
    }
    case 'del_bot': {
      const res = botManager.removeLatestBot()
      if (!res) {
        logger.log('⚠️  No bots to remove')
      } else if (res.returnedOrder) {
        logger.log(`🚪 Bot #${res.bot.id} left. Order #${res.returnedOrder.id} [${res.returnedOrder.type.toUpperCase()}] returned to queue`)
        botManager.notifyNewOrder()
      } else {
        logger.log(`🚪 Bot #${res.bot.id} left (was idle)`)
      }
      break
    }
    case 'status':
      printStatus()
      break
    case 'help':
      console.log('\nCommands: new_normal_order | new_vip_order | new_bot | del_bot | status | exit\n')
      break
    case 'exit':
    case 'quit':
      logger.separator('KITCHEN CLOSED')
      printStatus()
      process.exit(0)
      break
    default:
      if (cmd) logger.log(`❓ Unknown command: "${cmd}" (type 'help' for commands)`)
  }
}

// ── Simulation mode (GitHub Actions) ────────────────────────────────────────
if (SIMULATE) {
  const PT = PROCESSING_TIME
  // Timeline: each event fires at its stated ms offset from process start
  const events = [
    { at: 0,          cmd: 'status'            },
    { at: 200,        cmd: 'new_normal_order'  },
    { at: 400,        cmd: 'new_normal_order'  },
    { at: 600,        cmd: 'new_vip_order'     },   // jumps ahead of normals
    { at: 800,        cmd: 'new_bot'           },   // picks VIP first
    { at: 1000,       cmd: 'new_bot'           },   // picks normal #1
    { at: 1200,       cmd: 'status'            },   // queue: [normal#2]
    { at: PT + 1500,  cmd: 'new_normal_order'  },   // adds while bots finishing
    { at: PT + 1700,  cmd: 'new_vip_order'     },   // VIP jumps new normal
    { at: PT + 1900,  cmd: 'status'            },
    { at: PT * 2 + 2500, cmd: 'del_bot'        },   // remove latest bot
    { at: PT * 2 + 2700, cmd: 'status'         },
    { at: PT * 3 + 3500, cmd: 'status'         },   // should be all done
    { at: PT * 3 + 3700, cmd: 'exit'           },
  ]

  logger.separator('McDonald\'s Kitchen Chaos – SIMULATION MODE')
  logger.log(`Processing time per order: ${PT / 1000}s`)
  logger.log(`Output file: ${OUTPUT_FILE}`)
  logger.separator()

  events.forEach(({ at, cmd }) => {
    setTimeout(() => handleCommand(cmd), at)
  })

} else {
  // ── Interactive mode ───────────────────────────────────────────────────
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  logger.separator('McDonald\'s Kitchen Chaos – INTERACTIVE CLI')
  logger.log(`Processing time per order: ${PROCESSING_TIME / 1000}s`)
  logger.log(`Output file: ${OUTPUT_FILE}`)
  console.log('\nCommands: new_normal_order | new_vip_order | new_bot | del_bot | status | exit\n')

  rl.setPrompt('kitchen> ')
  rl.prompt()

  rl.on('line', line => {
    handleCommand(line)
    rl.prompt()
  })

  rl.on('close', () => {
    logger.separator('KITCHEN CLOSED')
    printStatus()
    process.exit(0)
  })
}
