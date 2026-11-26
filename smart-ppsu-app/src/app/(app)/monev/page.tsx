"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { listPetugas, Petugas } from "@/lib/data";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface Rekap {
  petugas: Petugas;
  hadir: number;
  istirahat: number;
  tugasSelesai: number;
  tugasTotal: number;
  progres: number;
  kendala: number;
  nilaiAkhir: number | null;
  peringkat?: number;
}

export default function MonevPage() {
  const [periode, setPeriode] = useState(String(new Date().getFullYear()));
  const [rows, setRows] = useState<Rekap[]>([]);
  const [loading, setLoading] = useState(false);

  const muat = async () => {
    setLoading(true);
    const petugas = await listPetugas();
    const awal = `${periode}-01-01`, akhir = `${periode}-12-31`;

    const [absSnap, tugasSnap, progresSnap, kendalaSnap, nilaiSnap] = await Promise.all([
      getDocs(query(collection(db, "absensi"), where("tanggal", ">=", awal), where("tanggal", "<=", akhir))),
      getDocs(collection(db, "penugasan")),
      getDocs(collection(db, "progres_foto")),
      getDocs(collection(db, "laporan_kendala")),
      getDocs(query(collection(db, "nilai_akhir"), where("periode", "==", periode))),
    ]);

    const hitung = (docs: typeof absSnap, field: string, val?: string) => {
      const m: Record<string, number> = {};
      docs.docs.forEach((d) => {
        const x = d.data();
        if (val !== undefined && x[field] !== val) return;
        const id = x.petugas_id;
        m[id] = (m[id] || 0) + 1;
      });
      return m;
    };

    const hadir = hitung(absSnap, "jenis", "masuk");
    const istirahat = hitung(absSnap, "jenis", "istirahat_mulai");
    const progres = hitung(progresSnap, "petugas_id");
    const kendala = hitung(kendalaSnap, "petugas_id");
    const tSelesai = hitung(tugasSnap, "petugas_id");
    const selesaiMap: Record<string, number> = {};
    const totalMap: Record<string, number> = {};
    tugasSnap.docs.forEach((d) => {
      const x = d.data();
      totalMap[x.petugas_id] = (totalMap[x.petugas_id] || 0) + 1;
      if (x.status === "selesai") selesaiMap[x.petugas_id] = (selesaiMap[x.petugas_id] || 0) + 1;
    });
    void tSelesai;

    const nilaiMap: Record<string, number> = {};
    nilaiSnap.docs.forEach((d) => { nilaiMap[d.data().petugas_id] = d.data().nilai_akhir; });

    const rekap: Rekap[] = petugas.map((p) => ({
      petugas: p,
      hadir: hadir[p.id] || 0,
      istirahat: istirahat[p.id] || 0,
      tugasSelesai: selesaiMap[p.id] || 0,
      tugasTotal: totalMap[p.id] || 0,
      progres: progres[p.id] || 0,
      kendala: kendala[p.id] || 0,
      nilaiAkhir: nilaiMap[p.id] ?? null,
    }));

    // peringkat hanya yang dinilai
    const dinilai = rekap.filter((r) => r.nilaiAkhir !== null)
      .sort((a, b) => (b.nilaiAkhir || 0) - (a.nilaiAkhir || 0));
    dinilai.forEach((r, i) => { r.peringkat = i + 1; });

    setRows(rekap.sort((a, b) => (a.peringkat || 999) - (b.peringkat || 999)));
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { muat(); }, [periode]);

  const sudahDinilai = rows.filter((r) => r.nilaiAkhir !== null).length;

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Laporan Monev PPSU — Periode ${periode}`, 14, 16);
    doc.setFontSize(10);
    doc.text("Kelurahan Duri Selatan — Metode SMART (C1-C5, 25 indikator)", 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [["#", "Nama", "Hadir", "Tugas Selesai", "Foto Progres", "Kendala", "Nilai Akhir", "Peringkat"]],
      body: rows.map((r, i) => [
        i + 1, r.petugas.nama, r.hadir,
        `${r.tugasSelesai}/${r.tugasTotal}`, r.progres, r.kendala,
        r.nilaiAkhir ?? "belum dinilai", r.peringkat ?? "-",
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [255, 140, 66] },
    });
    doc.save(`monev-ppsu-${periode}.pdf`);
  };

  const exportExcel = () => {
    const data = rows.map((r, i) => ({
      No: i + 1, Nama: r.petugas.nama, Email: r.petugas.email,
      Hadir: r.hadir, Istirahat: r.istirahat,
      "Tugas Selesai": r.tugasSelesai, "Tugas Total": r.tugasTotal,
      "Foto Progres": r.progres, "Laporan Kendala": r.kendala,
      "Nilai Akhir SMART": r.nilaiAkhir ?? "belum dinilai",
      Peringkat: r.peringkat ?? "-",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Monev ${periode}`);
    XLSX.writeFile(wb, `monev-ppsu-${periode}.xlsx`);
  };

  const maxNilai = useMemo(() => Math.max(100, ...rows.map((r) => r.nilaiAkhir || 0)), [rows]);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <h1 className="page-title">Laporan / Monev</h1>
      <p className="page-sub">Rekap penilaian & aktivitas periode 12 bulan — otomatis, siap ekspor.</p>

      <div className="card3d" style={{ marginTop: 16, padding: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ fontSize: 13, fontWeight: 700 }}>Periode:
          <input type="number" min={2020} max={2100} value={periode} onChange={(e) => setPeriode(e.target.value)}
            style={{ marginLeft: 8, width: 100, padding: "7px 10px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }} />
        </label>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {sudahDinilai}/{rows.length} petugas sudah dinilai
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn3d" style={{ padding: "9px 16px", fontSize: 13 }} onClick={exportPDF}>📄 Ekspor PDF</button>
          <button className="btn3d green" style={{ padding: "9px 16px", fontSize: 13 }} onClick={exportExcel}>📊 Ekspor Excel</button>
        </div>
      </div>

      {/* chart nilai akhir */}
      <div className="card3d" style={{ marginTop: 16, padding: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>Nilai Akhir SMART per Petugas</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {rows.map((r) => (
            <div key={r.petugas.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 130, fontSize: 12.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.petugas.nama}
              </div>
              <div style={{ flex: 1, height: 22, borderRadius: 8, background: "var(--surface-2)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 8,
                  width: `${((r.nilaiAkhir || 0) / maxNilai) * 100}%`,
                  background: r.nilaiAkhir === null ? "var(--border)"
                    : r.nilaiAkhir >= 75 ? "linear-gradient(90deg, var(--green-soft), var(--green))"
                    : r.nilaiAkhir >= 50 ? "linear-gradient(90deg, var(--orange-soft), var(--orange))"
                    : "linear-gradient(90deg, #f2746c, var(--danger))",
                  transition: "width 0.6s ease",
                }} />
              </div>
              <div style={{ width: 70, fontSize: 13, fontWeight: 800, textAlign: "right" }}>
                {r.nilaiAkhir ?? "—"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* tabel rekap */}
      <div className="card3d" style={{ marginTop: 16, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 720 }}>
          <thead>
            <tr style={{ background: "var(--surface-2)", textAlign: "left" }}>
              {["#", "Nama", "Hadir", "Tugas", "Progres", "Kendala", "Nilai Akhir", "Peringkat"].map((h) => (
                <th key={h} style={{ padding: "12px 14px", fontWeight: 800 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.petugas.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ padding: "10px 14px", color: "var(--text-muted)" }}>{i + 1}</td>
                <td style={{ padding: "10px 14px", fontWeight: 700 }}>{r.petugas.nama}</td>
                <td style={{ padding: "10px 14px" }}>{r.hadir}</td>
                <td style={{ padding: "10px 14px" }}>{r.tugasSelesai}/{r.tugasTotal}</td>
                <td style={{ padding: "10px 14px" }}>{r.progres}</td>
                <td style={{ padding: "10px 14px" }}>{r.kendala}</td>
                <td style={{ padding: "10px 14px", fontWeight: 800, color: r.nilaiAkhir === null ? "var(--text-faint)" : r.nilaiAkhir >= 75 ? "var(--green-deep)" : r.nilaiAkhir >= 50 ? "var(--orange-deep)" : "var(--danger)" }}>
                  {r.nilaiAkhir ?? "belum dinilai"}
                </td>
                <td style={{ padding: "10px 14px" }}>
                  {r.peringkat ? (
                    <span style={{ fontWeight: 800, padding: "3px 10px", borderRadius: 8, background: r.peringkat <= 3 ? "var(--green-bg)" : "var(--surface-2)", color: r.peringkat <= 3 ? "var(--green-deep)" : "var(--text-muted)" }}>
                      #{r.peringkat}
                    </span>
                  ) : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr><td colSpan={8} style={{ padding: 22, textAlign: "center", color: "var(--text-muted)" }}>Belum ada data petugas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
