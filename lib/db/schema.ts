import { pgTable, text, timestamp, uuid, integer, date, jsonb, numeric, unique } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const stores = pgTable('stores', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  color: text('color').notNull(),
  hours: jsonb('hours').notNull(),
})

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').notNull(), // "ops" | "leader" | "associate"
  storeId: integer('store_id').references(() => stores.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const schedules = pgTable(
  'schedules',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    storeId: integer('store_id').notNull().references(() => stores.id),
    employeeName: text('employee_name').notNull(),
    weekStart: date('week_start').notNull(),
    dayOfWeek: integer('day_of_week').notNull(), // 0=Sun 6=Sat
    shiftValue: text('shift_value'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    scheduleUnique: unique('schedules_unique').on(t.storeId, t.employeeName, t.weekStart, t.dayOfWeek),
  })
)

/** Per-week metadata: workload, promotions (per-day), optional hours override for the schedule. */
export const scheduleWeekMeta = pgTable(
  'schedule_week_meta',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    storeId: integer('store_id').notNull().references(() => stores.id),
    weekStart: date('week_start').notNull(),
    workload: jsonb('workload'), // { sun: string, mon: string, ... } per-day
    promotions: jsonb('promotions'), // { sun: string, mon: string, ... } per-day
    hoursOverride: jsonb('hours_override'), // { sun: string, mon: string, ... } when set, schedule uses this instead of store.hours
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    scheduleWeekMetaUnique: unique('schedule_week_meta_store_week').on(t.storeId, t.weekStart),
  })
)

export const trafficWeekly = pgTable(
  'traffic_weekly',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    storeId: integer('store_id').notNull().references(() => stores.id),
    weekStart: date('week_start').notNull(),
    sun: integer('sun').default(0),
    mon: integer('mon').default(0),
    tue: integer('tue').default(0),
    wed: integer('wed').default(0),
    thu: integer('thu').default(0),
    fri: integer('fri').default(0),
    sat: integer('sat').default(0),
    total: integer('total').default(0),
    trendMult: numeric('trend_mult', { precision: 6, scale: 4 }),
    trafficCount: integer('traffic_count'),
  },
  (t) => ({
    trafficUnique: unique('traffic_weekly_unique').on(t.storeId, t.weekStart),
  })
)

export const hourlyTraffic = pgTable('hourly_traffic', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  storeId: integer('store_id').notNull().references(() => stores.id),
  hour: integer('hour').notNull(), // 10–20 (10AM–8PM)
  dayOfWeek: integer('day_of_week').notNull(),
  avgCount: numeric('avg_count', { precision: 6, scale: 2 }),
  dailyTotal: numeric('daily_total', { precision: 8, scale: 2 }),
  pctOfDay: numeric('pct_of_day', { precision: 5, scale: 4 }),
  storeMax: numeric('store_max', { precision: 6, scale: 2 }),
  pctOfMax: numeric('pct_of_max', { precision: 5, scale: 4 }),
})

export const rtoRequests = pgTable('rto_requests', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  storeId: integer('store_id').notNull().references(() => stores.id),
  employeeName: text('employee_name').notNull(),
  employeeEmail: text('employee_email').notNull(),
  requestedDays: text('requested_days').notNull(),
  type: text('type').notNull(), // "RTO" | "PTO" | "COMP" | "Sick"
  partialTime: text('partial_time'),
  note: text('note'),
  status: text('status').notNull().default('pending'), // "pending" | "approved" | "denied"
  leaderNote: text('leader_note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const retailData = pgTable(
  'retail_data',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    storeId: integer('store_id').notNull().references(() => stores.id),
    date: date('date').notNull(),
    budgetNet: numeric('budget_net', { precision: 12, scale: 2 }),
    lyNet: numeric('ly_net', { precision: 12, scale: 2 }),
    ordersBudget: integer('orders_budget'),
    ordersLy: integer('orders_ly'),
    aovBudget: numeric('aov_budget', { precision: 12, scale: 2 }),
    aovLy: numeric('aov_ly', { precision: 12, scale: 2 }),
    uptBudget: numeric('upt_budget', { precision: 8, scale: 4 }),
    uptLy: numeric('upt_ly', { precision: 8, scale: 4 }),
    cvrBudget: numeric('cvr_budget', { precision: 8, scale: 4 }),
    cvrLy: numeric('cvr_ly', { precision: 8, scale: 4 }),
    trafficBudget: integer('traffic_budget'),
  },
  (t) => ({
    retailStoreDateUnique: unique('retail_data_store_date').on(t.storeId, t.date),
  })
)

/** Employee availability per store. scope=ongoing: effective from effectiveDate onward. scope=week: only that week (effectiveDate = Sunday). */
export const availability = pgTable(
  'availability',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    storeId: integer('store_id').notNull().references(() => stores.id),
    userId: uuid('user_id').notNull().references(() => users.id),
    effectiveDate: date('effective_date').notNull(),
    scope: text('scope').notNull().default('ongoing'), // 'ongoing' | 'week'
    type: text('type').notNull(), // legacy
    partialHours: jsonb('partial_hours'),
    daySchedule: jsonb('day_schedule'), // { "0": { type, start?, end? }, ... } Sun=0..Sat=6
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    availabilityUnique: unique('availability_store_user_effective_scope').on(t.storeId, t.userId, t.effectiveDate, t.scope),
  })
)

// Type exports
export type Store = typeof stores.$inferSelect
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Schedule = typeof schedules.$inferSelect
export type TrafficWeekly = typeof trafficWeekly.$inferSelect
export type HourlyTraffic = typeof hourlyTraffic.$inferSelect
export type RtoRequest = typeof rtoRequests.$inferSelect
export type RetailData = typeof retailData.$inferSelect
export type Availability = typeof availability.$inferSelect
export type ScheduleWeekMeta = typeof scheduleWeekMeta.$inferSelect
