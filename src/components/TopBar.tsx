import { signOut } from "firebase/auth";
import { Link } from "react-router-dom";
import { auth } from "../services/firebase";
import { useAuth } from "../services/useAuth";

export default function TopBar() {
  const { user, loading } = useAuth();

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", padding: 12, borderBottom: "1px solid #eee" }}>
      <Link to="/" style={{ textDecoration: "none", fontWeight: 700 }}>
        CitySignal
      </Link>

      <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
        {!loading && user ? (
          <>
            <span style={{ fontSize: 12, opacity: 0.8 }}>{user.email ?? "Signed in"}</span>
            <Link to="/new">New Signal</Link>
            <button onClick={() => signOut(auth)}>Sign out</button>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </div>
    </div>
  );
}
