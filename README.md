# AskBen — Personal Finance Triage with a Colonial Counselor

[![Live Demo](https://img.shields.io/badge/Live-askben.buzz-blue?style=for-the-badge)](https://www.askben.buzz)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-green?style=for-the-badge&logo=supabase)](https://supabase.com)

**AskBen ranks your bills, debts, and payments, then tells you the next useful move — without a bank login or a lecture.**

Live at **[askben.buzz](https://www.askben.buzz)**

> ⭐ Star this repo if you want more practical, no-judgment finance tools for real people.

---

## What it does

- **Triage first.** Bills and debts get a priority, not a guilt trip.
- **Ben talks.** Four voices (encouraging, funny, direct, governor). Advice stays specific.
- **Ledger you control.** You type what you want. No bank passwords. No SSN.
- **Progress that sticks.** Payments, streaks, XP, and Franklin’s Landing.

## First-run path

1. Sign up
2. Choose how Ben should speak
3. Add one bill (or debt) so the engine has something to rank
4. Ask Ben what to do this week

The 3D town (`/world`) is the reward loop. The ledger is the product.

## Stack

Next.js 14 · React 18 · Supabase · Stripe · OpenAI · Zustand · Three.js

## Local development

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

## Links

- [Privacy](https://www.askben.buzz/privacy)
- [Terms](https://www.askben.buzz/terms)
- [Security](https://www.askben.buzz/security)
- Support: support@askben.buzz

---

Built in Minnesota. Open to collaborators who care about practical tools for real financial stress.
