import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

describe("order", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks() // restores all implemented mock back to original
    vi.resetModules() // allows modules to be reevaluated when reimported. Top-level imports cannot be re-evaluated.
  })

  it("should add new order", async () => {
    const OrderService = await import("../src/modules/order/order.service.js")
    vi.spyOn(OrderService, "assignOrder").mockImplementation(async () => {})

    let orders = await OrderService.getPendingOrders()
    const initialTotalPendingOrders = orders.length
    await OrderService.submitOrder()
    orders = await OrderService.getPendingOrders()
    const currentTotalPendingOrders = orders.length

    expect(currentTotalPendingOrders).toBe(initialTotalPendingOrders + 1)
    expect(orders[0].isVip).toBe(false)
  })

  it("should add new vip order", async () => {
    const OrderService = await import("../src/modules/order/order.service.js")
    vi.spyOn(OrderService, "assignOrder").mockImplementation(async () => {})

    let orders = await OrderService.getPendingOrders()
    const initialTotalPendingOrders = orders.length
    await OrderService.submitVipOrder()
    orders = await OrderService.getPendingOrders()
    const currentTotalPendingOrders = orders.length

    expect(currentTotalPendingOrders).toBe(initialTotalPendingOrders + 1)
    expect(orders[0].isVip).toBe(true)
  })

  it("should add new vip order in the correct order", async () => {
    const OrderService = await import("../src/modules/order/order.service.js")
    vi.spyOn(OrderService, "assignOrder").mockImplementation(async () => {})

    await OrderService.submitOrder()
    await OrderService.submitOrder()
    await OrderService.submitVipOrder()
    await OrderService.submitOrder()

    let orders = await OrderService.getPendingOrders()
    const initialTotalPendingOrders = orders.length
    await OrderService.submitVipOrder()
    orders = await OrderService.getPendingOrders()
    const currentTotalPendingOrders = orders.length

    expect(currentTotalPendingOrders).toBe(initialTotalPendingOrders + 1) // check new order is added
    expect(orders[0].isVip).toBe(true) // check 1st order belongs to vip
    expect(orders[1].isVip).toBe(true) // check 2nd order belongs to vip
    expect(orders[1].id > orders[0].id).toBe(true) // check whether 2nd order running number is after 1st order
  })

  it("should assign order in ordered sequence", async () => {
    const OrderService = await import("../src/modules/order/order.service.js")
    const BotService = await import('../src/modules/bot/bot.service.js')
    vi.spyOn(OrderService, "processOrder").mockImplementation(async () => {})

    await OrderService.submitOrder()
    await OrderService.submitOrder()
    await OrderService.submitVipOrder()
    await OrderService.submitOrder()
    await OrderService.submitVipOrder()

    await BotService.addBot()
    await BotService.addBot()
    await BotService.addBot()

    const bots = await BotService.getBots()

    expect(bots.length).toBe(3) 
    expect(bots[0].assignedOrder?.isVip).toBe(true)
    expect(bots[1].assignedOrder?.isVip).toBe(true)
    expect(bots[2].assignedOrder?.isVip).toBe(false)
  })

  it("order should be processed and mark as completed once being assigned to bot", async () => {
    const OrderService = await import("../src/modules/order/order.service.js")
    const BotService = await import('../src/modules/bot/bot.service.js')

    await OrderService.submitOrder()
    await OrderService.submitOrder()
    await OrderService.submitVipOrder()
    await OrderService.submitOrder()
    await OrderService.submitVipOrder()

    await BotService.addBot()
    await BotService.addBot()
    await BotService.addBot()

    let completedOrders = await OrderService.getCompletedOrders()
    // Order should be assigned but not completed yet
    expect(completedOrders.length).toBe(0)

    // Fast-forward 10 seconds
    await vi.advanceTimersByTimeAsync(10000)

    completedOrders = await OrderService.getCompletedOrders()
    const bots = await BotService.getBots()

    expect(completedOrders.length).toBe(3)
    expect(completedOrders.every(order => order.status === 'COMPLETE')).toBe(true)
    expect(bots[0].status).toBe("BUSY") 
    expect(bots[1].status).toBe("BUSY") 
  })

  it("should assign any assigned order on deleted bot back to pending list", async () => {
    const OrderService = await import("../src/modules/order/order.service.js")
    const BotService = await import('../src/modules/bot/bot.service.js')

    await OrderService.submitOrder()
    await OrderService.submitOrder()
    await OrderService.submitVipOrder()

    await BotService.addBot()
    await BotService.addBot()
    await BotService.addBot()

    await vi.advanceTimersByTimeAsync(5000)

    let orders = await OrderService.getPendingOrders()
    let pendingOrderCount = orders.length
    expect(pendingOrderCount).toBe(0)

    let bots = await BotService.getBots()
    const orderForReassign = bots[bots.length-1].assignedOrder!
    await BotService.deleteBot()

    orders = await OrderService.getPendingOrders()
    pendingOrderCount = orders.length
    bots = await BotService.getBots()

    expect(bots.length).toBe(2) // 1 deleted, only 2 bots should remained
    expect(pendingOrderCount).toBe(1) // assigned order should exist in pending order list
    expect(orders[0].id === orderForReassign.id).toBe(true) 
  })
})
