-- Migration 004: link fixed expense items to the credit card they autopay through.
-- Null means the item is paid from a bank account (checking/debit).
-- on delete set null: if the card is removed, the item reverts to bank-paid.
alter table fixed_items
  add column if not exists paid_via_card_id uuid references credit_cards(id) on delete set null;
