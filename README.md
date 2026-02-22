# Brooklinen Backstage

Internal management tool for Brooklinen — scheduling, daily ops, and retail operations.

**Private / internal use only.** No public signup; access is managed by admins.

---

## Tech stack

- **Next.js 15** (App Router)
- **Supabase** (PostgreSQL, Auth)
- **Drizzle ORM**
- **Tailwind CSS**
- **TypeScript**

---

## Local setup

1. **Clone and install**
   ```bash
   git clone https://github.com/visuxlize/Brooklinen-Backstage.git
   cd Brooklinen-Backstage
   npm install
   ```

2. **Environment**
   - Create `.env.local` with: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000`).

3. **Database**
   ```bash
   npm run db:migrate
   npm run db:seed   # optional: seed data
   ```

4. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:seed` | Seed database (uses `.env.local`) |
| `npm run import:excel` | Import retail/traffic from Excel (uses `.env.local`) |

---

## Security

- Auth required for all routes except `/login` and RTO submit.
- Users are created by admins only (no public signup).
- Keep `SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL` server-side only; never commit or expose them.
