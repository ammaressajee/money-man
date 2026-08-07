-- Split wealth-building into three kinds: saving, investment, retirement.
-- Safe to run on a live database — existing rows are untouched and stay valid.
-- Run in the Supabase SQL Editor (Dashboard > SQL Editor > New query).

alter table fixed_items drop constraint if exists fixed_items_kind_check;
alter table fixed_items add constraint fixed_items_kind_check
  check (kind in ('expense','saving','investment','retirement'));

-- Optional: auto-reclassify obvious retirement accounts.
-- Review the names first, then uncomment and run if they look right:
-- update fixed_items set kind = 'retirement'
--   where kind = 'investment'
--   and (name ilike '%roth%' or name ilike '%401%' or name ilike '%ira %' or name ilike '% ira%' or name ilike 'ira');
