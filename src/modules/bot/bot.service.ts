import * as OrderService from "../order/order.service.js"
import { randomUUID } from "crypto"
import type { Bot } from "./bot.js"

const bots: Bot[] = []

export async function addBot() {
    const bot: Bot = {
        id: randomUUID(),
        status: "IDLE"
    }
    bots.push(bot)
    console.log(`New bot ${bot.id} added`)

    await OrderService.assignOrder()
}

export async function deleteBot() {
    // delete last bot
    const deletedBot = bots.pop()

    if (!deletedBot) {
        return
    }

    console.log(`Last bot ${deletedBot.id} deleted`)

    if (deletedBot?.assignedOrder) {
        clearTimeout(deletedBot.orderCompletionJobId)
        if (deletedBot.assignedOrder.isVip) {
            await OrderService.submitVipOrder(deletedBot.assignedOrder)
        } else {
            await OrderService.submitOrder(deletedBot.assignedOrder)
        }
    }
}

export async function getBots(status?: string) {
    if (!status) {
        return bots
    }
    return bots.filter((bot) => bot.status === status)
}