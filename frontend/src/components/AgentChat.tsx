import { useRef, useState } from "react";
import { api } from "../api";

interface Message {
  from: "user" | "agent";
  text: string;
}

export default function AgentChat({ skills, targetRole }: { skills: string[]; targetRole: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      from: "agent",
      text: "Hi! I'm your CareerAI mentor. Ask me anything about careers, skills, resumes, roadmaps or interviews.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages((m) => [...m, { from: "user", text }]);
    setLoading(true);
    try {
      const res = await api.agentChat(text, skills, targetRole || null);
      setMessages((m) => [...m, { from: "agent", text: res.reply }]);
    } catch {
      setMessages((m) => [...m, { from: "agent", text: "Sorry, something went wrong. Is the backend running?" }]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  return (
    <section>
      <h2>AI Career Mentor</h2>
      <p className="muted">Chat with the CareerAI agent. It uses your detected skills and target role for personalized advice.</p>
      <div className="chat">
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.from}`}>{m.text}</div>
        ))}
        {loading && <div className="bubble agent">Thinking…</div>}
        <div ref={bottomRef} />
      </div>
      <div className="row">
        <input
          className="chat-input"
          value={input}
          placeholder="e.g. Which job suits my skills? How do I prepare for interviews?"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button disabled={loading || !input.trim()} onClick={send}>Send</button>
      </div>
    </section>
  );
}
