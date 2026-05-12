-- Compatibility + Ben analytics views (security_invoker so RLS on base tables applies).

-- debt_status: used by payments page
create or replace view public.debt_status
with (security_invoker = true) as
select
  d.id,
  d.user_id,
  d.name,
  d.balance as remaining_balance
from public.debts d;

-- buckets: legacy dashboard alias → bills
create or replace view public.buckets
with (security_invoker = true) as
select
  b.id,
  b.user_id,
  b.name,
  b.due_date,
  'bill'::text as kind,
  b.category
from public.bills b;

-- income: legacy forecast table name → income_entries
create or replace view public.income
with (security_invoker = true) as
select
  e.id,
  e.user_id,
  e.amount,
  e.date_iso,
  e.source_name,
  e.note
from public.income_entries e;

-- obligations: legacy aggregate (monthly-style obligations snapshot)
create or replace view public.obligations
with (security_invoker = true) as
select
  gen_random_uuid() as id,
  x.user_id,
  x.amt as amount
from (
  select
    b.user_id,
    sum(coalesce(b.monthly_target, b.target, 0)::numeric) as amt
  from public.bills b
  group by b.user_id
  union all
  select
    d.user_id,
    sum(coalesce(d.monthly_min_payment, d.min_payment, 0)::numeric) as amt
  from public.debts d
  group by d.user_id
) x;

-- ben_master: dashboard totals (matches app/dashboard net definition)
create or replace view public.ben_master
with (security_invoker = true) as
with
  inc as (
    select user_id, sum(amount)::numeric as total_income
    from public.income_entries
    group by user_id
  ),
  spd as (
    select user_id, sum(amount)::numeric as total_spend
    from public.spend_entries
    group by user_id
  ),
  db as (
    select
      user_id,
      sum(balance)::numeric as total_debt_balance,
      sum(coalesce(monthly_min_payment, min_payment, 0)::numeric) as total_debt_minimums
    from public.debts
    group by user_id
  ),
  uids as (
    select user_id from inc
    union select user_id from spd
    union select user_id from db
    union select user_id from public.bills
    union select user_id from public.payments
  )
select
  u.user_id,
  coalesce(i.total_income, 0)::numeric as total_income,
  coalesce(s.total_spend, 0)::numeric as total_spend,
  coalesce(d.total_debt_balance, 0)::numeric as total_debt_balance,
  coalesce(d.total_debt_minimums, 0)::numeric as total_debt_minimums,
  (coalesce(i.total_income, 0) - coalesce(s.total_spend, 0) - coalesce(d.total_debt_balance, 0))::numeric as net,
  (coalesce(s.total_spend, 0) + coalesce(d.total_debt_minimums, 0))::numeric as total_obligations,
  greatest(
    0::numeric,
    (coalesce(s.total_spend, 0) + coalesce(d.total_debt_minimums, 0) - coalesce(i.total_income, 0))::numeric
  ) as income_gap
from uids u
left join inc i on i.user_id = u.user_id
left join spd s on s.user_id = u.user_id
left join db d on d.user_id = u.user_id;

-- ben_weekly: matches app/income-plan “gap this week” definition
create or replace view public.ben_weekly
with (security_invoker = true) as
with
  w as (
    select current_date as d0, (current_date + 6) as d1
  ),
  uids as (
    select user_id from public.income_entries
    union select user_id from public.spend_entries
    union select user_id from public.payments
    union select user_id from public.bills
    union select user_id from public.debts
  ),
  inc as (
    select user_id, sum(amount)::numeric as income_all
    from public.income_entries
    group by user_id
  ),
  spd as (
    select user_id, sum(amount)::numeric as spend_all
    from public.spend_entries
    group by user_id
  ),
  pay as (
    select user_id, sum(amount)::numeric as payments_all
    from public.payments
    group by user_id
  ),
  bill_due as (
    select
      b.user_id,
      sum(coalesce(b.monthly_target, b.target, 0)::numeric) as bills_week
    from public.bills b, w
    where coalesce(
      b.due_date,
      case
        when b.is_monthly and b.due_day is not null
          then public.ben_next_monthly_due(b.due_day, w.d0)
      end
    ) >= w.d0
      and coalesce(
        b.due_date,
        case
          when b.is_monthly and b.due_day is not null
            then public.ben_next_monthly_due(b.due_day, w.d0)
        end
      ) <= w.d1
    group by b.user_id
  ),
  debt_due as (
    select
      d.user_id,
      sum(coalesce(d.monthly_min_payment, d.min_payment, 0)::numeric) as debts_week
    from public.debts d, w
    where coalesce(
      d.due_date,
      case
        when d.is_monthly and d.due_day is not null
          then public.ben_next_monthly_due(d.due_day, w.d0)
      end
    ) >= w.d0
      and coalesce(
        d.due_date,
        case
          when d.is_monthly and d.due_day is not null
            then public.ben_next_monthly_due(d.due_day, w.d0)
        end
      ) <= w.d1
    group by d.user_id
  )
select
  u.user_id,
  w.d0 as window_start,
  w.d1 as window_end,
  coalesce(bd.bills_week, 0)::numeric as bills_due_week,
  coalesce(dd.debts_week, 0)::numeric as debts_due_week,
  coalesce(i.income_all, 0)::numeric as income_all,
  coalesce(s.spend_all, 0)::numeric as spend_all,
  coalesce(p.payments_all, 0)::numeric as payments_all,
  (
    coalesce(bd.bills_week, 0) + coalesce(dd.debts_week, 0)
    + coalesce(s.spend_all, 0) + coalesce(p.payments_all, 0)
    - coalesce(i.income_all, 0)
  )::numeric as gap_week
from uids u
cross join w
left join inc i on i.user_id = u.user_id
left join spd s on s.user_id = u.user_id
left join pay p on p.user_id = u.user_id
left join bill_due bd on bd.user_id = u.user_id
left join debt_due dd on dd.user_id = u.user_id;

-- ben_cash_trajectory: 31-day liquidity projection from trailing 7-day cadence + ben_master.net
create or replace view public.ben_cash_trajectory
with (security_invoker = true) as
with
  w as (
    select
      current_date - 6 as d_start,
      current_date as d_end
  ),
  daily as (
    select
      u.user_id,
      coalesce((
        select sum(e.amount)::numeric / 7.0
        from public.income_entries e, w
        where e.user_id = u.user_id
          and e.date_iso between w.d_start and w.d_end
      ), 0) as daily_in,
      coalesce((
        select sum(e.amount)::numeric / 7.0
        from public.spend_entries e, w
        where e.user_id = u.user_id
          and e.date_iso between w.d_start and w.d_end
      ), 0)
      + coalesce((
        select sum(e.amount)::numeric / 7.0
        from public.payments e, w
        where e.user_id = u.user_id
          and e.date_iso between w.d_start and w.d_end
      ), 0) as daily_out
    from (select distinct user_id from public.ben_master) u
  )
select
  bm.user_id,
  g.n::int as day_offset,
  (current_date + g.n) as on_date,
  (
    bm.net::numeric
    + g.n::numeric * (coalesce(d.daily_in, 0) - coalesce(d.daily_out, 0))
  )::numeric as projected_balance
from public.ben_master bm
left join daily d on d.user_id = bm.user_id
cross join generate_series(0, 30) as g(n);

grant select on public.debt_status to authenticated;
grant select on public.buckets to authenticated;
grant select on public.income to authenticated;
grant select on public.obligations to authenticated;
grant select on public.ben_master to authenticated;
grant select on public.ben_weekly to authenticated;
grant select on public.ben_cash_trajectory to authenticated;
