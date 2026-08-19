from pydantic import BaseModel, Field


class ResumeAnalyzeRequest(BaseModel):
    resume_text: str = Field(min_length=20)
    target_role: str | None = None


class SkillGapRequest(BaseModel):
    skills: list[str]
    target_role: str


class JobMatchRequest(BaseModel):
    skills: list[str]


class RoadmapRequest(BaseModel):
    skills: list[str]
    target_role: str
    hours_per_week: int = Field(default=10, ge=1, le=80)


class InterviewStartRequest(BaseModel):
    target_role: str | None = None
    num_questions: int = Field(default=5, ge=3, le=10)


class InterviewAnswer(BaseModel):
    question: str
    answer: str


class InterviewEvaluateRequest(BaseModel):
    target_role: str | None = None
    answers: list[InterviewAnswer]


class AgentChatRequest(BaseModel):
    message: str
    skills: list[str] = []
    target_role: str | None = None
