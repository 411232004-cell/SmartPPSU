"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { subscribeNotifikasi, notifUntuk, Notif } from "@/lib/data";
import { useAuth } from "@/lib/auth";

export default function NotifBell() {
  const { profil } = useAuth();
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!profil || profil.peran !== "petugas_ppsu") return;
    return subscribeNotifikasi((rows: Notif[]) => {
      setUnread(
        rows.filter((n) => notifUntuk(n, profil) && !n.dibaca_oleh?.includes(profil.uid)).length
      );
    });
  }, [profil]);

  if (!profil) return null;

  return (
    <button
      className="notif-bell"
      aria-label="Notifikasi"
      onClick={() => router.push("/notifikasi")}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {unread > 0 && <span className="notif-badge">{unread > 9 ? "9+" : unread}</span>}
    </button>
  );
}
