"use client";

import { useEffect, useRef, useState } from "react";
import {
  getServerTimeOffset, serverNow, getGPS, jarakMeter, resizeWatermark,
} from "@/lib/capture";
import { simpanAbsensi, ZONA_DEMO, JenisAbsen, Zona } from "@/lib/absensi";
import { getZona, listZona } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import LoadingScreen from "@/components/LoadingScreen";

const LABEL: Record<JenisAbsen, string> = {
  masuk: "ABSEN MASUK",
  istirahat_mulai: "MULAI ISTIRAHAT",
  istirahat_selesai: "SELESAI ISTIRAHAT",
  pulang: "ABSEN PULANG",
};

type GPS = { lat: number; lng: number; akurasi: number };

export default function AbsensiPage() {
  const { profil } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [zona, setZona] = useState<Zona>(ZONA_DEMO);
  const [kameraSiap, setKameraSiap] = useState(false);
  const [kameraError, setKameraError] = useState("");
  const [gps, setGps] = useState<GPS | null>(null);
  const [gpsError, setGpsError] = useState("");
  const [offset, setOffset] = useState(0);
  const [sibuk, setSibuk] = useState(false);
  const [hasil, setHasil] = useState<{ url: string; teks: string; ok: boolean } | null>(null);

  const jarak = gps ? Math.round(jarakMeter(gps.lat, gps.lng, zona.lat, zona.lng)) : null;
  const dalamZona = jarak !== null && jarak <= zona.radiusMeter;

  useEffect(() => {
    getServerTimeOffset().then(setOffset);
    (async () => {
      // zona: dari profil petugas, atau zona pertama di Firestore, fallback demo
      try {
        if (profil?.zona_id) {
          const z = await getZona(profil.zona_id);
          if (z) return setZona(z);
        }
        const zs = await listZona();
        if (zs.length) setZona(zs[0]);
      } catch {}
    })();

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setKameraSiap(true);
      } catch {
        setKameraError("Kamera tidak dapat diakses. Izinkan akses kamera di browser.");
      }
    })();

    getGPS()
      .then((p) => setGps({ lat: p.coords.latitude, lng: p.coords.longitude, akurasi: p.coords.accuracy }))
      .catch(() => setGpsError("GPS tidak aktif / izin lokasi ditolak."));

    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, [profil?.zona_id]);

  const ambilFoto = async (jenis: JenisAbsen) => {
    if (!videoRef.current || !gps || !profil) return;
    setSibuk(true);
    setHasil(null);
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      const mentah: Blob = await new Promise((r) => canvas.toBlob((b) => r(b!), "image/jpeg", 0.95));

      const waktu = serverNow(offset);
      const foto = await resizeWatermark(mentah, {
        waktu, lat: gps.lat, lng: gps.lng,
        nama: profil.nama, label: LABEL[jenis],
      });

      const res = await simpanAbsensi({
        petugasId: profil.uid,
        namaPetugas: profil.nama,
        jenis, foto,
        lat: gps.lat, lng: gps.lng, akurasi: gps.akurasi,
        zona,
      });

      setHasil({
        url: res.fotoUrl,
        teks: `${LABEL[jenis]} tercatat • ${res.dalamZona ? "di dalam zona" : "DI LUAR ZONA"} (${res.jarakMeter} m) • time mark ${waktu.toLocaleTimeString("id-ID")}`,
        ok: res.dalamZona,
      });
    } catch (e) {
      setHasil({ url: "", teks: `Gagal menyimpan: ${e instanceof Error ? e.message : e}`, ok: false });
    } finally {
      setSibuk(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h1 className="page-title">Absensi</h1>
      <p className="page-sub">
        Foto selfie live dari kamera — tanpa galeri. Time mark dari server, GPS &amp;
        watermark terbakar ke foto, tidak dapat dimanipulasi.
      </p>

      {/* Status GPS & zona */}
      <div className="card3d-inset" style={{ marginTop: 16, padding: 14, fontSize: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span>
            📍 {gps
              ? `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)} (±${Math.round(gps.akurasi)} m)`
              : gpsError || "Mengambil GPS…"}
          </span>
          <span style={{ fontWeight: 700, color: gps ? (dalamZona ? "var(--green-deep)" : "var(--danger)") : "var(--text-muted)" }}>
            {jarak === null ? "…" : dalamZona ? `Dalam zona ✓ (${jarak} m)` : `LUAR ZONA (${jarak} m > ${zona.radiusMeter} m)`}
          </span>
        </div>
        <div style={{ color: "var(--text-faint)", marginTop: 4 }}>{zona.nama} • radius {zona.radiusMeter} m</div>
      </div>

      {/* Kamera */}
      <div className="card3d" style={{ marginTop: 14, overflow: "hidden", position: "relative", background: "#000" }}>
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ width: "100%", display: "block", aspectRatio: "4/3", objectFit: "cover", transform: "scaleX(-1)" }}
        />
        {!kameraSiap && !kameraError && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#111" }}>
            <LoadingScreen label="Membuka Kamera" />
          </div>
        )}
        {kameraError && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", padding: 20, textAlign: "center" }}>
            {kameraError}
          </div>
        )}
        <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 8 }}>
          ● LIVE — tidak bisa pilih dari galeri
        </div>
      </div>

      {/* Tombol aksi */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
        <button className="btn3d" disabled={!kameraSiap || !gps || sibuk} onClick={() => ambilFoto("masuk")}>
          📷 Absen Masuk
        </button>
        <button className="btn3d green" disabled={!kameraSiap || !gps || sibuk} onClick={() => ambilFoto("istirahat_mulai")}>
          ☕ Mulai Istirahat
        </button>
        <button className="btn3d green" disabled={!kameraSiap || !gps || sibuk} onClick={() => ambilFoto("istirahat_selesai")}>
          🍽️ Selesai Istirahat
        </button>
        <button className="btn3d" disabled={!kameraSiap || !gps || sibuk} onClick={() => ambilFoto("pulang")}>
          📷 Absen Pulang
        </button>
      </div>

      {sibuk && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
          <LoadingScreen label="Menyimpan Absensi" />
        </div>
      )}

      {hasil && (
        <div className="card3d" style={{ marginTop: 16, padding: 14, borderColor: hasil.ok ? "var(--green)" : "var(--danger)" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: hasil.ok ? "var(--green-deep)" : "var(--danger)" }}>
            {hasil.ok ? "✓ " : "⚠ "}{hasil.teks}
          </div>
          {hasil.url && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={hasil.url} alt="Bukti absensi" style={{ width: "100%", borderRadius: 12, marginTop: 10 }} />
          )}
        </div>
      )}
    </div>
  );
}
