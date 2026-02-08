import { useEffect, useState } from "react";
import type { SegmentRisk } from "../services/nightSafety";
import { getSegmentRiskLevel } from "../services/nightSafety";
import { Link } from "react-router-dom";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "../services/firebase";

export default function SegmentPopup({
  segment,
  onClose,
}: {
  segment: SegmentRisk;
  onClose: () => void;
}) {
  const level = getSegmentRiskLevel(segment.segmentRiskScore, segment.highRiskCount);

  // Pull latest action log per nearby signal (MVP: N queries, N<=3)
  const [latestNotes, setLatestNotes] = useState<Record<string, string>>({});
  const [openHelpNearby, setOpenHelpNearby] = useState<any[]>([]);
  const [pledgeCounts, setPledgeCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // latest action note per signal
      const notes: Record<string, string> = {};
      for (const s of segment.nearbyTopSignals) {
        const q1 = query(
          collection(db, "actionLogs"),
          where("signalId", "==", s.id),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        const snap = await getDocs(q1);
        notes[s.id] = snap.docs[0]?.data()?.note ?? "";
      }

      // open help requests near the segment bbox (expanded)
      const q2 = query(collection(db, "helpRequests"), where("status", "==", "open"), orderBy("createdAt", "desc"), limit(50));
      const snap2 = await getDocs(q2);
      const all = snap2.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

      // bbox-only match: if help lat/lng inside bbox +/- delta
      const delta = 0.002;
      const near = all.filter((r) => {
        if (r.lat == null || r.lng == null) return false;
        const lat = Number(r.lat), lng = Number(r.lng);
        return (
          lat >= segment.bbox.minLat - delta &&
          lat <= segment.bbox.maxLat + delta &&
          lng >= segment.bbox.minLng - delta &&
          lng <= segment.bbox.maxLng + delta
        );
      }).slice(0, 3);

      // pledge counts for those help requests (MVP: 3 queries)
      const counts: Record<string, number> = {};
      for (const hr of near) {
        const q3 = query(collection(db, "pledges"), where("helpRequestId", "==", hr.id), limit(200));
        const snap3 = await getDocs(q3);
        counts[hr.id] = snap3.size;
      }

      if (!cancelled) {
        setLatestNotes(notes);
        setOpenHelpNearby(near);
        setPledgeCounts(counts);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [segment]);

  return (
    <div style={{ position: "absolute", top: 12, right: 12, width: 360, background: "white", border: "1px solid #eee", borderRadius: 10, padding: 12, zIndex: 1000 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div style={{ fontWeight: 900 }}>Unsafe at Night Segment</div>
        <button onClick={onClose}>X</button>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
        Risk: <b>{level}</b> • Score: <b>{segment.segmentRiskScore}</b> • Night signals: <b>{segment.signalCount}</b> • High-risk: <b>{segment.highRiskCount}</b>
      </div>

      <div style={{ marginTop: 8, fontSize: 12 }}>
        Top categories: {segment.topCategories.map((c) => `${c.category} (${c.count})`).join(", ") || "—"}
      </div>

      <div style={{ marginTop: 10, fontWeight: 900 }}>Top nearby signals</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
        {segment.nearbyTopSignals.length ? segment.nearbyTopSignals.map((s) => (
          <div key={s.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
            <div style={{ fontWeight: 800 }}>
              {s.category} • score {Math.round(Number(s.priorityScore ?? 0) * 10) / 10} • <span style={{ fontSize: 12, opacity: 0.8 }}>{s.status}</span>
            </div>
            {latestNotes[s.id] ? (
              <div style={{ fontSize: 12, marginTop: 4, opacity: 0.9 }}>Latest action: {latestNotes[s.id]}</div>
            ) : (
              <div style={{ fontSize: 12, marginTop: 4, opacity: 0.6 }}>No action logs yet.</div>
            )}
            <div style={{ marginTop: 6 }}>
              <Link to={`/signal/${s.id}`}>Open signal</Link>
            </div>
          </div>
        )) : <div style={{ opacity: 0.7 }}>No nearby night signals matched.</div>}
      </div>

      <div style={{ marginTop: 10, fontWeight: 900 }}>Open help nearby</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
        {openHelpNearby.length ? openHelpNearby.map((r) => (
          <div key={r.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
            <div style={{ fontWeight: 800 }}>{r.title}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{r.type} • {r.orgName} • pledges {pledgeCounts[r.id] ?? 0}</div>
          </div>
        )) : <div style={{ opacity: 0.7 }}>No open help requests near this segment.</div>}
      </div>

      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>
        Out of scope: true routing engine, turn-by-turn navigation, segment-level action logs stored directly on segment.
      </div>
    </div>
  );
}
