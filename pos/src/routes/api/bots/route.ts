import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '@/db'
import { bots, orders } from '@/db/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { uuidv7 } from '@/lib/uuid7'

interface CreateBotRequest {}

// GET /api/bots - List all bots (excluding soft-deleted)
// POST /api/bots - Create a new bot
export const Route = createFileRoute('/api/bots')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const db = getDb()
          const allBots = await db
            .select()
            .from(bots)
            .where(isNull(bots.deletedAt))
            .orderBy(desc(bots.createdAt))

          return Response.json({ bots: allBots })
        } catch (error) {
          console.error('Get bots error:', error)
          return Response.json(
            { error: 'Internal server error' },
            { status: 500 },
          )
        }
      },

      POST: async () => {
        try {
          const db = getDb()

          // Create bot with UUID7
          const newBot = {
            id: uuidv7(),
            status: 'IDLE' as const,
            currentOrderId: null,
          }

          await db.insert(bots).values(newBot)

          return Response.json({
            bot: newBot,
            message: 'Bot created successfully',
          })
        } catch (error) {
          console.error('Create bot error:', error)
          return Response.json(
            { error: 'Internal server error' },
            { status: 500 },
          )
        }
      },
    },
  },
})
