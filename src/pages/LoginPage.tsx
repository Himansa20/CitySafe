import { signInWithPopup } from "firebase/auth";
import { Navigate } from "react-router-dom";
import { auth, googleProvider } from "../services/firebase";
import { useAuth } from "../services/useAuth";

export default function LoginPage() {
  const { user, loading } = useAuth();

  if (!loading && user) return <Navigate to="/" replace />;

  return (
    <div style={{ padding: 16, maxWidth: 520, margin: "0 auto" }}>
      <h2>Login</h2>
      <p style={{ opacity: 0.8 }}>Sign in to create a signal.</p>
      <button
        onClick={() => signInWithPopup(auth, googleProvider)}
        style={{ padding: "10px 12px" }}
      >
        Sign in with Google
      </button>
    </div>
  );
}
