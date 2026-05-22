import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '@/db'
import { orders, bots } from '@/db/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'

interface SyncRequest {
  orders?: Array<{ uuid: string; updatedAt: number }>
  bots?: Array<{ uuid: string; updatedAt: number }>
}

// POST /api/sync - Sync client changes with server
export const Route = createFileRoute('/api/sync')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body: SyncRequest = await request.json()
          const db = getDb()

          // Get server state for all entities
          const serverOrders = await db
            .select()
            .from(orders)
            .where(isNull(orders.deletedAt))

          const serverBots = await db
            .select()
            .from(bots)
            .where(isNull(bots.deletedAt))

          // Determine what needs to be sent to client
          const clientOrderUuids = new Set(body.orders?.map((o) => o.uuid) || [])
          const clientBotUuids = new Set(body.bots?.map((b) => b.uuid) || [])

          const newOrders = serverOrders.filter((o) => !clientOrderUuids.has(o.id))
          const newBots = serverBots.filter((b) => !clientBotUuids.has(b.id))

          // Check for updates based on timestamps
          const updatedOrders = serverOrders.filter((o) => {
            const clientOrder = body.orders?.find((co) => co.uuid === o.id)
            if (!clientOrder) return false
            return o.updatedAt.getTime() > clientOrder.updatedAt
          })

          const updatedBots = serverBots.filter((b) => {
            const clientBot = body.bots?.find((cb) => cb.uuid === b.id)
            if (!clientBot) return false
            return b.updatedAt.getTime() > clientBot.updatedAt
          })

          return Response.json({
            orders: {
              new: newOrders,
              updated: updatedOrders,
            },
            bots: {
              new: newBots,
              updated: updatedBots,
            },
            timestamp: Date.now(),
          })
        } catch (error) {
          console.error('Sync error:', error)
          return Response.json(
            { error: 'Internal server error' },
            { status: 500 },
          )
        }
      },
    },
  },
})
