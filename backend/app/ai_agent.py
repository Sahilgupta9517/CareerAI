"""Career AI Agent: uses OpenAI when OPENAI_API_KEY is set, otherwise falls back
to the rule-based engine so the app works fully offline."""

import os

from .engine import match_jobs, skill_gap

SYSTEM_PROMPT = (
    "You are CareerAI, a friendly and practical career mentor for students. "
    "Give specific, actionable advice about careers, skills, resumes, learning "
    "paths and interviews. Keep answers concise and structured."
)


def _openai_reply(message: str, context: str) -> str | None:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return None
    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"{context}\n\nQuestion: {message}"},
            ],
            max_tokens=600,
        )
        return response.choices[0].message.content
    except Exception:
        return None


def _rule_based_reply(message: str, skills: list[str], target_role: str | None) -> str:
    lowered = message.lower()

    if target_role and skills:
        gap = skill_gap(skills, target_role)
        if "error" not in gap:
            missing = ", ".join(gap["missing_core"][:5]) or "nothing critical"
            return (
                f"For {gap['role']}, you are {gap['readiness_percent']}% ready. "
                f"Focus next on: {missing}. {gap['verdict']} "
                "Use the Roadmap tab to get a week-by-week plan."
            )

    if skills and any(w in lowered for w in ["job", "role", "career", "match", "kaunsi", "which"]):
        top = match_jobs(skills)[:3]
        lines = [f"{r['role']} ({r['match_percent']}% match, {r['avg_salary_lpa']})" for r in top]
        return "Based on your skills, your best-fit roles are: " + "; ".join(lines) + \
            ". Open the Job Match tab for full details."

    if any(w in lowered for w in ["resume", "cv"]):
        return (
            "Resume tips: keep it 1 page, lead with skills and 2-3 projects, use action "
            "verbs, and quantify results (e.g. 'improved accuracy by 15%'). Paste your "
            "resume in the Resume Analyzer tab for a detailed score."
        )
    if any(w in lowered for w in ["interview", "prepare"]):
        return (
            "Interview prep: practice the STAR method for HR questions, revise your own "
            "projects deeply, and do daily DSA practice. Try the Mock Interview tab to "
            "get scored feedback on your answers."
        )
    if any(w in lowered for w in ["roadmap", "learn", "seekh", "start", "begin"]):
        return (
            "Pick one target role, then learn its core skills first through projects, "
            "not just tutorials. Set a target role and use the Roadmap tab for a "
            "personalized week-by-week plan."
        )
    return (
        "I can help with career planning, skill gaps, job matching, learning roadmaps "
        "and interview prep. Tell me your skills and target role, or use the tabs above "
        "to analyze your resume and generate a roadmap."
    )


def agent_reply(message: str, skills: list[str], target_role: str | None) -> dict:
    context = f"Student skills: {', '.join(skills) or 'unknown'}. Target role: {target_role or 'unknown'}."
    ai = _openai_reply(message, context)
    if ai:
        return {"reply": ai, "source": "openai"}
    return {"reply": _rule_based_reply(message, skills, target_role), "source": "rule-based"}
