import { createFileRoute } from '@tanstack/react-router'
import { Client } from '@upstash/qstash'
import { getDb } from '@/db'
import { bots, orders } from '@/db/schema'
import { and, eq, isNull, sql } from 'drizzle-orm'

const BOT_PROCESSING_DELAY_SECONDS = 10

const isConstraintError = (error: unknown) =>
  error instanceof Error &&
  /SQLITE_CONSTRAINT|UNIQUE constraint failed|constraint failed/i.test(
    error.message,
  )

export const Route = createFileRoute('/api/bots/$id/claim')({
  server: {
    handlers: {
      POST: async ({ params }) => {
        try {
          const qstashToken = process.env.QSTASH_TOKEN
          const baseUrl = process.env.APP_BASE_URL
          const qstashEnabled = !!(qstashToken && baseUrl)

          const db = getDb()
          const now = new Date()
          const claimResult = await db.transaction(async (tx) => {
            const botResult = await tx
              .select()
              .from(bots)
              .where(and(eq(bots.id, params.id), isNull(bots.deletedAt)))
              .limit(1)

            const bot = botResult[0]
            if (!bot) return { status: 'BOT_NOT_FOUND' as const }
            if (bot.status !== 'IDLE') return { status: 'BOT_BUSY' as const }

            const orderResult = await tx
              .select()
              .from(orders)
              .where(and(eq(orders.status, 'PENDING'), isNull(orders.deletedAt)))
              .orderBy(
                sql<number>`case when ${orders.type} = 'VIP' then 0 else 1 end`,
                orders.orderNumber,
              )
              .limit(1)

            const order = orderResult[0]
            if (!order) return { status: 'NO_ORDER' as const }

            const updatedOrders = await tx
              .update(orders)
              .set({
                status: 'PROCESSING',
                botId: bot.id,
                processingStartedAt: now,
                completedAt: null,
                updatedAt: now,
              })
              .where(
                and(
                  eq(orders.id, order.id),
                  eq(orders.status, 'PENDING'),
                  isNull(orders.deletedAt),
                ),
              )
              .returning()

            if (updatedOrders.length === 0) {
              throw new Error('ORDER_CONFLICT')
            }

            const updatedBots = await tx
              .update(bots)
              .set({
                status: 'PROCESSING',
                currentOrderId: order.id,
                updatedAt: now,
              })
              .where(
                and(
                  eq(bots.id, bot.id),
                  eq(bots.status, 'IDLE'),
                  isNull(bots.deletedAt),
                ),
              )
              .returning()

            if (updatedBots.length === 0) {
              throw new Error('BOT_CONFLICT')
            }

            return {
              status: 'OK' as const,
              order: updatedOrders[0],
              bot: updatedBots[0],
            }
          })

          if (claimResult.status === 'BOT_NOT_FOUND') {
            return Response.json({ error: 'Bot not found' }, { status: 404 })
          }

          if (claimResult.status === 'BOT_BUSY') {
            return Response.json(
              { error: 'Bot is already processing an order' },
              { status: 409 },
            )
          }

          if (claimResult.status === 'NO_ORDER') {
            return Response.json({ order: null, message: 'No pending orders' })
          }

          // Schedule order completion via QStash if configured
          // Otherwise, the resume logic in GET /api/orders will complete it
          if (qstashEnabled) {
            try {
              const client = new Client({ token: qstashToken! })
              const callbackUrl = new URL('/api/orders/complete', baseUrl).toString()

              await client.publishJSON({
                url: callbackUrl,
                body: {
                  orderId: claimResult.order.id,
                  botId: claimResult.bot.id,
                },
                delay: BOT_PROCESSING_DELAY_SECONDS,
                deduplicationId: `${claimResult.order.id}-${now.getTime()}`,
              })
            } catch (qstashError) {
              // Log error but don't fail - resume logic will handle completion
              console.error('[QStash] Failed to schedule order completion:', qstashError)
            }
          }

          return Response.json({
            order: claimResult.order,
            bot: claimResult.bot,
            message: 'Order claimed successfully',
          })
        } catch (error) {
          if (isConstraintError(error)) {
            return Response.json(
              { error: 'Order or bot assignment conflict' },
              { status: 409 },
            )
          }

          console.error('Claim order error:', error)
          return Response.json(
            { error: 'Internal server error' },
            { status: 500 },
          )
        }
      },
    },
  },
})
