"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { namaRegu } from "@/lib/regu";
import ThemeToggle from "@/components/ThemeToggle";

export default function ProfilPage() {
  const { profil, logout } = useAuth();
  const router = useRouter();

  if (!profil) return null;

  const rows: [string, string][] = [
    ["Email", profil.email || "-"],
    ["Peran", profil.peran === "kasi_ekbang" ? "Kasi Ekbang" : "Petugas PPSU"],
    ["Regu", profil.regu ? namaRegu(profil.regu) : "Belum masuk regu"],
    ["Status", profil.aktif !== false ? "Aktif" : "Nonaktif"],
  ];

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <h1 className="page-title">Profil</h1>
      <p className="page-sub">Informasi akun dan pengaturan aplikasi.</p>

      <div className="card3d" style={{ marginTop: 18, padding: 22, textAlign: "center" }}>
        <div
          className="avatar-circle"
          style={{ width: 72, height: 72, fontSize: 30, margin: "0 auto 12px" }}
        >
          {profil.nama.charAt(0).toUpperCase()}
        </div>
        <div style={{ fontWeight: 800, fontSize: 18 }}>{profil.nama}</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
          {profil.peran === "kasi_ekbang" ? "Kasi Ekbang" : "Petugas PPSU"}
        </div>
      </div>

      <div className="card3d" style={{ marginTop: 14, padding: 18 }}>
        {rows.map(([k, v]) => (
          <div
            key={k}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              padding: "10px 2px",
              borderBottom: "1px solid var(--border)",
              fontSize: 13.5,
            }}
          >
            <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>{k}</span>
            <span style={{ fontWeight: 700, textAlign: "right" }}>{v}</span>
          </div>
        ))}
      </div>

      <div
        className="card3d"
        style={{ marginTop: 14, padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 700 }}>Mode tampilan</span>
        <ThemeToggle />
      </div>

      <button
        className="btn3d danger"
        style={{ width: "100%", marginTop: 16 }}
        onClick={async () => {
          await logout();
          router.push("/login");
        }}
      >
        Keluar
      </button>
    </div>
  );
}
