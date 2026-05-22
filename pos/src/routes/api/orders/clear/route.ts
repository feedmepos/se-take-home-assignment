import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '@/db'
import { orders, bots } from '@/db/schema'
import { eq, isNull } from 'drizzle-orm'

// DELETE /api/orders/clear - Clear all orders (soft delete)
export const Route = createFileRoute('/api/orders/clear')({
  server: {
    handlers: {
      DELETE: async () => {
        try {
          const db = getDb()
          const now = new Date()

          // Soft delete all orders
          await db
            .update(orders)
            .set({
              deletedAt: now,
              updatedAt: now,
            })
            .where(isNull(orders.deletedAt))

          // Reset all bots to IDLE and clear their current orders
          await db
            .update(bots)
            .set({
              status: 'IDLE',
              currentOrderId: null,
              updatedAt: now,
            })
            .where(isNull(bots.deletedAt))

          return Response.json({
            message: 'All orders cleared successfully',
          })
        } catch (error) {
          console.error('Clear orders error:', error)
          return Response.json(
            { error: 'Internal server error' },
            { status: 500 },
          )
        }
      },
    },
  },
})
