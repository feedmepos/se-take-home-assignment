import { createFileRoute } from '@tanstack/react-router'
import { Receiver } from '@upstash/qstash'
import { getDb } from '@/db'
import { bots, orders } from '@/db/schema'
import { and, eq, isNull } from 'drizzle-orm'

interface OrderCompletionPayload {
  orderId: string
  botId: string
}

// POST /api/orders/complete - QStash callback to finalize an order
export const Route = createFileRoute('/api/orders/complete')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const signature = request.headers.get('Upstash-Signature') || ''
          const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY
          const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY

          if (!currentSigningKey || !nextSigningKey) {
            return Response.json(
              { error: 'QStash signing keys are not configured' },
              { status: 500 },
            )
          }

          const receiver = new Receiver({
            currentSigningKey,
            nextSigningKey,
          })

          const body = await request.text()
          const isValid = await receiver.verify({ signature, body })
          if (!isValid) {
            return Response.json({ error: 'Invalid signature' }, { status: 403 })
          }

          const payload = JSON.parse(body) as OrderCompletionPayload
          if (!payload.orderId || !payload.botId) {
            return Response.json({ error: 'Invalid payload' }, { status: 400 })
          }

          const db = getDb()
          const orderResult = await db
            .select()
            .from(orders)
            .where(and(eq(orders.id, payload.orderId), isNull(orders.deletedAt)))
            .limit(1)

          const order = orderResult[0]
          if (
            !order ||
            order.status !== 'PROCESSING' ||
            order.botId !== payload.botId
          ) {
            return Response.json({ message: 'Order already finalized' })
          }

          const now = new Date()
          await db
            .update(orders)
            .set({
              status: 'COMPLETE',
              completedAt: now,
              updatedAt: now,
            })
            .where(and(eq(orders.id, payload.orderId), isNull(orders.deletedAt)))

          await db
            .update(bots)
            .set({
              status: 'IDLE',
              currentOrderId: null,
              updatedAt: now,
            })
            .where(
              and(
                eq(bots.id, payload.botId),
                eq(bots.currentOrderId, payload.orderId),
                eq(bots.status, 'PROCESSING'),
                isNull(bots.deletedAt),
              ),
            )

          return Response.json({ message: 'Order completed' })
        } catch (error) {
          console.error('Order completion error:', error)
          return Response.json(
            { error: 'Internal server error' },
            { status: 500 },
          )
        }
      },
    },
  },
})
