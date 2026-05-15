import type { Bot } from "../bot/bot.js"
import type { Order } from "./order.js"
import * as BotService from "../bot/bot.service.js"

const pendingOrders: Order[] = []
const completedOrders: Order[] = []

let runningNumber = 1

export async function submitOrder(order?: Order) {
    if (!order) {
        order = {
            id: `#${String(runningNumber).padStart(5, '0')}`,
            status: "PENDING",
            isVip: false
        }
        runningNumber++
    }
    
    pendingOrders.push(order)
    console.log(`Order ${order.id} submitted at ${new Date().toLocaleString('sv-SE').replace('T', ' ')}`) // add timestamp
    await assignOrder()
}

export async function submitVipOrder(order?: Order) {
    if (!order) {
        order = {
            id: `#${String(runningNumber).padStart(5, '0')}`,
            status: "PENDING",
            isVip: true
        }
        runningNumber++
    }

    const index = pendingOrders.findIndex(order => !order.isVip )

    if (index === -1) {
        pendingOrders.push(order)
    } else {
        pendingOrders.splice(index, 0, order)
    }

    console.log(`VIP order ${order.id} submitted at ${new Date().toLocaleString('sv-SE').replace('T', ' ')}`) // add timestamp
    await assignOrder()
}

export async function assignOrder() {
    if (pendingOrders.length == 0) {
        return
    }

    const idleBots: Bot[] = await BotService.getBots("IDLE")

    idleBots.forEach((bot) => {
        const order = pendingOrders.shift()

        if (order) {
            bot.assignedOrder = order
            bot.status = "BUSY"
            processOrder(bot)

            console.log(`Order ${order.id} has been assigned to bot ${bot.id} at ${new Date().toLocaleString('sv-SE').replace('T', ' ')}, ${pendingOrders.length} pending orders remaining`) // add timestamp on bot start processing which order
        }
    })
}

export async function processOrder(bot: Bot) {
    const orderCompletionJobId = setTimeout(() => {
        completeOrder(bot)
    }, 10000)

    bot.orderCompletionJobId = orderCompletionJobId
}

export async function completeOrder(bot: Bot) {
    const order = bot.assignedOrder!
    order.status = "COMPLETE"
    completedOrders.push(order)
    bot.assignedOrder = undefined
    bot.status = "IDLE"
    console.log(`Order ${order.id} has been marked as completed at ${new Date().toLocaleString('sv-SE').replace('T', ' ')}`) // add timestamp on when order completed
    assignOrder()
}

export async function getPendingOrders() {
    return pendingOrders
}

export async function getCompletedOrders() {
    return completedOrders
}