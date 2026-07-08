# WE Bonus Tracker

Internal PWA for Wichita Endodontics leadership to track adjusted production,
quarterly staff bonus progress, and Drive for Nine qualification status.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Postgres/Auth
- PWA manifest and service worker

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase Setup

Create a Supabase project, then copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Run the SQL files in order:

```text
supabase/schema.sql
supabase/seed.sql
```

The seed file creates Wichita Endodontics, 2026 S1P revenue goals, bonus tiers,
April Drive for Nine result, May schedule capacity, and May production entries
imported from the workbook.

## Security Setup

Access is invite-only through Supabase Auth. Set these in Supabase before sending
production invites:

- Authentication > URL Configuration > Site URL: your Vercel production URL
- Authentication > URL Configuration > Redirect URLs: add
  `https://your-vercel-domain/auth/set-password`
- Authentication > Providers > Email > Email OTP Expiration: `86400` seconds
  for a 24-hour invite/password setup link

Roles:

- Admin: can invite office managers, doctors, leadership, and staff; can save
  production entries
- Office Manager: can invite doctors, leadership, and staff; can save production
  entries
- Doctor: can view all tracker pages
- Leadership: can view all tracker pages
- Staff: reserved for future staff access

Admins and office managers can resend expired setup links from the Admin user
table. Signed-in users can change their own password from Account.

## Push Notifications

The app can send a midday "no production entered yet" reminder on workdays and
a Monday morning month-status summary. Without the env vars below the app runs
normally and the Account page explains that notifications are not configured.

1. Generate a VAPID key pair once:

   ```bash
   npx web-push generate-vapid-keys
   ```

2. Add to the environment (Vercel project settings and `.env.local`):

   ```bash
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=   # public key from step 1
   VAPID_PRIVATE_KEY=              # private key from step 1
   VAPID_SUBJECT=mailto:you@example.com
   CRON_SECRET=                    # any long random string
   ```

3. Deploy. `vercel.json` schedules `/api/cron/notifications` hourly; Vercel
   automatically sends `Authorization: Bearer $CRON_SECRET` to cron routes.
   Each run compares the practice's `notification_settings` times (defaults:
   reminder at 12:00, Monday summary at 08:00, both America/Chicago) against
   the current hour, so daylight saving needs no cron changes.

4. Each user enables notifications per device from Account > Notifications
   (on iPhone/iPad the app must be added to the Home Screen first) and can
   send themselves a test notification from the same card.

Recipients are practice users with `notifications_enabled` on their profile;
staff are excluded unless `notification_settings.notify_staff` is true.

## CSV Exports

The History page offers `Monthly CSV` (goals, actuals, official S1P numbers)
and `Daily entries CSV` (per-day production) downloads for reconciliation.

## Verification

```bash
npm run lint
npm run build
```
