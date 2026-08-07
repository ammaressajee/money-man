# Our Money

A shared monthly money snapshot for two. Income in, fixed costs out, one card
balance per statement cycle — and a clear headline: how much you saved and
invested this month.

Not a budgeting app. No transaction imports, no category-by-category logging.

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- Recharts
- Supabase (Postgres + Auth)
- Netlify (hosting)

## Run locally

```bash
npm install
npm run dev
```

With no env vars set, the app runs in **demo mode**: you're signed in
automatically and see realistic seed data (persisted in localStorage) so you
can explore every screen. Connect Supabase to go live.

## Connect Supabase (go live)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the contents of `supabase/schema.sql`, and run it.
   This creates the five tables, unique constraints, and RLS policies.
3. **Authentication > Users > Add user**: create ONE shared email/password user
   for the household (set the password directly). Then under
   **Authentication > Sign In / Up**, disable public sign-ups.
4. Copy `.env.example` to `.env` and fill in from
   **Project Settings > API**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Restart `npm run dev` and sign in with the shared credentials.

### Migrating an existing database

If you created the database before this update, run the migration to enforce
card-statement uniqueness (prevents double-counting spend):

```sql
-- supabase/migrations/001_card_statements_unique.sql
-- Open SQL Editor in Supabase Dashboard and paste this file's contents.
```

The migration deduplicates any existing rows (keeping the newest per card/date)
before adding the constraint, so it is safe to run on live data.

## Deploy to Netlify

1. Push this repo to GitHub.
2. In Netlify: **Add new site > Import an existing project**, pick the repo.
   Build settings are read from `netlify.toml` (build `npm run build`,
   publish `dist`).
3. Add the two `VITE_SUPABASE_*` environment variables under
   **Site configuration > Environment variables**.
4. Deploy, then open the site on your phones and sign in.

## How money flows

Open **How money flows** in the app (`/flow`) for a live diagram of accounts and
arrows. Teal = wealth-building (what the hero number counts). Orange = spending.
Joint contributions scale with each partner's income.

```mermaid
flowchart TB
  classDef account fill:#ffffff,stroke:#99a5a0,stroke-width:1.5px,color:#172723
  classDef wealth fill:#e4f0ed,stroke:#0e7a6d,stroke-width:1.5px,color:#0a5a50
  classDef spend fill:#f6ebe4,stroke:#b96a45,stroke-width:1.5px,color:#7a3f26
  classDef inflow fill:#172723,stroke:#172723,color:#ffffff

  subgraph AMMAR[" Ammar "]
    APAY([Paycheck]):::inflow --> ACHK[Personal Checking]:::account
    ACHK -- auto-transfer --> ASAV[Personal Savings]:::wealth
    ACHK --> AROTH[Roth IRA]:::wealth
    ACHK --> ABILLS[Car note · Insurance]:::spend
    ACHK -- pay statement --> ACC[Credit Cards]:::spend
  end

  subgraph FIANCEE[" Bethany "]
    FPAY([Paycheck]):::inflow --> FCHK[Personal Checking]:::account
    FCHK -- auto-transfer --> FSAV[Personal Savings]:::wealth
    FCHK --> FROTH[Roth IRA]:::wealth
    FCHK --> FBILLS[Car note · Insurance]:::spend
    FCHK -- pay statement --> FCC[Credit Cards]:::spend
  end

  ACHK -- "share ∝ income" --> JOINT[Joint Checking]:::account
  FCHK -- "share ∝ income" --> JOINT
  JOINT --> SHARED[Rent · Utilities · Shared subs]:::spend
```

## How the numbers work

- Everything is normalized to monthly: biweekly × 26⁄12, annual ÷ 12.
- Joint costs are split **proportionally to each partner's income**, recomputed
  live from entered income — not a hardcoded 50/50.
- Auto-savings transfers and investment items (e.g. Roth IRA) count as
  **Saved & Invested** — never as expenses.
- Card statements count toward the month their closing date falls in.
- "Other spend" is a single monthly estimate per person for debit/cash
  spending that didn't hit a tracked card.
- One-time income counts in the month it was entered.

## Local verification

```bash
npm run verify    # sanity-checks the summary math against hand-computed values
npm run build     # TypeScript compile + production bundle
npm run lint      # lint the source
```

## Project structure

```
src/
  components/   UI building blocks (dashboard cards, charts, manage forms)
  hooks/        Auth, household data context, useMonthlySummary
  lib/          Supabase client, data API (live + demo), money math, summaries
  pages/        Login, Dashboard, ManageData
  types/        Database row types
supabase/       schema.sql — run in the Supabase SQL editor
```
