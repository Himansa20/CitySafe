import { useEffect, useState } from "react";
import { confirmSignal, hasConfirmed } from "../services/confirmations";
import { useAuth } from "../services/useAuth";
import { theme } from "../theme";

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
      setErr("Sign in needed");
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
      setErr((e as Error)?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  const disabled = loading || busy || confirmed;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled}
        style={{
          ...theme.button.base,
          ...(confirmed ? theme.button.secondary : theme.button.primary),
          backgroundColor: confirmed ? theme.colors.status.success : undefined,
          color: confirmed ? "#fff" : undefined,
          border: confirmed ? "none" : undefined,
          padding: compact ? "0.4rem 0.8rem" : "0.6rem 1rem",
          opacity: disabled && !confirmed ? 0.7 : 1,
          width: "100%",
          fontSize: compact ? theme.typography.sizes.xs : theme.typography.sizes.sm,
        }}
      >
        {confirmed ? "✓ Confirmed" : busy ? "..." : "👍 Confirm"}
      </button>
      {err && <div style={{ color: theme.colors.status.danger, fontSize: theme.typography.sizes.xs }}>{err}</div>}
    </div>
  );
}
