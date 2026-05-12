-- AskBen core schema: idempotent, Supabase-compatible (run after fresh project or alongside existing tables).

create extension if not exists "pgcrypto";

-- ── Helpers: monthly due-day (matches app income-plan logic) ───────────────

create or replace function public.ben_safe_date(y int, m int, d int)
returns date
language plpgsql
immutable
as $$
declare
  last_day int;
begin
  last_day := extract(day from (make_date(y, m, 1) + interval '1 month - 1 day'))::int;
  return make_date(y, m, least(d, last_day));
end;
$$;

create or replace function public.ben_next_monthly_due(p_due_day int, refd date)
returns date
language plpgsql
immutable
as $$
declare
  y int;
  m int;
  this_d date;
  nexty int;
  nextm int;
begin
  if p_due_day is null or p_due_day < 1 or p_due_day > 31 then
    return null;
  end if;

  y := extract(year from refd)::int;
  m := extract(month from refd)::int;
  this_d := public.ben_safe_date(y, m, p_due_day);

  if this_d >= refd then
    return this_d;
  end if;

  if m = 12 then
    nexty := y + 1;
    nextm := 1;
  else
    nexty := y;
    nextm := m + 1;
  end if;

  return public.ben_safe_date(nexty, nextm, p_due_day);
end;
$$;

-- ── Tables ────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  target numeric not null default 0,
  category text,
  due_date date,
  due_day int,
  is_monthly boolean default false,
  monthly_target numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind text default 'credit',
  balance numeric not null default 0,
  min_payment numeric,
  monthly_min_payment numeric,
  due_date date,
  apr numeric,
  credit_limit numeric,
  note text,
  is_monthly boolean default false,
  due_day int,
  created_at timestamptz not null default now()
);

create table if not exists public.income_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.income_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_name text not null,
  amount numeric not null default 0,
  date_iso date not null,
  note text,
  allocations jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.spend_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  merchant text,
  amount numeric not null default 0,
  category text not null default 'misc',
  date_iso date not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric not null default 0,
  date_iso date not null,
  merchant text,
  note text,
  bill_id uuid references public.bills (id) on delete set null,
  debt_id uuid references public.debts (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.side_hustles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  income_type text not null,
  rate numeric not null default 0,
  planned_quantity numeric not null default 0,
  note text,
  created_at timestamptz not null default now()
);

-- ── Auth: profile row ─────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', '')
  )
  on conflict (user_id) do nothing;

  return NEW;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.bills enable row level security;
alter table public.debts enable row level security;
alter table public.income_sources enable row level security;
alter table public.income_entries enable row level security;
alter table public.spend_entries enable row level security;
alter table public.payments enable row level security;
alter table public.side_hustles enable row level security;

-- Drop & recreate policies (idempotent naming)
do $$
declare
  pol record;
begin
  for pol in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles', 'bills', 'debts', 'income_sources', 'income_entries',
        'spend_entries', 'payments', 'side_hustles'
      )
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

create policy profiles_own on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy bills_own on public.bills
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy debts_own on public.debts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy income_sources_own on public.income_sources
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy income_entries_own on public.income_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy spend_entries_own on public.spend_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy payments_own on public.payments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy side_hustles_own on public.side_hustles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
