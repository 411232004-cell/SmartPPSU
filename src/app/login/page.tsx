"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import ThemeToggle from "@/components/ThemeToggle";
import InlineLoader from "@/components/InlineLoader";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!SITE_KEY || document.getElementById("recaptcha-v3")) return;
    const s = document.createElement("script");
    s.id = "recaptcha-v3";
    s.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Email dan password wajib diisi");
      return;
    }
    setLoading(true);

    if (SITE_KEY) {
      try {
        const token = await new Promise<string>((resolve, reject) => {
          if (!window.grecaptcha) {
            reject(new Error("reCAPTCHA belum termuat. Cek koneksi."));
            return;
          }
          window.grecaptcha.ready(() => {
            window.grecaptcha!
              .execute(SITE_KEY, { action: "login" })
              .then(resolve)
              .catch(() => reject(new Error("reCAPTCHA gagal dieksekusi.")));
          });
        });
        const res = await fetch("/api/verify-recaptcha", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const v = await res.json();
        if (!v.success) {
          setError("Verifikasi keamanan gagal. Coba lagi.");
          setLoading(false);
          return;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Verifikasi keamanan gagal.");
        setLoading(false);
        return;
      }
    }

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
    <div className="bubble-bg">
      <span className="ball ball-1" />
      <span className="ball ball-2" />
      <span className="ball ball-3" />
      <span className="ball ball-4" />
      <span className="ball ball-5" />
      <span className="ball ball-6" />
      <span className="ball ball-7" />

      <div style={{ position: "fixed", top: 18, right: 18, zIndex: 20 }}>
        <ThemeToggle />
      </div>

      <div className="glass-circle">
        {loading ? (
          <div style={{ padding: "40px 0", zIndex: 10 }}>
            <InlineLoader label="Memproses Login" />
          </div>
        ) : (
          <form className="bubble-form" onSubmit={submit}>
            <h1>Smart PPSU</h1>
            <div className="bubble-sub">Kelurahan Duri Selatan — Absensi &amp; Penilaian Kinerja</div>

            <div className="bubble-input">
              <span className="ic">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="5" width="18" height="14" rx="3" />
                  <path d="m3.5 7 8.5 6 8.5-6" />
                </svg>
              </span>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div className="bubble-input">
              <span className="ic">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="4" y="10.5" width="16" height="10" rx="3" />
                  <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
                </svg>
              </span>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && <div className="bubble-error">{error}</div>}

            <button type="submit" className="bubble-btn">
              LOGIN
            </button>

            <div className="bubble-foot">
              <span>Absensi • Progres • SMART</span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
