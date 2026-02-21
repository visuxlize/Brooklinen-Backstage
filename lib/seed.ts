import { db } from './db'
import { stores, users, schedules, trafficWeekly, retailData } from './db/schema'
import { STORE_CONFIG } from './stores'
import { format, addWeeks, startOfWeek, addDays } from 'date-fns'
import { sql } from 'drizzle-orm'

const EMPLOYEES_101 = [
  'Andres', 'Victoria', 'Braiden', 'Rachel', 'Willow', 'Selene', 'Patrick',
]

const EMPLOYEES_102 = [
'Chris', 'Abraham', 'Jennifer', 'Eve', 'Dylan', 'Hudson', 'Maggie',
]

const EMPLOYEES_103 = [
  'Maribel', 'Randy', 'Talia', 'Sasha', 'Betty', 'Chung',
]

const EMPLOYEES_104 = [
  'Andy', 'Brandon', 'Jennifer', 'Shir', 'Lillian', 'Carly',
]

const EMPLOYEES_105 = [
  'Alyssa', 'Tai', 'Cole', 'Demonde', 'Aaliyah',
]

const EMPLOYEES_107 = [
  'Demi', 'Quincy', 'Ainslie', 'Allison', 'Alexa',  
]

const EMPLOYEES_108 = [
  'Vanessa', 'Hannah', 'Kaeli', 'Brianna', 'Marielique', 'Akira', 
]

const EMPLOYEES_109 = [
  'LaShawn','Aleza', 'Flora', 'Ken', 'Arianna', 'Ruth',
]

const SHIFT_TEMPLATES = [
  '10AM–6PM',
  '11AM–7PM',
  '12PM–8PM',
  '9AM–5PM',
  '10AM–6PM',
  '11AM–7PM',
]

function randomShift(day: number): string {
  const rand = Math.random()
  if (rand < 0.05) return 'OFF'
  if (rand < 0.07) return 'PTO'
  if (rand < 0.08) return 'COMP'
  // Weekend slightly different
  if (day === 0 || day === 6) {
    return Math.random() > 0.3 ? '10AM–6PM' : '11AM–7PM'
  }
  return SHIFT_TEMPLATES[Math.floor(Math.random() * SHIFT_TEMPLATES.length)]
}

function getWeekStart(weekIdx: number): Date {
  const base = startOfWeek(new Date(), { weekStartsOn: 0 })
  const monthStart = startOfWeek(
    new Date(base.getFullYear(), base.getMonth(), 1),
    { weekStartsOn: 0 }
  )
  return addWeeks(monthStart, weekIdx)
}

async function main() {
  console.log('Seeding database...')

  // 1. Upsert stores
  console.log('Seeding stores...')
  for (const store of STORE_CONFIG) {
    await db
      .insert(stores)
      .values({
        id: store.id,
        name: store.name,
        city: store.city,
        color: store.color,
        hours: store.hours,
      })
      .onConflictDoUpdate({
        target: stores.id,
        set: {
          name: sql`excluded.name`,
          city: sql`excluded.city`,
          color: sql`excluded.color`,
          hours: sql`excluded.hours`,
        },
      })
  }
  console.log('Stores seeded.')

  // 2. Seed users (these are DB-only records; Supabase auth users must be created separately)
  console.log('Seeding users...')
  const SEED_USERS = [
    { id: 'fa88ae0c-2d86-403b-8c29-a2e8507558c9', name: 'Andres', email: 'andres.marte@brooklinen.com', role: 'ops', storeId: null },
  ]

  for (const u of SEED_USERS) {
    await db
      .insert(users)
      .values(u)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          name: sql`excluded.name`,
          email: sql`excluded.email`,
          role: sql`excluded.role`,
          storeId: sql`excluded.store_id`,
        },
      })
  }
  console.log('Users seeded.')

  // 3. Seed schedules for 5 weeks for all eight stores
  console.log('Seeding schedules...')
  const storeEmployees: Record<number, string[]> = {
    101: EMPLOYEES_101,
    102: EMPLOYEES_102,
    103: EMPLOYEES_103,
    104: EMPLOYEES_104,
    105: EMPLOYEES_105,
    107: EMPLOYEES_107,
    108: EMPLOYEES_108,
    109: EMPLOYEES_109,
  }

  for (const [storeIdStr, emps] of Object.entries(storeEmployees)) {
    const storeId = parseInt(storeIdStr)
    for (let weekIdx = 0; weekIdx < 5; weekIdx++) {
      const weekStart = getWeekStart(weekIdx)
      const weekStartStr = format(weekStart, 'yyyy-MM-dd')

      for (const emp of emps) {
        for (let day = 0; day < 7; day++) {
          const shiftValue = randomShift(day)
          await db
            .insert(schedules)
            .values({
              storeId,
              employeeName: emp,
              weekStart: weekStartStr,
              dayOfWeek: day,
              shiftValue,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [schedules.storeId, schedules.employeeName, schedules.weekStart, schedules.dayOfWeek],
              set: { shiftValue: sql`excluded.shift_value`, updatedAt: new Date() },
            })
        }
      }
    }
  }
  console.log('Schedules seeded.')

  // 4. Seed traffic data for 8 weeks for all stores
  console.log('Seeding traffic data...')
  const now = new Date()
  for (const store of STORE_CONFIG) {
    for (let weekBack = 0; weekBack < 8; weekBack++) {
      const weekDate = startOfWeek(addWeeks(now, -weekBack), { weekStartsOn: 0 })
      const weekStartStr = format(weekDate, 'yyyy-MM-dd')

      const baseTraffic = 80 + Math.random() * 80
      const dayMults = [0.7, 0.6, 0.65, 0.7, 0.8, 1.0, 1.2]
      const days = dayMults.map((m) => Math.round(baseTraffic * m + Math.random() * 20))
      const total = days.reduce((a, b) => a + b, 0)
      const trendMult = (0.95 + Math.random() * 0.15).toFixed(4)

      await db
        .insert(trafficWeekly)
        .values({
          storeId: store.id,
          weekStart: weekStartStr,
          sun: days[0],
          mon: days[1],
          tue: days[2],
          wed: days[3],
          thu: days[4],
          fri: days[5],
          sat: days[6],
          total,
          trendMult,
          trafficCount: total,
        })
        .onConflictDoUpdate({
          target: [trafficWeekly.storeId, trafficWeekly.weekStart],
          set: {
            sun: sql`excluded.sun`,
            mon: sql`excluded.mon`,
            tue: sql`excluded.tue`,
            wed: sql`excluded.wed`,
            thu: sql`excluded.thu`,
            fri: sql`excluded.fri`,
            sat: sql`excluded.sat`,
            total: sql`excluded.total`,
            trendMult: sql`excluded.trend_mult`,
            trafficCount: sql`excluded.traffic_count`,
          },
        })
    }
  }
  console.log('Traffic seeded.')

  // 5. Retail data (weekly budget sales & LY) for schedule header
  console.log('Seeding retail data (budget / LY)...')
  for (let w = 0; w < 5; w++) {
    const weekStart = getWeekStart(w)
    for (const store of STORE_CONFIG) {
      for (let d = 0; d < 7; d++) {
        const date = addDays(weekStart, d)
        const dateStr = format(date, 'yyyy-MM-dd')
        const budget = 5000 + Math.floor(Math.random() * 3500) + (d >= 5 ? 500 : 0)
        const ly = Math.floor(budget * (0.7 + Math.random() * 0.25))
        await db
          .insert(retailData)
          .values({
            storeId: store.id,
            date: dateStr,
            budgetNet: String(budget),
            lyNet: String(ly),
          })
          .onConflictDoUpdate({
            target: [retailData.storeId, retailData.date],
            set: {
              budgetNet: sql`excluded.budget_net`,
              lyNet: sql`excluded.ly_net`,
            },
          })
      }
    }
  }
  console.log('Retail data seeded.')

  console.log('Database seeding complete!')
  process.exit(0)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
