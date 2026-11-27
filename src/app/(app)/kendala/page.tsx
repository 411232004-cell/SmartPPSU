"use client";

import { useState } from "react";
import { simpanKendala } from "@/lib/data";
import { getGPS } from "@/lib/capture";
import { useAuth } from "@/lib/auth";
import SendButton from "@/components/SendButton";

const JENIS = [
  { v: "kondisi_berbahaya", l: "⚠️ Kondisi berbahaya" },
  { v: "alat_rusak", l: "🔧 Alat rusak" },
  { v: "kendala", l: "📋 Kendala kerja lain" },
];

export default function KendalaPage() {
  const { profil } = useAuth();
  const [jenis, setJenis] = useState("kondisi_berbahaya");
  const [deskripsi, setDeskripsi] = useState("");
  const [pesan, setPesan] = useState("");

  const kirim = async () => {
    if (!profil || !deskripsi.trim()) {
      setPesan("Isi deskripsi kendala dulu.");
      return;
    }
    let lat, lng;
    try {
      const p = await getGPS();
      lat = p.coords.latitude; lng = p.coords.longitude;
    } catch {}
    await simpanKendala({
      petugas_id: profil.uid,
      nama_petugas: profil.nama,
      jenis, deskripsi, lat, lng,
    });
    setDeskripsi("");
    setPesan("✓ Laporan kendala terkirim ke Kasi Ekbang.");
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <h1 className="page-title">Lapor Kendala</h1>
      <p className="page-sub">Laporkan kondisi berbahaya, alat rusak, atau kendala kerja — bukti kriteria C5 indikator 4.</p>

      <div className="card3d" style={{ marginTop: 18, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 700 }}>Jenis kendala</label>
          {JENIS.map((j) => (
            <label key={j.v} className="card3d-inset" style={{ display: "flex", gap: 10, padding: "10px 12px", cursor: "pointer", fontSize: 14, alignItems: "center", border: jenis === j.v ? "2px solid var(--orange)" : "1px solid var(--border)" }}>
              <input type="radio" name="jenis" checked={jenis === j.v} onChange={() => setJenis(j.v)} />
              {j.l}
            </label>
          ))}
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 700 }}>Deskripsi</label>
          <textarea
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            rows={4}
            placeholder="Contoh: Genangan air dalam di Jl. X menghambat penyapuan, kabel listrik menjuntai berbahaya…"
            style={{
              width: "100%", marginTop: 6, padding: 12, borderRadius: 12,
              border: "1px solid var(--border)", background: "var(--surface)",
              color: "var(--text)", fontSize: 14, fontFamily: "inherit", resize: "vertical",
            }}
          />
        </div>

        {pesan && <div style={{ fontSize: 13, fontWeight: 600, color: pesan.startsWith("✓") ? "var(--green-deep)" : "var(--danger)" }}>{pesan}</div>}

        <div style={{ display: "flex", justifyContent: "center" }}>
          <SendButton label="Kirim Laporan" sentLabel="Terkirim!" onSend={kirim} />
        </div>
      </div>
    </div>
  );
}
