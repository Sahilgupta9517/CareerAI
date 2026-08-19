import { useState } from "react";
import { api, type JobMatch } from "../api";

export default function JobMatchTab({ skills }: { skills: string[] }) {
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    setLoading(true);
    setError("");
    try {
      setMatches(await api.matchJobs(skills));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <h2>Job Match</h2>
      <p className="muted">
        {skills.length
          ? `Matching ${skills.length} skills against ${"10"} career roles.`
          : "First detect your skills via the Resume Analyzer or Skill Gap tab."}
      </p>
      <div className="row">
        <button disabled={loading || skills.length === 0} onClick={run}>
          {loading ? "Matching..." : "Find Matching Roles"}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="results">
        {matches.map((m) => (
          <div key={m.role_key} className="card job-card">
            <div className="job-head">
              <h3>{m.role}</h3>
              <span className={`badge ${m.match_percent >= 60 ? "ok" : m.match_percent >= 30 ? "warn" : ""}`}>
                {m.match_percent}% match
              </span>
            </div>
            <p className="muted">{m.description}</p>
            <p>
              <strong>Salary:</strong> {m.avg_salary_lpa} · <strong>Demand:</strong> {m.demand}
            </p>
            <div className="progress">
              <div className="progress-fill" style={{ width: `${m.match_percent}%` }} />
            </div>
            {m.matched_skills.length > 0 && (
              <div className="chips">
                {m.matched_skills.map((s) => <span key={s} className="chip ok">{s}</span>)}
              </div>
            )}
            {m.missing_skills.length > 0 && (
              <p className="muted small">Missing core: {m.missing_skills.join(", ")}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
