import { signInWithPopup } from "firebase/auth";
import { Navigate, useNavigate } from "react-router-dom";
import { auth, googleProvider } from "../services/firebase";
import { useAuth } from "../services/useAuth";
import { getOrCreateUser } from "../services/users";
import { useState } from "react";
import { theme } from "../theme";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function onLogin() {
    setBusy(true);
    setErr(null);
    try {
      await signInWithPopup(auth, googleProvider);
      await getOrCreateUser(); // create users/{uid} with role=citizen if missing
      nav("/");
    } catch (e) {
      setErr((e as Error)?.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      ...theme.layout.flexCenter,
      minHeight: "calc(100vh - 80px)",
      background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)"
    }}>
      <div style={{
        ...theme.card,
        padding: "2.5rem",
        width: "100%",
        maxWidth: "420px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.5rem",
        boxShadow: theme.shadows.lg
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🏙️</div>
          <h2 style={{
            fontSize: theme.typography.sizes["2xl"],
            fontWeight: 800,
            color: theme.colors.text.primary,
            margin: 0
          }}>
            Welcome Back
          </h2>
          <p style={{
            color: theme.colors.text.secondary,
            marginTop: "0.5rem",
            fontSize: theme.typography.sizes.base
          }}>
            Sign in to CitySignal to report issues, track status, and help your community.
          </p>
        </div>

        <button
          onClick={onLogin}
          disabled={busy}
          style={{
            ...theme.button.base,
            ...theme.button.secondary,
            width: "100%",
            padding: "0.8rem",
            fontSize: theme.typography.sizes.base,
            display: "flex",
            gap: "0.75rem",
            justifyContent: "center",
            boxShadow: theme.shadows.sm
          }}
        >
          {busy ? "Signing in..." : (
            <>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="18" height="18" />
              Sign in with Google
            </>
          )}
        </button>

        {err && (
          <div style={{
            color: theme.colors.status.danger,
            fontSize: theme.typography.sizes.sm,
            padding: "0.5rem",
            backgroundColor: "#fef2f2",
            borderRadius: theme.rounded.md,
            width: "100%",
            textAlign: "center"
          }}>
            {err}
          </div>
        )}
      </div>
    </div>
  );
}
