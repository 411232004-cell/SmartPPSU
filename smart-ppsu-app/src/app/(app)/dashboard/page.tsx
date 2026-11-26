"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { subscribeAbsensiHariIni, subscribeProgresTerbaru, listPetugas } from "@/lib/data";

function fmtWaktu(ts: { toDate?: () => Date } | undefined) {
  try {
    return ts?.toDate ? ts.toDate().toLocaleTimeString("id-ID") : "-";
  } catch { return "-"; }
}

function DashboardKasi() {
  const [absensi, setAbsensi] = useState<Record<string, unknown>[]>([]);
  const [progres, setProgres] = useState<Record<string, unknown>[]>([]);
  const [jmlPetugas, setJmlPetugas] = useState(0);

  useEffect(() => {
    const u1 = subscribeAbsensiHariIni(setAbsensi);
    const u2 = subscribeProgresTerbaru(setProgres);
    listPetugas().then((l) => setJmlPetugas(l.filter((p) => p.aktif).length));
    return () => { u1(); u2(); };
  }, []);

  const hadir = new Set(absensi.filter((a) => a.jenis === "masuk").map((a) => a.petugas_id)).size;
  const luarZona = absensi.filter((a) => a.dalam_zona === false).length;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginTop: 20 }}>
        {[
          { label: "Petugas aktif", value: String(jmlPetugas) },
          { label: "Sudah absen masuk", value: `${hadir} orang`, accent: true },
          { label: "Absensi hari ini", value: `${absensi.length} record` },
          { label: "⚠ Luar zona", value: `${luarZona} record`, danger: luarZona > 0 },
        ].map((s) => (
          <div key={s.label} className="card3d" style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 5, color: s.danger ? "var(--danger)" : s.accent ? "var(--green-deep)" : "var(--text)" }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="card3d" style={{ marginTop: 18, padding: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 10 }}>
          Absensi hari ini <span style={{ fontSize: 11, color: "var(--green-deep)" }}>● LIVE</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {absensi.map((a) => (
            <div key={a.id as string} className="card3d-inset" style={{ padding: "9px 12px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {typeof a.foto_url === "string" && a.foto_url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={a.foto_url} alt="" style={{ width: 56, height: 42, objectFit: "cover", borderRadius: 8 }} />
              )}
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                  {(a.nama_petugas as string) || (a.petugas_id as string)}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {String(a.jenis).replace("_", " ")} • {fmtWaktu(a.waktu_server as never)} • {a.jarak_meter as number} m dari zona
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: a.dalam_zona ? "var(--green-deep)" : "var(--danger)" }}>
                {a.dalam_zona ? "DALAM ZONA" : "LUAR ZONA"}
              </span>
            </div>
          ))}
          {absensi.length === 0 && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Belum ada absensi hari ini.</div>}
        </div>
      </div>

      <div className="card3d" style={{ marginTop: 16, padding: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 10 }}>
          Foto progres terbaru <span style={{ fontSize: 11, color: "var(--green-deep)" }}>● LIVE</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
          {progres.slice(0, 12).map((p) => (
            <div key={p.id as string} className="card3d-inset" style={{ overflow: "hidden" }}>
              {typeof p.foto_url === "string" && p.foto_url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={p.foto_url} alt="" style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover" }} />
              )}
              <div style={{ padding: "7px 9px", fontSize: 11 }}>
                <div style={{ fontWeight: 700 }}>{p.tahap as string}% — {(p.nama_petugas as string) || ""}</div>
                <div style={{ color: "var(--text-faint)" }}>{fmtWaktu(p.waktu_server as never)}</div>
              </div>
            </div>
          ))}
          {progres.length === 0 && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Belum ada foto progres.</div>}
        </div>
      </div>
    </div>
  );
}

function DashboardPetugas({ nama }: { nama: string }) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginTop: 20 }}>
        {[
          { label: "Absensi & Progres", value: "Kamera live + geotag", accent: true },
          { label: "Time mark", value: "Dari server — anti manipulasi" },
          { label: "Penilaian", value: "SMART oleh Kasi Ekbang" },
        ].map((s) => (
          <div key={s.label} className="card3d" style={{ padding: 18 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, marginTop: 6, color: s.accent ? "var(--orange-deep)" : "var(--text)" }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div className="card3d" style={{ marginTop: 20, padding: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>Halo, {nama} 👋</div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 14px" }}>
          Lakukan absensi di dalam zona tugas dan dokumentasikan progres pekerjaan Anda (0% → 50% → 100%).
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href="/absensi" className="btn3d">Absen Sekarang</a>
          <a href="/progres" className="btn3d green">Upload Foto Progres</a>
          <a href="/tugas" className="btn3d ghost">Lihat Penugasan</a>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { profil } = useAuth();
  const tgl = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  return (
    <div>
      <h1 className="page-title">
        {profil?.peran === "kasi_ekbang" ? "Monitoring Real-time" : "Beranda"}
      </h1>
      <p className="page-sub">{tgl}</p>
      {profil?.peran === "kasi_ekbang" ? <DashboardKasi /> : <DashboardPetugas nama={profil?.nama || ""} />}
    </div>
  );
}
