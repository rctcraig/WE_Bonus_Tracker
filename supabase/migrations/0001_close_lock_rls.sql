-- Harden RLS so a manager's user session cannot modify closed months through
-- the Supabase REST API. The app's server actions use the service role (which
-- bypasses RLS), so closing/reopening months in the app keeps working; this
-- only removes the direct-API path around the close lock and audit trail.
--
-- Applied to production 2026-07-08. supabase/schema.sql carries the same
-- definitions for fresh installs.

create or replace function is_month_open(p_practice_id uuid, p_date date)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from monthly_goals g
    where g.practice_id = p_practice_id
      and g.month = date_trunc('month', p_date)::date
      and not g.closed
  )
$$;

drop policy if exists "Managers maintain open monthly goals" on monthly_goals;
create policy "Managers maintain open monthly goals"
on monthly_goals for all
using (
  can_manage()
  and practice_id = current_user_practice_id()
  and not closed
)
with check (
  can_manage()
  and practice_id = current_user_practice_id()
  and not closed
);

drop policy if exists "Managers maintain production" on production_entries;
create policy "Managers maintain production"
on production_entries for all
using (
  can_manage()
  and practice_id = current_user_practice_id()
  and is_month_open(practice_id, work_date)
)
with check (
  can_manage()
  and practice_id = current_user_practice_id()
  and is_month_open(practice_id, work_date)
);

drop policy if exists "Managers maintain plans" on month_plans;
create policy "Managers maintain plans"
on month_plans for all
using (
  can_manage()
  and practice_id = current_user_practice_id()
  and is_month_open(practice_id, month)
)
with check (
  can_manage()
  and practice_id = current_user_practice_id()
  and is_month_open(practice_id, month)
);

drop policy if exists "Managers maintain schedule days" on schedule_days;
create policy "Managers maintain schedule days"
on schedule_days for all
using (
  can_manage()
  and exists (
    select 1
    from month_plans mp
    where mp.id = schedule_days.month_plan_id
      and mp.practice_id = current_user_practice_id()
      and is_month_open(mp.practice_id, mp.month)
  )
)
with check (
  can_manage()
  and exists (
    select 1
    from month_plans mp
    where mp.id = schedule_days.month_plan_id
      and mp.practice_id = current_user_practice_id()
      and is_month_open(mp.practice_id, mp.month)
  )
);
