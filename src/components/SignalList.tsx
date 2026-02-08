import { Link } from "react-router-dom";
import type { Signal } from "../types/signal";
import ConfirmButton from "./ConfirmButton";
import { getPriorityBadge } from "../utils/scoring";
import { theme, CATEGORY_ICONS } from "../theme";

function PriorityBadge({ score }: { score: number }) {
  const b = getPriorityBadge(score);

  let bg = theme.colors.status.infoLight;
  let color = theme.colors.status.info;

  if (b === "High") {
    bg = theme.colors.status.dangerLight;
    color = theme.colors.status.danger;
  } else if (b === "Medium") {
    bg = theme.colors.status.warningLight;
    color = "#92400e"; // amber-800
  } else {
    bg = theme.colors.status.successLight;
    color = "#166534"; // green-800
  }

  return (
    <span style={{
      padding: "4px 10px",
      borderRadius: theme.rounded.full,
      backgroundColor: bg,
      color: color,
      fontSize: theme.typography.sizes.xs,
      fontWeight: 600,
    }}>
      {b}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isResolved = status === "resolved";
  return (
    <span style={{
      fontSize: theme.typography.sizes.xs,
      color: isResolved ? theme.colors.status.success : theme.colors.status.warning,
      fontWeight: 500,
      display: "flex",
      alignItems: "center",
      gap: "4px"
    }}>
      <span style={{
        width: "6px",
        height: "6px",
        borderRadius: "50%",
        backgroundColor: isResolved ? theme.colors.status.success : theme.colors.status.warning
      }} />
      {isResolved ? "Resolved" : "Open"}
    </span>
  );
}

export default function SignalList({ signals }: { signals: Signal[] }) {
  if (!signals.length) return (
    <div style={{
      padding: "2rem",
      textAlign: "center",
      color: theme.colors.text.secondary,
    }}>
      No signals found matching your criteria.
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {signals.map((s) => {
        const icon = CATEGORY_ICONS[s.category] || "📌";

        return (
          <div
            key={s.id}
            style={{
              ...theme.card,
              padding: "1rem",
              transition: theme.transitions.default,
              cursor: "default",
              borderLeft: `4px solid ${s.status === "resolved"
                  ? theme.colors.status.success
                  : getPriorityBadge(s.priorityScore ?? 0) === "High"
                    ? theme.colors.status.danger
                    : getPriorityBadge(s.priorityScore ?? 0) === "Medium"
                      ? theme.colors.status.warning
                      : theme.colors.primary
                }`
            }}
          >
            {/* Header Row */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "0.75rem"
            }}>
              {/* Category + Icon */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                <span style={{
                  fontSize: "1.5rem",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: theme.colors.bg,
                  borderRadius: theme.rounded.lg
                }}>
                  {icon}
                </span>
                <div>
                  <div style={{
                    fontWeight: 600,
                    fontSize: theme.typography.sizes.base,
                    color: theme.colors.text.primary,
                    textTransform: "capitalize",
                    marginBottom: "2px"
                  }}>
                    {s.category.replace("_", " ")}
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              </div>

              {/* Priority Badge */}
              <PriorityBadge score={s.priorityScore ?? 0} />
            </div>

            {/* Description */}
            <p style={{
              fontSize: theme.typography.sizes.sm,
              color: theme.colors.text.secondary,
              lineHeight: 1.5,
              marginBottom: "0.75rem",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              margin: "0 0 0.75rem 0"
            }}>
              {s.description}
            </p>

            {/* Stats Row */}
            <div style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              fontSize: theme.typography.sizes.xs,
              color: theme.colors.text.muted,
              paddingTop: "0.75rem",
              borderTop: `1px solid ${theme.colors.borderLight}`,
              marginBottom: "0.75rem"
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                👥 {s.confirmationsCount ?? 0} confirmed
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                ⚡ Severity {s.severity}/5
              </span>
              {s.hasLocalPhoto && (
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  📸 Photo
                </span>
              )}
              {s.affectedGroups.length > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  🎯 {s.affectedGroups.slice(0, 2).join(", ")}
                  {s.affectedGroups.length > 2 && ` +${s.affectedGroups.length - 2}`}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <Link
                to={`/signal/${s.id}`}
                style={{
                  ...theme.button.base,
                  ...theme.button.primary,
                  flex: 1,
                  textDecoration: "none",
                  fontSize: theme.typography.sizes.sm,
                  padding: "0.5rem 0.75rem"
                }}
              >
                View Details
              </Link>
              <div style={{ flex: 1 }}>
                <ConfirmButton signalId={s.id} signalLat={s.lat} signalLng={s.lng} compact />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
