# CareerAI 🎯

An intelligent career platform that analyzes a student's **resume, skills, target job and performance** and provides — through an AI agent — personalized **career planning, skill-gap analysis, job matching, learning roadmaps and mock interviews**.

## Features

| Feature | What it does |
|---|---|
| **Resume Analyzer** | Paste text or upload a PDF/TXT resume → skill extraction, resume score (0–100), section detection, improvement suggestions |
| **Skill Gap Analysis** | Compares your skills against a target role's core + advanced skills → readiness % and exactly what to learn |
| **Job Match** | Ranks 10 career roles (frontend, backend, data science, ML, DevOps, GenAI…) by match % with salary and demand info |
| **Learning Roadmap** | Week-by-week personalized plan with curated resources and milestones, adjusted to your hours/week |
| **Mock Interview** | HR + technical + role-specific questions with instant scored feedback (keywords, length, structure/STAR) |
| **AI Mentor Chat** | Career agent chat — uses OpenAI if `OPENAI_API_KEY` is set, otherwise a built-in rule-based mentor (works fully offline) |

## Tech Stack

- **Backend:** Python, FastAPI, pypdf (PDF parsing), optional OpenAI integration
- **Frontend:** React 18 + TypeScript + Vite, hand-rolled dark UI (no UI framework)

## Run Locally

### 1. Backend (port 8000)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Optional — enable real LLM answers in the AI Mentor:

```bash
export OPENAI_API_KEY=sk-...   # otherwise a rule-based mentor is used
```

### 2. Frontend (port 5173)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## API Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/roles` | List supported career roles |
| POST | `/api/resume/analyze` | Analyze resume text |
| POST | `/api/resume/upload` | Analyze uploaded PDF/TXT resume |
| POST | `/api/skill-gap` | Skill-gap vs a target role |
| POST | `/api/jobs/match` | Rank roles by skill match |
| POST | `/api/roadmap` | Personalized learning roadmap |
| POST | `/api/interview/start` | Generate mock-interview questions |
| POST | `/api/interview/evaluate` | Score answers with feedback |
| POST | `/api/agent/chat` | Chat with the AI career mentor |

## Project Structure

```
CareerAI/
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── main.py        # FastAPI routes
│       ├── engine.py      # rule-based career intelligence engine
│       ├── ai_agent.py    # AI mentor (OpenAI + offline fallback)
│       ├── data.py        # skill taxonomy, roles, resources, questions
│       └── schemas.py     # pydantic request models
└── frontend/
    └── src/
        ├── App.tsx        # tabbed layout + shared skills/role state
        ├── api.ts         # typed API client
        └── components/    # one component per feature
```
