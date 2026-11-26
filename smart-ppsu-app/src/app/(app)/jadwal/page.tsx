"use client";

import { useEffect, useMemo, useState } from "react";
import { listPenugasan, Penugasan } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

export default function JadwalPage() {
  const { profil } = useAuth();
  const now = new Date();
  const [tahun, setTahun] = useState(now.getFullYear());
  const [bulan, setBulan] = useState(now.getMonth()); // 0-based
  const [tugas, setTugas] = useState<Penugasan[]>([]);
  const [hariDipilih, setHariDipilih] = useState<string | null>(null);

  useEffect(() => {
    listPenugasan(profil?.peran === "petugas_ppsu" ? { petugas_id: profil.uid } : undefined)
      .then(setTugas);
  }, [profil]);

  const perTanggal = useMemo(() => {
    const m: Record<string, Penugasan[]> = {};
    tugas.forEach((t) => {
      if (!t.tanggal_tugas) return;
      (m[t.tanggal_tugas] = m[t.tanggal_tugas] || []).push(t);
    });
    return m;
  }, [tugas]);

  // grid kalender
  const hariPertama = new Date(tahun, bulan, 1);
  const offsetHari = (hariPertama.getDay() + 6) % 7; // Senin=0
  const jmlHari = new Date(tahun, bulan + 1, 0).getDate();
  const sel: (string | null)[] = [
    ...Array(offsetHari).fill(null),
    ...Array.from({ length: jmlHari }, (_, i) => {
      const d = i + 1;
      return `${tahun}-${String(bulan + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }),
  ];

  const geser = (d: number) => {
    const b = bulan + d;
    setBulan(((b % 12) + 12) % 12);
    setTahun(tahun + Math.floor(b / 12) - (b < 0 && b % 12 !== 0 ? 1 : 0));
    setHariDipilih(null);
  };

  const isKasi = profil?.peran === "kasi_ekbang";

  const rowsBulan = tugas
    .filter((t) => t.tanggal_tugas?.startsWith(`${tahun}-${String(bulan + 1).padStart(2, "0")}`))
    .sort((a, b) => a.tanggal_tugas.localeCompare(b.tanggal_tugas));

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Jadwal PPSU — ${BULAN[bulan]} ${tahun}`, 14, 16);
    autoTable(doc, {
      startY: 24,
      head: [["Tanggal", "Petugas", "Pekerjaan", "Prioritas", "Status"]],
      body: rowsBulan.map((t) => [t.tanggal_tugas, t.nama_petugas || t.petugas_id, t.jenis_pekerjaan, t.prioritas, t.status]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [255, 140, 66] },
    });
    doc.save(`jadwal-ppsu-${tahun}-${bulan + 1}.pdf`);
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      rowsBulan.map((t) => ({
        Tanggal: t.tanggal_tugas, Petugas: t.nama_petugas || t.petugas_id,
        Pekerjaan: t.jenis_pekerjaan, Deskripsi: t.deskripsi,
        Prioritas: t.prioritas, Status: t.status,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, BULAN[bulan]);
    XLSX.writeFile(wb, `jadwal-ppsu-${tahun}-${bulan + 1}.xlsx`);
  };

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <h1 className="page-title">Jadwal Harian PPSU</h1>
      <p className="page-sub">
        {isKasi ? "Semua jadwal petugas — bisa diekstrak ke PDF/Excel." : "Jadwal penugasan Anda."}
      </p>

      <div className="card3d" style={{ marginTop: 16, padding: 18 }}>
        {/* header bulan */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button className="btn3d ghost" style={{ padding: "7px 14px" }} onClick={() => geser(-1)}>‹</button>
          <div style={{ fontWeight: 800, fontSize: 17 }}>{BULAN[bulan]} {tahun}</div>
          <button className="btn3d ghost" style={{ padding: "7px 14px" }} onClick={() => geser(1)}>›</button>
        </div>

        {/* grid hari */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5, marginTop: 14 }}>
          {HARI.map((h) => (
            <div key={h} style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: "var(--text-faint)", padding: "4px 0" }}>{h}</div>
          ))}
          {sel.map((tgl, i) => {
            const items = tgl ? perTanggal[tgl] || [] : [];
            const isToday = tgl === new Date().toISOString().slice(0, 10);
            const dipilih = tgl === hariDipilih;
            return (
              <button
                key={i}
                disabled={!tgl}
                onClick={() => setHariDipilih(tgl)}
                style={{
                  aspectRatio: "1", borderRadius: 12, border: "none", cursor: tgl ? "pointer" : "default",
                  background: dipilih ? "var(--orange)" : isToday ? "var(--green-bg)" : "var(--surface-2)",
                  color: dipilih ? "#fff" : "var(--text)",
                  boxShadow: tgl ? "0 2px 0 var(--border)" : "none",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 3, fontFamily: "inherit",
                }}
              >
                {tgl && (
                  <>
                    <span style={{ fontSize: 13, fontWeight: isToday ? 800 : 600 }}>{parseInt(tgl.slice(8))}</span>
                    {items.length > 0 && (
                      <span style={{
                        fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 6,
                        background: dipilih ? "rgba(255,255,255,0.3)" : "var(--orange-soft)", color: dipilih ? "#fff" : "#fff",
                      }}>
                        {items.length}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* detail hari dipilih */}
      {hariDipilih && (
        <div className="card3d" style={{ marginTop: 14, padding: 18 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 10 }}>Jadwal {hariDipilih}</div>
          {(perTanggal[hariDipilih] || []).map((t) => (
            <div key={t.id} className="card3d-inset" style={{ padding: "10px 14px", marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t.jenis_pekerjaan}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {t.nama_petugas || ""} • {t.status} • prioritas {t.prioritas}
              </div>
            </div>
          ))}
          {(perTanggal[hariDipilih] || []).length === 0 && (
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Tidak ada jadwal di tanggal ini.</div>
          )}
        </div>
      )}

      {/* ekspor (kasi) */}
      {isKasi && (
        <div className="card3d" style={{ marginTop: 14, padding: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>
            Ekstrak jadwal {BULAN[bulan]} {tahun} ({rowsBulan.length} jadwal):
          </span>
          <button className="btn3d" style={{ padding: "9px 16px", fontSize: 13 }} onClick={exportPDF}>📄 PDF</button>
          <button className="btn3d green" style={{ padding: "9px 16px", fontSize: 13 }} onClick={exportExcel}>📊 Excel</button>
        </div>
      )}
    </div>
  );
}
