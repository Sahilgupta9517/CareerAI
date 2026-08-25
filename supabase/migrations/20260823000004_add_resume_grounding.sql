-- Preserve the exact resume and career context used for each interview.
alter table public.mock_interviews
  add column if not exists resume_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists personalized boolean not null default false;

alter table public.mock_interview_questions
  add column if not exists question_source text not null default 'role',
  add column if not exists resume_context text,
  add column if not exists skill_area text;

create index if not exists mock_interviews_personalized_idx on public.mock_interviews(personalized, created_at desc);
create index if not exists mock_interview_questions_source_idx on public.mock_interview_questions(question_source, topic);

alter table public.mock_interview_questions drop constraint if exists mock_interview_questions_source_check;
alter table public.mock_interview_questions add constraint mock_interview_questions_source_check
  check (question_source in ('role', 'resume', 'project', 'skill_gap', 'career_analysis', 'behavioral'));
