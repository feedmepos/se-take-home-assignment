import { createFileRoute } from '@tanstack/react-router'
import { Client } from '@upstash/qstash'
import { getDb } from '@/db'
import { orders, bots, orderNumbers, resumeLocks } from '@/db/schema'
import { and, eq, isNull, desc, sql, lt } from 'drizzle-orm'
import { uuidv7 } from '@/lib/uuid7'

const BOT_PROCESSING_DELAY_SECONDS = 10
const RESUME_LOCK_TTL_SECONDS = 30 // Lock expires after 30 seconds - prevents recovery from running too frequently
const RESUME_LOCK_ID = 'resume_processing'

/**
 * Try to acquire a distributed lock for resume operations.
 * Uses optimistic locking with expiry to prevent thundering herd.
 *
 * Returns true if lock acquired, false if another process holds it.
 */
const tryAcquireResumeLock = async (): Promise<boolean> => {
  const db = getDb()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + RESUME_LOCK_TTL_SECONDS * 1000)

  try {
    // Try to update existing lock if it's expired
    const updateResult = await db
      .update(resumeLocks)
      .set({
        lockedAt: now,
        expiresAt: expiresAt,
      })
      .where(
        and(
          eq(resumeLocks.id, RESUME_LOCK_ID),
          lt(resumeLocks.expiresAt, now), // Lock has expired
        ),
      )
      .returning()

    if (updateResult.length > 0) {
      return true // Lock acquired via update
    }

    // Check if lock exists and is still valid
    const existingLock = await db
      .select()
      .from(resumeLocks)
      .where(eq(resumeLocks.id, RESUME_LOCK_ID))
      .limit(1)

    if (existingLock.length > 0) {
      // Lock exists and not expired (otherwise update would have succeeded)
      return false
    }

    // Lock doesn't exist, try to insert
    await db.insert(resumeLocks).values({
      id: RESUME_LOCK_ID,
      lockedAt: now,
      expiresAt: expiresAt,
    })

    return true // Lock acquired via insert
  } catch (error) {
    // If insert fails due to constraint (race condition), another process won
    if (
      error instanceof Error &&
      /SQLITE_CONSTRAINT|UNIQUE constraint failed|constraint failed/i.test(
        error.message,
      )
    ) {
      return false
    }
    // For other errors, log and allow operation to proceed (fail-open)
    console.error('[ResumeLock] Unexpected error:', error)
    return true
  }
}

const getTimestampMs = (value: unknown) => {
  if (!value) return null
  if (value instanceof Date) return value.getTime()
  const parsed = new Date(value as string | number).getTime()
  return Number.isNaN(parsed) ? null : parsed
}

// Fix bots stuck in PROCESSING without an order
const recoverStuckBots = async () => {
  const db = getDb()
  const now = new Date()

  // Find bots that are PROCESSING but have no currentOrderId
  await db
    .update(bots)
    .set({
      status: 'IDLE',
      currentOrderId: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(bots.status, 'PROCESSING'),
        isNull(bots.currentOrderId),
        isNull(bots.deletedAt),
      ),
    )
}

const resumeProcessingOrders = async () => {
  const db = getDb()
  const processingOrders = await db
    .select()
    .from(orders)
    .where(and(eq(orders.status, 'PROCESSING'), isNull(orders.deletedAt)))

  if (processingOrders.length === 0) return

  const nowMs = Date.now()
  const rawBaseUrl = process.env.APP_BASE_URL
  const baseUrl = rawBaseUrl && !rawBaseUrl.startsWith('http')
    ? `https://${rawBaseUrl}`
    : rawBaseUrl
  const token = process.env.QSTASH_TOKEN
  const client = baseUrl && token ? new Client({ token }) : null
  const callbackUrl = baseUrl
    ? new URL('/api/orders/complete', baseUrl).toString()
    : null

  for (const order of processingOrders) {
    if (!order.botId) continue

    const startedAtMs =
      getTimestampMs(order.processingStartedAt) ??
      getTimestampMs(order.updatedAt) ??
      getTimestampMs(order.createdAt)
    if (!startedAtMs) continue

    const elapsedMs = nowMs - startedAtMs

    if (elapsedMs >= BOT_PROCESSING_DELAY_SECONDS * 1000) {
      const now = new Date(nowMs)
      await db
        .update(orders)
        .set({
          status: 'COMPLETE',
          completedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(orders.id, order.id),
            eq(orders.status, 'PROCESSING'),
            isNull(orders.deletedAt),
          ),
        )

      await db
        .update(bots)
        .set({
          status: 'IDLE',
          currentOrderId: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(bots.id, order.botId),
            eq(bots.currentOrderId, order.id),
            eq(bots.status, 'PROCESSING'),
            isNull(bots.deletedAt),
          ),
        )
      continue
    }

    if (client && callbackUrl) {
      const remainingSeconds = Math.max(
        1,
        Math.ceil((BOT_PROCESSING_DELAY_SECONDS * 1000 - elapsedMs) / 1000),
      )

      await client.publishJSON({
        url: callbackUrl,
        body: { orderId: order.id, botId: order.botId },
        delay: remainingSeconds,
        deduplicationId: `${order.id}-${startedAtMs}`,
      })
    }
  }
}

interface CreateOrderRequest {
  type: 'NORMAL' | 'VIP'
  userId: string
}

/**
 * Public recovery function that can be called on server startup
 * or from external services. Runs both stuck bot recovery and
 * processing order resumption.
 */
export async function runRecovery() {
  try {
    console.log('[Recovery] Running startup recovery...')
    await recoverStuckBots()
    await resumeProcessingOrders()
    console.log('[Recovery] Startup recovery completed')
  } catch (error) {
    console.error('[Recovery] Error during startup recovery:', error)
  }
}

// GET /api/orders - List all orders (excluding soft-deleted)
// POST /api/orders - Create a new order
export const Route = createFileRoute('/api/orders')({
  server: {
    handlers: {
      GET: async () => {
        try {
          // Try to acquire lock before running recovery/resume logic
          // This prevents thundering herd when multiple clients poll simultaneously
          const lockAcquired = await tryAcquireResumeLock()
          if (lockAcquired) {
            await recoverStuckBots()
            await resumeProcessingOrders()
          }

          const db = getDb()
          const allOrders = await db
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

          return Response.json({ orders: allOrders })
        } catch (error) {
          console.error('Get orders error:', error)
          return Response.json(
            { error: 'Internal server error' },
            { status: 500 },
          )
        }
      },

      POST: async ({ request }) => {
        try {
          const body: CreateOrderRequest = await request.json()

          const db = getDb()
          const newOrder = await db.transaction(async (tx) => {
            const sequenceResult = await tx
              .insert(orderNumbers)
              .values({})
              .returning({ id: orderNumbers.id })

            const orderNumber = sequenceResult[0]?.id
            if (!orderNumber) {
              throw new Error('Failed to allocate order number')
            }

            const order = {
              id: uuidv7(),
              orderNumber,
              type: body.type,
              status: 'PENDING' as const,
              userId: body.userId,
              botId: null,
              completedAt: null,
              processingStartedAt: null,
            }

            await tx.insert(orders).values(order)
            return order
          })

          return Response.json({
            order: newOrder,
            message: 'Order created successfully',
          })
        } catch (error) {
          console.error('Create order error:', error)
          return Response.json(
            { error: 'Internal server error' },
            { status: 500 },
          )
        }
      },
    },
  },
})
