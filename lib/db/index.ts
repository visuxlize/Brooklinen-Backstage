import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

/**
 * Database Connection
 * 
 * This creates a connection to your PostgreSQL database using Drizzle ORM.
 * The connection is configured for serverless environments (Vercel, etc.)
 * 
 * Why Drizzle?
 * - Type-safe queries (catch errors at compile time)
 * - Better performance than ORMs like Prisma
 * - Flexible and SQL-like syntax
 * - Great developer experience
 * 
 * Example usage:
 * ```typescript
 * import { db } from '@/lib/db'
 * import { users } from '@/lib/db/schema'
 * import { eq } from 'drizzle-orm'
 * 
 * // Select all users
 * const allUsers = await db.select().from(users)
 * 
 * // Select with conditions
 * const activeUsers = await db
 *   .select()
 *   .from(users)
 *   .where(eq(users.isActive, true))
 * 
 * // Insert a user
 * const newUser = await db
 *   .insert(users)
 *   .values({ email: 'test@example.com' })
 *   .returning()
 * 
 * // Update a user
 * await db
 *   .update(users)
 *   .set({ fullName: 'New Name' })
 *   .where(eq(users.id, userId))
 * 
 * // Delete a user
 * await db
 *   .delete(users)
 *   .where(eq(users.id, userId))
 * ```
 */

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Supabase: use Transaction mode pooler (port 6543) to avoid "MaxClientsInSessionMode" errors.
// In Dashboard: Project Settings → Database → Connection string → "Transaction" (not Session).
// Session mode (port 5432) has a low connection limit; transaction mode multiplexes connections.
const dbUrl = process.env.DATABASE_URL

// Create PostgreSQL connection
// prepare: false for serverless; max: 1 to avoid exhausting pool when using session mode
const client = postgres(dbUrl, {
  prepare: false,
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
})

// Create Drizzle instance with schema
// If you see "MaxClientsInSessionMode: max clients reached", switch DATABASE_URL to pooler:6543
// The schema is imported so Drizzle knows about your tables and relationships
export const db = drizzle(client, { schema })
