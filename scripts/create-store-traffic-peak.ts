/**
 * One-off: create store_traffic_peak table (drizzle-kit push can fail on some DBs).
 * Run: npx tsx scripts/create-store-traffic-peak.ts
 */
import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import postgres from 'postgres'

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL not set')
    process.exit(1)
  }
  const sql = postgres(url, { max: 1 })
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS store_traffic_peak (
      store_id integer PRIMARY KEY REFERENCES stores(id),
      peak_window_by_day jsonb NOT NULL
    );
  `)
  console.log('Created store_traffic_peak table (or it already existed).')
  await sql.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
