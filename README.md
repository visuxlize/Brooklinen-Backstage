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

## RTO submission page (go live)

The **Request Time Off** form is public (no login). Associates can submit RTO/PTO/Partial requests; store leaders approve or deny in Backstage.

**Production URL (after deploy):**
- General: `https://YOUR_APP.vercel.app/rto/submit`
- Per store (form pre-selects store): `https://YOUR_APP.vercel.app/rto/submit?store=101` (use store id: 101–109)

**To go live:**
1. Set **`NEXT_PUBLIC_APP_URL`** in Vercel to your production URL (e.g. `https://brooklinen-backstage.vercel.app`) so “Copy link” in the app uses the correct domain.
2. Share the link with store leaders; they can copy the form link from the RTO tab (per store) or from the “Share this form” section on the submit page.
3. Store leaders open **RTO** in Backstage to see pending requests and approve/deny; employees get email if **RESEND_API_KEY** is set.

---

## Security

- Auth required for all routes except `/login` and RTO submit.
- Users are created by admins only (no public signup).
- Keep `SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL` server-side only; never commit or expose them.
