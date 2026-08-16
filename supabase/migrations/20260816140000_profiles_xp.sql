-- Ensure progression columns exist on profiles (safe to re-run).
alter table public.profiles
  add column if not exists xp integer not null default 0;

alter table public.profiles
  add column if not exists level integer not null default 1;

alter table public.profiles
  add column if not exists reputation integer not null default 0;
