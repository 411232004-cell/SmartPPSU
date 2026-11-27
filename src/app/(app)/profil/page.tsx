"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { namaRegu } from "@/lib/regu";
import { daftarkanPush, izinNotif, PushStatus } from "@/lib/push";
import ThemeToggle from "@/components/ThemeToggle";

export default function ProfilPage() {
  const { profil, logout } = useAuth();
  const router = useRouter();
  const [pushStatus, setPushStatus] = useState<PushStatus | "loading" | null>(null);

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

      {/* aktifkan push notification — wajib lewat klik (aturan browser mobile) */}
      {profil.peran === "petugas_ppsu" && (
        <div className="card3d" style={{ marginTop: 14, padding: 16 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>Notifikasi</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
            Aktifkan supaya tugas khusus & edaran bunyi walau aplikasi tertutup.
          </div>
          {izinNotif() === "granted" && pushStatus !== "denied" && pushStatus !== "error" ? (
            <div style={{ marginTop: 10, fontSize: 13, fontWeight: 800, color: "var(--green-deep)" }}>
              {pushStatus === "aktif" ? "✓ Notifikasi aktif di perangkat ini" : "Izin notifikasi sudah diberikan — klik untuk daftarkan perangkat ini"}
            </div>
          ) : null}
          {(pushStatus === null || pushStatus === "denied" || pushStatus === "error" || pushStatus === "no_vapid" || izinNotif() !== "granted") && (
            <button
              className="btn3d"
              style={{ width: "100%", marginTop: 10, padding: "11px 16px" }}
              disabled={pushStatus === "loading"}
              onClick={async () => {
                setPushStatus("loading");
                setPushStatus(await daftarkanPush(profil.uid));
              }}
            >
              {pushStatus === "loading" ? "Mengaktifkan…" : "Aktifkan Notifikasi"}
            </button>
          )}
          {pushStatus === "denied" && (
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--danger)", fontWeight: 600 }}>
              Izin ditolak — buka pengaturan situs di browser (ikon gembok/titik tiga → Site settings → Notifications → Allow), lalu coba lagi.
            </div>
          )}
          {pushStatus === "error" && (
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--danger)", fontWeight: 600 }}>
              Gagal mendaftarkan perangkat — coba lagi.
            </div>
          )}
          {izinNotif() === "unsupported" && (
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
              Browser ini tidak mendukung notifikasi. Di iPhone, install aplikasi ke Home Screen dulu.
            </div>
          )}
        </div>
      )}

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
