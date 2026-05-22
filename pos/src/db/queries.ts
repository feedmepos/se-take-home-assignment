import { getDb } from './index'
import { users, orders, bots, orderNumbers } from './schema'
import { eq, and, isNull, desc, sql } from 'drizzle-orm'
import type { User, Order, Bot, NewUser, NewOrder, NewBot } from './schema'

// ============================================================================
// USER QUERIES
// ============================================================================

/**
 * Get user by username (excluding soft-deleted)
 */
export async function getUserByUsername(username: string): Promise<User | undefined> {
  const db = getDb()
  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.username, username), isNull(users.deletedAt)))
    .limit(1)
  return result[0]
}

/**
 * Get user by ID (excluding soft-deleted)
 */
export async function getUserById(id: string): Promise<User | undefined> {
  const db = getDb()
  const result = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
    .limit(1)
  return result[0]
}

/**
 * Get all users (excluding soft-deleted)
 */
export async function getAllUsers(): Promise<User[]> {
  const db = getDb()
  return await db
    .select()
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(desc(users.createdAt))
}

/**
 * Create a new user
 */
export async function createUser(user: NewUser): Promise<User> {
  const db = getDb()
  const result = await db.insert(users).values(user).returning()
  return result[0]
}

/**
 * Soft delete a user (preserves their orders)
 */
export async function deleteUser(id: string): Promise<void> {
  const db = getDb()
  await db
    .update(users)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, id))
}

// ============================================================================
// ORDER QUERIES
// ============================================================================

/**
 * Get all orders with VIP priority sorting
 * VIP orders come first, then Normal orders, each ordered by orderNumber
 */
export async function getAllOrders(): Promise<Order[]> {
  const db = getDb()
  return await db
    .select()
    .from(orders)
    .where(isNull(orders.deletedAt))
    .orderBy(
      sql<number>`
        case
          when ${orders.status} = 'PENDING' and ${orders.type} = 'VIP' then 0
          when ${orders.status} = 'PENDING' and ${orders.type} = 'NORMAL' then 1
          when ${orders.status} = 'PROCESSING' then 2
          else 3
        end
      `,
      sql<number>`case when ${orders.status} = 'PENDING' then ${orders.orderNumber} end`,
      desc(orders.createdAt),
    )
}

/**
 * Get order by ID (excluding soft-deleted)
 */
export async function getOrderById(id: string): Promise<Order | undefined> {
  const db = getDb()
  const result = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), isNull(orders.deletedAt)))
    .limit(1)
  return result[0]
}

/**
 * Get next order number (max + 1, or 1 if no orders)
 */
export async function getNextOrderNumber(): Promise<number> {
  const db = getDb()
  const result = await db
    .insert(orderNumbers)
    .values({})
    .returning({ id: orderNumbers.id })
  const orderNumber = result[0]?.id
  if (!orderNumber) {
    throw new Error('Failed to allocate order number')
  }
  return orderNumber
}

/**
 * Get pending orders (VIP first, then by orderNumber)
 */
export async function getPendingOrders(): Promise<Order[]> {
  const db = getDb()
  return await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.status, 'PENDING'),
        isNull(orders.deletedAt)
      )
    )
    .orderBy(
      sql<number>`case when ${orders.type} = 'VIP' then 0 else 1 end`,
      orders.orderNumber
    )
}

/**
 * Get processing orders
 */
export async function getProcessingOrders(): Promise<Order[]> {
  const db = getDb()
  return await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.status, 'PROCESSING'),
        isNull(orders.deletedAt)
      )
    )
    .orderBy(orders.createdAt)
}

/**
 * Get complete orders
 */
export async function getCompleteOrders(): Promise<Order[]> {
  const db = getDb()
  return await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.status, 'COMPLETE'),
        isNull(orders.deletedAt)
      )
    )
    .orderBy(desc(orders.completedAt))
}

/**
 * Create a new order
 */
export async function createOrder(order: NewOrder): Promise<Order> {
  const db = getDb()
  const result = await db.insert(orders).values(order).returning()
  return result[0]
}

/**
 * Update an order
 */
export async function updateOrder(id: string, updates: Partial<Omit<Order, 'id'>>): Promise<Order | undefined> {
  const db = getDb()
  const result = await db
    .update(orders)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(orders.id, id), isNull(orders.deletedAt)))
    .returning()
  return result[0]
}

/**
 * Soft delete an order
 */
export async function deleteOrder(id: string): Promise<void> {
  const db = getDb()
  await db
    .update(orders)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(orders.id, id))
}

// ============================================================================
// BOT QUERIES
// ============================================================================

/**
 * Get all bots (excluding soft-deleted)
 */
export async function getAllBots(): Promise<Bot[]> {
  const db = getDb()
  return await db
    .select()
    .from(bots)
    .where(isNull(bots.deletedAt))
    .orderBy(desc(bots.createdAt))
}

/**
 * Get bot by ID (excluding soft-deleted)
 */
export async function getBotById(id: string): Promise<Bot | undefined> {
  const db = getDb()
  const result = await db
    .select()
    .from(bots)
    .where(and(eq(bots.id, id), isNull(bots.deletedAt)))
    .limit(1)
  return result[0]
}

/**
 * Get idle bots
 */
export async function getIdleBots(): Promise<Bot[]> {
  const db = getDb()
  return await db
    .select()
    .from(bots)
    .where(
      and(
        eq(bots.status, 'IDLE'),
        isNull(bots.deletedAt)
      )
    )
    .orderBy(bots.createdAt)
}

/**
 * Create a new bot
 */
export async function createBot(bot: NewBot): Promise<Bot> {
  const db = getDb()
  const result = await db.insert(bots).values(bot).returning()
  return result[0]
}

/**
 * Update a bot
 */
export async function updateBot(id: string, updates: Partial<Omit<Bot, 'id'>>): Promise<Bot | undefined> {
  const db = getDb()
  const result = await db
    .update(bots)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(bots.id, id), isNull(bots.deletedAt)))
    .returning()
  return result[0]
}

/**
 * Soft delete a bot (returns in-flight order to PENDING)
 */
export async function deleteBot(id: string): Promise<void> {
  const db = getDb()

  // Get bot before soft delete to return order to PENDING
  const bot = await getBotById(id)

  if (bot && bot.currentOrderId) {
    // Return the order to PENDING
    await db
      .update(orders)
      .set({
        status: 'PENDING',
        botId: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(orders.id, bot.currentOrderId),
          eq(orders.status, 'PROCESSING')
        )
      )
  }

  // Soft delete the bot
  await db
    .update(bots)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(bots.id, id))
}
