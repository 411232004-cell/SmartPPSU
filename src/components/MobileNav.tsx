"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const I = {
  home: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H10v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20h3.5a1 1 0 0 0 1-1v-9" />
    </svg>
  ),
  absen: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <path d="M8 12.3l2.5 2.5L16 9.3" />
    </svg>
  ),
  kamera: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </svg>
  ),
  tugas: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  monitor: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21s-7-5.4-7-11a7 7 0 0 1 14 0c0 5.6-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  ),
  nilai: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  ),
  monev: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" />
    </svg>
  ),
};

export default function MobileNav({
  peran = "petugas_ppsu",
}: {
  peran?: "petugas_ppsu" | "kasi_ekbang";
}) {
  const pathname = usePathname();
  const items =
    peran === "kasi_ekbang"
      ? [
          { href: "/dashboard", label: "Monitor", icon: I.monitor },
          { href: "/jadwal", label: "Jadwal", icon: I.tugas },
          { href: "/penilaian", label: "Nilai", icon: I.nilai },
          { href: "/monev", label: "Monev", icon: I.monev },
        ]
      : [
          { href: "/dashboard", label: "Beranda", icon: I.home },
          { href: "/absensi", label: "Absen", icon: I.absen },
          { href: "/progres", label: "Progres", icon: I.kamera },
          { href: "/tugas", label: "Tugas", icon: I.tugas },
        ];

  return (
    <nav className="mobile-nav">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className={pathname === it.href ? "active" : ""}
        >
          {it.icon}
          <span>{it.label}</span>
        </Link>
      ))}
    </nav>
  );
}
