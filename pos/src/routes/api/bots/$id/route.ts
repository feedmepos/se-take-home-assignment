import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '@/db'
import { bots, orders } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

interface UpdateBotRequest {
  status?: 'IDLE' | 'PROCESSING'
  currentOrderId?: string | null
}

// PATCH /api/bots/:id - Update a bot
// DELETE /api/bots/:id - Soft delete a bot (returns order to PENDING)
export const Route = createFileRoute('/api/bots/$id')({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        try {
          const body: UpdateBotRequest = await request.json()

          const db = getDb()
          const botResult = await db
            .select()
            .from(bots)
            .where(and(eq(bots.id, params.id), isNull(bots.deletedAt)))
            .limit(1)

          const bot = botResult[0]
          if (!bot) {
            return Response.json({ error: 'Bot not found' }, { status: 404 })
          }

          // Build update object
          const updates: Record<string, any> = {
            updatedAt: new Date(),
          }

          if (body.status !== undefined) {
            updates.status = body.status
          }

          if (body.currentOrderId !== undefined) {
            updates.currentOrderId = body.currentOrderId
          }

          await db
            .update(bots)
            .set(updates)
            .where(and(eq(bots.id, params.id), isNull(bots.deletedAt)))

          // If bot was processing an order and is now being stopped (not reassigned),
          // return the order to PENDING.
          // Don't reset the order if we're reassigning the bot to a new order.
          const isReassigning =
            body.status === 'PROCESSING' &&
            body.currentOrderId !== null &&
            body.currentOrderId !== bot.currentOrderId
          const isStopping =
            bot.currentOrderId &&
            (body.status === 'IDLE' || body.currentOrderId === null)

          if (isStopping && !isReassigning) {
            await db
              .update(orders)
              .set({
                status: 'PENDING',
                botId: null,
                processingStartedAt: null,
                completedAt: null,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(orders.id, bot.currentOrderId),
                  eq(orders.status, 'PROCESSING'),
                ),
              )
          }

          // Return updated bot
          const updatedResult = await db
            .select()
            .from(bots)
            .where(eq(bots.id, params.id))
            .limit(1)

          return Response.json({
            bot: updatedResult[0],
            message: 'Bot updated successfully',
          })
        } catch (error) {
          console.error('Update bot error:', error)
          return Response.json(
            { error: 'Internal server error' },
            { status: 500 },
          )
        }
      },

      DELETE: async ({ params }) => {
        try {
          const db = getDb()

          // Get bot before soft delete to return order to PENDING
          const botResult = await db
            .select()
            .from(bots)
            .where(and(eq(bots.id, params.id), isNull(bots.deletedAt)))
            .limit(1)

          const bot = botResult[0]

          // If bot was processing an order, return it to PENDING
          if (bot && bot.currentOrderId) {
            await db
              .update(orders)
              .set({
                status: 'PENDING',
                botId: null,
                processingStartedAt: null,
                completedAt: null,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(orders.id, bot.currentOrderId),
                  eq(orders.status, 'PROCESSING'),
                ),
              )
          }

          // Soft delete by setting deletedAt
          await db
            .update(bots)
            .set({ deletedAt: new Date() })
            .where(and(eq(bots.id, params.id), isNull(bots.deletedAt)))

          return Response.json({ message: 'Bot deleted successfully' })
        } catch (error) {
          console.error('Delete bot error:', error)
          return Response.json(
            { error: 'Internal server error' },
            { status: 500 },
          )
        }
      },
    },
  },
})
