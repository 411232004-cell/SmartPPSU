"use client";

import { useEffect, useState } from "react";
import {
  listPetugas, buatAkunPetugas, updatePetugas, listZona, Petugas, Zona,
} from "@/lib/data";
import DeleteButton from "@/components/DeleteButton";
import { inputStyle } from "@/lib/ui";

export default function PetugasPage() {
  const [list, setList] = useState<Petugas[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [form, setForm] = useState({ nama: "", email: "", password: "", niap: "", zona_id: "" });
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState("");

  const muat = async () => {
    setList(await listPetugas());
    setZonas(await listZona());
  };
  useEffect(() => { muat(); }, []);

  const buat = async () => {
    if (!form.nama || !form.email || !form.password) {
      setPesan("Nama, email, dan password wajib diisi."); return;
    }
    setSibuk(true); setPesan("");
    try {
      await buatAkunPetugas(form);
      setPesan(`✓ Akun ${form.nama} dibuat. Petugas bisa login dengan email & password ini.`);
      setForm({ nama: "", email: "", password: "", niap: "", zona_id: "" });
      muat();
    } catch (e) {
      setPesan(`Gagal: ${e instanceof Error ? e.message : e}`);
    } finally { setSibuk(false); }
  };

  const toggleAktif = async (p: Petugas) => {
    await updatePetugas(p.id, { aktif: !p.aktif });
    muat();
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <h1 className="page-title">Data Petugas</h1>
      <p className="page-sub">Kelola akun petugas PPSU — akun dibuat di sini, petugas langsung bisa login.</p>

      <div className="card3d" style={{ marginTop: 18, padding: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>＋ Buat akun petugas baru</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <input style={inputStyle} placeholder="Nama lengkap" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
          <input style={inputStyle} placeholder="NIAP (opsional)" value={form.niap} onChange={(e) => setForm({ ...form, niap: e.target.value })} />
          <input style={inputStyle} type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input style={inputStyle} type="text" placeholder="Password awal" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <select style={inputStyle} value={form.zona_id} onChange={(e) => setForm({ ...form, zona_id: e.target.value })}>
            <option value="">— Pilih zona —</option>
            {zonas.map((z) => <option key={z.id} value={z.id}>{z.nama}</option>)}
          </select>
        </div>
        {pesan && <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: pesan.startsWith("✓") ? "var(--green-deep)" : "var(--danger)" }}>{pesan}</div>}
        <button className="btn3d" style={{ marginTop: 14 }} disabled={sibuk} onClick={buat}>
          {sibuk ? "Membuat…" : "Buat Akun"}
        </button>
      </div>

      <div className="card3d" style={{ marginTop: 16, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: "var(--surface-2)", textAlign: "left" }}>
              {["Nama", "Email", "NIAP", "Zona GPS (override)", "Status", "Aksi"].map((h) => (
                <th key={h} style={{ padding: "12px 14px", fontWeight: 800 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "11px 14px", fontWeight: 700 }}>{p.nama}</td>
                <td style={{ padding: "11px 14px", color: "var(--text-muted)" }}>{p.email}</td>
                <td style={{ padding: "11px 14px", color: "var(--text-muted)" }}>{p.niap || "-"}</td>
                <td style={{ padding: "11px 14px" }}>
                  <select
                    style={{ ...inputStyle, padding: "5px 8px", fontSize: 12.5, width: "auto" }}
                    value={p.zona_id || ""}
                    onChange={async (e) => { await updatePetugas(p.id, { zona_id: e.target.value }); muat(); }}
                  >
                    <option value="">Ikut zona regu</option>
                    {zonas.map((z) => <option key={z.id} value={z.id}>{z.nama}</option>)}
                  </select>
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: p.aktif ? "var(--green-deep)" : "var(--danger)" }}>
                    {p.aktif ? "AKTIF" : "NONAKTIF"}
                  </span>
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button className="btn3d ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => toggleAktif(p)}>
                      {p.aktif ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    <DeleteButton title="Nonaktifkan akun" onClick={() => toggleAktif(p)} />
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>Belum ada petugas terdaftar.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
