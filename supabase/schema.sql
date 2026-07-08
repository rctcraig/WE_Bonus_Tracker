create extension if not exists pgcrypto;

create type app_role as enum (
  'admin',
  'manager',
  'doctor',
  'leadership',
  'staff'
);

create type day_type as enum ('mth', 'friday');
create type profitability_status as enum ('unknown', 'favorable', 'unfavorable');
create type drive_for_nine_result as enum (
  'not_active',
  'not_qualified',
  'qualified_pending',
  'won',
  'not_selected'
);

create table practices (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  practice_id uuid not null references practices(id) on delete cascade,
  full_name text not null,
  role app_role not null default 'staff',
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table monthly_goals (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references practices(id) on delete cascade,
  month date not null,
  s1p_goal numeric(12, 2) not null check (s1p_goal >= 0),
  historical_adjusted_actual numeric(12, 2),
  official_s1p_actual numeric(12, 2),
  closed boolean not null default false,
  profitability_status profitability_status not null default 'unknown',
  close_note text,
  closed_at timestamptz,
  closed_by uuid references profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (practice_id, month)
);

create table month_plans (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references practices(id) on delete cascade,
  month date not null,
  avg_mth_doctor_day numeric(10, 2) not null default 10800,
  avg_friday_doctor_day numeric(10, 2) not null default 5500,
  planned_workday_count integer not null check (planned_workday_count >= 0),
  setup_locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (practice_id, month)
);

create table schedule_days (
  id uuid primary key default gen_random_uuid(),
  month_plan_id uuid not null references month_plans(id) on delete cascade,
  work_date date not null,
  day_type day_type not null,
  doctors numeric(4, 1) not null check (doctors >= 0),
  original_doctors numeric(4, 1) not null check (original_doctors >= 0),
  change_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (month_plan_id, work_date)
);

create table production_entries (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references practices(id) on delete cascade,
  work_date date not null,
  total_production numeric(12, 2) not null check (total_production >= 0),
  credit_adjustments numeric(12, 2) not null default 0 check (credit_adjustments >= 0),
  adjusted_production numeric(12, 2) generated always as
    (total_production - credit_adjustments) stored,
  note text,
  entered_by uuid references profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (practice_id, work_date)
);

create table bonus_tiers (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references practices(id) on delete cascade,
  threshold_pct numeric(6, 2) not null,
  amount numeric(10, 2) not null,
  created_at timestamptz not null default now(),
  unique (practice_id, threshold_pct)
);

create table drive_for_nine_campaigns (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references practices(id) on delete cascade,
  month date not null,
  active boolean not null default false,
  qualification_pct numeric(6, 2) not null default 115,
  result drive_for_nine_result not null default 'not_active',
  official_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (practice_id, month)
);

create table notification_settings (
  practice_id uuid primary key references practices(id) on delete cascade,
  missing_entry_reminder_time time not null default '12:00',
  monday_summary_time time not null default '08:00',
  notify_staff boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(user_id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

create table audit_events (
  id uuid primary key default gen_random_uuid(),
  practice_id uuid not null references practices(id) on delete cascade,
  actor_user_id uuid references profiles(user_id),
  event_type text not null,
  table_name text not null,
  record_id uuid,
  reason text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
before update on profiles
for each row execute function touch_updated_at();

create trigger monthly_goals_touch_updated_at
before update on monthly_goals
for each row execute function touch_updated_at();

create trigger month_plans_touch_updated_at
before update on month_plans
for each row execute function touch_updated_at();

create trigger schedule_days_touch_updated_at
before update on schedule_days
for each row execute function touch_updated_at();

create trigger production_entries_touch_updated_at
before update on production_entries
for each row execute function touch_updated_at();

create trigger drive_for_nine_campaigns_touch_updated_at
before update on drive_for_nine_campaigns
for each row execute function touch_updated_at();

alter table practices enable row level security;
alter table profiles enable row level security;
alter table monthly_goals enable row level security;
alter table month_plans enable row level security;
alter table schedule_days enable row level security;
alter table production_entries enable row level security;
alter table bonus_tiers enable row level security;
alter table drive_for_nine_campaigns enable row level security;
alter table notification_settings enable row level security;
alter table push_subscriptions enable row level security;
alter table audit_events enable row level security;

create or replace function current_user_practice_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select practice_id from profiles where user_id = auth.uid()
$$;

create or replace function current_user_role()
returns app_role
language sql
security definer
set search_path = public
stable
as $$
  select role from profiles where user_id = auth.uid()
$$;

create or replace function can_manage()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select current_user_role() in ('admin', 'manager')
$$;

create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select current_user_role() = 'admin'
$$;

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

create policy "Users can read their practice"
on practices for select
using (id = current_user_practice_id());

create policy "Profiles are visible inside practice"
on profiles for select
using (practice_id = current_user_practice_id());

create policy "Admins manage profiles"
on profiles for all
using (is_admin() and practice_id = current_user_practice_id())
with check (is_admin() and practice_id = current_user_practice_id());

create policy "Practice data is readable inside practice"
on monthly_goals for select
using (practice_id = current_user_practice_id());

-- Closed months are frozen for user sessions; the app's service-role server
-- actions handle close/reopen so those transitions stay audited.
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

create policy "Practice plans readable inside practice"
on month_plans for select
using (practice_id = current_user_practice_id());

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

create policy "Schedule days readable through own practice"
on schedule_days for select
using (
  exists (
    select 1
    from month_plans mp
    where mp.id = schedule_days.month_plan_id
      and mp.practice_id = current_user_practice_id()
  )
);

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

create policy "Production readable inside practice"
on production_entries for select
using (practice_id = current_user_practice_id());

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

create policy "Bonus tiers readable inside practice"
on bonus_tiers for select
using (practice_id = current_user_practice_id());

create policy "Admins maintain bonus tiers"
on bonus_tiers for all
using (is_admin() and practice_id = current_user_practice_id())
with check (is_admin() and practice_id = current_user_practice_id());

create policy "Drive campaigns readable inside practice"
on drive_for_nine_campaigns for select
using (practice_id = current_user_practice_id());

create policy "Managers maintain drive campaigns"
on drive_for_nine_campaigns for all
using (can_manage() and practice_id = current_user_practice_id())
with check (can_manage() and practice_id = current_user_practice_id());

create policy "Notification settings readable inside practice"
on notification_settings for select
using (practice_id = current_user_practice_id());

create policy "Admins maintain notification settings"
on notification_settings for all
using (is_admin() and practice_id = current_user_practice_id())
with check (is_admin() and practice_id = current_user_practice_id());

create policy "Users manage own push subscriptions"
on push_subscriptions for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Audit events visible to managers"
on audit_events for select
using (can_manage() and practice_id = current_user_practice_id());

create policy "Audit events inserted by managers"
on audit_events for insert
with check (can_manage() and practice_id = current_user_practice_id());
