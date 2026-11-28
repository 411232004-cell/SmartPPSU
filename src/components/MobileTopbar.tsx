"use client";

import { usePathname, useRouter } from "next/navigation";
import NotifBell from "./NotifBell";

export default function MobileTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/dashboard";

  return (
    <div className="mobile-topbar">
      <div className="mtb-side">
        {!isHome && (
          <button
            type="button"
            className="mtb-back"
            onClick={() => router.push("/dashboard")}
            aria-label="Kembali ke beranda"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Kembali
          </button>
        )}
      </div>
      <span className="mtb-title">Smart PPSU</span>
      <div className="mtb-side" style={{ justifyContent: "flex-end", gap: 8 }}>
        <NotifBell />
      </div>
    </div>
  );
}
