import { Link } from "react-router-dom";
import type { Signal } from "../types/signal";

export default function SignalList({ signals }: { signals: Signal[] }) {
  if (!signals.length) return <div style={{ padding: 12 }}>No signals yet.</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12 }}>
      {signals.map((s) => (
        <div key={s.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontWeight: 700 }}>
              {s.category} • severity {s.severity}
            </div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{s.status}</div>
          </div>
          <div style={{ fontSize: 13, marginTop: 6, opacity: 0.9 }}>{s.description}</div>
          <div style={{ marginTop: 8, display: "flex", gap: 10, fontSize: 12, opacity: 0.8 }}>
            <span>Groups: {s.affectedGroups.join(", ") || "—"}</span>
            <span>Photo: {s.hasLocalPhoto ? "local" : "none"}</span>
          </div>
          <div style={{ marginTop: 8 }}>
            <Link to={`/signal/${s.id}`}>Open</Link>
          </div>
        </div>
      ))}
    </div>
  );
}
