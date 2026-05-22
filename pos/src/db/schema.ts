import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// Users table with soft delete support
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // UUID7
  username: text('username').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['NORMAL', 'VIP', 'MANAGER', 'BOT'] }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
})

// Orders table with soft delete and foreign keys
export const orders = sqliteTable(
  'orders',
  {
    id: text('id').primaryKey(), // UUID7
    orderNumber: integer('order_number').notNull(),
    type: text('type', { enum: ['NORMAL', 'VIP'] }).notNull(),
    status: text('status', { enum: ['PENDING', 'PROCESSING', 'COMPLETE'] }).notNull(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    botId: text('bot_id').references(() => bots.id, { onDelete: 'set null' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
    processingStartedAt: integer('processing_started_at', { mode: 'timestamp' }),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  },
  (table) => ({
    orderNumberActiveIdx: uniqueIndex('orders_order_number_active')
      .on(table.orderNumber)
      .where(sql`${table.deletedAt} is null`),
    processingBotActiveIdx: uniqueIndex('orders_processing_bot_active')
      .on(table.botId)
      .where(
        sql`${table.status} = 'PROCESSING' and ${table.deletedAt} is null and ${table.botId} is not null`,
      ),
  }),
)

// Order number sequence table (auto-incrementing)
export const orderNumbers = sqliteTable('order_numbers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
})

// Bots table with soft delete support
export const bots = sqliteTable('bots', {
  id: text('id').primaryKey(), // UUID7
  status: text('status', { enum: ['IDLE', 'PROCESSING'] }).notNull(),
  currentOrderId: text('current_order_id').references(() => orders.id, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  deletedAt: integer('deleted_at', { mode: 'timestamp' }),
})

// Distributed lock table for preventing concurrent resume operations
// Uses optimistic locking with expiry to prevent thundering herd on GET /api/orders
export const resumeLocks = sqliteTable('resume_locks', {
  id: text('id').primaryKey(), // Lock name (e.g., 'resume_processing')
  lockedAt: integer('locked_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
})

// Types for TypeScript
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert
export type Bot = typeof bots.$inferSelect
export type NewBot = typeof bots.$inferInsert
export type ResumeLock = typeof resumeLocks.$inferSelect
export type NewResumeLock = typeof resumeLocks.$inferInsert
