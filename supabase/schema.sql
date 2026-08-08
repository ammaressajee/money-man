-- Money Man — Supabase schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query).

-- Fixed recurring costs — expenses AND wealth contributions, distinguished by `kind`:
--   'expense'    → spending (rent, insurance, subscriptions…)
--   'saving'     → cash savings (HYSA, emergency fund…)
--   'investment' → brokerage / taxable investing
--   'retirement' → Roth IRA, 401(k), HSA…
create table fixed_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,                     -- e.g. "Rent", "Car Insurance", "Roth IRA", "Spotify"
  amount numeric not null,
  frequency text not null check (frequency in ('monthly','annual')),
  category text not null,                 -- e.g. 'Housing','Insurance','Subscriptions','Utilities','Investing','Other'
  kind text not null check (kind in ('expense','saving','investment','retirement')),
  owner text not null check (owner in ('ammar','fiancee','joint')),
  active boolean default true,
  created_at timestamptz default now()
);

-- Recurring paychecks
create table income_sources (
  id uuid primary key default gen_random_uuid(),
  owner text not null check (owner in ('ammar','fiancee')),
  label text not null,                    -- e.g. "Biweekly Paycheck", "Bonus"
  amount numeric not null,                -- net amount landing in personal checking + savings combined
  frequency text not null check (frequency in ('monthly','biweekly','annual','one_time')),
  auto_savings_amount numeric default 0,  -- fixed $ auto-transferred to personal savings per paycheck
  active boolean default true,
  created_at timestamptz default now()
);

-- Credit cards
create table credit_cards (
  id uuid primary key default gen_random_uuid(),
  name text not null,                     -- e.g. "Chase Sapphire"
  owner text not null check (owner in ('ammar','fiancee')),
  active boolean default true,
  created_at timestamptz default now()
);

-- One row per statement cycle per card
create table card_statements (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references credit_cards(id) on delete cascade,
  statement_date date not null,           -- closing date of the statement
  balance numeric not null,               -- amount owed that cycle (full cycle balance, not payment amount)
  created_at timestamptz default now(),
  constraint card_statements_card_id_statement_date_key unique (card_id, statement_date)
);

-- Debit/cash spend not on a tracked credit card (one or more rows per person per month)
create table other_spend (
  id uuid primary key default gen_random_uuid(),
  owner text not null check (owner in ('ammar','fiancee')),
  month date not null,                    -- first of the month this entry covers
  amount numeric not null,
  label text not null default '',         -- optional note, e.g. "farmer's market cash"
  created_at timestamptz default now()
);

-- Row Level Security: single shared household login, so any authenticated
-- user gets full access. No per-row ownership needed.
alter table fixed_items enable row level security;
alter table income_sources enable row level security;
alter table credit_cards enable row level security;
alter table card_statements enable row level security;
alter table other_spend enable row level security;

create policy "household full access" on fixed_items
  for all to authenticated using (true) with check (true);
create policy "household full access" on income_sources
  for all to authenticated using (true) with check (true);
create policy "household full access" on credit_cards
  for all to authenticated using (true) with check (true);
create policy "household full access" on card_statements
  for all to authenticated using (true) with check (true);
create policy "household full access" on other_spend
  for all to authenticated using (true) with check (true);

-- After running this:
-- 1. Dashboard > Authentication > Users > Add user: create ONE shared
--    email/password user for the household (disable "send invite email",
--    set the password directly). No sign-up flow exists in the app.
-- 2. Dashboard > Authentication > Sign In / Up: disable public sign-ups.
