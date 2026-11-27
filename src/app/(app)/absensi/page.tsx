"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getServerTimeOffset, serverNow, getGPS, jarakMeter } from "@/lib/capture";
import {
  simpanAbsensi, ZONA_DEMO, JenisAbsen, Zona,
  LABEL_JENIS, URUTAN_JENIS, MENIT_AWAL, jamJadwal, fmtJam, Shift,
} from "@/lib/absensi";
import { getZona, getShiftUntuk, pastikanZonaDefault } from "@/lib/data";
import { reguById } from "@/lib/regu";
import { useAuth } from "@/lib/auth";
import LoadingScreen from "@/components/LoadingScreen";

type GPS = { lat: number; lng: number; akurasi: number };
type AbsenRow = { jenis: JenisAbsen; waktu?: Date; dalam_zona?: boolean };

const IKON: Record<JenisAbsen, string> = {
  masuk: "🌅",
  istirahat_mulai: "☕",
  istirahat_selesai: "🍽️",
  pulang: "🌙",
};

export default function AbsensiPage() {
  const { profil } = useAuth();
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(new Date());
  const [shift, setShift] = useState<Shift | null>(null);
  const [zona, setZona] = useState<Zona | null | undefined>(undefined); // undefined = loading, null = bebas
  const [zonaLabel, setZonaLabel] = useState("");
  const [gps, setGps] = useState<GPS | null>(null);
  const [gpsError, setGpsError] = useState("");
  const [sudah, setSudah] = useState<Record<string, AbsenRow>>({});
  const [sibuk, setSibuk] = useState<JenisAbsen | null>(null);
  const [pesan, setPesan] = useState<{ teks: string; ok: boolean } | null>(null);

  const hariIni = new Date().toISOString().slice(0, 10);
  const waktuServer = useMemo(() => serverNow(offset), [offset, now]);

  // refresh jam tiap 15 dtk agar status tombol ikut berubah
  useEffect(() => {
    getServerTimeOffset().then(setOffset);
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);

  // tentukan shift hari ini + zona geofence sesuai regu
  useEffect(() => {
    if (!profil) return;
    (async () => {
      pastikanZonaDefault().catch(() => {}); // seed zona rw/kantor/kelurahan bila belum ada
      const s = (await getShiftUntuk(profil.uid, hariIni)) || profil.shift || "pagi";
      setShift(s as Shift);

      const bebasTugas = (await getDoc(doc(db, "users", profil.uid))).data()?.bebas_gps === true;
      const regu = reguById(profil.regu);
      if (bebasTugas || !regu || regu.geofence === "bebas") {
        setZona(null);
        setZonaLabel(bebasTugas ? "Bebas GPS — sedang tugas khusus" : "Bebas GPS (tanpa kunci lokasi)");
        return;
      }
      try {
        const z = regu.zonaId ? await getZona(regu.zonaId) : null;
        const zz = z || ZONA_DEMO;
        setZona(zz);
        setZonaLabel(`Radius ${zz.radiusMeter} m — ${zz.nama}`);
      } catch {
        setZona(ZONA_DEMO);
        setZonaLabel(`Radius ${ZONA_DEMO.radiusMeter} m — ${ZONA_DEMO.nama}`);
      }
    })();
  }, [profil, hariIni]);

  // absensi yang sudah tercatat hari ini
  const muatSudah = async () => {
    if (!profil) return;
    const snap = await getDocs(
      query(collection(db, "absensi"), where("petugas_id", "==", profil.uid))
    );
    const m: Record<string, AbsenRow> = {};
    snap.docs.forEach((d) => {
      const x = d.data();
      if (x.tanggal !== hariIni) return;
      m[x.jenis] = {
        jenis: x.jenis,
        waktu: x.waktu_server?.toDate?.(),
        dalam_zona: x.dalam_zona,
      };
    });
    setSudah(m);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { muatSudah(); }, [profil]);

  // GPS hanya untuk regu yang dikunci
  useEffect(() => {
    if (zona === undefined || zona === null) return;
    getGPS()
      .then((p) => setGps({ lat: p.coords.latitude, lng: p.coords.longitude, akurasi: p.coords.accuracy }))
      .catch(() => setGpsError("GPS tidak aktif / izin lokasi ditolak."));
  }, [zona]);

  const jarak = gps && zona ? Math.round(jarakMeter(gps.lat, gps.lng, zona.lat, zona.lng)) : null;
  const dalamZona = !!zona && jarak !== null && jarak <= zona.radiusMeter;

  const absen = async (jenis: JenisAbsen) => {
    if (!profil || !shift || shift === "libur") return;
    setSibuk(jenis);
    setPesan(null);
    try {
      let pos: GPS | null = null;
      if (zona) {
        try {
          const p = await getGPS();
          pos = { lat: p.coords.latitude, lng: p.coords.longitude, akurasi: p.coords.accuracy };
          setGps(pos);
        } catch {
          throw new Error("GPS wajib aktif untuk absen di regu ini. Nyalakan lokasi lalu coba lagi.");
        }
      }
      const waktu = serverNow(offset);
      const jadwal = jamJadwal(shift, jenis, waktu);
      const telat = Math.max(0, Math.round((waktu.getTime() - jadwal.getTime()) / 60000));

      const res = await simpanAbsensi({
        petugasId: profil.uid,
        namaPetugas: profil.nama,
        jenis,
        lat: pos?.lat ?? null,
        lng: pos?.lng ?? null,
        akurasi: pos?.akurasi ?? 0,
        zona: zona ?? null,
        shift,
        telat_menit: jenis === "masuk" || jenis === "istirahat_selesai" ? telat : 0,
      });

      const zonaTeks = zona
        ? res.dalamZona ? `di dalam zona (${res.jarakMeter} m)` : `DI LUAR ZONA (${res.jarakMeter} m)`
        : "bebas GPS";
      const telatTeks = telat > 0 && (jenis === "masuk" || jenis === "istirahat_selesai")
        ? ` • terlambat ${telat} mnt`
        : "";
      setPesan({
        teks: `${LABEL_JENIS[jenis]} tercatat ${waktu.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} • ${zonaTeks}${telatTeks}`,
        ok: res.dalamZona,
      });
      await muatSudah();
    } catch (e) {
      setPesan({ teks: `Gagal: ${e instanceof Error ? e.message : e}`, ok: false });
    } finally {
      setSibuk(null);
    }
  };

  if (shift === null || zona === undefined) {
    return <LoadingScreen label="Menyiapkan Absensi" />;
  }

  if (shift === "libur") {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <h1 className="page-title">Absensi</h1>
        <div className="card3d" style={{ marginTop: 16, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>🌴</div>
          <div style={{ fontWeight: 800, fontSize: 16, marginTop: 8 }}>Hari ini Anda libur</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            Tidak ada jadwal shift — tombol absen dinonaktifkan.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h1 className="page-title">Absensi</h1>
      <p className="page-sub">
        Shift <b>{shift.toUpperCase()}</b> — satu klik untuk absen. Tombol terbuka {MENIT_AWAL} menit
        sebelum jam jadwal. Lokasi &amp; waktu dicatat otomatis.
      </p>

      {/* status lokasi */}
      <div className="card3d-inset" style={{ marginTop: 16, padding: 14, fontSize: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span>
            📍 {zona === null
              ? zonaLabel
              : gps
                ? `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)} (±${Math.round(gps.akurasi)} m)`
                : gpsError || "Mengambil GPS…"}
          </span>
          {zona !== null && (
            <span style={{ fontWeight: 700, color: gps ? (dalamZona ? "var(--green-deep)" : "var(--danger)") : "var(--text-muted)" }}>
              {jarak === null ? "…" : dalamZona ? `Dalam radius ✓ (${jarak} m)` : `LUAR RADIUS (${jarak} m > ${zona.radiusMeter} m)`}
            </span>
          )}
        </div>
        <div style={{ color: "var(--text-faint)", marginTop: 4 }}>{zonaLabel}</div>
      </div>

      {/* tombol absen */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
        {URUTAN_JENIS.map((jenis) => {
          const jadwal = jamJadwal(shift, jenis, waktuServer);
          const buka = new Date(jadwal.getTime() - MENIT_AWAL * 60000);
          const row = sudah[jenis];
          const terbuka = waktuServer >= buka;
          const disabled = !!row || !terbuka || sibuk !== null;
          return (
            <button
              key={jenis}
              className={`btn3d absen-btn${row ? " done" : ""}`}
              disabled={disabled}
              onClick={() => absen(jenis)}
            >
              <span className="absen-ikon">{row ? "✓" : IKON[jenis]}</span>
              <span style={{ flex: 1, textAlign: "left" }}>
                <span style={{ display: "block", fontWeight: 800, fontSize: 15 }}>{LABEL_JENIS[jenis]}</span>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700, opacity: 0.85 }}>
                  Jadwal {fmtJam(jadwal)}
                  {row?.waktu ? ` — tercatat ${fmtJam(row.waktu)}` : !terbuka ? ` — terbuka ${fmtJam(buka)}` : ""}
                </span>
              </span>
              {sibuk === jenis && <span style={{ fontSize: 12, fontWeight: 800 }}>Menyimpan…</span>}
            </button>
          );
        })}
      </div>

      {pesan && (
        <div className="card3d" style={{ marginTop: 16, padding: 14, borderColor: pesan.ok ? "var(--green)" : "var(--danger)" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: pesan.ok ? "var(--green-deep)" : "var(--danger)" }}>
            {pesan.ok ? "✓ " : "⚠ "}{pesan.teks}
          </div>
        </div>
      )}
    </div>
  );
}
