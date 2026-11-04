-- Ensure bills.kind exists and is non-null for bill inserts.
-- Schema drift: live DB has NOT NULL kind; tracked migrations did not add it.

alter table public.bills
  add column if not exists kind text;

update public.bills
  set kind = 'bill'
  where kind is null;

alter table public.bills
  alter column kind set default 'bill';

alter table public.bills
  alter column kind set not null;
