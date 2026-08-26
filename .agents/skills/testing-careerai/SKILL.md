---
name: testing-careerai
description: How to run and end-to-end test the CareerAI app (FastAPI backend + Vite React frontend)
---

# Testing CareerAI

## Run the app
- Backend: `cd backend && uvicorn app.main:app --port 8000` (deps: `pip3 install -r backend/requirements.txt`).
- Frontend: `cd frontend && npm run dev` → http://localhost:5173. On Linux boxes npm may need the optional native bindings installed explicitly: `npm install -D @rolldown/binding-linux-x64-gnu @oxlint/linux-x64-gnu`.
- No auth/credentials. If `OPENAI_API_KEY` is unset, the AI Mentor chat uses a built-in rule-based fallback (response `source: "rule-based"`) — this is expected, not a failure.

## App structure (frontend/src)
- Single page, tab buttons in a nav: Resume Analyzer, Skill Gap, Job Match, Roadmap, Mock Interview, AI Mentor (`App.tsx`).
- Shared state: header "Target role" `<select>` + skills detected from resume analysis flow into all tabs. Header shows "N skills detected" once skills exist.

## Test tips
- Resume Analyzer needs ≥20 chars of text before "Analyze Text" enables. A resume with email, B.Tech, projects, and skills like Python/SQL/React/Pandas/Machine Learning yields score 70, 5 skills, 5 sections.
- "Upload PDF/TXT" is a hidden file input inside a label; a small `/tmp/resume.txt` works (use Ctrl+L in the GTK file dialog to type the path).
- Skill Gap with no target role selected shows error "Choose a target role in the top bar first."; Analyze Gap also updates the shared skills list from the comma-separated textarea.
- Job Match returns all 10 roles sorted by match % descending; button disabled when no skills detected yet.
- Mock Interview: "Start Interview" fetches 5 questions; "Submit Answers" stays disabled until every textarea is non-empty. Scoring rewards length/keywords/STAR structure, so "I don't know" scores ~10/100 vs 70–80 for structured answers.
