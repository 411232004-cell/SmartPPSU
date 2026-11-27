"use client";

import ThemeToggle from "./ThemeToggle";
import NotifBell from "./NotifBell";

// Pojok kanan atas desktop: lonceng notifikasi + toggle siang/malam
export default function AppHeader() {
  return (
    <div className="app-header">
      <NotifBell />
      <ThemeToggle />
    </div>
  );
}
