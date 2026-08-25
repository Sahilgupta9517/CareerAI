-- Persist certifications returned by the authenticated resume analysis.
alter table public.resume_analyses
  add column if not exists certifications jsonb not null default '[]'::jsonb;