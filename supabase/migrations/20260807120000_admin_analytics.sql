-- AskBen admin analytics: visitors, security events, product events, is_admin
-- Idempotent. Run in Supabase SQL editor or via supabase db push.

create extension if not exists "pgcrypto";

-- profiles: ensure is_admin exists
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- visitors (page hits + coarse geo from Vercel headers)
create table if not exists public.visitors (
  id            bigserial primary key,
  created_at    timestamptz not null default now(),
  ip_hash       text,
  user_agent    text,
  pathname      text not null default '/',
  referrer      text,
  country       text,
  region        text,
  city          text,
  lat_centroid  double precision,
  lng_centroid  double precision,
  is_bot        boolean not null default false,
  is_suspicious boolean not null default false,
  risk_score    integer not null default 0,
  reason        text,
  user_id       uuid references auth.users (id) on delete set null
);

create index if not exists visitors_created_at_idx on public.visitors (created_at desc);
create index if not exists visitors_pathname_idx on public.visitors (pathname);
create index if not exists visitors_country_idx on public.visitors (country);
create index if not exists visitors_user_id_idx on public.visitors (user_id);
create index if not exists visitors_ip_hash_idx on public.visitors (ip_hash);

-- security_events
create table if not exists public.security_events (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  ip_hash     text,
  event_type  text not null,
  pathname    text,
  user_agent  text,
  country     text,
  risk_score  integer,
  reason      text
);

create index if not exists security_events_created_at_idx on public.security_events (created_at desc);
create index if not exists security_events_type_idx on public.security_events (event_type);

-- product_events (feature usage + funnel steps)
create table if not exists public.product_events (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  user_id     uuid references auth.users (id) on delete set null,
  event_name  text not null,
  pathname    text,
  meta        jsonb not null default '{}'::jsonb
);

create index if not exists product_events_created_at_idx on public.product_events (created_at desc);
create index if not exists product_events_name_idx on public.product_events (event_name);
create index if not exists product_events_user_id_idx on public.product_events (user_id);

-- RLS
alter table public.visitors enable row level security;
alter table public.security_events enable row level security;
alter table public.product_events enable row level security;

-- Helpers: only admins can read analytics tables
create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where user_id = auth.uid() limit 1),
    false
  );
$$;

drop policy if exists visitors_admin_select on public.visitors;
create policy visitors_admin_select on public.visitors
  for select using (public.is_current_user_admin());

drop policy if exists visitors_insert_anon on public.visitors;
create policy visitors_insert_anon on public.visitors
  for insert with check (true);

drop policy if exists security_events_admin_select on public.security_events;
create policy security_events_admin_select on public.security_events
  for select using (public.is_current_user_admin());

drop policy if exists security_events_insert_anon on public.security_events;
create policy security_events_insert_anon on public.security_events
  for insert with check (true);

drop policy if exists product_events_admin_select on public.product_events;
create policy product_events_admin_select on public.product_events
  for select using (public.is_current_user_admin());

drop policy if exists product_events_insert_auth on public.product_events;
create policy product_events_insert_auth on public.product_events
  for insert with check (true);

grant select on public.visitors to authenticated;
grant select on public.security_events to authenticated;
grant select on public.product_events to authenticated;
grant insert on public.visitors to anon, authenticated;
grant insert on public.security_events to anon, authenticated;
grant insert on public.product_events to anon, authenticated;
