"use client";

import { useEffect, useState } from "react";

export default function OfflineGuard() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  if (online) return null;

  return (
    <div className="offline-overlay" role="alert">
      <svg
        className="face404"
        viewBox="0 0 320 380"
        width="240"
        height="285"
        aria-label="Wajah 404 berkedip"
      >
        <g
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="25"
        >
          <g className="f404-eyes" transform="translate(0, 112.5)">
            <g transform="translate(15, 0)">
              <polyline className="f404-eye-lid" points="37,0 0,120 75,120" />
              <polyline className="f404-pupil" points="55,120 55,155" strokeDasharray="35 35" />
            </g>
            <g transform="translate(230, 0)">
              <polyline className="f404-eye-lid" points="37,0 0,120 75,120" />
              <polyline className="f404-pupil" points="55,120 55,155" strokeDasharray="35 35" />
            </g>
          </g>
          <rect className="f404-nose" rx="4" ry="4" x="132.5" y="112.5" width="55" height="155" />
          <g strokeDasharray="102 102" transform="translate(65, 334)">
            <path className="f404-mouth-left" d="M 0 30 C 0 30 40 0 95 0" strokeDashoffset="-102" />
            <path className="f404-mouth-right" d="M 95 0 C 150 0 190 30 190 30" strokeDashoffset="102" />
          </g>
        </g>
      </svg>
      <div className="offline-title">Koneksi Terputus</div>
      <p className="offline-sub">
        Jaringan internet hilang. Periksa koneksi kamu — aplikasi akan
        kembali normal begitu online lagi.
      </p>
    </div>
  );
}
