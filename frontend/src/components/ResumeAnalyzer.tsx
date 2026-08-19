import { useState } from "react";
import { api, type ResumeResult } from "../api";
import SkillGapCard from "./SkillGapCard";

export default function ResumeAnalyzer({
  targetRole,
  onSkills,
}: {
  targetRole: string;
  onSkills: (skills: string[]) => void;
}) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ResumeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async (fn: () => Promise<ResumeResult>) => {
    setLoading(true);
    setError("");
    try {
      const r = await fn();
      setResult(r);
      onSkills(r.skills);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <h2>Resume Analyzer</h2>
      <p className="muted">Paste your resume text or upload a PDF/TXT file. CareerAI extracts your skills, scores your resume and suggests improvements.</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste your resume text here..."
        rows={10}
      />
      <div className="row">
        <button disabled={loading || text.trim().length < 20} onClick={() => run(() => api.analyzeResume(text, targetRole || undefined))}>
          {loading ? "Analyzing..." : "Analyze Text"}
        </button>
        <label className="upload-btn">
          Upload PDF/TXT
          <input
            type="file"
            accept=".pdf,.txt"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) run(() => api.uploadResume(f, targetRole || undefined));
            }}
          />
        </label>
      </div>
      {error && <p className="error">{error}</p>}

      {result && (
        <div className="results">
          <div className="cards">
            <div className="card stat">
              <span className="stat-value">{result.resume_score}</span>
              <span className="stat-label">Resume score / 100</span>
            </div>
            <div className="card stat">
              <span className="stat-value">{result.skills.length}</span>
              <span className="stat-label">Skills detected</span>
            </div>
            <div className="card stat">
              <span className="stat-value">{result.word_count}</span>
              <span className="stat-label">Words</span>
            </div>
          </div>

          <div className="card">
            <h3>Detected skills</h3>
            <div className="chips">
              {result.skills.length ? result.skills.map((s) => <span key={s} className="chip">{s}</span>) : <span className="muted">None detected</span>}
            </div>
          </div>

          <div className="card">
            <h3>Sections found</h3>
            <div className="chips">
              {result.sections_found.map((s) => <span key={s} className="chip ok">{s}</span>)}
            </div>
          </div>

          {result.suggestions.length > 0 && (
            <div className="card">
              <h3>Suggestions</h3>
              <ul>{result.suggestions.map((s) => <li key={s}>{s}</li>)}</ul>
            </div>
          )}

          {result.skill_gap && !result.skill_gap.error && <SkillGapCard gap={result.skill_gap} />}
        </div>
      )}
    </section>
  );
}
