# Google Calendar OAuth2 — Setup Guide

## Step 1 — Google Cloud Console Setup

Do these steps **before** running the app with Calendar features.

1. **Open Google Cloud Console**  
   Go to [https://console.cloud.google.com/](https://console.cloud.google.com/).

2. **Create or select a project**  
   - Click the project dropdown at the top (next to "Google Cloud").  
   - Click **New Project**, name it (e.g. "Brooklinen Backstage"), and create it.  
   - Or select an existing project.

3. **Enable the Google Calendar API**  
   - In the left menu go to **APIs & Services** → **Library**.  
   - Search for **Google Calendar API**.  
   - Open it and click **Enable**.

4. **Create OAuth2 credentials**  
   - Go to **APIs & Services** → **Credentials**.  
   - Click **Create Credentials** → **OAuth client ID**.  
   - If prompted, set the **OAuth consent screen**:  
     - User type: **External** (or Internal if it’s a Workspace-only app).  
     - App name, support email, and developer contact as required.  
     - Scopes: add `https://www.googleapis.com/auth/calendar.readonly` (you can add this under "Add or remove scopes" or it will be requested at runtime).  
     - Save.  
   - Back under **Credentials**, create **OAuth client ID** again.  
   - Application type: **Web application**.  
   - Name it (e.g. "Backstage Web").  
   - Under **Authorized redirect URIs** add:
     - **Local dev:** `http://localhost:3000/api/calendar/callback`  
       (If your dev server runs on another port, use that host/port, e.g. `http://localhost:5173/api/calendar/callback`.)  
     - **Production:** `https://YOUR_PRODUCTION_DOMAIN/api/calendar/callback`  
   - Click **Create**.  
   - Copy the **Client ID** and **Client Secret**; you’ll put these in `.env.local` (Step 2).

5. **Scopes to request**  
   The app requests this scope only:  
   `https://www.googleapis.com/auth/calendar.readonly`  
   No other Calendar scopes are required for “read upcoming events.”

---

## Step 2 — Environment Variables

This is a **Next.js** app (not Vite). Use `.env.local` in the project root.

1. **Variable names** (exact):

   ```bash
   GOOGLE_CALENDAR_CLIENT_ID=your_client_id_here
   GOOGLE_CALENDAR_CLIENT_SECRET=your_client_secret_here
   ```

   - `GOOGLE_CALENDAR_CLIENT_ID` — from the OAuth client you created.  
   - `GOOGLE_CALENDAR_CLIENT_SECRET` — from the same OAuth client.  
   - Do **not** commit these. Keep them only in `.env.local` (or your host’s env config).

2. **Add to `.gitignore`**  
   The repo already ignores `.env` and `.env*.local`, so local secrets are not committed. If you add a custom `.env` file, ensure it’s listed in `.gitignore`.

3. **Production**  
   Set the same variable names in your hosting dashboard (e.g. Vercel → Project → Settings → Environment Variables). Use your **production** redirect URI in the Google Cloud Console (see Step 1).
