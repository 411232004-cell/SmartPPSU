// Splash screen — desain logo Smart PPSU saat aplikasi dimuat
export default function LoadingScreen({
  label = "Memuat Aplikasi…",
}: {
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#fdf3e7",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/splash.png"
        alt="Smart PPSU — Memuat Aplikasi"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    </div>
  );
}
