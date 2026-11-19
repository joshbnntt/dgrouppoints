# D-Group Points — Remix 3 + Google Sheets + Vercel

Only dependency: `remix`. No bundler, no build step.

## Sheet
Tab `Roster`, header in row 1, one teen per row:

| A Name | B Team | C Game | D Scripture Memory | E Character Trait | F Trait Verse | G Study |
|---|---|---|---|---|---|---|
| Sarah Kate | Light Stalkers | 0 | 0 | 0 | 0 | 0 |

Cells are running totals.

Categories (name, short label, points per tap, show/hide) live on a **Categories** tab, created automatically on first run. Admins edit them at **/admin/categories**; row order there matches the Roster columns from C onward.

## Google Cloud
1. Enable the **Google Sheets API**.
2. **Service account** → JSON key → `client_email` / `private_key` into env. Share the sheet with that email (Editor).
3. **OAuth client (Web)** → redirect URIs: `http://localhost:3000/auth/google/callback` and `https://YOUR-APP.vercel.app/auth/google/callback`.

## Run locally (Node 24+)
```
cp .env.example .env   # fill in
npm install
npm run dev            # http://localhost:3000
```

## Deploy
Push to GitHub → import in Vercel (Framework Preset: **Other**) → add the env vars (set `APP_ORIGIN` to your production URL) → deploy.
`api/index.ts` exports the router as a fetch handler and `vercel.json` rewrites every path to it.

## Install as an app
Open the site on a phone: iPhone Safari → Share → **Add to Home Screen**; Android Chrome → menu → **Install app**. The scoreboard shows the last loaded scores when offline.

## Admins
`ADMIN_EMAIL` accepts several comma-separated Google accounts. While the OAuth consent screen is in *Testing*, each admin must also be added there as a test user.

## Security
`/` is public read-only. `/admin` and `POST /admin/score` require a session created by Google login for `ADMIN_EMAIL` (verified email). Cookie is signed, httpOnly, SameSite=Lax.
