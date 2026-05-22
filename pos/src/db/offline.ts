import Dexie, { Table } from 'dexie'

// Order types
export type OrderType = 'NORMAL' | 'VIP'
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETE'

// Offline order interface
export interface OfflineOrder {
  id?: number // Auto-increment primary key
  uuid: string // UUID7
  orderNumber: number
  type: OrderType
  status: OrderStatus
  userId: string | null
  botId: string | null
  createdAt: Date
  processingStartedAt: Date | null
  completedAt: Date | null
  updatedAt: Date
  deletedAt: Date | null
  synced: boolean // Track if synced to server
}

// Offline bot interface
export interface OfflineBot {
  id?: number
  uuid: string // UUID7
  status: 'IDLE' | 'PROCESSING'
  currentOrderId: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  synced: boolean
}

// Sync queue entry
export interface SyncOperation {
  id?: number
  type: 'CREATE' | 'UPDATE' | 'DELETE'
  entity: 'order' | 'bot'
  payload: any
  timestamp: number
  retryCount: number
  lastError?: string
}

/**
 * FeedMe Database - IndexedDB wrapper using Dexie
 * Provides offline-first storage for orders and bots
 */
export class FeedMeDatabase extends Dexie {
  orders!: Table<OfflineOrder, number>
  bots!: Table<OfflineBot, number>
  syncQueue!: Table<SyncOperation, number>

  constructor() {
    super('FeedMeDB')

    // Define tables and indexes
    this.version(1).stores({
      orders: '++id, uuid, orderNumber, type, status, [type+status], synced',
      bots: '++id, uuid, status, synced',
      syncQueue: '++id, type, entity, timestamp',
    })
  }
}

// Create database instance
export const db = new FeedMeDatabase()

// Database helper functions
export const offlineDb = {
  // Orders
  async getOrders() {
    return await db.orders.where('deletedAt').equals(null as any).toArray()
  },

  async getPendingOrders() {
    return await db.orders
      .where('status')
      .equals('PENDING')
      .and((order) => order.deletedAt === null)
      .toArray()
  },

  async getOrderById(uuid: string) {
    return await db.orders.get({ uuid })
  },

  async addOrder(order: Omit<OfflineOrder, 'id'>) {
    return await db.orders.add({
      ...order,
      synced: false,
    })
  },

  async updateOrder(uuid: string, updates: Partial<OfflineOrder>) {
    return await db.orders.where('uuid').equals(uuid).modify({
      ...updates,
      synced: false,
      updatedAt: new Date(),
    })
  },

  async deleteOrder(uuid: string) {
    return await db.orders.where('uuid').equals(uuid).modify({
      deletedAt: new Date(),
      synced: false,
    })
  },

  // Bots
  async getBots() {
    return await db.bots.where('deletedAt').equals(null as any).toArray()
  },

  async getBotById(uuid: string) {
    return await db.bots.get({ uuid })
  },

  async addBot(bot: Omit<OfflineBot, 'id'>) {
    return await db.bots.add({
      ...bot,
      synced: false,
    })
  },

  async updateBot(uuid: string, updates: Partial<OfflineBot>) {
    return await db.bots.where('uuid').equals(uuid).modify({
      ...updates,
      synced: false,
      updatedAt: new Date(),
    })
  },

  async deleteBot(uuid: string) {
    return await db.bots.where('uuid').equals(uuid).modify({
      deletedAt: new Date(),
      synced: false,
    })
  },

  // Sync queue
  async enqueueSyncOperation(operation: Omit<SyncOperation, 'id'>) {
    return await db.syncQueue.add({
      ...operation,
      retryCount: 0,
    })
  },

  async getPendingSyncOperations() {
    return await db.syncQueue.toArray()
  },

  async removeSyncOperation(id: number) {
    return await db.syncQueue.delete(id)
  },

  async incrementSyncRetry(id: number, error: string) {
    return await db.syncQueue.where('id').equals(id).modify((op) => {
      op.retryCount++
      op.lastError = error
    })
  },

  // Clear all data (for testing/logout)
  async clearAll() {
    await db.orders.clear()
    await db.bots.clear()
    await db.syncQueue.clear()
  },
}
