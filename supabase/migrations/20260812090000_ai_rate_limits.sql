-- Authenticated AskBen quotas. Counters are private and can only be consumed
-- through the security-definer function using the caller's auth.uid().

create table if not exists public.ai_rate_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null check (bucket in ('minute', 'day')),
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, bucket, window_started_at)
);

alter table public.ai_rate_counters enable row level security;

revoke all on public.ai_rate_counters from anon, authenticated;

create or replace function public.consume_ai_quota(
  p_minute_limit integer default 12,
  p_daily_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_minute_start timestamptz;
  v_day_start timestamptz;
  v_minute_count integer;
  v_daily_count integer;
  v_retry integer;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_minute_limit < 1 or p_minute_limit > 1000
     or p_daily_limit < 1 or p_daily_limit > 100000 then
    raise exception 'invalid quota limits' using errcode = '22023';
  end if;

  v_minute_start := date_trunc('minute', v_now);
  v_day_start := date_trunc('day', v_now);

  delete from public.ai_rate_counters
  where user_id = v_user_id
    and window_started_at < v_day_start - interval '2 days';

  insert into public.ai_rate_counters (
    user_id,
    bucket,
    window_started_at,
    request_count
  ) values (
    v_user_id,
    'minute',
    v_minute_start,
    1
  )
  on conflict (user_id, bucket, window_started_at)
  do update set request_count = ai_rate_counters.request_count + 1
  where ai_rate_counters.request_count < p_minute_limit
  returning request_count into v_minute_count;

  if v_minute_count is null then
    v_retry := greatest(
      1,
      ceil(extract(epoch from (v_minute_start + interval '1 minute' - v_now)))::integer
    );
    return jsonb_build_object(
      'allowed', false,
      'minute_remaining', 0,
      'daily_remaining', 0,
      'retry_after_seconds', v_retry
    );
  end if;

  insert into public.ai_rate_counters (
    user_id,
    bucket,
    window_started_at,
    request_count
  ) values (
    v_user_id,
    'day',
    v_day_start,
    1
  )
  on conflict (user_id, bucket, window_started_at)
  do update set request_count = ai_rate_counters.request_count + 1
  where ai_rate_counters.request_count < p_daily_limit
  returning request_count into v_daily_count;

  if v_daily_count is null then
    v_retry := greatest(
      1,
      ceil(extract(epoch from (v_day_start + interval '1 day' - v_now)))::integer
    );
    return jsonb_build_object(
      'allowed', false,
      'minute_remaining', greatest(0, p_minute_limit - v_minute_count),
      'daily_remaining', 0,
      'retry_after_seconds', v_retry
    );
  end if;

  return jsonb_build_object(
    'allowed', true,
    'minute_remaining', greatest(0, p_minute_limit - v_minute_count),
    'daily_remaining', greatest(0, p_daily_limit - v_daily_count),
    'retry_after_seconds', 0
  );
end;
$$;

revoke all on function public.consume_ai_quota(integer, integer) from public, anon;
grant execute on function public.consume_ai_quota(integer, integer) to authenticated;
