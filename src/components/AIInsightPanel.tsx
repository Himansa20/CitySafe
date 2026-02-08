import { useState } from "react";
import { buildAreaSummary } from "../services/areaSummary";
import { buildInsightPrompt } from "../services/aiPrompt";
import { generateAIInsight } from "../services/aiInsight";

type Status = "idle" | "loading" | "success" | "error";

export default function AIInsightPanel({ areaId }: { areaId: string }) {
  const [days, setDays] = useState<7 | 30>(7);
  const [status, setStatus] = useState<Status>("idle");
  const [text, setText] = useState("");
  const [err, setErr] = useState("");

  async function onGenerate() {
    setStatus("loading");
    setErr("");
    setText("");

    try {
      const summary = await buildAreaSummary(areaId, days);
      if (summary.totalSignals === 0) {
        setText("No reports in this area for the selected time window.");
        setStatus("success");
        return;
      }

      const prompt = buildInsightPrompt(summary);
      const out = await generateAIInsight(prompt);

      setText(out || "No insight returned.");
      setStatus("success");
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? "Failed");
      setStatus("error");
    }
  }

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: 12, borderBottom: "1px solid #eee", fontWeight: 900 }}>
        AI Insight (Advisory)
      </div>

      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 13, opacity: 0.85 }}>
          Summarizes waste/transport patterns and suggests one next step. Not a decision.
        </div>

        <label style={{ fontSize: 12 }}>
          Time window{" "}
          <select value={days} onChange={(e) => setDays(Number(e.target.value) as 7 | 30)}>
            <option value={7}>last 7 days</option>
            <option value={30}>last 30 days</option>
          </select>
        </label>

        <button onClick={onGenerate} disabled={status === "loading"} style={{ padding: "10px 12px" }}>
          {status === "loading" ? "Generating..." : "Generate AI Insight"}
        </button>

        {status === "error" && <div style={{ color: "crimson", fontSize: 12 }}>{err}</div>}

        {text && (
          <div style={{ borderTop: "1px solid #eee", paddingTop: 10 }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Generated Insight</div>
            <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.35 }}>{text}</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
              Based on reported signals in the selected time window.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
