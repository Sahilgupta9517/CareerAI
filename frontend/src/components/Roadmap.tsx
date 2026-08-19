import { useState } from "react";
import { api, type RoadmapResult } from "../api";

export default function Roadmap({ skills, targetRole }: { skills: string[]; targetRole: string }) {
  const [hours, setHours] = useState(10);
  const [plan, setPlan] = useState<RoadmapResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    if (!targetRole) {
      setError("Choose a target role in the top bar first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const p = await api.roadmap(skills, targetRole, hours);
      if (p.error) setError(p.error);
      else setPlan(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <h2>Learning Roadmap</h2>
      <p className="muted">A week-by-week personalized plan to close your skill gap for the target role.</p>
      <div className="row">
        <label>
          Hours/week:
          <input
            type="number"
            min={1}
            max={80}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
          />
        </label>
        <button disabled={loading} onClick={run}>
          {loading ? "Generating..." : "Generate Roadmap"}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {plan && (
        <div className="results">
          <div className="card">
            <h3>{plan.role} — {plan.total_weeks} week plan ({plan.hours_per_week} hrs/week)</h3>
            <p>Current readiness: <strong>{plan.readiness_percent}%</strong></p>
            {plan.phases.length === 0 && <p>You already cover all listed skills — focus on projects and interview prep!</p>}
            <ol className="timeline">
              {plan.phases.map((ph) => (
                <li key={ph.order}>
                  <div className="timeline-head">
                    <strong>Week {ph.start_week}{ph.end_week !== ph.start_week ? `–${ph.end_week}` : ""}: {ph.skill}</strong>
                    <span className={`badge ${ph.priority === "core" ? "warn" : ""}`}>{ph.priority}</span>
                  </div>
                  <p className="muted">{ph.resource}</p>
                  <p className="small">Milestone: {ph.milestone}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="card">
            <h3>Tips</h3>
            <ul>{plan.tips.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
        </div>
      )}
    </section>
  );
}
