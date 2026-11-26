"use client";

import { useEffect, useState } from "react";

// Toggle Day/Night mode (desain "button dua mode") — sun, moon, stars, clouds
export default function ThemeToggle() {
  const [night, setNight] = useState(false);

  useEffect(() => {
    setNight(document.documentElement.classList.contains("night"));
  }, []);

  const toggle = () => {
    const next = !night;
    setNight(next);
    document.documentElement.classList.toggle("night", next);
    try {
      localStorage.setItem("ppsu-theme", next ? "night" : "day");
    } catch {}
  };

  return (
    <button
      type="button"
      className={`dn-toggle${night ? " night" : ""}`}
      onClick={toggle}
      aria-pressed={night}
      aria-label="Ganti mode siang / malam"
      title={night ? "Mode Siang" : "Mode Malam"}
    >
      <div className="track">
        <div className="stars">
          {Array.from({ length: 10 }).map((_, i) => (
            <span
              key={i}
              style={{
                left: `${8 + ((i * 37) % 60)}%`,
                top: `${10 + ((i * 23) % 70)}%`,
                animationDelay: `${(i % 5) * 0.4}s`,
              }}
            />
          ))}
        </div>
        <div className="moon" />
        <div className="sun" />
        <div className="cloud-track">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/cloud.png" alt="" aria-hidden draggable={false} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/cloud2.png" alt="" aria-hidden draggable={false} />
        </div>
      </div>
      <div className="knob" />
    </button>
  );
}
