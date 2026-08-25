-- Ensure report and answer records can only reference the authenticated user's interview.
drop policy if exists "Users can manage their interview reports" on public.interview_reports;
create policy "Users can manage their interview reports" on public.interview_reports for all to authenticated
  using (exists (
    select 1
    from public.mock_interviews
    join public.profiles on profiles.id = mock_interviews.profile_id
    where mock_interviews.id = interview_reports.interview_id
      and mock_interviews.profile_id = interview_reports.profile_id
      and profiles.user_id = auth.uid()
  ))
  with check (exists (
    select 1
    from public.mock_interviews
    join public.profiles on profiles.id = mock_interviews.profile_id
    where mock_interviews.id = interview_reports.interview_id
      and mock_interviews.profile_id = interview_reports.profile_id
      and profiles.user_id = auth.uid()
  ));

drop policy if exists "Users can manage their interview answers" on public.interview_answers;
create policy "Users can manage their interview answers" on public.interview_answers for all to authenticated
  using (exists (
    select 1
    from public.mock_interviews
    join public.profiles on profiles.id = mock_interviews.profile_id
    join public.mock_interview_questions on mock_interview_questions.interview_id = mock_interviews.id
    where mock_interviews.id = interview_answers.interview_id
      and mock_interviews.profile_id = interview_answers.profile_id
      and mock_interview_questions.id = interview_answers.question_id
      and profiles.user_id = auth.uid()
  ))
  with check (exists (
    select 1
    from public.mock_interviews
    join public.profiles on profiles.id = mock_interviews.profile_id
    join public.mock_interview_questions on mock_interview_questions.interview_id = mock_interviews.id
    where mock_interviews.id = interview_answers.interview_id
      and mock_interviews.profile_id = interview_answers.profile_id
      and mock_interview_questions.id = interview_answers.question_id
      and profiles.user_id = auth.uid()
  ));