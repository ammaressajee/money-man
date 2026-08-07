-- Migration: enforce one statement row per card per closing date
-- Run this in the Supabase SQL Editor BEFORE deploying the app update.
--
-- Step 1: Remove duplicates, keeping the most recently created row for each (card, date) pair.
delete from card_statements a
using card_statements b
where a.card_id = b.card_id
  and a.statement_date = b.statement_date
  and a.created_at < b.created_at;

-- Step 2: Add unique constraint so the app can safely upsert going forward.
alter table card_statements
  add constraint card_statements_card_id_statement_date_key
  unique (card_id, statement_date);
