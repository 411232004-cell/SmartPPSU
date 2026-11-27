import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart PPSU — Kelurahan Duri Selatan",
  description:
    "Aplikasi absensi, dokumentasi progres, dan penilaian kinerja PPSU metode SMART",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#ff8c42",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('ppsu-theme')==='night')document.documentElement.classList.add('night')}catch(e){}`,
          }}
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
