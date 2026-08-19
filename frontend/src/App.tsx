import { useEffect, useState } from "react";
import "./App.css";
import { api, type Role } from "./api";
import ResumeAnalyzer from "./components/ResumeAnalyzer";
import SkillGap from "./components/SkillGap";
import JobMatchTab from "./components/JobMatchTab";
import Roadmap from "./components/Roadmap";
import MockInterview from "./components/MockInterview";
import AgentChat from "./components/AgentChat";

const TABS = [
  "Resume Analyzer",
  "Skill Gap",
  "Job Match",
  "Roadmap",
  "Mock Interview",
  "AI Mentor",
] as const;
type Tab = (typeof TABS)[number];

export default function App() {
  const [tab, setTab] = useState<Tab>("Resume Analyzer");
  const [skills, setSkills] = useState<string[]>([]);
  const [targetRole, setTargetRole] = useState<string>("");
  const [roles, setRoles] = useState<Role[]>([]);

  useEffect(() => {
    api.roles().then(setRoles).catch(() => setRoles([]));
  }, []);

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="logo">🎯</span>
          <div>
            <h1>CareerAI</h1>
            <p>Your intelligent career planning agent</p>
          </div>
        </div>
        <div className="profile-bar">
          <label>
            Target role:
            <select value={targetRole} onChange={(e) => setTargetRole(e.target.value)}>
              <option value="">— choose —</option>
              {roles.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.title}
                </option>
              ))}
            </select>
          </label>
          <span className="skills-count">
            {skills.length > 0 ? `${skills.length} skills detected` : "No skills yet — analyze your resume"}
          </span>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t} className={t === tab ? "tab active" : "tab"} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>

      <main className="content">
        {tab === "Resume Analyzer" && (
          <ResumeAnalyzer targetRole={targetRole} onSkills={setSkills} />
        )}
        {tab === "Skill Gap" && (
          <SkillGap skills={skills} setSkills={setSkills} targetRole={targetRole} />
        )}
        {tab === "Job Match" && <JobMatchTab skills={skills} />}
        {tab === "Roadmap" && <Roadmap skills={skills} targetRole={targetRole} />}
        {tab === "Mock Interview" && <MockInterview targetRole={targetRole} />}
        {tab === "AI Mentor" && <AgentChat skills={skills} targetRole={targetRole} />}
      </main>

      <footer className="footer">
        CareerAI — resume analysis · skill-gap · job matching · learning roadmap · mock interviews
      </footer>
    </div>
  );
}
