import * as OrderService from "./modules/order/order.service.js"
import * as BotService from "./modules/bot/bot.service.js"

async function run() {
    console.log('START ORDER MANAGEMENT SYSTEM')
    console.log('=============================')

    const functions = ["addBot", "deleteBot", "submitOrder", "submitVipOrder"]

    let addBotCount = Math.floor(Math.random() * 10) + 1
    let deleteBotCount = Math.floor(Math.random() * 10) + 1
    let orderCount = Math.floor(Math.random() * 15) + 1
    let vipOrderCount = Math.floor(Math.random() * 15) + 1
    let totalCalls = addBotCount + deleteBotCount + orderCount + vipOrderCount
    let totalDeletedBot = deleteBotCount

    // load 5 bots initially
    await BotService.addBot()
    await BotService.addBot()
    await BotService.addBot()
    await BotService.addBot()
    await BotService.addBot()


    while (totalCalls) {
        const randomIndex = Math.floor(Math.random() * functions.length);
        const action = functions[randomIndex];

        switch (action) {
            case "addBot":
                await BotService.addBot()
                addBotCount--
                if (addBotCount == 0) {
                    functions.splice(functions.indexOf("addBot"), 1)
                }
                break
            
            case "deleteBot":
                await BotService.deleteBot()
                deleteBotCount--
                if (deleteBotCount == 0) {
                    functions.splice(functions.indexOf("deleteBot"), 1)
                }
                break

            case "submitOrder":
                await OrderService.submitOrder()
                orderCount--
                if (orderCount == 0) {
                    functions.splice(functions.indexOf("submitOrder"), 1)
                }
                break

            case "submitVipOrder":
                await OrderService.submitVipOrder()
                vipOrderCount--
                if (vipOrderCount == 0) {
                    functions.splice(functions.indexOf("submitVipOrder"), 1)
                }
                break
        }

        totalCalls--
    }

    process.on('beforeExit', async () => {
        let summary = '\n\nSUMMARY\n=======\n'

        const bots = await BotService.getBots()
        summary += `Total Bots Remaining: ${bots.length}\n`
        summary += `Total Bots (Deleted): ${totalDeletedBot}\n`

        const completedOrders = await OrderService.getCompletedOrders()
        summary += `Total Normal Orders Completed: ${completedOrders.filter(order => !order.isVip).length}\n`
        summary += `Total VIP Orders Completed: ${completedOrders.filter(order => order.isVip).length}\n`

        console.log(summary)
    })
}

run()