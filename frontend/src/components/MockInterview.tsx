import { useState } from "react";
import { api, type InterviewEvaluation } from "../api";

export default function MockInterview({ targetRole }: { targetRole: string }) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [evaluation, setEvaluation] = useState<InterviewEvaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const start = async () => {
    setLoading(true);
    setError("");
    setEvaluation(null);
    try {
      const q = await api.startInterview(targetRole || null, 5);
      setQuestions(q.questions);
      setAnswers(q.questions.map(() => ""));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = questions.map((q, i) => ({ question: q, answer: answers[i] }));
      setEvaluation(await api.evaluateInterview(payload, targetRole || null));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <h2>Mock Interview</h2>
      <p className="muted">Practice HR + technical questions and get instant AI feedback with scores.</p>
      <div className="row">
        <button disabled={loading} onClick={start}>
          {loading && questions.length === 0 ? "Loading..." : questions.length ? "Restart Interview" : "Start Interview"}
        </button>
      </div>
      {error && <p className="error">{error}</p>}

      {questions.length > 0 && !evaluation && (
        <div className="results">
          {questions.map((q, i) => (
            <div key={q} className="card">
              <h3>Q{i + 1}. {q}</h3>
              <textarea
                rows={4}
                value={answers[i]}
                placeholder="Type your answer..."
                onChange={(e) => {
                  const next = [...answers];
                  next[i] = e.target.value;
                  setAnswers(next);
                }}
              />
            </div>
          ))}
          <button disabled={loading || answers.some((a) => !a.trim())} onClick={submit}>
            {loading ? "Evaluating..." : "Submit Answers"}
          </button>
        </div>
      )}

      {evaluation && (
        <div className="results">
          <div className="card stat">
            <span className="stat-value">{evaluation.overall_score}</span>
            <span className="stat-label">Overall score / 100 — {evaluation.verdict}</span>
          </div>
          {evaluation.per_question.map((pq) => (
            <div key={pq.question} className="card">
              <div className="job-head">
                <h3>{pq.question}</h3>
                <span className={`badge ${pq.score >= 60 ? "ok" : "warn"}`}>{pq.score}/100</span>
              </div>
              {pq.keywords_hit.length > 0 && (
                <div className="chips">
                  {pq.keywords_hit.map((k) => <span key={k} className="chip ok">{k}</span>)}
                </div>
              )}
              <ul>{pq.feedback.map((f) => <li key={f}>{f}</li>)}</ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
