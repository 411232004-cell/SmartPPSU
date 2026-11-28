"use client";

// Error boundary level root — menangkap error di layout utama.
// Harus merender <html>/<body> sendiri karena layout bisa ikut crash.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body style={{
        margin: 0, fontFamily: "system-ui, sans-serif",
        background: "#0b1020", color: "#fff",
        minHeight: "100vh", display: "grid", placeItems: "center",
        textAlign: "center", padding: 24,
      }}>
        <div>
          <h2 style={{ margin: "0 0 8px" }}>Terjadi kesalahan</h2>
          <p style={{ margin: "0 0 18px", opacity: 0.75, fontSize: 14 }}>
            {error.message || "Aplikasi gagal dimuat."}
          </p>
          <button
            onClick={reset}
            style={{
              padding: "10px 22px", borderRadius: 999, border: "none",
              background: "linear-gradient(135deg,#ff9a3d,#ff6a00)",
              color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14,
            }}
          >
            Muat Ulang
          </button>
        </div>
      </body>
    </html>
  );
}
