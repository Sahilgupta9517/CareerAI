-- Persist the validated skill-gap analysis alongside the user's career analysis.
alter table public.career_analyses
  add column if not exists skill_gap_analysis jsonb not null default '{}'::jsonb;