'use strict'

class Order {
  constructor(id, type) {
    this.id = id
    this.type = type          // 'normal' | 'vip'
    this.status = 'pending'   // 'pending' | 'processing' | 'completed'
    this.botId = null
    this.createdAt = new Date()
    this.completedAt = null
  }
}

class OrderManager {
  constructor() {
    this.queue = []      // pending + processing orders, VIPs before normals
    this.completed = []
    this._counter = 0
  }

  addNormalOrder() {
    const order = new Order(++this._counter, 'normal')
    this.queue.push(order)
    return order
  }

  addVIPOrder() {
    const order = new Order(++this._counter, 'vip')
    // Insert immediately after the last existing VIP (before any normals)
    let lastVIPIdx = -1
    this.queue.forEach((o, i) => { if (o.type === 'vip') lastVIPIdx = i })
    this.queue.splice(lastVIPIdx + 1, 0, order)
    return order
  }

  getNextPendingOrder() {
    return this.queue.find(o => o.status === 'pending') || null
  }

  markProcessing(orderId, botId) {
    const order = this.queue.find(o => o.id === orderId)
    if (!order) return null
    order.status = 'processing'
    order.botId = botId
    return order
  }

  completeOrder(orderId) {
    const idx = this.queue.findIndex(o => o.id === orderId)
    if (idx < 0) return null
    const order = this.queue.splice(idx, 1)[0]
    order.status = 'completed'
    order.completedAt = new Date()
    this.completed.push(order)
    return order
  }

  returnOrder(order) {
    // Remove from current position first (it stays in queue with status 'processing')
    const idx = this.queue.findIndex(o => o.id === order.id)
    if (idx >= 0) this.queue.splice(idx, 1)

    order.status = 'pending'
    order.botId = null

    if (order.type === 'vip') {
      let lastVIPIdx = -1
      this.queue.forEach((o, i) => { if (o.type === 'vip') lastVIPIdx = i })
      this.queue.splice(lastVIPIdx + 1, 0, order)
    } else {
      this.queue.push(order)
    }
    return order
  }

  getQueueSnapshot() {
    return this.queue.map(o => ({ id: o.id, type: o.type, status: o.status, botId: o.botId }))
  }

  getCompletedSnapshot() {
    return this.completed.map(o => ({ id: o.id, type: o.type, completedAt: o.completedAt }))
  }
}

module.exports = { OrderManager, Order }
