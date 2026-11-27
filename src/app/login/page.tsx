"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import ThemeToggle from "@/components/ThemeToggle";
import LoadingScreen from "@/components/LoadingScreen";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Email dan password wajib diisi");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.push("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.includes("invalid-credential") || msg.includes("wrong-password") || msg.includes("user-not-found")
          ? "Email atau password salah."
          : msg
      );
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div style={{ position: "fixed", top: 18, right: 18 }}>
        <ThemeToggle />
      </div>

      <div className="login-card">
        {loading ? (
          <div style={{ padding: "40px 0" }}>
            <LoadingScreen label="Memproses Login" />
          </div>
        ) : (
          <>
            <div className="login-avatar-line">
              <span />
              <div className="login-avatar">👷</div>
              <span />
            </div>

            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: 1 }}>
                SMART PPSU
              </div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                Kelurahan Duri Selatan — Absensi &amp; Penilaian Kinerja
              </div>
            </div>

            <form className="login-form" onSubmit={submit}>
              <div className="login-input-box">
                <span className="ic">👤</span>
                <input
                  type="email"
                  placeholder="EMAIL"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                />
              </div>
              <div className="login-input-box">
                <span className="ic">🔒</span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div
                  style={{
                    background: "rgba(229,83,75,0.25)",
                    border: "1px solid rgba(255,255,255,0.4)",
                    borderRadius: 10,
                    padding: "9px 12px",
                    fontSize: 12.5,
                  }}
                >
                  {error}
                </div>
              )}

              <button type="submit" className="btn3d" style={{ width: "100%", marginTop: 4 }}>
                LOGIN
              </button>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12.5,
                  marginTop: 8,
                  opacity: 0.9,
                }}
              >
                <span>Absensi • Progres • SMART</span>
                <a href="#" style={{ color: "rgba(255,255,255,0.8)" }}>
                  Lupa password?
                </a>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
