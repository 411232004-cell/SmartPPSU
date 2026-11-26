"use client";

import { useEffect, useState } from "react";
import {
  listPetugas, listZona, listPenugasan, tambahPenugasan, simpanZona,
  Petugas, Zona, Penugasan,
} from "@/lib/data";
import { useAuth } from "@/lib/auth";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: "1px solid var(--border)", background: "var(--surface)",
  color: "var(--text)", fontSize: 14, fontFamily: "inherit",
};

export default function PenugasanPage() {
  const { profil } = useAuth();
  const [petugas, setPetugas] = useState<Petugas[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [tugas, setTugas] = useState<Penugasan[]>([]);
  const [pesan, setPesan] = useState("");

  const [tugasForm, setTugasForm] = useState({
    petugas_id: "", jenis_pekerjaan: "", deskripsi: "",
    tanggal_tugas: new Date().toISOString().slice(0, 10),
    target_selesai: "", prioritas: "normal" as const, zona_id: "",
  });
  const [zonaForm, setZonaForm] = useState({
    nama: "", alamat: "", lat: "", lng: "", radiusMeter: "300",
    jamMasuk: "07:00", jamPulang: "15:00",
  });

  const muat = async () => {
    const [p, z, t] = await Promise.all([listPetugas(), listZona(), listPenugasan()]);
    setPetugas(p); setZonas(z); setTugas(t.slice(0, 30));
  };
  useEffect(() => { muat(); }, []);

  const buatTugas = async () => {
    if (!tugasForm.petugas_id || !tugasForm.jenis_pekerjaan) {
      setPesan("Pilih petugas dan isi jenis pekerjaan."); return;
    }
    const p = petugas.find((x) => x.id === tugasForm.petugas_id);
    await tambahPenugasan({
      ...tugasForm,
      zona_id: tugasForm.zona_id || p?.zona_id || "",
      nama_petugas: p?.nama,
      dibuat_oleh: profil?.uid,
    });
    setPesan("✓ Penugasan dibuat.");
    setTugasForm({ ...tugasForm, jenis_pekerjaan: "", deskripsi: "", target_selesai: "" });
    muat();
  };

  const buatZona = async () => {
    if (!zonaForm.nama || !zonaForm.lat || !zonaForm.lng) {
      setPesan("Isi nama zona dan koordinat titik pusat."); return;
    }
    await simpanZona({
      nama: zonaForm.nama, alamat: zonaForm.alamat,
      lat: parseFloat(zonaForm.lat), lng: parseFloat(zonaForm.lng),
      radiusMeter: parseInt(zonaForm.radiusMeter) || 300,
      jamMasuk: zonaForm.jamMasuk, jamPulang: zonaForm.jamPulang,
    });
    setPesan("✓ Zona tersimpan — langsung dipakai untuk geofencing absensi.");
    setZonaForm({ nama: "", alamat: "", lat: "", lng: "", radiusMeter: "300", jamMasuk: "07:00", jamPulang: "15:00" });
    muat();
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <h1 className="page-title">Penugasan &amp; Zona</h1>
      <p className="page-sub">Buat penugasan untuk petugas dan kelola zona geofencing.</p>

      {pesan && <div className="card3d" style={{ marginTop: 12, padding: 10, fontSize: 13, fontWeight: 600, color: pesan.startsWith("✓") ? "var(--green-deep)" : "var(--danger)" }}>{pesan}</div>}

      <div className="card3d" style={{ marginTop: 16, padding: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>＋ Buat penugasan</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          <select style={inputStyle} value={tugasForm.petugas_id} onChange={(e) => {
            const p = petugas.find((x) => x.id === e.target.value);
            setTugasForm({ ...tugasForm, petugas_id: e.target.value, zona_id: p?.zona_id || "" });
          }}>
            <option value="">— Petugas —</option>
            {petugas.filter(p => p.aktif).map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </select>
          <input style={inputStyle} placeholder="Jenis pekerjaan (mis. Penyapuan jalan)" value={tugasForm.jenis_pekerjaan} onChange={(e) => setTugasForm({ ...tugasForm, jenis_pekerjaan: e.target.value })} />
          <input style={inputStyle} placeholder="Deskripsi / lokasi detail" value={tugasForm.deskripsi} onChange={(e) => setTugasForm({ ...tugasForm, deskripsi: e.target.value })} />
          <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Tanggal tugas
            <input style={inputStyle} type="date" value={tugasForm.tanggal_tugas} onChange={(e) => setTugasForm({ ...tugasForm, tanggal_tugas: e.target.value })} />
          </label>
          <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Target selesai (opsional)
            <input style={inputStyle} type="date" value={tugasForm.target_selesai} onChange={(e) => setTugasForm({ ...tugasForm, target_selesai: e.target.value })} />
          </label>
          <select style={inputStyle} value={tugasForm.prioritas} onChange={(e) => setTugasForm({ ...tugasForm, prioritas: e.target.value as "normal" })}>
            <option value="rendah">Prioritas rendah</option>
            <option value="normal">Prioritas normal</option>
            <option value="tinggi">Prioritas tinggi</option>
          </select>
          <select style={inputStyle} value={tugasForm.zona_id} onChange={(e) => setTugasForm({ ...tugasForm, zona_id: e.target.value })}>
            <option value="">— Zona (default zona petugas) —</option>
            {zonas.map((z) => <option key={z.id} value={z.id}>{z.nama}</option>)}
          </select>
        </div>
        <button className="btn3d" style={{ marginTop: 14 }} onClick={buatTugas}>Buat Penugasan</button>
      </div>

      <div className="card3d" style={{ marginTop: 16, padding: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>＋ Tambah zona geofencing</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <input style={inputStyle} placeholder="Nama zona (mis. Zona RW 05)" value={zonaForm.nama} onChange={(e) => setZonaForm({ ...zonaForm, nama: e.target.value })} />
          <input style={inputStyle} placeholder="Alamat/wilayah" value={zonaForm.alamat} onChange={(e) => setZonaForm({ ...zonaForm, alamat: e.target.value })} />
          <input style={inputStyle} placeholder="Latitude titik pusat" value={zonaForm.lat} onChange={(e) => setZonaForm({ ...zonaForm, lat: e.target.value })} />
          <input style={inputStyle} placeholder="Longitude titik pusat" value={zonaForm.lng} onChange={(e) => setZonaForm({ ...zonaForm, lng: e.target.value })} />
          <input style={inputStyle} placeholder="Radius (meter)" value={zonaForm.radiusMeter} onChange={(e) => setZonaForm({ ...zonaForm, radiusMeter: e.target.value })} />
          <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Jam masuk
            <input style={inputStyle} type="time" value={zonaForm.jamMasuk} onChange={(e) => setZonaForm({ ...zonaForm, jamMasuk: e.target.value })} />
          </label>
          <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Jam pulang
            <input style={inputStyle} type="time" value={zonaForm.jamPulang} onChange={(e) => setZonaForm({ ...zonaForm, jamPulang: e.target.value })} />
          </label>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 8 }}>
          Tips: ambil koordinat dari Google Maps (klik kanan titik → salin koordinat).
        </div>
        <button className="btn3d green" style={{ marginTop: 12 }} onClick={buatZona}>Simpan Zona</button>
      </div>

      <div className="card3d" style={{ marginTop: 16, padding: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 10 }}>Penugasan terbaru</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {tugas.map((t) => (
            <div key={t.id} className="card3d-inset" style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t.jenis_pekerjaan} — {t.nama_petugas || t.petugas_id}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t.tanggal_tugas} • {t.deskripsi}</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: t.status === "selesai" ? "var(--green-deep)" : "var(--orange-deep)", alignSelf: "center" }}>
                {t.status.toUpperCase()}
              </span>
            </div>
          ))}
          {tugas.length === 0 && <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Belum ada penugasan.</div>}
        </div>
      </div>
    </div>
  );
}
