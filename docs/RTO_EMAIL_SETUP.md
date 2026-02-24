# RTO Email Notifications — Setup Guide

This guide gets the Request Time Off (RTO) email system working: **submission notifications to store leaders** and **approval/denial emails to employees**. The app uses [Resend](https://resend.com) to send mail.

---

## 1. Create a Resend account

1. Go to **[resend.com](https://resend.com)** and sign up (or log in).
2. Verify your email if prompted.

---

## 2. Get your API key

1. In the Resend dashboard, open **API Keys** (in the sidebar or under **Integrations**).
2. Click **Create API Key**.
3. Name it (e.g. `Brooklinen Backstage`), choose **Full access** or **Sending access**.
4. Copy the key (it starts with `re_`). You won’t see it again.

---

## 3. Set up your sending domain

**You cannot use `brooklinen-backstage.vercel.app` (or any `*.vercel.app` URL) as a sending domain.** Resend (and other providers) require you to add DNS records (MX, SPF, DKIM) on the domain you send from. You don’t control `vercel.app`, so you can’t add those records there. Use one of the options below.

**Option A — Use Resend’s domain (easiest, works right away)**  
- After signup, Resend lets you send from **their** domain (e.g. `onboarding@resend.dev`).  
- In Resend: **Domains** → check the default domain they give you (often `resend.dev`).  
- In your app, set `EMAIL_FROM` to an address on that domain, for example:  
  `Brooklinen Backstage <onboarding@resend.dev>`  
- No DNS setup. Fine for testing and low volume; the “From” address will show `@resend.dev` instead of your brand.

**Option B — Use your own domain (e.g. brooklinen.com) for production**  
1. In Resend: **Domains** → **Add Domain**.
2. Enter a domain **you control** (e.g. `brooklinen.com` or a subdomain like `notifications.brooklinen.com`). Do **not** use `*.vercel.app`.
3. Add the DNS records Resend shows (MX, SPF, DKIM) at your DNS provider (e.g. Cloudflare, GoDaddy, your registrar).
4. Wait until Resend shows the domain as **Verified**.
5. Set `EMAIL_FROM` to something like:  
   `Brooklinen Backstage <notifications@brooklinen.com>`

---

## 4. Environment variables

In your project root, create or edit **`.env.local`** (this file is gitignored).

**Required for RTO emails**

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
```

Use the API key you copied in step 2.

**Optional — FROM address**

You **must** use an address on a domain Resend can send from (their default domain or a domain you added in Resend). You **cannot** use `@brooklinen-backstage.vercel.app` or any `@*.vercel.app` address.

If you don’t set `EMAIL_FROM`, the app falls back to a default (see code). To set it explicitly:

```bash
# Use Resend’s default domain (after signup they show you the allowed address, e.g. onboarding@resend.dev):
EMAIL_FROM="Brooklinen Backstage <onboarding@resend.dev>"

# Or, after verifying your own domain (e.g. brooklinen.com) in Resend:
EMAIL_FROM="Brooklinen Backstage <notifications@brooklinen.com>"
```

Use the exact “From” email Resend shows for your verified/default domain.

**Reminder**

- Don’t commit `.env.local`. The repo already ignores `.env` and `.env*.local`.
- On Vercel (or your host), add the same variables in **Project → Settings → Environment Variables**.

---

## 5. Who gets emails

**Submission (employee submits RTO at `/rto/submit`)**  
- The app finds all **store leaders** for that request’s store: users with `store_id` = request’s store and `role` = `leader` or `store_leader`.
- Each leader receives one email at their **user record email** (the `email` column in the `users` table).
- **Reply-To** is the submitting employee’s email.

**Approval / Denial (leader approves or denies in `/rto`)**  
- One email is sent to the **employee’s email** (the one they entered on the RTO form, stored on the request).
- **From** shows: `[Leader Name] via Brooklinen Backstage <your FROM address>`.
- **Reply-To** is the leader’s email (from the logged-in user’s record).

So:

- **Leaders** must exist in the `users` table with the correct `store_id` and `role` (`leader` or `store_leader`) and a valid `email`.
- **Employees** enter their own email on the public RTO form; that’s who receives the approve/deny email.

---

## 6. Quick test

1. Start the app: `npm run dev`.
2. **Test submission notification**
   - Open `/rto/submit`, pick a store that has at least one leader in `users`, and submit a request with a valid email.
   - Check the leader’s inbox (and spam). You should see “New Time Off Request” with the employee name and a “Review Request” link.
3. **Test approval email**
   - Log in as a store leader, go to `/rto`, and approve or deny the request.
   - Check the employee’s inbox. You should see “Approved” or “Request Not Approved” with the leader’s name and “View My Requests” link.

If no email arrives:

- Check the terminal/console for `[RTO email]` logs (success or failure).
- In Resend dashboard, open **Logs** to see sends and bounces.
- Confirm `RESEND_API_KEY` is set in `.env.local` and that you’re sending from an allowed address (verified domain or Resend’s default).

---

## 7. Summary checklist

- [ ] Resend account created  
- [ ] API key created and copied  
- [ ] `RESEND_API_KEY` in `.env.local` (and in production env)  
- [ ] (Optional) `EMAIL_FROM` or `NOTIFICATIONS_EMAIL_FROM` in `.env.local` if you want a custom FROM  
- [ ] (Production) Domain added and verified in Resend if you use a custom FROM  
- [ ] Store leaders in `users` with correct `store_id`, `role`, and `email`  
- [ ] Test submit → leader gets email  
- [ ] Test approve/deny → employee gets email  

Once this is done, RTO submission and decision emails will run automatically for all stores and users.
