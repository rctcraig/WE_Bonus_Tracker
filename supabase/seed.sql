with practice_row as (
  insert into practices (slug, name)
  values ('wichita-endodontics', 'Wichita Endodontics')
  on conflict (slug) do update set name = excluded.name
  returning id
)
insert into bonus_tiers (practice_id, threshold_pct, amount)
select id, tier.threshold_pct, tier.amount
from practice_row
cross join (
  values
    (97.00, 50.00),
    (100.00, 125.00),
    (103.00, 150.00),
    (106.00, 200.00),
    (109.00, 500.00)
) as tier(threshold_pct, amount)
on conflict (practice_id, threshold_pct)
do update set amount = excluded.amount;

with p as (
  select id from practices where slug = 'wichita-endodontics'
)
insert into monthly_goals (
  practice_id,
  month,
  s1p_goal,
  historical_adjusted_actual,
  official_s1p_actual,
  closed,
  profitability_status
)
select
  p.id,
  goal.month::date,
  goal.s1p_goal,
  goal.historical_adjusted_actual,
  goal.official_s1p_actual,
  goal.closed,
  goal.profitability_status::profitability_status
from p
cross join (
  values
    ('2026-01-01', 940077.40, 942379.07, 961400.40, true, 'favorable'),
    ('2026-02-01', 862853.09, 947129.00, 936157.98, true, 'favorable'),
    ('2026-03-01', 838753.30, 879208.13, 885354.52, true, 'favorable'),
    ('2026-04-01', 816368.27, 975704.35, null, true, 'unknown'),
    ('2026-05-01', 936583.05, null, null, false, 'unknown'),
    ('2026-06-01', 1108492.51, null, null, false, 'unknown'),
    ('2026-07-01', 1068755.66, null, null, false, 'unknown'),
    ('2026-08-01', 986617.27, null, null, false, 'unknown'),
    ('2026-09-01', 1008663.58, null, null, false, 'unknown'),
    ('2026-10-01', 1058726.62, null, null, false, 'unknown'),
    ('2026-11-01', 969370.50, null, null, false, 'unknown'),
    ('2026-12-01', 1047783.75, null, null, false, 'unknown')
) as goal(
  month,
  s1p_goal,
  historical_adjusted_actual,
  official_s1p_actual,
  closed,
  profitability_status
)
on conflict (practice_id, month)
do update set
  s1p_goal = excluded.s1p_goal,
  historical_adjusted_actual = excluded.historical_adjusted_actual,
  official_s1p_actual = excluded.official_s1p_actual,
  closed = excluded.closed,
  profitability_status = excluded.profitability_status;

with p as (
  select id from practices where slug = 'wichita-endodontics'
)
insert into drive_for_nine_campaigns (
  practice_id,
  month,
  active,
  qualification_pct,
  result,
  official_note
)
select
  p.id,
  campaign.month::date,
  campaign.active,
  115.00,
  campaign.result::drive_for_nine_result,
  campaign.official_note
from p
cross join (
  values
    ('2026-04-01', true, 'won', 'Qualified above 115% and S1P confirmed WE won.'),
    ('2026-06-01', true, 'qualified_pending', null),
    ('2026-08-01', true, 'qualified_pending', null),
    ('2026-10-01', true, 'qualified_pending', null),
    ('2026-12-01', true, 'qualified_pending', null)
) as campaign(month, active, result, official_note)
on conflict (practice_id, month)
do update set
  active = excluded.active,
  qualification_pct = excluded.qualification_pct,
  result = excluded.result,
  official_note = excluded.official_note;

with p as (
  select id from practices where slug = 'wichita-endodontics'
), plan as (
  insert into month_plans (
    practice_id,
    month,
    avg_mth_doctor_day,
    avg_friday_doctor_day,
    planned_workday_count
  )
  select id, '2026-05-01'::date, 10800.00, 5500.00, 20
  from p
  on conflict (practice_id, month)
  do update set
    avg_mth_doctor_day = excluded.avg_mth_doctor_day,
    avg_friday_doctor_day = excluded.avg_friday_doctor_day,
    planned_workday_count = excluded.planned_workday_count
  returning id
)
insert into schedule_days (
  month_plan_id,
  work_date,
  day_type,
  doctors,
  original_doctors,
  change_reason
)
select
  plan.id,
  schedule.work_date::date,
  schedule.day_type::day_type,
  schedule.doctors,
  schedule.original_doctors,
  schedule.change_reason
from plan
cross join (
  values
    ('2026-05-01', 'friday', 3.0, 3.0, null),
    ('2026-05-04', 'mth', 6.0, 6.0, null),
    ('2026-05-05', 'mth', 6.0, 6.0, null),
    ('2026-05-06', 'mth', 6.0, 6.0, null),
    ('2026-05-07', 'mth', 6.0, 6.0, null),
    ('2026-05-08', 'friday', 3.0, 3.0, null),
    ('2026-05-11', 'mth', 6.0, 6.0, null),
    ('2026-05-12', 'mth', 6.0, 6.0, null),
    ('2026-05-13', 'mth', 6.0, 6.0, null),
    ('2026-05-14', 'mth', 6.0, 6.0, null),
    ('2026-05-15', 'friday', 3.0, 3.0, null),
    ('2026-05-18', 'mth', 6.0, 6.0, null),
    ('2026-05-19', 'mth', 5.0, 6.0, 'Doctor out'),
    ('2026-05-20', 'mth', 6.0, 6.0, null),
    ('2026-05-21', 'mth', 6.0, 6.0, null),
    ('2026-05-22', 'friday', 3.0, 3.0, null),
    ('2026-05-26', 'mth', 6.0, 6.0, null),
    ('2026-05-27', 'mth', 6.0, 6.0, null),
    ('2026-05-28', 'mth', 6.0, 6.0, null),
    ('2026-05-29', 'friday', 3.0, 3.0, null)
) as schedule(work_date, day_type, doctors, original_doctors, change_reason)
on conflict (month_plan_id, work_date)
do update set
  day_type = excluded.day_type,
  doctors = excluded.doctors,
  original_doctors = excluded.original_doctors,
  change_reason = excluded.change_reason;

with p as (
  select id from practices where slug = 'wichita-endodontics'
)
insert into production_entries (
  practice_id,
  work_date,
  total_production,
  credit_adjustments,
  note
)
select
  p.id,
  entry.work_date::date,
  entry.total_production,
  entry.credit_adjustments,
  'Imported from Book1.xlsx'
from p
cross join (
  values
    ('2026-05-01', 22555.00, 340.00),
    ('2026-05-04', 64714.00, 24370.00),
    ('2026-05-05', 73261.00, 16381.00),
    ('2026-05-06', 71937.00, 22661.00),
    ('2026-05-07', 73692.00, 8581.00),
    ('2026-05-08', 19740.00, 0.00),
    ('2026-05-11', 72488.00, 28736.00),
    ('2026-05-12', 74538.00, 10526.00),
    ('2026-05-13', 68613.00, 7724.00)
) as entry(work_date, total_production, credit_adjustments)
on conflict (practice_id, work_date)
do update set
  total_production = excluded.total_production,
  credit_adjustments = excluded.credit_adjustments,
  note = excluded.note;

insert into notification_settings (practice_id)
select id from practices where slug = 'wichita-endodontics'
on conflict (practice_id) do nothing;
