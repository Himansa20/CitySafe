import { Polyline } from "react-leaflet";
import type { SegmentRisk } from "../services/nightSafety";
import { getSegmentRiskLevel } from "../services/nightSafety";

function styleFor(level: "high" | "medium" | "low") {
  if (level === "high") return { color: "red", weight: 6, opacity: 0.9 };
  if (level === "medium") return { color: "orange", weight: 5, opacity: 0.8 };
  return { color: "yellow", weight: 4, opacity: 0.7 };
}

export default function SegmentOverlay({
  segments,
  onSelect,
}: {
  segments: SegmentRisk[];
  onSelect: (seg: SegmentRisk) => void;
}) {
  return (
    <>
      {segments.map((s) => {
        const level = getSegmentRiskLevel(s.segmentRiskScore, s.highRiskCount);
        return (
          <Polyline
            key={s.segmentId}
            positions={s.polyline.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={styleFor(level)}
            eventHandlers={{ click: () => onSelect(s) }}
          />
        );
      })}
    </>
  );
}
