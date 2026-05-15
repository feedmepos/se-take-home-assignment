import { describe, it, expect, vi, afterEach } from 'vitest'

describe('bot', () => {
  afterEach(() => {
    vi.restoreAllMocks() // restores all implemented mock back to original
    vi.resetModules() // allows modules to be reevaluated when reimported. Top-level imports cannot be re-evaluated.
  })

  it('should add new bot', async () => {
    // dynamic import modules 
    const BotService = await import('../src/modules/bot/bot.service.js')
    const OrderService = await import('../src/modules/order/order.service.js')

    // mock assignOrder() to be an empty function to fully test on bot creation only in addBot()
    vi.spyOn(OrderService, 'assignOrder').mockImplementation(async () => {})

    let bots = await BotService.getBots("IDLE")
    const initialIdleBotCount = bots.length
    await BotService.addBot()
    bots = await BotService.getBots("IDLE")
    const currentIdleBotCount = bots.length

    expect(currentIdleBotCount).toBe(initialIdleBotCount + 1)
  })

  it('should delete latest bot', async () => {
    // dynamic import modules 
    const BotService = await import('../src/modules/bot/bot.service.js')
    const OrderService = await import('../src/modules/order/order.service.js')

    // create few bots and orders as start
    await BotService.addBot()
    await BotService.addBot()
    await BotService.addBot()

    await OrderService.submitOrder()
    await OrderService.submitOrder()
    await OrderService.submitOrder()

    vi.spyOn(OrderService, 'submitOrder').mockImplementation(async () => {})
    vi.spyOn(OrderService, 'submitVipOrder').mockImplementation(async () => {})

    let bots = await BotService.getBots()
    const initialTotalBotCount = bots.length
    await BotService.deleteBot()
    bots = await BotService.getBots()
    const currentTotalBotCount = bots.length

    // Check bot deleted
    expect(currentTotalBotCount).toBe(initialTotalBotCount - 1)
  })

  it('should get all bots', async () => {
    const BotService = await import('../src/modules/bot/bot.service.js')

    // create few bots and orders as start
    await BotService.addBot()
    await BotService.addBot()
    await BotService.addBot()

    let bots = await BotService.getBots()

    // Check whether total 3 bots are created
    expect(bots.length).toBe(3)
  })

  it('should get bots by status', async () => {
    const BotService = await import('../src/modules/bot/bot.service.js')
    const OrderService = await import('../src/modules/order/order.service.js')

    // create few bots and orders as start
    await BotService.addBot()
    await BotService.addBot()
    await BotService.addBot()

    await OrderService.submitOrder()
    await OrderService.submitOrder()

    let bots = await BotService.getBots("BUSY")

    // Check whether total 2 bots are busy
    expect(bots.length).toBe(2)
  })

  it('should add new bot which proceed to take on any available pending order', async () => {
    // dynamic import modules 
    const BotService = await import('../src/modules/bot/bot.service.js')
    const OrderService = await import('../src/modules/order/order.service.js')

    await BotService.addBot()
    await BotService.addBot()
    await BotService.addBot()

    await OrderService.submitOrder()
    await OrderService.submitOrder()
    await OrderService.submitVipOrder()
    await OrderService.submitOrder()

    await BotService.addBot()

    const bots = await BotService.getBots()

    // expect latest bot added to be busy 
    expect(bots[bots.length-1].status).toBe("BUSY")
    expect(bots[bots.length-1].assignedOrder).toBeDefined()
  })
})

