-- Keep the preferences contract aligned with onboarding and career analysis.
alter table public.user_preferences
  add column if not exists preferred_job_type text,
  add column if not exists expected_salary numeric;
