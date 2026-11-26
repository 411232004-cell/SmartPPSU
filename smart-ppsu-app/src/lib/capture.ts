// Utilitas anti-manipulasi untuk absensi & foto progres

/** Offset waktu server vs jam HP (ms). Positif = jam HP lebih lambat. */
export async function getServerTimeOffset(): Promise<number> {
  try {
    const t0 = Date.now();
    const res = await fetch("/api/time", { cache: "no-store" });
    const { now } = await res.json();
    // koreksi separuh waktu tempuh
    const offset = now - (t0 + (Date.now() - t0) / 2);
    return Math.round(offset);
  } catch {
    return 0;
  }
}

export function serverNow(offsetMs: number): Date {
  return new Date(Date.now() + offsetMs);
}

/** Ambil posisi GPS saat ini. */
export function getGPS(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

/** Jarak dua titik koordinat (meter), rumus haversine. */
export function jarakMeter(
  lat1: number, lng1: number, lat2: number, lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Resize foto (maks sisi 1280px, JPEG ±300KB) + bakar watermark ke pixel:
 * time mark server, koordinat GPS, nama petugas. Bukan metadata — tidak bisa diedit.
 */
export async function resizeWatermark(
  blob: Blob,
  opt: { waktu: Date; lat: number; lng: number; nama: string; label: string }
): Promise<Blob> {
  const img = await createImageBitmap(blob);
  const MAX = 1280;
  const scale = Math.min(1, MAX / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);

  // --- watermark strip di bawah ---
  const stripH = Math.max(76, Math.round(h * 0.09));
  const y0 = h - stripH;
  ctx.fillStyle = "rgba(20, 12, 6, 0.72)";
  ctx.fillRect(0, y0, w, stripH);

  const fmtTgl = opt.waktu.toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  });
  const fmtJam = opt.waktu.toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const line1 = `${opt.label} • ${fmtTgl} ${fmtJam} WIB`;
  const line2 = `${opt.nama} • ${opt.lat.toFixed(6)}, ${opt.lng.toFixed(6)}`;

  const fs = Math.max(18, Math.round(stripH * 0.3));
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${fs}px system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillText(line1, 14, y0 + stripH * 0.3);
  ctx.font = `500 ${fs * 0.82}px system-ui, sans-serif`;
  ctx.fillStyle = "#ffd9b8";
  ctx.fillText(line2, 14, y0 + stripH * 0.72);

  // cap kecil "SMART PPSU" di pojok
  ctx.font = `700 ${fs * 0.7}px system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText("SMART PPSU ✓ SERVER TIME", w - 14, y0 + stripH * 0.3);

  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.82)
  );
}

/** Hash SHA-256 file untuk verifikasi integritas. */
export async function sha256Hex(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
