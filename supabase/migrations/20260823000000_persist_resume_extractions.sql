-- Persist authenticated PDF extraction results without storing the uploaded binary.
alter table public.resume_analyses
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists extracted_text text,
  add column if not exists structured_resume jsonb not null default '{}'::jsonb;

-- AI fields are intentionally nullable until the analysis service is connected.
alter table public.resume_analyses alter column overall_score drop not null;
alter table public.resume_analyses alter column ats_score drop not null;
alter table public.resume_analyses alter column keyword_score drop not null;
alter table public.resume_analyses alter column formatting_score drop not null;
alter table public.resume_analyses alter column ai_summary drop not null;

create index if not exists resume_analyses_user_id_created_at_idx
  on public.resume_analyses(user_id, created_at desc);

drop policy if exists "Users can insert their own resume analyses" on public.resume_analyses;
create policy "Users can insert their own resume analyses"
  on public.resume_analyses for insert to authenticated
  with check (exists (select 1 from public.profiles where profiles.id = resume_analyses.profile_id and profiles.user_id = auth.uid()) and user_id = auth.uid());

drop policy if exists "Users can update their own resume analyses" on public.resume_analyses;
create policy "Users can update their own resume analyses"
  on public.resume_analyses for update to authenticated
  using (exists (select 1 from public.profiles where profiles.id = resume_analyses.profile_id and profiles.user_id = auth.uid()))
  with check (exists (select 1 from public.profiles where profiles.id = resume_analyses.profile_id and profiles.user_id = auth.uid()) and (user_id is null or user_id = auth.uid()));
