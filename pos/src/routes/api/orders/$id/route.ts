import { createFileRoute } from '@tanstack/react-router'
import { Client } from '@upstash/qstash'
import { getDb } from '@/db'
import { orders, bots } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

const BOT_PROCESSING_DELAY_SECONDS = 10

const isConstraintError = (error: unknown) =>
  error instanceof Error &&
  /SQLITE_CONSTRAINT|UNIQUE constraint failed|constraint failed/i.test(
    error.message,
  )

interface UpdateOrderRequest {
  status?: 'PENDING' | 'PROCESSING' | 'COMPLETE'
  botId?: string | null
}

// PATCH /api/orders/:id - Update an order
// DELETE /api/orders/:id - Soft delete an order
export const Route = createFileRoute('/api/orders/$id')({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        try {
          const body: UpdateOrderRequest = await request.json()

          const db = getDb()
          const orderResult = await db
            .select()
            .from(orders)
            .where(and(eq(orders.id, params.id), isNull(orders.deletedAt)))
            .limit(1)

          const order = orderResult[0]
          if (!order) {
            return Response.json({ error: 'Order not found' }, { status: 404 })
          }

          const now = new Date()
          const nowMs = now.getTime()
          const wantsProcessing =
            body.status === 'PROCESSING' &&
            body.botId !== undefined &&
            body.botId !== null
          const processingBotId = wantsProcessing ? (body.botId as string) : null

          // Prevent assigning a bot to an order that's already being processed
          if (
            wantsProcessing &&
            order.status === 'PROCESSING' &&
            order.botId !== null &&
            order.botId !== body.botId
          ) {
            return Response.json(
              { error: 'Order is already being processed by another bot' },
              { status: 409 },
            )
          }

          if (wantsProcessing && processingBotId) {
            const botResult = await db
              .select()
              .from(bots)
              .where(and(eq(bots.id, processingBotId), isNull(bots.deletedAt)))
              .limit(1)

            const bot = botResult[0]
            if (!bot) {
              return Response.json({ error: 'Bot not found' }, { status: 404 })
            }

            const botBusy =
              bot.status !== 'IDLE' && bot.currentOrderId !== params.id
            if (botBusy) {
              return Response.json(
                { error: 'Bot is already processing another order' },
                { status: 409 },
              )
            }
          }

          const isProcessingTransition = wantsProcessing && order.status !== 'PROCESSING'
          const shouldScheduleCompletion = isProcessingTransition

          if (shouldScheduleCompletion) {
            if (!process.env.QSTASH_TOKEN) {
              return Response.json(
                { error: 'QSTASH_TOKEN is not configured' },
                { status: 500 },
              )
            }

            const baseUrl = process.env.APP_BASE_URL
            if (!baseUrl) {
              return Response.json(
                { error: 'APP_BASE_URL is not configured' },
                { status: 500 },
              )
            }

            try {
              const callbackUrl = new URL(
                '/api/orders/complete',
                baseUrl,
              ).toString()
              const client = new Client({
                token: process.env.QSTASH_TOKEN,
              })

              await client.publishJSON({
                url: callbackUrl,
                body: { orderId: params.id, botId: processingBotId },
                delay: BOT_PROCESSING_DELAY_SECONDS,
                deduplicationId: `${params.id}-${nowMs}`,
              })
              console.log(
                `[QStash] Scheduled order completion for ${params.id} in ${BOT_PROCESSING_DELAY_SECONDS}s`,
              )
            } catch (qstashError) {
              console.error(
                '[QStash] Failed to schedule order completion:',
                qstashError,
              )
              return Response.json(
                {
                  error:
                    'Failed to schedule order completion. Check APP_BASE_URL format (must include protocol like https://)',
                },
                { status: 500 },
              )
            }
          }

          // Build update object
          const updates: Record<string, any> = {
            updatedAt: now,
          }

          if (body.status !== undefined) {
            updates.status = body.status
            if (body.status === 'COMPLETE') {
              updates.completedAt = now
            }
            if (body.status === 'PENDING') {
              updates.processingStartedAt = null
              updates.completedAt = null
            }
          }

          if (body.botId !== undefined) {
            updates.botId = body.botId
          }

          if (isProcessingTransition) {
            updates.processingStartedAt = now
            updates.completedAt = null
          }

          try {
            if (wantsProcessing && processingBotId) {
              await db.transaction(async (tx) => {
                await tx
                  .update(orders)
                  .set(updates)
                  .where(
                    and(eq(orders.id, params.id), isNull(orders.deletedAt)),
                  )

                await tx
                  .update(bots)
                  .set({
                    status: 'PROCESSING',
                    currentOrderId: params.id,
                    updatedAt: now,
                  })
                  .where(
                    and(eq(bots.id, processingBotId), isNull(bots.deletedAt)),
                  )
              })
            } else {
              await db
                .update(orders)
                .set(updates)
                .where(and(eq(orders.id, params.id), isNull(orders.deletedAt)))
            }
          } catch (error) {
            if (isConstraintError(error)) {
              return Response.json(
                { error: 'Order or bot assignment conflict' },
                { status: 409 },
              )
            }
            throw error
          }

          // Return updated order
          const updatedResult = await db
            .select()
            .from(orders)
            .where(eq(orders.id, params.id))
            .limit(1)

          return Response.json({
            order: updatedResult[0],
            message: 'Order updated successfully',
          })
        } catch (error) {
          console.error('Update order error:', error)
          return Response.json(
            { error: 'Internal server error' },
            { status: 500 },
          )
        }
      },

      DELETE: async ({ params }) => {
        try {
          const db = getDb()

          // Soft delete by setting deletedAt
          await db
            .update(orders)
            .set({ deletedAt: new Date() })
            .where(and(eq(orders.id, params.id), isNull(orders.deletedAt)))

          return Response.json({ message: 'Order deleted successfully' })
        } catch (error) {
          console.error('Delete order error:', error)
          return Response.json(
            { error: 'Internal server error' },
            { status: 500 },
          )
        }
      },
    },
  },
})
