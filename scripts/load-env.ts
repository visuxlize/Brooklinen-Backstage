/**
 * Load .env.local so DATABASE_URL is set when running scripts with npx tsx.
 * Import this first in any script that uses the database.
 */
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
