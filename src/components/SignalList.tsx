import { Link } from "react-router-dom";
import type { Signal } from "../types/signal";
import ConfirmButton from "./ConfirmButton";
import { getPriorityBadge } from "../utils/scoring";
import { theme } from "../theme";

function Badge({ score }: { score: number }) {
  const b = getPriorityBadge(score);

  let bg = theme.colors.status.info;
  let color = "#ffffff";

  if (b === "High") {
    bg = theme.colors.status.danger;
  } else if (b === "Medium") {
    bg = theme.colors.status.warning;
  } else {
    bg = theme.colors.status.success;
  }

  return (
    <span style={{
      padding: "2px 8px",
      borderRadius: theme.rounded.full,
      backgroundColor: bg,
      color: color,
      fontSize: theme.typography.sizes.xs,
      fontWeight: 600,
      boxShadow: theme.shadows.sm,
    }}>
      {b} Priority
    </span>
  );
}

export default function SignalList({ signals }: { signals: Signal[] }) {
  if (!signals.length) return (
    <div style={{
      padding: "2rem",
      textAlign: "center",
      color: theme.colors.text.secondary,
      ...theme.card
    }}>
      No signals found matching your criteria.
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {signals.map((s) => (
        <div key={s.id} style={{
          ...theme.card,
          padding: "1rem",
          transition: "transform 0.2s, box-shadow 0.2s",
          cursor: "default"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "flex-start", marginBottom: "0.5rem" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{
                fontSize: theme.typography.sizes.sm,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                fontWeight: 600,
                color: theme.colors.text.secondary
              }}>
                {s.category.replace("_", " ")}
              </span>
              <span style={{ fontSize: theme.typography.sizes.lg, fontWeight: 700, color: theme.colors.text.primary }}>
                Subject: {s.category} Issue
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
              <Badge score={s.priorityScore ?? 0} />
              <span style={{
                fontSize: theme.typography.sizes.xs,
                color: theme.colors.text.secondary,
                fontWeight: 500
              }}>
                {s.status.replace("_", " ")}
              </span>
            </div>
          </div>

          <p style={{
            fontSize: theme.typography.sizes.sm,
            color: theme.colors.text.secondary,
            lineHeight: 1.5,
            marginBottom: "1rem",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden"
          }}>
            {s.description}
          </p>

          <div style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            fontSize: theme.typography.sizes.xs,
            color: theme.colors.text.secondary,
            paddingTop: "0.75rem",
            borderTop: `1px solid ${theme.colors.border}`,
            marginBottom: "1rem"
          }}>
            <span title="Affected Groups">👥 {s.affectedGroups.length ? s.affectedGroups.join(", ") : "None specified"}</span>
            <span title="Confirmations">👍 {s.confirmationsCount ?? 0}</span>
            <span title="Severity">⚠️ Level {s.severity}</span>
            {s.hasLocalPhoto && <span title="Has Photo">📸 Photo</span>}
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <Link
              to={`/signal/${s.id}`}
              style={{
                ...theme.button.base,
                ...theme.button.secondary,
                flex: 1,
                textDecoration: "none",
                fontSize: theme.typography.sizes.sm
              }}
            >
              View Details
            </Link>
            <div style={{ flex: 1 }}>
              <ConfirmButton signalId={s.id} compact />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
