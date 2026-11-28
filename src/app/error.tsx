"use client";

// Error boundary — menangkap error render halaman agar aplikasi tidak
// tampil layar putih; pengguna bisa muat ulang langsung dari sini.

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      minHeight: "60vh", display: "grid", placeItems: "center",
      padding: 24, textAlign: "center",
    }}>
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element -- sengaja <img>: error boundary harus mandiri tanpa loader next/image */}
        <img
          src="/assets/logo-sm.png" alt="" width={64} height={64}
          style={{ borderRadius: "50%", margin: "0 auto 14px" }}
        />
        <h2 style={{
          margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "var(--text)",
        }}>
          Terjadi kesalahan
        </h2>
        <p style={{
          margin: "0 0 18px", fontSize: 14, color: "var(--text-muted)",
          maxWidth: 360,
        }}>
          {error.message || "Halaman gagal dimuat. Coba muat ulang — jika masih error, hubungi admin."}
        </p>
        <button className="btn3d" onClick={reset} style={{ fontSize: 14 }}>
          Muat Ulang
        </button>
      </div>
    </div>
  );
}
