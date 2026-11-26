"use client";

import { useEffect, useState } from "react";
import { listPenugasan, updateStatusTugas, Penugasan } from "@/lib/data";
import { useAuth } from "@/lib/auth";

export default function TugasPage() {
  const { profil } = useAuth();
  const [tugas, setTugas] = useState<Penugasan[]>([]);
  const [pesan, setPesan] = useState("");

  const muat = async () => {
    if (!profil) return;
    setTugas(await listPenugasan({ petugas_id: profil.uid }));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { muat(); }, [profil]);

  const ubah = async (t: Penugasan, status: Penugasan["status"]) => {
    let alasan = "";
    if (status === "tertunda") {
      alasan = prompt("Alasan penundaan:") || "";
      if (!alasan) return;
    }
    await updateStatusTugas(t.id, status, alasan);
    setPesan(`Status "${t.jenis_pekerjaan}" → ${status}`);
    muat();
  };

  const warna: Record<string, string> = {
    ditugaskan: "var(--orange-deep)",
    proses: "#c78a00",
    selesai: "var(--green-deep)",
    tertunda: "var(--danger)",
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <h1 className="page-title">Penugasan Saya</h1>
      <p className="page-sub">Daftar tugas dari Kasi Ekbang — tandai status setelah dikerjakan.</p>

      {pesan && <div className="card3d" style={{ marginTop: 12, padding: 10, fontSize: 13, fontWeight: 600, color: "var(--green-deep)" }}>{pesan}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        {tugas.length === 0 && (
          <div className="card3d" style={{ padding: 20, fontSize: 14, color: "var(--text-muted)" }}>
            Belum ada penugasan.
          </div>
        )}
        {tugas.map((t) => (
          <div key={t.id} className="card3d" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{t.jenis_pekerjaan}</div>
                <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 3 }}>{t.deskripsi}</div>
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 5 }}>
                  {t.tanggal_tugas}{t.target_selesai ? ` • target ${t.target_selesai}` : ""} • prioritas {t.prioritas}
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 8, background: "var(--surface-2)", color: warna[t.status], whiteSpace: "nowrap" }}>
                {t.status.toUpperCase()}
              </span>
            </div>
            {t.status !== "selesai" && (
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {t.status === "ditugaskan" && (
                  <button className="btn3d" style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => ubah(t, "proses")}>Mulai Kerjakan</button>
                )}
                <button className="btn3d green" style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => ubah(t, "selesai")}>✓ Tandai Selesai</button>
                <button className="btn3d ghost" style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => ubah(t, "tertunda")}>Tunda</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
