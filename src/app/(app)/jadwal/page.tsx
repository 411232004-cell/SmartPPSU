"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listPenugasan, Penugasan, listJadwalBulan, setJadwalShift, setJadwalMassal, JadwalShift,
  listPetugas, Petugas,
} from "@/lib/data";
import { JADWAL_SHIFT, LABEL_JENIS, URUTAN_JENIS, Shift } from "@/lib/absensi";
import { namaRegu } from "@/lib/regu";
import { useAuth } from "@/lib/auth";
import { auth } from "@/lib/firebase";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

const WARNA_SHIFT: Record<string, string> = {
  pagi: "#f59e0b",
  sore: "#6366f1",
  libur: "#94a3b8",
};

export default function JadwalPage() {
  const { profil } = useAuth();
  const { tanya, dialog } = useConfirmDialog();
  const now = new Date();
  const [tahun, setTahun] = useState(now.getFullYear());
  const [bulan, setBulan] = useState(now.getMonth()); // 0-based
  const [tugas, setTugas] = useState<Penugasan[]>([]);
  const [jadwal, setJadwal] = useState<JadwalShift[]>([]);
  const [petugas, setPetugas] = useState<Petugas[]>([]);
  const [hariDipilih, setHariDipilih] = useState<string | null>(null);
  const [pesan, setPesan] = useState("");
  // pola mingguan massal: indeks 0=Senin..6=Minggu, target per personel
  const [pola, setPola] = useState<Shift[]>(["pagi", "pagi", "pagi", "pagi", "pagi", "pagi", "libur"]);
  const [polaTarget, setPolaTarget] = useState(""); // "" = semua petugas aktif, selain itu id personel
  const [polaBulan, setPolaBulan] = useState(1); // rotasi biasanya per bulan, bisa 2–3 bulan sekaligus
  const [polaSibuk, setPolaSibuk] = useState(false);

  const prefix = `${tahun}-${String(bulan + 1).padStart(2, "0")}`;
  const isKasi = profil?.peran === "kasi_ekbang";

  const muatJadwal = () => listJadwalBulan(prefix).then(setJadwal).catch(() => {});

  useEffect(() => {
    listPenugasan(profil?.peran === "petugas_ppsu" ? { petugas_id: profil.uid } : undefined)
      .then(setTugas).catch(() => {});
  }, [profil]);

  useEffect(() => { muatJadwal(); }, [prefix]);
  useEffect(() => { if (isKasi) listPetugas().then(setPetugas); }, [isKasi]);

  const perTanggal = useMemo(() => {
    const m: Record<string, Penugasan[]> = {};
    tugas.forEach((t) => {
      if (!t.tanggal_tugas) return;
      (m[t.tanggal_tugas] = m[t.tanggal_tugas] || []).push(t);
    });
    return m;
  }, [tugas]);

  const shiftMap = useMemo(() => {
    const m: Record<string, Record<string, string>> = {};
    jadwal.forEach((j) => {
      (m[j.tanggal] = m[j.tanggal] || {})[j.petugas_id] = j.shift;
    });
    return m;
  }, [jadwal]);

  // grid kalender
  const hariPertama = new Date(tahun, bulan, 1);
  const offsetHari = (hariPertama.getDay() + 6) % 7; // Senin=0
  const jmlHari = new Date(tahun, bulan + 1, 0).getDate();
  const sel: (string | null)[] = [
    ...Array(offsetHari).fill(null),
    ...Array.from({ length: jmlHari }, (_, i) => {
      const d = i + 1;
      return `${prefix}-${String(d).padStart(2, "0")}`;
    }),
  ];

  const geser = (d: number) => {
    const b = bulan + d;
    setBulan(((b % 12) + 12) % 12);
    setTahun(tahun + Math.floor(b / 12) - (b < 0 && b % 12 !== 0 ? 1 : 0));
    setHariDipilih(null);
  };

  // push ke petugas saat jadwalnya berubah — bunyi walau aplikasi tertutup
  const kirimPush = (judul: string, deskripsi: string, target: "personel" | "semua", uid?: string) => {
    auth.currentUser?.getIdToken().then((t) => {
      if (!t) return;
      fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({
          judul, deskripsi, target,
          target_petugas_id: target === "personel" ? uid : undefined,
        }),
      }).catch(() => {});
    }).catch(() => {});
  };

  const ubahShift = async (tanggal: string, p: Petugas, shift: "pagi" | "sore" | "libur") => {
    await setJadwalShift(tanggal, p, shift);
    setPesan(`Shift ${p.nama} @ ${tanggal} → ${shift.toUpperCase()}`);
    muatJadwal();
    kirimPush("Jadwal shift diubah", `Shift kamu ${tanggal} → ${shift.toUpperCase()}. Cek menu Jadwal.`, "personel", p.id);
  };

  // terapkan pola mingguan ke target personel — 1 sampai 3 bulan sekaligus
  const terapkanPola = async () => {
    const target = petugas.filter((p) => p.aktif && (!polaTarget || p.id === polaTarget));
    if (!target.length) {
      setPesan("Tidak ada petugas aktif pada target yang dipilih.");
      return;
    }
    const namaTgt = polaTarget ? target[0]?.nama : `${target.length} petugas`;
    if (!(await tanya(
      "Terapkan pola shift?",
      `${namaTgt} — ${polaBulan} bulan mulai ${BULAN[bulan]} ${tahun}.\nJadwal yang sudah diatur manual akan ditimpa sesuai pola.`,
      { okLabel: "Terapkan" }
    ))) return;
    setPolaSibuk(true);
    try {
      const items: { tanggal: string; p: Petugas; shift: Shift }[] = [];
      for (let m = 0; m < polaBulan; m++) {
        const bln = bulan + m;
        const th = tahun + Math.floor(bln / 12);
        const bl = bln % 12;
        const pfx = `${th}-${String(bl + 1).padStart(2, "0")}`;
        const jml = new Date(th, bl + 1, 0).getDate();
        for (let d = 1; d <= jml; d++) {
          const tgl = `${pfx}-${String(d).padStart(2, "0")}`;
          const wd = (new Date(th, bl, d).getDay() + 6) % 7; // Senin=0
          const shift = pola[wd];
          target.forEach((p) => items.push({ tanggal: tgl, p, shift }));
        }
      }
      await setJadwalMassal(items);
      setPesan(`✓ Pola diterapkan — ${items.length} jadwal untuk ${namaTgt} (${polaBulan} bulan).`);
      muatJadwal();
      kirimPush(
        "Jadwal shift diterbitkan",
        `Jadwal shift ${polaBulan > 1 ? `${polaBulan} bulan` : `bulan ${BULAN[bulan]}`} sudah tersedia — cek menu Jadwal.`,
        polaTarget ? "personel" : "semua",
        polaTarget || undefined
      );
    } catch (e) {
      setPesan(`Gagal: ${e instanceof Error ? e.message : e}`);
    } finally {
      setPolaSibuk(false);
    }
  };

  const rowsBulan = tugas
    .filter((t) => t.tanggal_tugas?.startsWith(prefix))
    .sort((a, b) => a.tanggal_tugas.localeCompare(b.tanggal_tugas));

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`Jadwal PPSU — ${BULAN[bulan]} ${tahun}`, 14, 16);
    autoTable(doc, {
      startY: 24,
      head: [["Tanggal", "Petugas", "Shift", "Pekerjaan", "Prioritas", "Status"]],
      body: rowsBulan.map((t) => [
        t.tanggal_tugas, t.nama_petugas || t.petugas_id,
        (shiftMap[t.tanggal_tugas]?.[t.petugas_id] || "-").toUpperCase(),
        t.jenis_pekerjaan, t.prioritas, t.status,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [255, 140, 66] },
    });
    doc.save(`jadwal-ppsu-${prefix}.pdf`);
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      rowsBulan.map((t) => ({
        Tanggal: t.tanggal_tugas, Petugas: t.nama_petugas || t.petugas_id,
        Shift: (shiftMap[t.tanggal_tugas]?.[t.petugas_id] || "-").toUpperCase(),
        Pekerjaan: t.jenis_pekerjaan, Deskripsi: t.deskripsi,
        Prioritas: t.prioritas, Status: t.status,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, BULAN[bulan]);
    XLSX.writeFile(wb, `jadwal-ppsu-${prefix}.xlsx`);
  };

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <h1 className="page-title">Jadwal Harian PPSU</h1>
      <p className="page-sub">
        {isKasi
          ? "Atur shift tiap petugas — klik tanggal lalu pilih shift. Shift menentukan jam tombol absen terbuka."
          : "Jadwal shift & penugasan Anda."}
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
            const shiftSaya = tgl && profil ? shiftMap[tgl]?.[profil.uid] : undefined;
            const nShift = tgl ? Object.keys(shiftMap[tgl] || {}).length : 0;
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
                    {isKasi && nShift > 0 && (
                      <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 6, background: dipilih ? "rgba(255,255,255,0.3)" : "var(--orange-soft)", color: "#fff" }}>
                        {nShift}
                      </span>
                    )}
                    {!isKasi && shiftSaya && (
                      <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 6, background: WARNA_SHIFT[shiftSaya], color: "#fff" }}>
                        {shiftSaya[0].toUpperCase()}
                      </span>
                    )}
                    {!isKasi && !shiftSaya && items.length > 0 && (
                      <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 6, background: "var(--orange-soft)", color: "#fff" }}>
                        {items.length}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>
          <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: WARNA_SHIFT.pagi, marginRight: 5 }} />Pagi 07.00–15.00</span>
          <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: WARNA_SHIFT.sore, marginRight: 5 }} />Sore 15.00–23.00</span>
          <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: WARNA_SHIFT.libur, marginRight: 5 }} />Libur</span>
        </div>
      </div>

      {/* pola shift mingguan — terapkan sekaligus ke sebulan penuh */}
      {isKasi && (
        <div className="card3d" style={{ marginTop: 14, padding: 18 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Pola Shift Mingguan</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
            Pilih <b>personel</b>, atur pola Senin–Minggu sekali, lalu terapkan ke 1–3 bulan —
            cocok untuk rotasi shift bulanan kelurahan. Tidak perlu klik tanggal satu per satu.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))", gap: 8 }}>
            {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"].map((h, i) => (
              <label key={h} style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)" }}>
                {h}
                <select
                  value={pola[i]}
                  onChange={(e) => setPola(pola.map((s, j) => (j === i ? (e.target.value as Shift) : s)))}
                  style={{
                    display: "block", width: "100%", marginTop: 4, padding: "7px 8px", borderRadius: 9,
                    border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--text)",
                    fontSize: 12.5, fontWeight: 800, fontFamily: "inherit",
                  }}
                >
                  <option value="pagi">PAGI</option>
                  <option value="sore">SORE</option>
                  <option value="libur">OFF</option>
                </select>
              </label>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={polaTarget}
              onChange={(e) => setPolaTarget(e.target.value)}
              style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 13, fontFamily: "inherit" }}
            >
              <option value="">Semua petugas aktif</option>
              {petugas.filter((p) => p.aktif).map((p) => (
                <option key={p.id} value={p.id}>{p.nama} — {namaRegu(p.regu)}</option>
              ))}
            </select>
            <select
              value={polaBulan}
              onChange={(e) => setPolaBulan(parseInt(e.target.value))}
              style={{ padding: "8px 10px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 13, fontFamily: "inherit" }}
            >
              <option value={1}>1 bulan ({BULAN[bulan]})</option>
              <option value={2}>2 bulan</option>
              <option value={3}>3 bulan</option>
            </select>
            <button className="btn3d" style={{ padding: "9px 16px", fontSize: 13 }} disabled={polaSibuk} onClick={terapkanPola}>
              {polaSibuk ? "Menulis jadwal…" : "Terapkan"}
            </button>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>
              per minggu: {pola.filter((s) => s === "pagi").length}× pagi, {pola.filter((s) => s === "sore").length}× sore, {pola.filter((s) => s === "libur").length}× OFF
            </span>
          </div>
        </div>
      )}

      {pesan && (
        <div className="card3d" style={{ marginTop: 12, padding: 10, fontSize: 13, fontWeight: 600, color: "var(--green-deep)" }}>{pesan}</div>
      )}

      {/* detail hari dipilih */}
      {hariDipilih && (
        <div className="card3d" style={{ marginTop: 14, padding: 18 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 10 }}>Jadwal {hariDipilih}</div>

          {/* editor shift untuk admin */}
          {isKasi && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text-muted)", marginBottom: 8 }}>
                ATUR SHIFT ({petugas.filter((p) => p.aktif).length} petugas aktif)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {petugas.filter((p) => p.aktif).map((p) => {
                  const cur = shiftMap[hariDipilih]?.[p.id] || "";
                  return (
                    <div key={p.id} className="card3d-inset" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{p.nama}</div>
                        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{namaRegu(p.regu)}</div>
                      </div>
                      {(["pagi", "sore", "libur"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => ubahShift(hariDipilih, p, s)}
                          style={{
                            padding: "6px 12px", borderRadius: 9, border: "none", cursor: "pointer",
                            fontSize: 11, fontWeight: 800, fontFamily: "inherit",
                            background: cur === s ? WARNA_SHIFT[s] : "var(--surface-2)",
                            color: cur === s ? "#fff" : "var(--text-muted)",
                            boxShadow: cur === s ? `0 2px 0 ${WARNA_SHIFT[s]}` : "0 2px 0 var(--border)",
                          }}
                        >
                          {s.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* shift saya hari itu */}
          {!isKasi && (
            <div className="card3d-inset" style={{ padding: "10px 14px", marginBottom: 10, fontSize: 13 }}>
              {shiftMap[hariDipilih]?.[profil?.uid || ""] ? (
                <>
                  Shift Anda: <b style={{ color: WARNA_SHIFT[shiftMap[hariDipilih][profil!.uid]] }}>
                    {shiftMap[hariDipilih][profil!.uid].toUpperCase()}
                  </b>
                  {shiftMap[hariDipilih][profil!.uid] !== "libur" && (
                    <span style={{ color: "var(--text-muted)" }}>
                      {" "}— {URUTAN_JENIS.map((j) => {
                        const [h, m] = JADWAL_SHIFT[shiftMap[hariDipilih][profil!.uid] as "pagi" | "sore"][j];
                        return `${LABEL_JENIS[j]} ${String(h).padStart(2, "0")}.${String(m).padStart(2, "0")}`;
                      }).join(" • ")}
                    </span>
                  )}
                </>
              ) : (
                <span style={{ color: "var(--text-muted)" }}>Belum ada shift terjadwal — absen memakai shift default akun.</span>
              )}
            </div>
          )}

          {(perTanggal[hariDipilih] || []).map((t) => (
            <div key={t.id} className="card3d-inset" style={{ padding: "10px 14px", marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t.jenis_pekerjaan}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {t.nama_petugas || ""} • {t.status} • prioritas {t.prioritas}
              </div>
            </div>
          ))}
          {(perTanggal[hariDipilih] || []).length === 0 && !isKasi && (
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Tidak ada penugasan di tanggal ini.</div>
          )}
        </div>
      )}

      {/* ekspor (kasi) */}
      {isKasi && (
        <div className="card3d" style={{ marginTop: 14, padding: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>
            Ekstrak jadwal {BULAN[bulan]} {tahun} ({rowsBulan.length} penugasan):
          </span>
          <button className="btn3d" style={{ padding: "9px 16px", fontSize: 13 }} onClick={exportPDF}>Ekspor PDF</button>
          <button className="btn3d green" style={{ padding: "9px 16px", fontSize: 13 }} onClick={exportExcel}>Ekspor Excel</button>
        </div>
      )}

      {dialog}
    </div>
  );
}
