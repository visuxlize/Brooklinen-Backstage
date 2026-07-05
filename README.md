# Brooklinen Backstage

Internal retail operations platform for Brooklinen store locations — weekly scheduling, time off requests (RTO/PTO), traffic analytics, daily ops, and nightly recap. Built for store leaders, area managers, and HQ operations.

---

## Live Showcase

A read-only static showcase of the platform is available at:

**[visuxlize.github.io/Brooklinen-Backstage](https://visuxlize.github.io/Brooklinen-Backstage)**

The showcase uses fictional store names, fictional employees, and realistic mock data. It is not connected to any live store systems or databases.

> Access code required. Contact the developer to request access.

---

## What This Is

Backstage is a single platform that supports:

- **Scheduling** — Build and edit week-by-week store schedules (Sun–Sat). Shifts, OFF, PTO, coverage, budget hours, and Power Hour from traffic data.
- **Time Off (RTO)** — Associates submit requests via a public form. Leaders approve or deny; approved requests automatically sync to the schedule and availability.
- **Availability** — Per-employee, per-day availability with ongoing or week-specific scope.
- **Traffic** — Upload traffic data; view weekly and hourly breakdowns. Peak windows feed the schedule Power Hour row.
- **Daily Ops** — Morning wakeup and nightly recap with export to PNG for reporting.
- **Admin** — User management scoped by role and store.

The app is multi-tenant by store: users are scoped to their location. OPS/Area Managers see all stores.

---

## Framework and Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Database | PostgreSQL via Supabase |
| ORM | Drizzle ORM |
| Auth | Supabase Auth (admin-created users only) |
| Styling | Tailwind CSS |
| Deployment | Vercel (production) |

Key dependencies: `date-fns`, `lucide-react`, `zod`, `html2canvas`, `resend`, `xlsx`.

---

## Architecture

### Project structure

```
/app
  (app)/         Dashboard, schedule, daily-ops, availability, traffic, RTO, admin
  (auth)/        Login
  rto/submit/    Public RTO submit form (no auth required)
  api/           API routes — schedule, availability, RTO, traffic, admin
/components      UI and feature components
/lib
  db/            Drizzle schema, client, migrations
  supabase/      Server and client Supabase auth helpers
  scheduleRtoUtils, scheduleWeeks, shiftUtils, rtoAvailabilitySync
/showcase        Static GitHub Pages showcase (read-only demo)
/drizzle         Generated SQL migrations
/public          Static assets
```

### Data flow

1. **Auth** — Supabase session. Users exist in `users` table; no public signup.
2. **Store context** — Active store drives all data queries and API calls.
3. **Schedule** — Reads `schedules`, `schedule_week_meta`, `retail_data`. Writes go to both tables on cell edit.
4. **RTO** — Public form writes `rto_requests`. Leaders approve/deny; approval syncs to `schedules` and `availability`.
5. **Traffic** — Uploaded Excel fills `traffic_weekly` and `hourly_traffic`. Peak data drives Power Hour on the schedule.

---

## Database Schema

| Table | Purpose |
|---|---|
| `stores` | Store id, name, city, color, default hours |
| `users` | Auth id, name, email, role, storeId |
| `schedules` | One row per (store, employee, weekStart, dayOfWeek) |
| `schedule_week_meta` | Per (store, weekStart): workload, promotions, hours override |
| `rto_requests` | Time off requests with status, leader notes, date ranges |
| `availability` | Per-employee per-day availability with ongoing or weekly scope |
| `retail_data` | Per (store, date): budget, LY net, orders, AOV, UPT, CVR, traffic |
| `traffic_weekly` | Per (store, weekStart): daily traffic counts and totals |
| `hourly_traffic` | Per (store, hour, dayOfWeek): avg counts and percentages |
| `store_traffic_peak` | Per store: peak window by day, drives Power Hour |

---

## User Roles

| Role | Access |
|---|---|
| OPS / Area Manager | Full access across all stores |
| Store Leader | Full access for their store only |
| Lead / Associate | Schedule view + RTO submit only |

---

## Showcase

The `/showcase` folder contains a self-contained static demo that deploys to GitHub Pages via GitHub Actions on every push to `main`.

It includes:

- Passcode-gated login page
- Dashboard with SPA goal tracker and all-store cards
- Schedule page with a pre-filled sample week
- RTO page with pending and resolved requests
- Traffic page with daily and hourly bar charts

All data in the showcase is fictional. No Supabase, no API calls, no real store data.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:generate` | Generate Drizzle migrations from schema |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:seed` | Seed database |
| `npm run import:excel` | Import retail/traffic from Excel |

---

## Security

- All routes require authentication except `/login` and `/rto/submit`.
- Users are created by admins only — no public signup.
- API routes validate the current user and enforce role and store scope.
- Server-side secrets (`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`) are never exposed client-side.

---

*Private use only. Built and maintained by Andres — Retail Operations, Brooklinen.*
