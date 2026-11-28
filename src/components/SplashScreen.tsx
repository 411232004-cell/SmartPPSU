"use client";

import { useEffect, useState } from "react";

/**
 * Splash overlay — tampil sekali tiap aplikasi dibuka/di-reload.
 * Di Android, layar launch bawaan hanya ikon+warna (tidak bisa gambar custom),
 * jadi overlay ini menampilkan desain splash tepat setelah app termuat.
 * Gambar dipilih sesuai orientasi layar (portrait HP / landscape desktop).
 */
export function gambarSplash(): string {
  if (typeof window === "undefined") return "/splash.png";
  return window.innerWidth > window.innerHeight
    ? "/splash-wide.png"
    : "/splash.png";
}

export default function SplashScreen() {
  const [tampil, setTampil] = useState(true);
  const [fade, setFade] = useState(false);
  const [src, setSrc] = useState("/splash.png");

  useEffect(() => {
    setSrc(gambarSplash());
    const t1 = setTimeout(() => setFade(true), 1500);
    const t2 = setTimeout(() => setTampil(false), 2100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!tampil) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "#fdf3e7",
        opacity: fade ? 0 : 1,
        transition: "opacity 0.6s ease",
        pointerEvents: fade ? "none" : "auto",
      }}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </div>
  );
}
