-- Run this in Supabase SQL Editor (Dashboard → SQL Editor) to add columns
-- that exist in the app schema but may be missing in production.
-- Safe to run multiple times (idempotent).

-- schedules: column for cross-store coverage (who is covering from another store)
ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS covering_from_store_id integer REFERENCES stores(id);

-- schedule_week_meta: persisted employee row order on the schedule
ALTER TABLE schedule_week_meta
  ADD COLUMN IF NOT EXISTS employee_order jsonb;

-- stores: canonical employee row order for schedule (applies to all weeks)
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS employee_order jsonb;
