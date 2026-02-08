import { signInWithPopup } from "firebase/auth";
import { Navigate, useNavigate } from "react-router-dom";
import { auth, googleProvider } from "../services/firebase";
import { useAuth } from "../services/useAuth";
import { getOrCreateUser } from "../services/users";
import { useState } from "react";
import { theme } from "../theme";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Icons } from '../icons';

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
      await getOrCreateUser();
      nav("/");
    } catch (e) {
      setErr((e as Error)?.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Animated Background Elements */}
      <div style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}>
        <div style={{
          position: "absolute",
          top: "-20%",
          right: "-10%",
          width: "600px",
          height: "600px",
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)",
          borderRadius: "50%",
          animation: "float 6s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute",
          bottom: "-15%",
          left: "-5%",
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, rgba(236, 72, 153, 0.1) 0%, transparent 70%)",
          borderRadius: "50%",
          animation: "float 8s ease-in-out infinite reverse",
        }} />
        <div style={{
          position: "absolute",
          top: "40%",
          left: "30%",
          width: "300px",
          height: "300px",
          background: "radial-gradient(circle, rgba(34, 211, 238, 0.08) 0%, transparent 70%)",
          borderRadius: "50%",
          animation: "float 10s ease-in-out infinite",
        }} />
      </div>

      {/* Left Panel - Branding */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "3rem",
        position: "relative",
        zIndex: 1,
      }}>
        <div style={{
          maxWidth: "480px",
          textAlign: "center",
        }}>
          {/* Logo */}
          <div style={{
            width: "100px",
            height: "100px",
            borderRadius: "28px",
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 2rem",
            boxShadow: "0 20px 40px rgba(99, 102, 241, 0.3)",
            fontSize: "2.5rem",
            color: "white",
          }}>
            <FontAwesomeIcon icon={Icons.city} />
          </div>

          <h1 style={{
            fontSize: "3rem",
            fontWeight: 800,
            margin: "0 0 1rem",
            background: "linear-gradient(135deg, #fff 0%, #c7d2fe 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.02em",
          }}>
            CitySignal
          </h1>

          <p style={{
            fontSize: "1.25rem",
            color: "rgba(255, 255, 255, 0.6)",
            margin: "0 0 3rem",
            lineHeight: 1.6,
          }}>
            Empowering citizens to build safer, smarter communities together
          </p>

          {/* Feature highlights */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
            textAlign: "left",
          }}>
            {[
              { icon: Icons.alert, title: "Report Issues", desc: "Quickly report urban issues in your neighborhood" },
              { icon: Icons.map, title: "Track Progress", desc: "Monitor resolution status in real-time" },
              { icon: Icons.users, title: "Community Driven", desc: "Collaborate with neighbors and authorities" },
            ].map((feature, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "1rem",
                padding: "1rem",
                borderRadius: "16px",
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                backdropFilter: "blur(10px)",
              }}>
                <div style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#a5b4fc",
                  fontSize: "1.1rem",
                  flexShrink: 0,
                }}>
                  <FontAwesomeIcon icon={feature.icon} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: "white", marginBottom: "4px" }}>
                    {feature.title}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "rgba(255, 255, 255, 0.5)", lineHeight: 1.4 }}>
                    {feature.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem",
        position: "relative",
        zIndex: 1,
      }}>
        <div style={{
          width: "100%",
          maxWidth: "420px",
          padding: "2.5rem",
          borderRadius: "24px",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)",
        }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
              marginBottom: "1.5rem",
              fontSize: "1.75rem",
              color: theme.colors.primary,
            }}>
              <FontAwesomeIcon icon={Icons.lock} />
            </div>
            <h2 style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              color: theme.colors.text.primary,
              margin: "0 0 0.5rem",
            }}>
              Welcome back
            </h2>
            <p style={{
              color: theme.colors.text.secondary,
              margin: 0,
              fontSize: "0.95rem",
            }}>
              Sign in to continue to your dashboard
            </p>
          </div>

          {/* Divider */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}>
            <div style={{ flex: 1, height: "1px", background: theme.colors.border }} />
            <span style={{ color: theme.colors.text.muted, fontSize: "0.8rem", fontWeight: 500 }}>
              Continue with
            </span>
            <div style={{ flex: 1, height: "1px", background: theme.colors.border }} />
          </div>

          {/* Google Sign In Button */}
          <button
            onClick={onLogin}
            disabled={busy}
            style={{
              width: "100%",
              padding: "1rem 1.5rem",
              borderRadius: "14px",
              border: `2px solid ${theme.colors.border}`,
              background: "white",
              cursor: busy ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.875rem",
              fontSize: "1rem",
              fontWeight: 600,
              color: theme.colors.text.primary,
              transition: "all 0.2s ease",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.02)",
              opacity: busy ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!busy) {
                e.currentTarget.style.borderColor = theme.colors.primary;
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(99, 102, 241, 0.15)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = theme.colors.border;
              e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.02)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {busy ? (
              <>
                <div style={{
                  width: "20px",
                  height: "20px",
                  border: "2px solid #e2e8f0",
                  borderTopColor: theme.colors.primary,
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }} />
                Signing in...
              </>
            ) : (
              <>
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google"
                  width="22"
                  height="22"
                />
                Sign in with Google
              </>
            )}
          </button>

          {/* Error Display */}
          {err && (
            <div style={{
              marginTop: "1.25rem",
              padding: "1rem",
              borderRadius: "12px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
            }}>
              <FontAwesomeIcon
                icon={Icons.xmark}
                style={{ color: theme.colors.status.danger, marginTop: "2px" }}
              />
              <div>
                <div style={{
                  fontWeight: 600,
                  color: "#991b1b",
                  marginBottom: "4px",
                  fontSize: "0.875rem",
                }}>
                  Authentication Error
                </div>
                <div style={{
                  color: "#b91c1c",
                  fontSize: "0.8rem",
                  lineHeight: 1.4,
                }}>
                  {err}
                </div>
              </div>
            </div>
          )}

          {/* Terms */}
          <p style={{
            marginTop: "2rem",
            textAlign: "center",
            fontSize: "0.8rem",
            color: theme.colors.text.muted,
            lineHeight: 1.5,
          }}>
            By signing in, you agree to our{" "}
            <a href="#" style={{ color: theme.colors.primary, textDecoration: "none" }}>
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" style={{ color: theme.colors.primary, textDecoration: "none" }}>
              Privacy Policy
            </a>
          </p>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(3deg); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 900px) {
          /* Stack panels on mobile */
        }
      `}</style>
    </div>
  );
}
