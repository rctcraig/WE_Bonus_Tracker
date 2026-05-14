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
```

Run the SQL files in order:

```text
supabase/schema.sql
supabase/seed.sql
```

The seed file creates Wichita Endodontics, 2026 S1P revenue goals, bonus tiers,
April Drive for Nine result, May schedule capacity, and May production entries
imported from the workbook.

## Verification

```bash
npm run lint
npm run build
```
