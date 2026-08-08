-- Optional label on other_spend so cash/debit entries can note what they were for.
-- Safe to run on a live database. Run in the Supabase SQL Editor.

alter table other_spend
  add column if not exists label text not null default '';
