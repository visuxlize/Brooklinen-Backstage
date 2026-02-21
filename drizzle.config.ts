import type { Config } from 'drizzle-kit'
import path from 'path'

// Load .env.local so DATABASE_URL is available when running drizzle-kit from CLI
import dotenv from 'dotenv'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config
