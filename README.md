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

## Verification

```bash
npm run lint
npm run build
```
