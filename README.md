# AskBen

Personal finance triage with a colonial counselor named Ben.

Live: [money-control-saas.vercel.app](https://money-control-saas.vercel.app)

AskBen ranks bills, debts, income, and payments, then tells you the next useful move — without a bank login or a lecture.

## What it does

- **Triage first.** Bills and debts get a priority, not a guilt trip.
- **Ben talks.** Four voices (encouraging, funny, direct, governor). Advice stays specific.
- **Ledger you control.** You type what you want. No bank passwords. No SSN.
- **Progress that sticks.** Payments, streaks, XP, and Franklin’s Landing.

## First-run path (polished)

1. Sign up
2. Choose how Ben should speak
3. Add one bill (or debt) so the engine has something to rank
4. Ask Ben what to do this week

The 3D town (`/world`) is the reward loop. The ledger is the product.

## Stack

Next.js 14 · React 18 · Supabase · Stripe · OpenAI · Zustand · Three.js

## Local

```bash
npm install
cp .env.example .env.local   # if present; otherwise set the vars below
npm run dev
```

Required env:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server routes)
- `OPENAI_API_KEY` (Ask Ben)
- `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (paid plans)

Apply migrations in `supabase/migrations/` before expecting AI quotas or XP columns.

## Product rule

If a new user cannot add a bill and hear one next step in under two minutes, the colonial town can wait.
