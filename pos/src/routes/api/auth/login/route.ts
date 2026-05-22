import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '@/db'
import { users } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

interface LoginRequest {
  username: string
  password: string
}

export const Route = createFileRoute('/api/auth/login')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body: LoginRequest = await request.json()

          // Find user by username (excluding soft-deleted)
          const db = getDb()
          const userResult = await db
            .select()
            .from(users)
            .where(and(eq(users.username, body.username), isNull(users.deletedAt)))
            .limit(1)

          const user = userResult[0]

          if (!user) {
            return Response.json(
              { error: 'Invalid username or password' },
              { status: 401 },
            )
          }

          // Simple password check (for demo - use bcrypt in production)
          const passwordHash = Buffer.from(body.password).toString('base64')
          if (user.passwordHash !== passwordHash) {
            return Response.json(
              { error: 'Invalid username or password' },
              { status: 401 },
            )
          }

          // Return user data (excluding password)
          const { passwordHash: _, ...userWithoutPassword } = user
          return Response.json({
            user: userWithoutPassword,
            message: 'Login successful',
          })
        } catch (error) {
          console.error('Login error:', error)
          return Response.json(
            { error: 'Internal server error' },
            { status: 500 },
          )
        }
      },
    },
  },
})
