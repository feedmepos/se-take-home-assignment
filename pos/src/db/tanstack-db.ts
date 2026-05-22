import { createDB } from '@tanstack/db-core'
import { drizzleAdapter } from '@tanstack/db-drizzle-adapter'
import { getDb } from './index'
import * as schema from './schema'

/**
 * TanStack DB Instance
 *
 * This provides a type-safe database layer on top of Drizzle ORM.
 * It offers reactive queries and mutations with automatic cache management.
 *
 * Note: For this prototype, we primarily use direct Drizzle queries in the API routes.
 * This TanStack DB instance is available for future enhancements like live queries.
 */

// Create TanStack DB instance with Drizzle adapter
export const db = createDB({
  adapter: drizzleAdapter(getDb() as any, schema),
})

// Export schema for convenience
export * from './schema'
