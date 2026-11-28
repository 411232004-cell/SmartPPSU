"use client";

import { useEffect, useRef, useState } from "react";
import {
  getServerTimeOffset, serverNow, getGPS, jarakMeter, resizeWatermark,
} from "@/lib/capture";
import {
  listPenugasan, listProgres, simpanProgres, getZona, Penugasan, ProgresFoto,
} from "@/lib/data";
import { Zona } from "@/lib/absensi";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { reguById } from "@/lib/regu";
import { useAuth } from "@/lib/auth";
import LoadingScreen from "@/components/LoadingScreen";

const TAHAP = ["0", "50", "100"] as const;
const LABEL_TAHAP: Record<string, string> = {
  "0": "PROGRES 0% (AWAL)",
  "50": "PROGRES 50%",
  "100": "PROGRES 100% (HASIL)",
};

type GPS = { lat: number; lng: number; akurasi: number };

export default function ProgresPage() {
  const { profil } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [zona, setZona] = useState<Zona | null>(null);
  const [tugas, setTugas] = useState<Penugasan[]>([]);
  const [dipilih, setDipilih] = useState<Penugasan | null>(null);
  const [fotoAda, setFotoAda] = useState<Record<string, ProgresFoto>>({});
  const [gps, setGps] = useState<GPS | null>(null);
  const [offset, setOffset] = useState(0);
  const [kameraSiap, setKameraSiap] = useState(false);
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState("");

  useEffect(() => {
    getServerTimeOffset().then(setOffset);
    (async () => {
      if (!profil) return;
      try {
        // zona efektif: override personel (zona_id) → default regu; bebas saat tugas khusus
        const bebasTugas =
          (await getDoc(doc(db, "users", profil.uid))).data()?.bebas_gps === true;
        const zonaId = profil.zona_id || reguById(profil.regu)?.zonaId;
        if (!bebasTugas && zonaId) {
          const z = await getZona(zonaId);
          if (z) setZona(z);
        }
        const list = await listPenugasan({ petugas_id: profil.uid });
        setTugas(list.filter((t) => t.status !== "selesai"));
      } catch {}
    })();
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setKameraSiap(true);
      } catch {}
    })();
    getGPS()
      .then((p) => setGps({ lat: p.coords.latitude, lng: p.coords.longitude, akurasi: p.coords.accuracy }))
      .catch(() => {});
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, [profil]);

  useEffect(() => {
    if (!dipilih) return;
    listProgres(dipilih.id).then((rows) => {
      const map: Record<string, ProgresFoto> = {};
      rows.forEach((r) => (map[r.tahap] = r));
      setFotoAda(map);
    });
  }, [dipilih]);

  const capture = async (tahap: "0" | "50" | "100") => {
    if (!videoRef.current || !gps || !profil || !dipilih) return;
    setSibuk(true);
    setPesan("");
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
        nama: profil.nama, label: LABEL_TAHAP[tahap],
      });

      const jarak = zona
        ? Math.round(jarakMeter(gps.lat, gps.lng, zona.lat, zona.lng))
        : 0;
      await simpanProgres({
        penugasan_id: dipilih.id,
        petugas_id: profil.uid,
        nama_petugas: profil.nama,
        tahap, foto,
        lat: gps.lat, lng: gps.lng, akurasi: gps.akurasi,
        dalam_zona: zona ? jarak <= zona.radiusMeter : true,
        jarak_meter: jarak,
      });

      const rows = await listProgres(dipilih.id);
      const map: Record<string, ProgresFoto> = {};
      rows.forEach((r) => (map[r.tahap] = r));
      setFotoAda(map);
      setPesan(`✓ ${LABEL_TAHAP[tahap]} tersimpan`);
    } catch (e) {
      setPesan(`Gagal: ${e instanceof Error ? e.message : e}`);
    } finally {
      setSibuk(false);
    }
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <h1 className="page-title">Foto Progres</h1>
      <p className="page-sub">Dokumentasi 0% → 50% → 100% per penugasan — kamera live + geotag + time mark server.</p>

      {/* pilih penugasan */}
      <div className="card3d" style={{ marginTop: 16, padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Pilih penugasan:</div>
        {tugas.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Tidak ada penugasan aktif. Hubungi Kasi Ekbang.
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tugas.map((t) => (
            <button
              key={t.id}
              onClick={() => setDipilih(t)}
              className="card3d-inset"
              style={{
                textAlign: "left", padding: "10px 12px", cursor: "pointer",
                border: dipilih?.id === t.id ? "2px solid var(--orange)" : "1px solid var(--border)",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t.jenis_pekerjaan}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {t.tanggal_tugas} • {t.status} • prioritas {t.prioritas}
              </div>
            </button>
          ))}
        </div>
      </div>

      {dipilih && (
        <>
          {/* kamera */}
          <div className="card3d" style={{ marginTop: 14, overflow: "hidden", background: "#000", position: "relative" }}>
            <video
              ref={videoRef}
              playsInline muted
              style={{ width: "100%", display: "block", aspectRatio: "4/3", objectFit: "cover" }}
            />
            <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 8 }}>
              ● LIVE — kamera belakang
            </div>
          </div>

          {/* tahap */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 14 }}>
            {TAHAP.map((tp) => {
              const sudah = !!fotoAda[tp];
              return (
                <button
                  key={tp}
                  className={`btn3d${sudah ? " green" : ""}`}
                  disabled={!kameraSiap || !gps || sibuk}
                  onClick={() => capture(tp)}
                  style={{ flexDirection: "column", gap: 2, padding: "12px 8px" }}
                >
                  <span style={{ fontSize: 17 }}>{tp}%</span>
                  <span style={{ fontSize: 11, fontWeight: 500 }}>{sudah ? "✓ sudah ada" : "foto"}</span>
                </button>
              );
            })}
          </div>

          {/* thumbnails */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 10 }}>
            {TAHAP.map((tp) => (
              <div key={tp} className="card3d-inset" style={{ overflow: "hidden", aspectRatio: "4/3" }}>
                {fotoAda[tp] ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={fotoAda[tp].foto_url} alt={`Progres ${tp}%`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-faint)", fontSize: 12 }}>
                    Belum ada foto
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {sibuk && <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}><LoadingScreen label="Mengunggah Foto" /></div>}
      {pesan && <div className="card3d" style={{ marginTop: 14, padding: 12, fontSize: 13, fontWeight: 600 }}>{pesan}</div>}
    </div>
  );
}
