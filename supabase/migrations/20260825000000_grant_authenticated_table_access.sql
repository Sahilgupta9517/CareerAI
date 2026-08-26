-- PostgREST needs table privileges in addition to RLS policies.
-- RLS remains the boundary for which rows each authenticated user can access.
grant select, insert, update, delete on table
  public.profiles,
  public.skills,
  public.user_skills,
  public.user_preferences,
  public.career_goals,
  public.career_analyses,
  public.resume_analyses,
  public.interview_sessions,
  public.projects,
  public.roadmap_progress,
  public.saved_jobs,
  public.job_applications,
  public.mock_interviews,
  public.mock_interview_questions,
  public.interview_reports,
  public.interview_answers
to authenticated;

grant usage, select on all sequences in schema public to authenticated;
