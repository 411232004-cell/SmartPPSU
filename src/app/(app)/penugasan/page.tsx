"use client";

import { useEffect, useState } from "react";
import {
  listPetugas, listZona, listPenugasan, tambahPenugasan, simpanZona,
  updateTitikZona, updateNamaZona, hapusZona, pastikanZonaDefault,
  Petugas, Zona, Penugasan,
} from "@/lib/data";
import { getGPS } from "@/lib/capture";
import { useAuth } from "@/lib/auth";
import ZonaMap from "@/components/ZonaMap";
import { useConfirmDialog } from "@/components/ConfirmDialog";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: "1px solid var(--border)", background: "var(--surface)",
  color: "var(--text)", fontSize: 14, fontFamily: "inherit",
};

export default function PenugasanPage() {
  const { tanya, dialog } = useConfirmDialog();
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
    pastikanZonaDefault().catch(() => {});
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

  const [sibukZona, setSibukZona] = useState<string | null>(null);
  const [seleksiZona, setSeleksiZona] = useState("");
  const [modePindah, setModePindah] = useState(false);
  const [fokus, setFokus] = useState<{ lat: number; lng: number } | null>(null);
  const [qCari, setQCari] = useState("");
  const [hasilCari, setHasilCari] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
  const [cariSibuk, setCariSibuk] = useState(false);

  // pilih zona pertama begitu daftar termuat
  useEffect(() => {
    if (!seleksiZona && zonas.length) setSeleksiZona(zonas[0].id);
  }, [zonas, seleksiZona]);

  const setTitikDariPeta = async (zonaId: string, lat: number, lng: number) => {
    const z = zonas.find((x) => x.id === zonaId);
    await updateTitikZona(zonaId, lat, lng);
    setPesan(`✓ Titik pusat "${z?.nama || zonaId}" → ${lat.toFixed(5)}, ${lng.toFixed(5)}.`);
    muat();
  };

  // cari alamat lewat Nominatim (OpenStreetMap) — gratis, tanpa API key.
  // Hasil dikunci ke wilayah Duri Selatan dulu; kalau kosong baru cari luas.
  const cariLokasi = async () => {
    const q = qCari.trim();
    if (!q) return;
    setCariSibuk(true);
    setHasilCari([]);
    try {
      const qq = /jakarta|tambora/i.test(q) ? q : `${q}, Duri Selatan, Tambora, Jakarta Barat`;
      const fetchHasil = async (bounded: boolean) => {
        const url =
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=id` +
          `&viewbox=106.77,-6.14,106.83,-6.19${bounded ? "&bounded=1" : ""}` +
          `&q=${encodeURIComponent(qq)}`;
        const r = await fetch(url, { headers: { "Accept-Language": "id" } });
        return ((await r.json()) || []) as { display_name: string; lat: string; lon: string }[];
      };
      let data = await fetchHasil(true); // hanya di dalam Duri Selatan
      if (!data.length) data = await fetchHasil(false); // cadangan: pencarian luas
      setHasilCari(data);
      if (!data.length) {
        setPesan("Alamat tidak ditemukan — geser pin di mode satelit untuk menempatkan titik langsung.");
      }
    } catch {
      setPesan("Pencarian alamat gagal — cek koneksi internet.");
    } finally {
      setCariSibuk(false);
    }
  };

  const pakaiHasil = async (h: { display_name: string; lat: string; lon: string }) => {
    if (!seleksiZona) return;
    const lat = parseFloat(h.lat), lng = parseFloat(h.lon);
    const z = zonas.find((x) => x.id === seleksiZona);
    await updateTitikZona(seleksiZona, lat, lng);
    setFokus({ lat, lng });
    setHasilCari([]);
    setPesan(`✓ "${z?.nama || seleksiZona}" dipindah ke: ${h.display_name.slice(0, 80)}`);
    muat();
  };

  const gantiNama = async (z: Zona, nama: string) => {
    if (!nama.trim() || nama === z.nama) return;
    await updateNamaZona(z.id, nama.trim());
    setPesan(`✓ Zona diganti nama → "${nama.trim()}".`);
    muat();
  };

  const duplikatZona = async (z: Zona) => {
    await simpanZona({
      nama: `${z.nama} (salinan)`,
      lat: z.lat + 0.0005, lng: z.lng + 0.0005,
      radiusMeter: z.radiusMeter,
    });
    setPesan(`✓ "${z.nama}" diduplikat — geser pin salinannya ke titik baru.`);
    muat();
  };

  const hapusZonaDipilih = async (z: Zona) => {
    if (!(await tanya("Hapus zona?", `"${z.nama}" akan dihapus — regu yang terikat zona ini kembali bebas GPS.`, { okLabel: "Hapus", bahaya: true }))) return;
    await hapusZona(z.id);
    if (seleksiZona === z.id) setSeleksiZona("");
    setPesan(`✓ Zona "${z.nama}" dihapus.`);
    muat();
  };

  const setTitikDariGPS = async (z: Zona) => {
    setSibukZona(z.id);
    try {
      const p = await getGPS();
      await updateTitikZona(z.id, p.coords.latitude, p.coords.longitude);
      setPesan(`✓ Titik pusat "${z.nama}" diset ke lokasi Anda (${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)}).`);
      muat();
    } catch {
      setPesan("GPS gagal — nyalakan lokasi lalu coba lagi.");
    } finally {
      setSibukZona(null);
    }
  };

  const ubahRadius = async (z: Zona, radius: number) => {
    if (!radius || radius <= 0) return;
    await updateTitikZona(z.id, z.lat, z.lng, radius);
    setPesan(`✓ Radius "${z.nama}" → ${radius} m.`);
    muat();
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <h1 className="page-title">Penugasan &amp; Zona</h1>
      <p className="page-sub">Buat penugasan untuk petugas dan kelola zona geofencing.</p>

      {pesan && <div className="card3d" style={{ marginTop: 12, padding: 10, fontSize: 13, fontWeight: 600, color: pesan.startsWith("✓") ? "var(--green-deep)" : "var(--danger)" }}>{pesan}</div>}

      {/* titik pusat zona: peta + CRUD — di atas supaya langsung terlihat */}
      <div className="card3d" style={{ marginTop: 16, padding: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Titik pusat zona geofencing</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
          Pilih zona di daftar bawah — lalu <b>geser pin</b>, <b>cari alamat</b>, atau aktifkan <b>klik-peta</b> untuk memindahkan titiknya. Lingkaran menunjukkan radius.
        </div>
        <ZonaMap
          zonas={zonas}
          seleksiId={seleksiZona}
          klikAktif={modePindah}
          fokus={fokus}
          onPilih={setTitikDariPeta}
          onKlikZona={setSeleksiZona}
        />

        {/* alat pindah titik: mode klik-peta + pencarian alamat */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={modePindah} onChange={(e) => setModePindah(e.target.checked)} />
            Klik-peta untuk memindah titik zona terpilih (matikan jika selesai — anti salah-sentuh)
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              placeholder='Cari alamat… mis. "RW 1 Kelurahan Duri Selatan"'
              value={qCari}
              onChange={(e) => setQCari(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && cariLokasi()}
            />
            <button className="btn3d" style={{ padding: "8px 14px", fontSize: 12 }} onClick={cariLokasi} disabled={cariSibuk}>
              {cariSibuk ? "Mencari…" : "Cari"}
            </button>
          </div>
          {hasilCari.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {hasilCari.map((h, i) => (
                <button
                  key={i}
                  className="card3d-inset"
                  style={{ padding: "8px 12px", fontSize: 12, textAlign: "left", cursor: "pointer", color: "var(--text)", border: "none" }}
                  onClick={() => pakaiHasil(h)}
                >
                  {h.display_name}
                </button>
              ))}
              <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
                Klik hasil untuk memindahkan titik zona yang <b>terpilih</b> di daftar.
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {zonas.map((z) => (
            <div
              key={z.id}
              className="card3d-inset"
              onClick={() => setSeleksiZona(z.id)}
              style={{
                padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", cursor: "pointer",
                outline: z.id === seleksiZona ? "2px solid var(--orange)" : "none",
              }}
            >
              <div style={{ flex: 1, minWidth: 160 }}>
                <input
                  defaultValue={z.nama}
                  title="Ketik nama zona — tersimpan saat klik di luar"
                  style={{ ...inputStyle, padding: "6px 8px", fontSize: 13, fontWeight: 700, width: "100%", marginBottom: 3 }}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => gantiNama(z, e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                />
                <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
                  {z.lat.toFixed(5)}, {z.lng.toFixed(5)}
                </div>
              </div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                Radius (m)
                <input
                  type="number" min={50} step={50} defaultValue={z.radiusMeter}
                  style={{ ...inputStyle, width: 90, padding: "6px 8px", fontSize: 12 }}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => {
                    const v = parseInt(e.target.value);
                    if (v && v !== z.radiusMeter) ubahRadius(z, v);
                  }}
                />
              </label>
              <button
                className="btn3d"
                style={{ padding: "8px 14px", fontSize: 12 }}
                disabled={sibukZona === z.id}
                title="Set titik pusat ke posisi GPS Anda saat ini"
                onClick={(e) => { e.stopPropagation(); setTitikDariGPS(z); }}
              >
                {sibukZona === z.id ? "Mengambil GPS…" : "GPS saya"}
              </button>
              <button
                className="btn3d"
                style={{ padding: "8px 14px", fontSize: 12 }}
                title="Duplikat titik ini — geser pin salinannya ke lokasi lain"
                onClick={(e) => { e.stopPropagation(); duplikatZona(z); }}
              >
                Duplikat
              </button>
              <button
                className="btn3d"
                style={{ padding: "8px 14px", fontSize: 12, color: "#fff", background: "linear-gradient(180deg,#ef4444,#b91c1c)", boxShadow: "0 3px 0 #7f1d1d" }}
                title="Hapus zona ini"
                onClick={(e) => { e.stopPropagation(); hapusZonaDipilih(z); }}
              >
                Hapus
              </button>
            </div>
          ))}
          {zonas.length === 0 && (
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Belum ada zona.</div>
          )}
        </div>
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

      {/* form di bawah — peta & daftar tugas tetap jadi fokus utama */}
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

      {dialog}
    </div>
  );
}
