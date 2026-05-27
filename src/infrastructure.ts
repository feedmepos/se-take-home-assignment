import type { IDataPort, Order, Bot } from './domain'

export class InMemoryPort implements IDataPort {
  private _orders: Order[] = []
  private _bots: Bot[] = []
  private _nextOrderId = 1
  private _nextBotId = 1

  async getOrders() { return this._orders }
  async getBots() { return this._bots }
  async getNextOrderId() { return this._nextOrderId++ }
  async getNextBotId() { return this._nextBotId++ }

  async addOrder(order: Order) { this._orders.push(order) }
  async removeOrder(id: number) { this._orders = this._orders.filter((o) => o.id !== id) }
  async updateOrder(id: number, patch: Partial<Order>) {
    const o = this._orders.find((o) => o.id === id)
    if (o) Object.assign(o, patch)
  }

  async addBot(bot: Bot) { this._bots.push(bot) }
  async removeBot(id: number) { this._bots = this._bots.filter((b) => b.id !== id) }
  async updateBot(id: number, patch: Partial<Bot>) {
    const b = this._bots.find((b) => b.id === id)
    if (b) Object.assign(b, patch)
  }
}
