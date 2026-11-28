"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const SZ = 22;

const I = {
  home: (
    <svg width={SZ} height={SZ} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H10v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20h3.5a1 1 0 0 0 1-1v-9" />
    </svg>
  ),
  absen: (
    <svg width={SZ} height={SZ} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <path d="M8 12.3l2.5 2.5L16 9.3" />
    </svg>
  ),
  kamera: (
    <svg width={SZ} height={SZ} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </svg>
  ),
  tugas: (
    <svg width={SZ} height={SZ} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  jadwal: (
    <svg width={SZ} height={SZ} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="5" width="17" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3.5 10h17" />
    </svg>
  ),
  monitor: (
    <svg width={SZ} height={SZ} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21s-7-5.4-7-11a7 7 0 0 1 14 0c0 5.6-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  ),
  nilai: (
    <svg width={SZ} height={SZ} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  ),
  monev: (
    <svg width={SZ} height={SZ} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" />
    </svg>
  ),
  kendala: (
    <svg width={SZ} height={SZ} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </svg>
  ),
  users: (
    <svg width={SZ} height={SZ} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  zona: (
    <svg width={SZ} height={SZ} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" />
      <rect x="13" y="3.5" width="7.5" height="7.5" rx="2" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="2" />
      <rect x="13" y="13" width="7.5" height="7.5" rx="2" />
    </svg>
  ),
  profil: (
    <svg width={SZ} height={SZ} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </svg>
  ),
};

type Item = { href: string; label: string; icon: React.ReactNode };

export default function MobileNav({
  peran = "petugas_ppsu",
}: {
  peran?: "petugas_ppsu" | "kasi_ekbang";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);

  const fitur: Item[] =
    peran === "kasi_ekbang"
      ? [
          { href: "/penugasan", label: "Penugasan", icon: I.tugas },
          { href: "/jadwal", label: "Jadwal", icon: I.jadwal },
          { href: "/penilaian", label: "Penilaian", icon: I.nilai },
          { href: "/monev", label: "Monev", icon: I.monev },
          { href: "/petugas", label: "Petugas", icon: I.users },
          { href: "/zona", label: "Regu/Zona", icon: I.zona },
        ]
      : [
          { href: "/absensi", label: "Absensi", icon: I.absen },
          { href: "/progres", label: "Progres", icon: I.kamera },
          { href: "/tugas", label: "Tugas", icon: I.tugas },
          { href: "/jadwal", label: "Jadwal", icon: I.jadwal },
          { href: "/kendala", label: "Kendala", icon: I.kendala },
          { href: "/nilai-saya", label: "Nilai", icon: I.nilai },
          { href: "/zona", label: "Regu/Zona", icon: I.zona },
        ];

  return (
    <>
      {open && (
        <div
          className="dial-backdrop"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      {open && (
        <button
          type="button"
          className="dial-close"
          onClick={() => setOpen(false)}
          aria-label="Tutup menu fitur"
        >
          ✕
        </button>
      )}
      <nav className="mobile-nav">
        <Link href="/dashboard" className={pathname === "/dashboard" ? "active" : ""}>
          {I.home}
          <span>Beranda</span>
        </Link>

        <div className={`dial${open ? " open" : ""}`}>
          <div className="selector">
            <button
              type="button"
              className="knob"
              aria-label={open ? "Tutup menu fitur" : "Buka menu fitur"}
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            />
            <ul style={{ "--n": fitur.length } as React.CSSProperties}>
              {fitur.map((it, i) => (
                <li
                  key={it.href}
                  style={{ "--i": i } as React.CSSProperties}
                  className={pathname === it.href ? "selected" : ""}
                >
                  <button
                    type="button"
                    className="dial-ic"
                    tabIndex={open ? 0 : -1}
                    onClick={() => {
                      setOpen(false);
                      router.push(it.href);
                    }}
                  >
                    {it.icon}
                    <span>{it.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <span className="dial-label">Fitur</span>
        </div>

        <Link href="/profil" className={pathname === "/profil" ? "active" : ""}>
          {I.profil}
          <span>Profil</span>
        </Link>
      </nav>
    </>
  );
}
