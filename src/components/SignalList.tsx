import { Link } from "react-router-dom";
import type { Signal } from "../types/signal";
import ConfirmButton from "./ConfirmButton";
import { formatScore, getPriorityBadge } from "../utils/scoring";

function Badge({ score }: { score: number }) {
  const b = getPriorityBadge(score);
  const bg =
    b === "High" ? "#ffe5e5" : b === "Medium" ? "#fff4db" : "#e9f7ee";
  const border =
    b === "High" ? "#ffb3b3" : b === "Medium" ? "#ffd28a" : "#bfe7cd";

  return (
    <span style={{ padding: "2px 8px", borderRadius: 999, border: `1px solid ${border}`, background: bg, fontSize: 12 }}>
      {b}
    </span>
  );
}

export default function SignalList({ signals }: { signals: Signal[] }) {
  if (!signals.length) return <div style={{ padding: 12 }}>No signals yet.</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12 }}>
      {signals.map((s) => (
        <div key={s.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
            <div style={{ fontWeight: 800 }}>
              {s.category} • severity {s.severity}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Badge score={s.priorityScore ?? 0} />
              <div style={{ fontSize: 12, opacity: 0.7 }}>{s.status}</div>
            </div>
          </div>

          <div style={{ fontSize: 13, marginTop: 6, opacity: 0.9 }}>{s.description}</div>

          <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, opacity: 0.85 }}>
            <span>Groups: {s.affectedGroups.join(", ") || "—"}</span>
            <span>Confirms: {s.confirmationsCount ?? 0}</span>
            <span>Score: {formatScore(s.priorityScore ?? 0)}</span>
            <span>Photo: {s.hasLocalPhoto ? "local" : "none"}</span>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
            <Link to={`/signal/${s.id}`}>Open</Link>
            <ConfirmButton signalId={s.id} compact />
          </div>
        </div>
      ))}
    </div>
  );
}
