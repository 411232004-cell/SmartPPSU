"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import MobileTopbar from "@/components/MobileTopbar";
import AppHeader from "@/components/AppHeader";
import OfflineGuard from "@/components/OfflineGuard";
import LoadingScreen from "@/components/LoadingScreen";

function Shell({ children }: { children: React.ReactNode }) {
  const { profil, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !profil) router.replace("/login");
  }, [loading, profil, router]);

  if (loading || !profil) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LoadingScreen label="Memuat" />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar peran={profil.peran} nama={profil.nama} />
      <main className="app-content">
        <MobileTopbar />
        <AppHeader />
        {children}
      </main>
      <MobileNav peran={profil.peran} />
      <OfflineGuard />
    </div>
  );
}

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <Shell>{children}</Shell>;
}
