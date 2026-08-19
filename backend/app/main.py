import io

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader

from .ai_agent import agent_reply
from .data import JOB_ROLES
from .engine import (
    analyze_resume,
    build_roadmap,
    evaluate_interview,
    generate_interview,
    match_jobs,
    skill_gap,
)
from .schemas import (
    AgentChatRequest,
    InterviewEvaluateRequest,
    InterviewStartRequest,
    JobMatchRequest,
    ResumeAnalyzeRequest,
    RoadmapRequest,
    SkillGapRequest,
)

app = FastAPI(title="CareerAI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/roles")
def list_roles() -> list[dict]:
    return [
        {"key": key, "title": role["title"], "description": role["description"],
         "avg_salary_lpa": role["avg_salary_lpa"], "demand": role["demand"]}
        for key, role in JOB_ROLES.items()
    ]


@app.post("/api/resume/analyze")
def resume_analyze(req: ResumeAnalyzeRequest) -> dict:
    return analyze_resume(req.resume_text, req.target_role)


@app.post("/api/resume/upload")
async def resume_upload(file: UploadFile = File(...), target_role: str | None = None) -> dict:
    content = await file.read()
    if file.filename and file.filename.lower().endswith(".pdf"):
        try:
            reader = PdfReader(io.BytesIO(content))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Could not read PDF: {exc}") from exc
    else:
        text = content.decode("utf-8", errors="ignore")
    if len(text.strip()) < 20:
        raise HTTPException(status_code=400, detail="Could not extract enough text from the file.")
    return analyze_resume(text, target_role)


@app.post("/api/skill-gap")
def skill_gap_endpoint(req: SkillGapRequest) -> dict:
    return skill_gap(req.skills, req.target_role)


@app.post("/api/jobs/match")
def jobs_match(req: JobMatchRequest) -> list[dict]:
    return match_jobs(req.skills)


@app.post("/api/roadmap")
def roadmap(req: RoadmapRequest) -> dict:
    return build_roadmap(req.skills, req.target_role, req.hours_per_week)


@app.post("/api/interview/start")
def interview_start(req: InterviewStartRequest) -> dict:
    return generate_interview(req.target_role, req.num_questions)


@app.post("/api/interview/evaluate")
def interview_evaluate(req: InterviewEvaluateRequest) -> dict:
    return evaluate_interview([a.model_dump() for a in req.answers], req.target_role)


@app.post("/api/agent/chat")
def agent_chat(req: AgentChatRequest) -> dict:
    return agent_reply(req.message, req.skills, req.target_role)
