import type { SkillGapResult } from "../api";

export default function SkillGapCard({ gap }: { gap: SkillGapResult }) {
  return (
    <div className="card">
      <h3>Skill gap — {gap.role}</h3>
      <div className="progress">
        <div className="progress-fill" style={{ width: `${gap.readiness_percent}%` }} />
      </div>
      <p><strong>{gap.readiness_percent}% ready.</strong> {gap.verdict}</p>
      <div className="gap-grid">
        <div>
          <h4>Core skills you have</h4>
          <div className="chips">{gap.matched_core.map((s) => <span key={s} className="chip ok">{s}</span>)}</div>
        </div>
        <div>
          <h4>Core skills to learn</h4>
          <div className="chips">{gap.missing_core.map((s) => <span key={s} className="chip warn">{s}</span>)}</div>
        </div>
        <div>
          <h4>Advanced skills you have</h4>
          <div className="chips">{gap.matched_advanced.map((s) => <span key={s} className="chip ok">{s}</span>)}</div>
        </div>
        <div>
          <h4>Advanced skills to learn</h4>
          <div className="chips">{gap.missing_advanced.map((s) => <span key={s} className="chip warn">{s}</span>)}</div>
        </div>
      </div>
    </div>
  );
}
