"""Rule-based career intelligence engine: resume analysis, skill gap, job matching,
learning roadmap and mock-interview evaluation."""

import random
import re

from .data import (
    INTERVIEW_QUESTIONS,
    JOB_ROLES,
    KNOWN_SKILLS,
    LEARNING_RESOURCES,
    SKILL_ALIASES,
)

EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_RE = re.compile(r"(?:\+?\d{1,3}[\s-]?)?\d{10}")
EDUCATION_HINTS = [
    "b.tech", "btech", "b.e", "m.tech", "mtech", "bca", "mca", "b.sc", "m.sc",
    "bachelor", "master", "phd", "diploma", "12th", "10th", "cgpa", "gpa",
]
EXPERIENCE_HINTS = ["intern", "experience", "worked", "developed", "built", "led", "managed"]
PROJECT_HINTS = ["project", "hackathon", "built", "created", "implemented"]


def normalize_skill(raw: str) -> str:
    s = raw.strip().lower()
    return SKILL_ALIASES.get(s, s)


def extract_skills(text: str) -> list[str]:
    lowered = " " + re.sub(r"[,;|•·/()\[\]{}]", " ", text.lower()) + " "
    found: set[str] = set()
    for skill in KNOWN_SKILLS | set(SKILL_ALIASES.keys()):
        pattern = r"(?<![\w+#.])" + re.escape(skill) + r"(?![\w+#])"
        if re.search(pattern, lowered):
            found.add(normalize_skill(skill))
    return sorted(found)


def analyze_resume(text: str, target_role: str | None = None) -> dict:
    lowered = text.lower()
    skills = extract_skills(text)

    sections_found = []
    if EMAIL_RE.search(text) or PHONE_RE.search(text):
        sections_found.append("contact info")
    if any(h in lowered for h in EDUCATION_HINTS):
        sections_found.append("education")
    if any(h in lowered for h in EXPERIENCE_HINTS):
        sections_found.append("experience")
    if any(h in lowered for h in PROJECT_HINTS):
        sections_found.append("projects")
    if skills:
        sections_found.append("skills")

    word_count = len(text.split())
    score = 0
    score += min(len(skills) * 4, 40)
    score += len(sections_found) * 8
    if 250 <= word_count <= 900:
        score += 10
    if re.search(r"\d+%|\d+x|\bimproved\b|\breduced\b|\bincreased\b", lowered):
        score += 10
    score = min(score, 100)

    suggestions = []
    if "contact info" not in sections_found:
        suggestions.append("Add contact information (email and phone).")
    if "projects" not in sections_found:
        suggestions.append("Add 2-3 projects with tech stack and outcomes.")
    if "experience" not in sections_found:
        suggestions.append("Add internships or work experience with action verbs.")
    if len(skills) < 5:
        suggestions.append("List more relevant technical skills explicitly.")
    if not re.search(r"\d+%|\d+x|\bimproved\b|\breduced\b|\bincreased\b", lowered):
        suggestions.append("Quantify achievements (e.g. 'reduced load time by 40%').")
    if word_count < 250:
        suggestions.append("Resume looks too short; aim for 250-900 words.")
    elif word_count > 900:
        suggestions.append("Resume looks too long; trim to the most relevant content.")

    result = {
        "skills": skills,
        "sections_found": sections_found,
        "word_count": word_count,
        "resume_score": score,
        "suggestions": suggestions,
    }
    if target_role:
        result["skill_gap"] = skill_gap(skills, target_role)
    return result


def _resolve_role(target_role: str) -> tuple[str, dict] | None:
    key = target_role.strip().lower()
    if key in JOB_ROLES:
        return key, JOB_ROLES[key]
    for role_key, role in JOB_ROLES.items():
        if key in role_key or role_key in key:
            return role_key, role
    return None


def skill_gap(skills: list[str], target_role: str) -> dict:
    resolved = _resolve_role(target_role)
    if not resolved:
        return {
            "error": f"Unknown role '{target_role}'.",
            "available_roles": [r["title"] for r in JOB_ROLES.values()],
        }
    role_key, role = resolved
    have = {normalize_skill(s) for s in skills}
    core = role["core_skills"]
    advanced = role["advanced_skills"]

    matched_core = [s for s in core if s in have]
    missing_core = [s for s in core if s not in have]
    matched_adv = [s for s in advanced if s in have]
    missing_adv = [s for s in advanced if s not in have]

    readiness = round(
        (len(matched_core) / len(core)) * 70 + (len(matched_adv) / len(advanced)) * 30
    )
    return {
        "role": role["title"],
        "role_key": role_key,
        "readiness_percent": readiness,
        "matched_core": matched_core,
        "missing_core": missing_core,
        "matched_advanced": matched_adv,
        "missing_advanced": missing_adv,
        "verdict": (
            "Interview ready — polish advanced skills." if readiness >= 75
            else "Almost there — close the core gaps first." if readiness >= 45
            else "Foundation stage — focus on core skills."
        ),
    }


def match_jobs(skills: list[str]) -> list[dict]:
    have = {normalize_skill(s) for s in skills}
    results = []
    for role_key, role in JOB_ROLES.items():
        core, advanced = role["core_skills"], role["advanced_skills"]
        core_hits = sum(1 for s in core if s in have)
        adv_hits = sum(1 for s in advanced if s in have)
        score = round((core_hits / len(core)) * 70 + (adv_hits / len(advanced)) * 30)
        results.append({
            "role": role["title"],
            "role_key": role_key,
            "match_percent": score,
            "description": role["description"],
            "avg_salary_lpa": role["avg_salary_lpa"],
            "demand": role["demand"],
            "matched_skills": sorted([s for s in core + advanced if s in have]),
            "missing_skills": [s for s in core if s not in have],
        })
    return sorted(results, key=lambda r: r["match_percent"], reverse=True)


def build_roadmap(skills: list[str], target_role: str, hours_per_week: int = 10) -> dict:
    gap = skill_gap(skills, target_role)
    if "error" in gap:
        return gap

    to_learn = gap["missing_core"] + gap["missing_advanced"]
    pace = max(hours_per_week / 10, 0.5)
    phases, week_cursor = [], 1
    for i, skill in enumerate(to_learn):
        meta = LEARNING_RESOURCES.get(skill, {"resource": f"Official docs + a mini project on {skill}", "weeks": 2})
        duration = max(1, round(meta["weeks"] / pace))
        phases.append({
            "order": i + 1,
            "skill": skill,
            "priority": "core" if skill in gap["missing_core"] else "advanced",
            "resource": meta["resource"],
            "weeks": duration,
            "start_week": week_cursor,
            "end_week": week_cursor + duration - 1,
            "milestone": f"Build a small project or solve exercises using {skill}",
        })
        week_cursor += duration

    return {
        "role": gap["role"],
        "readiness_percent": gap["readiness_percent"],
        "hours_per_week": hours_per_week,
        "total_weeks": week_cursor - 1,
        "phases": phases,
        "tips": [
            "Follow the 70/30 rule: 70% building projects, 30% tutorials.",
            "Push every project to GitHub with a clear README.",
            "Revise core skills weekly; consistency beats intensity.",
            "After finishing core skills, start applying while learning advanced ones.",
        ],
    }


def generate_interview(target_role: str | None, num_questions: int = 5) -> dict:
    pool: list[dict] = []
    pool.extend(INTERVIEW_QUESTIONS["hr"][:2])
    pool.extend(INTERVIEW_QUESTIONS["technical"])
    role_title = None
    if target_role:
        resolved = _resolve_role(target_role)
        if resolved and resolved[0] in INTERVIEW_QUESTIONS:
            pool.extend(INTERVIEW_QUESTIONS[resolved[0]])
            role_title = resolved[1]["title"]
    random.shuffle(pool)
    questions = pool[:num_questions]
    return {
        "role": role_title or "General",
        "questions": [q["question"] for q in questions],
    }


def _find_keywords(question: str) -> list[str]:
    for bank in INTERVIEW_QUESTIONS.values():
        for q in bank:
            if q["question"] == question:
                return q["keywords"]
    return []


def evaluate_interview(answers: list[dict], target_role: str | None = None) -> dict:
    per_question = []
    total = 0.0
    for item in answers:
        question, answer = item["question"], item["answer"].strip()
        keywords = _find_keywords(question)
        words = len(answer.split())
        lowered = answer.lower()
        hits = [k for k in keywords if k in lowered]

        keyword_score = (len(hits) / len(keywords)) * 60 if keywords else 40.0
        length_score = 25 if 40 <= words <= 250 else 15 if 15 <= words < 40 else 5 if words > 0 else 0
        structure_score = 15 if re.search(
            r"\bfor example\b|\bfirst\b|\bthen\b|\bfinally\b|\bresult\b|\bbecause\b", lowered
        ) else 5
        score = round(min(keyword_score + length_score + structure_score, 100))
        total += score

        feedback = []
        missing = [k for k in keywords if k not in lowered][:3]
        if missing:
            feedback.append(f"Try covering: {', '.join(missing)}.")
        if words < 40:
            feedback.append("Answer is too short — elaborate with an example.")
        elif words > 250:
            feedback.append("Answer is long — be more concise and structured.")
        if structure_score == 5:
            feedback.append("Use a structure like STAR (Situation, Task, Action, Result).")
        if not feedback:
            feedback.append("Strong answer — clear, relevant and well structured.")

        per_question.append({
            "question": question,
            "score": score,
            "keywords_hit": hits,
            "feedback": feedback,
        })

    overall = round(total / len(answers)) if answers else 0
    return {
        "overall_score": overall,
        "verdict": (
            "Excellent — you are interview ready." if overall >= 75
            else "Good — refine your examples and structure." if overall >= 50
            else "Needs practice — focus on fundamentals and the STAR method."
        ),
        "per_question": per_question,
    }
