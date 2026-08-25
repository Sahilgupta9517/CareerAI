-- Store the reason and score context for each adaptive question.
alter table public.mock_interview_questions
  add column if not exists adaptive_reason text,
  add column if not exists based_on_previous_score boolean not null default false;