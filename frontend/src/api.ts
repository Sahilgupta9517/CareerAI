const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).detail || `Request failed: ${res.status}`);
  return res.json();
}

export interface SkillGapResult {
  role: string;
  readiness_percent: number;
  matched_core: string[];
  missing_core: string[];
  matched_advanced: string[];
  missing_advanced: string[];
  verdict: string;
  error?: string;
  available_roles?: string[];
}

export interface ResumeResult {
  skills: string[];
  sections_found: string[];
  word_count: number;
  resume_score: number;
  suggestions: string[];
  skill_gap?: SkillGapResult;
}

export interface JobMatch {
  role: string;
  role_key: string;
  match_percent: number;
  description: string;
  avg_salary_lpa: string;
  demand: string;
  matched_skills: string[];
  missing_skills: string[];
}

export interface RoadmapPhase {
  order: number;
  skill: string;
  priority: string;
  resource: string;
  weeks: number;
  start_week: number;
  end_week: number;
  milestone: string;
}

export interface RoadmapResult {
  role: string;
  readiness_percent: number;
  hours_per_week: number;
  total_weeks: number;
  phases: RoadmapPhase[];
  tips: string[];
  error?: string;
}

export interface InterviewQuestions {
  role: string;
  questions: string[];
}

export interface InterviewEvaluation {
  overall_score: number;
  verdict: string;
  per_question: {
    question: string;
    score: number;
    keywords_hit: string[];
    feedback: string[];
  }[];
}

export interface Role {
  key: string;
  title: string;
  description: string;
  avg_salary_lpa: string;
  demand: string;
}

export const api = {
  roles: async (): Promise<Role[]> => {
    const res = await fetch(`${BASE}/api/roles`);
    return res.json();
  },
  analyzeResume: (resume_text: string, target_role?: string) =>
    post<ResumeResult>("/api/resume/analyze", { resume_text, target_role: target_role || null }),
  uploadResume: async (file: File, targetRole?: string): Promise<ResumeResult> => {
    const form = new FormData();
    form.append("file", file);
    const qs = targetRole ? `?target_role=${encodeURIComponent(targetRole)}` : "";
    const res = await fetch(`${BASE}/api/resume/upload${qs}`, { method: "POST", body: form });
    if (!res.ok) throw new Error((await res.json()).detail || "Upload failed");
    return res.json();
  },
  skillGap: (skills: string[], target_role: string) =>
    post<SkillGapResult>("/api/skill-gap", { skills, target_role }),
  matchJobs: (skills: string[]) => post<JobMatch[]>("/api/jobs/match", { skills }),
  roadmap: (skills: string[], target_role: string, hours_per_week: number) =>
    post<RoadmapResult>("/api/roadmap", { skills, target_role, hours_per_week }),
  startInterview: (target_role: string | null, num_questions: number) =>
    post<InterviewQuestions>("/api/interview/start", { target_role, num_questions }),
  evaluateInterview: (answers: { question: string; answer: string }[], target_role: string | null) =>
    post<InterviewEvaluation>("/api/interview/evaluate", { answers, target_role }),
  agentChat: (message: string, skills: string[], target_role: string | null) =>
    post<{ reply: string; source: string }>("/api/agent/chat", { message, skills, target_role }),
};
