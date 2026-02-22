import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

/**
 * Database Connection (lazy-initialized so missing DATABASE_URL doesn't crash at import time).
 * Configured for serverless (Vercel). Use Transaction mode pooler (port 6543) when using Supabase.
 */

let _client: ReturnType<typeof postgres> | null = null
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (_db) return _db
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }
  _client = postgres(dbUrl, {
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  })
  _db = drizzle(_client, { schema })
  return _db
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
