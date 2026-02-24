# Brooklinen Backstage

**Internal management tool for Brooklinen retail stores** — weekly scheduling, request time off (RTO/PTO), availability, traffic, daily ops, and nightly recap. Built for store leaders, area managers, and HQ (OPS). Private use only; no public signup.

---

## What This Is

Brooklinen Backstage is a single application that supports:

- **Scheduling** — Build and edit week-by-week store schedules (Sun–Sat). Shifts, OFF, PTO, coverage from other stores, budget hours, and “Power Hour” from traffic data. Export schedule as PNG for email.
- **Request Time Off (RTO)** — Associates submit RTO/PTO/partial requests via a public form (no login). Leaders approve or deny in the app; approved requests automatically block schedule cells (OFF/PTO) and sync to availability.
- **Availability** — Per-employee, per-day: Open, N/A, or Partial (time windows). Ongoing or week-specific. Approved RTO/PTO is overlaid when viewing a week.
- **Traffic** — Upload traffic Excel; view weekly and hourly traffic. Peak windows per day feed the schedule “Power Hour” row.
- **Daily Ops** — Morning wakeup (Cashlog, Returns links), zoning, actuals, recap notes. State is persisted by store and date.
- **Nightly Recap** — Store + date, weather, in-store events, actual sales, narratives. Export recap as PNG for reporting.
- **Admin** — User management (create/link users to stores and roles). OPS/Area Manager see all stores; Store Leaders see their store only.

The app is **multi-tenant by store**: users are tied to a store (or all stores for OPS/Area Manager). Navigation and data are scoped by the active store.

---

## Framework & Tech Stack

| Layer        | Technology |
|-------------|------------|
| **Framework** | Next.js 15 (App Router) |
| **Language**  | TypeScript (strict) |
| **Database**  | PostgreSQL via Supabase |
| **ORM**       | Drizzle ORM |
| **Auth**      | Supabase Auth (Magic Links, OAuth); users created by admins only |
| **Styling**   | Tailwind CSS |
| **Deploy**    | Vercel |

Key dependencies: `date-fns`, `lucide-react`, `zod`, `html2canvas` (schedule/recap export), `resend` (optional email for RTO approve/deny), `xlsx` (traffic import).

---

## Architecture

### High-level

- **Server-first**: Pages are Server Components where possible; data is loaded on the server (DB via Drizzle, auth via Supabase server client).
- **Client where needed**: Schedule grid, availability editor, daily ops, RTO dashboard, traffic upload, and recap forms are client components with local state and `fetch` to API routes.
- **API routes** under `/app/api/` handle mutations and some reads (schedule, availability, RTO, traffic, retail, schedule-meta, etc.). Auth is checked in each route; role/store scope is enforced.

### Project structure

```
/app
  (app)/           # Main app (dashboard, schedule, daily-ops, availability, traffic, rto, admin)
  (auth)/          # login, signup
  rto/submit/      # Public RTO submit form (no auth)
  api/             # API routes (schedule, availability, rto, traffic, admin, etc.)
/components        # UI and feature components (schedule, availability, daily-ops, rto, layout, ui)
/lib
  db/              # Drizzle schema, client, migrations
  supabase/        # Server and client Supabase (auth)
  scheduleRtoUtils # RTO/PTO cell resolution for schedule and availability
  scheduleWeeks    # Week indexing (Sun–Sat)
  shiftUtils       # Shift parsing, paid hours, break deduction
  rtoAvailabilitySync  # On RTO approve: write schedule + availability
  roles, stores, auth, app-config, etc.
/drizzle           # Generated SQL migrations
/public            # Static assets
```

### Data flow (conceptual)

1. **Auth**: Supabase session; user record in `users` (id, name, email, role, storeId). Middleware and layout enforce login; layout also loads pending RTO count for nav badge.
2. **Store context**: Active store is selected in the sidebar; API calls and pages use this store (and optionally week) to load and save data.
3. **Schedule**: Reads `schedules`, `schedule_week_meta`, `retail_data` (budgets), approved RTO requests; merges approved RTO/PTO into cell display and WTD hours. Writes go to `schedules` and `schedule_week_meta`.
4. **RTO**: Submit form (public) writes `rto_requests`. Leaders PATCH approve/deny; on approve, `rtoAvailabilitySync` writes `schedules` and `availability` so OFF/PTO appear on schedule and availability.
5. **Availability**: Stored in `availability` by store, user, effective date, and scope (ongoing vs week). Schedule and availability tab both respect approved RTO/PTO when displaying.

---

## Database Schema

All tables live in the same PostgreSQL database (Supabase). Drizzle schema is in `lib/db/schema.ts`.

| Table | Purpose |
|-------|--------|
| **stores** | Store id, name, city, color, default hours (JSON), optional employee order. |
| **users** | Auth id (Supabase), name, email, role, storeId. No public signup; created via Admin. |
| **schedules** | One row per (store, employeeName, weekStart, dayOfWeek). shiftValue (e.g. "10AM–6PM", "OFF", "PTO"), optional coveringFromStoreId for coverage. |
| **schedule_week_meta** | Per (store, weekStart): workload, promotions (per-day JSON), hours override, employee order. |
| **rto_requests** | RTO/PTO/Partial requests: employeeName, email, requestedDays (display), startDate/endDate (YYYY-MM-DD), type, status (pending/approved/denied), leaderNote, timestamps. |
| **availability** | Per (store, userId, effectiveDate, scope): daySchedule JSON (Sun–Sat: open / na / partial with start/end). scope = ongoing or week. |
| **retail_data** | Per (store, date): budget_net, ly_net, orders, AOV, UPT, CVR, traffic budget. Used for schedule budget row and retail context. |
| **traffic_weekly** | Per (store, weekStart): daily traffic counts (sun–sat), total, trend mult, traffic count. |
| **hourly_traffic** | Per (store, hour, dayOfWeek): avg_count, daily_total, pct_of_day, store_max, pct_of_max. Used for traffic views. |
| **store_traffic_peak** | Per store: peak_window_by_day (JSON array of 7 strings). Drives schedule “Power Hour” row. |

Migrations: `npm run db:generate` (after schema changes), then `npm run db:migrate`. Seed (optional): `npm run db:seed`.

---

## How It Works

### Roles and access

- **OPS / Area Manager**: Full control; can switch and manage all stores. Pending RTO badge is summed across all stores.
- **Store Leader**: Full control for their store only (schedule, availability, RTO approve/deny, daily ops, traffic, user management for that store).
- **Lead / Associate**: View-only for Schedule and Daily Ops; can submit RTO via the public form and see “My Requests” link. No access to Admin or other stores.

Schedule and daily-ops edit permission: `canEditSchedule(user, storeId)` is true for OPS, Area Manager, or Store Leader for that store.

### Stores

Stores are defined in `lib/stores.ts` (id, name, city, color, default hours). Store ids are used in URLs and API (e.g. `?store=101`). DB `stores` table can override name/city/color/hours from config.

### Schedule week model

Weeks are Sun–Sat. `lib/scheduleWeeks` maps a week index (0-based) to the week’s Sunday date and total number of weeks in the planning window. Schedule API and page use `weekStart` (YYYY-MM-DD) and `dayOfWeek` 0–6 (Sun–Sat).

### RTO → Schedule and availability

When a leader **approves** an RTO request:

1. `rtoAvailabilitySync.applyRtoApprovalToAvailabilityAndSchedule` runs.
2. For each date in the request range, it writes or updates **availability** (week-scope) so those days are N/A (or partial, if partial time off).
3. For full RTO/PTO (not partial), it writes **schedules** rows: OFF for RTO, PTO for PTO, using the canonical user name from `users` so the schedule grid matches.
4. When **denying** or reverting approval, it clears those schedule rows and sets availability back to open for those days.

The schedule grid and availability tab both use approved RTO/PTO when resolving cell values (OFF/PTO overlay and WTD hours: RTO = 0h, PTO = 8h).

### Key scripts and config

- **Traffic**: Upload Excel via Traffic page; parser fills `traffic_weekly`, `hourly_traffic`, and optionally `store_traffic_peak` (for Power Hour). Script `scripts/create-store-traffic-peak.ts` can create/ensure the peak table.
- **Retail**: Retail data can be imported (e.g. `import:excel`) into `retail_data` for budget and LY comparison on the schedule.
- **Email**: Optional RTO approve/deny emails via Resend; set `RESEND_API_KEY` and use `api/rto/email`.

---

## Functionality (by area)

### Schedule

- View/edit a week by store and week index. Columns: Employee, WTD hours, Sun–Sat.
- Header row: day names, dates, store hours (with optional week override).
- Rows: daily budget goal, daily LY budget, promotions, workload, then one row per employee (avatar, name, WTD, shift cells).
- Shift cells: time range (e.g. 10AM–6PM), OFF, PTO, COMP, Sick, N/A. Quick-set popover; copy/paste between cells. Paid hours use break deduction (e.g. 8h gross → 7.5h paid).
- Approved RTO/PTO override manual entries and show as OFF/PTO; WTD includes PTO as 8h.
- Coverage: add a row for an employee from another store; their cells show the other store name and are read-only for shift value.
- Budget hours and “Trending hours” rows; “Power Hour” row from traffic peak (busiest window per day); “Actual hours” row (with over-budget highlight).
- Week meta: workload/promotions per day, store hours override, employee order. Delete week clears schedule for that week.
- Export: “Save as image (for email)” produces a PNG of the full schedule (retina, spec colors).

### RTO

- **Submit (public)**: `/rto/submit`. Form: store, name, email, type (RTO/PTO/Partial), date range, note. No login. Inserts `rto_requests` with status `pending`.
- **Dashboard (in-app)**: Leaders see requests for their store(s). Approve/deny with optional leader note. Nav badge shows count of **pending** requests only. On approve, sync runs to schedule and availability; optional email sent.

### Availability

- Per-store, per-user. Select employee; set each day (Sun–Sat) to Open, N/A, or Partial (with start/end times). Scope: ongoing (effective from a date) or “only this week.”
- When viewing “only this week,” approved RTO/PTO for that week are overlaid on the grid (RTO/PTO labels per day).

### Traffic

- Upload Excel; parse weekly and hourly traffic. View tables and any stored peak windows. Peak windows are used on the schedule as “Power Hour” per day. Upload state can be persisted in sessionStorage by store.

### Daily Ops

- Morning wakeup: links (e.g. Cashlog, Returns), no schedule link. By store and date; state in localStorage by store+date.

### Nightly Recap

- Store, date, weather, in-store event (dropdowns), actual sales (currency inputs), narrative sections. Export as PNG. Clean select and input styling; export replaces controls with static content.

### Admin

- User management: create/link users (Supabase auth), assign role and store. OPS/Area Manager see all users; Store Leader sees only their store.

---

## Local setup

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd Brooklinen-Scheduling
   npm install
   ```

2. **Environment**
   Create `.env.local` with:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL` (PostgreSQL connection string from Supabase)
   - `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000`)
   - Optional: `RESEND_API_KEY` for RTO approve/deny emails  
   - Optional: `GOOGLE_CALENDAR_CLIENT_ID` and `GOOGLE_CALENDAR_CLIENT_SECRET` for dashboard Google Calendar (see [docs/GOOGLE_CALENDAR_SETUP.md](docs/GOOGLE_CALENDAR_SETUP.md))

3. **Database**
   ```bash
   npm run db:migrate
   npm run db:seed   # optional
   ```

4. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000). Log in via Supabase (users must exist in `users`; create via Admin or seed).

---

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run db:generate` | Generate Drizzle migrations from schema |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:seed` | Seed database |
| `npm run db:create-peak-table` | Create/ensure `store_traffic_peak` table |
| `npm run import:excel` | Import retail/traffic from Excel |

---

## RTO submit (go live)

The RTO submit form is public (no login). Production URL examples:

- `https://YOUR_APP.vercel.app/rto/submit`
- `https://YOUR_APP.vercel.app/rto/submit?store=101` (pre-select store by id)

Set `NEXT_PUBLIC_APP_URL` in Vercel to the production URL so in-app “Copy link” uses the correct domain. Share the link with store leaders; they can copy it from the RTO tab or the submit page. Pending requests appear in the app with a nav badge; leaders approve/deny there. If `RESEND_API_KEY` is set, employees receive an email on approve/deny.

---

## Security

- Auth is required for all routes except `/login`, `/signup`, and `/rto/submit`.
- Users are created by admins only (no public signup).
- Keep `SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL` server-side only; never commit or expose them.
- API routes validate the current user and enforce role/store scope.
