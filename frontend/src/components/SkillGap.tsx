import { useState } from "react";
import { api, type SkillGapResult } from "../api";
import SkillGapCard from "./SkillGapCard";

export default function SkillGap({
  skills,
  setSkills,
  targetRole,
}: {
  skills: string[];
  setSkills: (s: string[]) => void;
  targetRole: string;
}) {
  const [input, setInput] = useState(skills.join(", "));
  const [gap, setGap] = useState<SkillGapResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    const list = input.split(",").map((s) => s.trim()).filter(Boolean);
    setSkills(list);
    if (!targetRole) {
      setError("Choose a target role in the top bar first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const g = await api.skillGap(list, targetRole);
      if (g.error) setError(g.error);
      else setGap(g);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <h2>Skill Gap Analysis</h2>
      <p className="muted">Enter your skills (comma-separated) and pick a target role to see how ready you are.</p>
      <textarea
        rows={3}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="e.g. python, sql, react, git"
      />
      <div className="row">
        <button disabled={loading || !input.trim()} onClick={analyze}>
          {loading ? "Analyzing..." : "Analyze Gap"}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {gap && <div className="results"><SkillGapCard gap={gap} /></div>}
    </section>
  );
}
