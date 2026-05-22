import { drizzle } from 'drizzle-orm/libsql/web'

import * as schema from './schema.ts'

// Database connection singleton
let _dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb() {
  if (_dbInstance) return _dbInstance

  if (!process.env.TURSO_DATABASE_URL) {
    throw new Error('TURSO_DATABASE_URL environment variable is required')
  }

  _dbInstance = drizzle({
    connection: {
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    },
    schema,
  })
  return _dbInstance
}

// Lazy getter - only initializes when accessed
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    return (getDb() as Record<string | symbol, unknown>)[prop]
  },
})
