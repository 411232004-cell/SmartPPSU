"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

type Item = { href: string; label: string; icon: React.ReactNode };

const I = {
  home: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H10v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20h3.5a1 1 0 0 0 1-1v-9" />
    </svg>
  ),
  absen: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <path d="M8 12.3l2.5 2.5L16 9.3" />
    </svg>
  ),
  kamera: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </svg>
  ),
  tugas: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  jadwal: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="5" width="17" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </svg>
  ),
  monitor: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21s-7-5.4-7-11a7 7 0 0 1 14 0c0 5.6-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  ),
  nilai: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  ),
  monev: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" />
    </svg>
  ),
  users: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  zona: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" />
      <rect x="13" y="3.5" width="7.5" height="7.5" rx="2" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="2" />
      <rect x="13" y="13" width="7.5" height="7.5" rx="2" />
    </svg>
  ),
  logout: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
};

export default function Sidebar({
  peran = "petugas_ppsu",
  nama = "Petugas",
}: {
  peran?: "petugas_ppsu" | "kasi_ekbang";
  nama?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const utama: Item[] =
    peran === "kasi_ekbang"
      ? [
          { href: "/dashboard", label: "Monitoring Real-time", icon: I.monitor },
          { href: "/penugasan", label: "Penugasan & Zona", icon: I.tugas },
          { href: "/jadwal", label: "Jadwal Harian PPSU", icon: I.jadwal },
          { href: "/penilaian", label: "Penilaian SMART", icon: I.nilai },
          { href: "/monev", label: "Laporan / Monev", icon: I.monev },
          { href: "/zona", label: "Regu & Zona", icon: I.zona },
        ]
      : [
          { href: "/dashboard", label: "Beranda", icon: I.home },
          { href: "/absensi", label: "Absensi", icon: I.absen },
          { href: "/progres", label: "Foto Progres", icon: I.kamera },
          { href: "/tugas", label: "Penugasan Saya", icon: I.tugas },
          { href: "/jadwal", label: "Jadwal Saya", icon: I.jadwal },
          { href: "/zona", label: "Regu & Zona", icon: I.zona },
          { href: "/kendala", label: "Lapor Kendala", icon: I.monitor },
        ];

  const lainnya: Item[] =
    peran === "kasi_ekbang"
      ? [{ href: "/petugas", label: "Data Petugas", icon: I.users }]
      : [{ href: "/nilai-saya", label: "Nilai Kinerja Saya", icon: I.nilai }];

  return (
    <aside className="sidebar-app">
      <div className="logo-row">
        <div className="logo">
          <span className="logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 21s-7-5.4-7-11a7 7 0 0 1 14 0c0 5.6-7 11-7 11z" />
              <circle cx="12" cy="10" r="2.6" />
            </svg>
          </span>
          <span>Smart PPSU</span>
        </div>

      </div>

      <div className="section-label">MENU UTAMA</div>
      <nav className="nav-section">
        {utama.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`nav-item${pathname === it.href ? " active" : ""}`}
          >
            {it.icon}
            <span className="nav-label">{it.label}</span>
          </Link>
        ))}
      </nav>

      <div className="divider" />
      <div className="section-label">LAINNYA</div>
      <nav className="nav-section">
        {lainnya.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`nav-item${pathname === it.href ? " active" : ""}`}
          >
            {it.icon}
            <span className="nav-label">{it.label}</span>
          </Link>
        ))}
        <button
          className="nav-item"
          style={{ border: "none", background: "none", cursor: "pointer", width: "100%", textAlign: "left" }}
          onClick={async () => { await logout(); router.push("/login"); }}
        >
          {I.logout}
          <span className="nav-label">Keluar</span>
        </button>
      </nav>

      <div className="spacer" />
      <div className="user-row">
        <div className="avatar-circle">{nama.charAt(0).toUpperCase()}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {nama}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
            {peran === "kasi_ekbang" ? "Kasi Ekbang" : "Petugas PPSU"}
          </div>
        </div>
      </div>
    </aside>
  );
}
