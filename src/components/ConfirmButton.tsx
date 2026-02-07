import { useEffect, useState } from "react";
import { confirmSignal, hasConfirmed } from "../services/confirmations";
import { useAuth } from "../services/useAuth";

export default function ConfirmButton({
  signalId,
  compact = false,
}: {
  signalId: string;
  compact?: boolean;
}) {
  const { user, loading } = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setErr(null);
      if (!user) {
        setConfirmed(false);
        return;
      }
      const v = await hasConfirmed(signalId, user.uid);
      if (!cancelled) setConfirmed(v);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [signalId, user]);

  async function onConfirm() {
    if (!user) {
      setErr("Please sign in to confirm.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await confirmSignal(signalId, user.uid);
      setConfirmed(true);
      if (res.alreadyConfirmed) {
        // no-op
      }
    } catch (e) {
      setErr((e as Error)?.message ?? "Confirm failed");
    } finally {
      setBusy(false);
    }
  }

  const disabled = loading || busy || confirmed;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled}
        style={{
          padding: compact ? "6px 10px" : "10px 12px",
          opacity: disabled ? 0.7 : 1,
        }}
      >
        {confirmed ? "Confirmed" : busy ? "Confirming..." : "Confirm"}
      </button>
      {err && <div style={{ color: "crimson", fontSize: 12 }}>{err}</div>}
    </div>
  );
}
