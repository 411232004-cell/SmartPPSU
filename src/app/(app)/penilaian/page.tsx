"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, addDoc, setDoc, doc, serverTimestamp, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { KRITERIA, SKALA, SkorIndikator, hitungSMART } from "@/lib/penilaian";
import { listPetugas, Petugas } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import LoadingScreen from "@/components/LoadingScreen";

type SkorMap = Record<string, SkorIndikator[]>;

const skorKosong = (): SkorMap =>
  Object.fromEntries(KRITERIA.map((k) => [k.kode, Array(5).fill(3)]));

export default function PenilaianPage() {
  const { profil } = useAuth();
  const [petugas, setPetugas] = useState<Petugas[]>([]);
  const [dipilih, setDipilih] = useState<Petugas | null>(null);
  const [periode, setPeriode] = useState(String(new Date().getFullYear()));
  const [skor, setSkor] = useState<SkorMap>(skorKosong());
  const [catatan, setCatatan] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState("");
  const [bonus, setBonus] = useState(0);
  const [otomasi, setOtomasi] = useState<{
    absen: number; terjadwal: number; tepat: number; lengkap: number;
    tugasSelesai: number; tugasTotal: number;
    tkSelesai: number; tkPoin: number; tkGagal: number; tkMinus: number;
  } | null>(null);
  const [memuatOto, setMemuatOto] = useState(false);

  useEffect(() => { listPetugas().then(setPetugas); }, []);

  const skorPct = (p: number) => (p >= 0.95 ? 5 : p >= 0.8 ? 4 : p >= 0.6 ? 3 : p >= 0.4 ? 2 : 1);

  // Isi otomatis dari data: absensi vs jadwal (C1), penugasan harian (C2), tugas khusus (bonus/penalti)
  const isiOtomatis = async () => {
    if (!dipilih) return;
    setMemuatOto(true);
    try {
      const awal = `${periode}-01-01`, akhir = `${periode}-12-31`;

      // --- absensi vs jadwal shift ---
      // filter tanggal di kode — where + range beda field butuh composite index
      const dlm = (t: string) => t >= awal && t <= akhir;
      const [absSnap, jadSnap] = await Promise.all([
        getDocs(query(collection(db, "absensi"), where("petugas_id", "==", dipilih.id))),
        getDocs(query(collection(db, "jadwal_shift"), where("petugas_id", "==", dipilih.id))),
      ]);
      const rows = absSnap.docs.map((d) => d.data()).filter((r) => dlm(r.tanggal || ""));
      const hariKerja = jadSnap.docs.filter((d) => {
        const j = d.data();
        return j.shift !== "libur" && dlm(j.tanggal || "");
      }).length;

      const perTanggal: Record<string, Set<string>> = {};
      rows.forEach((r) => {
        (perTanggal[r.tanggal] = perTanggal[r.tanggal] || new Set()).add(r.jenis);
      });
      const hariMasuk = Object.keys(perTanggal).filter((t) => perTanggal[t].has("masuk"));
      const hariLengkap = hariMasuk.filter((t) =>
        perTanggal[t].has("pulang") && perTanggal[t].has("istirahat_mulai") && perTanggal[t].has("istirahat_selesai")
      );

      const masuk = rows.filter((r) => r.jenis === "masuk");
      const pctHadir = hariKerja ? hariMasuk.length / hariKerja : hariMasuk.length ? 1 : 0;
      const pctTepat = masuk.length ? masuk.filter((r) => (r.telat_menit ?? 0) <= 5).length / masuk.length : 0;
      const pctLengkap = hariMasuk.length ? hariLengkap.length / hariMasuk.length : 0;

      // --- penugasan harian: wajib selesai di tanggalnya ---
      const tSnap = await getDocs(query(collection(db, "penugasan"),
        where("petugas_id", "==", dipilih.id)));
      const tugasAll = tSnap.docs.map((d) => d.data()).filter((t) => dlm(t.tanggal_tugas || ""));
      const tugasSelesai = tugasAll.filter((t) => t.status === "selesai").length;
      const pctTugas = tugasAll.length ? tugasSelesai / tugasAll.length : 0;

      // --- tugas khusus: selesai = +poin, belum selesai = −poin ---
      const ns = await getDocs(query(collection(db, "notifikasi"), where("jenis", "==", "tugas_khusus")));
      let tkSelesai = 0, tkPoin = 0, tkGagal = 0, tkMinus = 0;
      ns.docs.forEach((d) => {
        const n = d.data();
        const miliknya = n.target_petugas_id === dipilih.id || (n.target === "regu" && n.target_regu === dipilih.regu);
        if (!miliknya) return;
        if (n.status === "selesai") { tkSelesai++; tkPoin += n.poin || 0; }
        else { tkGagal++; tkMinus += n.poin || 0; }
      });

      setSkor((s) => ({
        ...s,
        C1: [skorPct(pctHadir), skorPct(pctTepat), skorPct(pctTepat), s.C1[3], skorPct(pctLengkap)],
        C2: [skorPct(pctTugas), skorPct(pctTugas), skorPct(pctTugas), s.C2[3], s.C2[4]],
      }));
      const netBonus = tkPoin - tkMinus; // tugas khusus belum selesai mengurangi nilai
      setBonus(netBonus);
      setOtomasi({
        absen: hariMasuk.length, terjadwal: hariKerja,
        tepat: Math.round(pctTepat * 100), lengkap: Math.round(pctLengkap * 100),
        tugasSelesai, tugasTotal: tugasAll.length,
        tkSelesai, tkPoin, tkGagal, tkMinus,
      });
    } catch (e) {
      setPesan(`Gagal membaca data: ${e instanceof Error ? e.message : e}`);
    } finally {
      setMemuatOto(false);
    }
  };

  const hasil = useMemo(() => hitungSMART(skor), [skor]);

  const setSkorIndikator = (kode: string, idx: number, v: SkorIndikator) => {
    setSkor((s) => {
      const arr = [...(s[kode] || [])];
      arr[idx] = v;
      return { ...s, [kode]: arr };
    });
  };

  const simpan = async () => {
    if (!dipilih || !profil) return;
    setSibuk(true);
    setPesan("");
    try {
      const skorFlat: Record<string, SkorIndikator> = {};
      const alasan: Record<string, string> = {};
      for (const k of KRITERIA) {
        skor[k.kode].forEach((s, i) => {
          skorFlat[`${k.kode.toLowerCase()}i${i + 1}`] = s;
          if (s === "tidak_dinilai") alasan[`${k.kode.toLowerCase()}i${i + 1}`] = "tidak dapat diamati periode ini";
        });
      }

      const nilai = await addDoc(collection(db, "penilaian"), {
        petugas_id: dipilih.id,
        nama_petugas: dipilih.nama,
        penilai_id: profil.uid,
        periode,
        skor: skorFlat,
        alasan_tidak_dinilai: alasan,
        catatan_penilai: catatan,
        status: "final",
        dibuat_pada: serverTimestamp(),
      });

      const nilaiDenganBonus = Math.min(100, Math.max(0, Math.round((hasil.nilaiAkhir + bonus) * 100) / 100));
      await setDoc(doc(db, "nilai_akhir", `${dipilih.id}_${periode}`), {
        penilaian_id: nilai.id,
        petugas_id: dipilih.id,
        nama_petugas: dipilih.nama,
        periode,
        nilai_kriteria: hasil.nilaiKriteria,
        bobot_ternormalisasi: hasil.bobotTernormalisasi,
        utilitas: hasil.utilitas,
        nilai_akhir: nilaiDenganBonus,
        nilai_smart: hasil.nilaiAkhir,
        bonus_tugas_khusus: bonus,
        sumber: "manual",
        dihitung_pada: serverTimestamp(),
      });

      setPesan(`✓ Penilaian ${dipilih.nama} tersimpan — SMART ${hasil.nilaiAkhir}${bonus !== 0 ? ` ${bonus > 0 ? "+" : "−"}${Math.abs(bonus)} bonus tugas khusus` : ""} = ${nilaiDenganBonus}`);
    } catch (e) {
      setPesan(`Gagal: ${e instanceof Error ? e.message : e}`);
    } finally {
      setSibuk(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 className="page-title">Penilaian SMART</h1>
      <p className="page-sub">
        Skor 1–5 per indikator berdasarkan bukti. Nilai akhir dihitung otomatis — tanpa hitung manual.
      </p>

      {/* Pilih petugas + periode */}
      <div className="card3d" style={{ marginTop: 16, padding: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>PETUGAS</label>
          <select
            style={{ width: "100%", marginTop: 4, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 14 }}
            value={dipilih?.id || ""}
            onChange={(e) => setDipilih(petugas.find((p) => p.id === e.target.value) || null)}
          >
            <option value="">— Pilih petugas —</option>
            {petugas.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>PERIODE (12 BULAN)</label>
          <input
            type="number" min={2020} max={2100} value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            style={{ display: "block", marginTop: 4, width: 120, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 14 }}
          />
        </div>
        {dipilih && (
          <div className="card3d-inset" style={{ padding: "10px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 10.5, color: "var(--text-muted)", fontWeight: 700 }}>NILAI AKHIR</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: hasil.nilaiAkhir >= 75 ? "var(--green-deep)" : hasil.nilaiAkhir >= 50 ? "var(--orange-deep)" : "var(--danger)" }}>
              {hasil.nilaiAkhir}
            </div>
            {bonus !== 0 && (
              <div style={{ fontSize: 11, fontWeight: 800, color: bonus > 0 ? "var(--green-deep)" : "var(--danger)" }}>
                {bonus > 0 ? "+" : "−"}{Math.abs(bonus)} tugas khusus → {Math.min(100, Math.max(0, hasil.nilaiAkhir + bonus))}
              </div>
            )}
          </div>
        )}
        {dipilih && (
          <button className="btn3d green" style={{ padding: "10px 16px", fontSize: 13, whiteSpace: "nowrap" }} disabled={memuatOto} onClick={isiOtomatis}>
            {memuatOto ? "Membaca data…" : "✨ Isi otomatis dari data"}
          </button>
        )}
      </div>

      {otomasi && (
        <div className="card3d-inset" style={{ marginTop: 12, padding: "10px 16px", fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.7 }}>
          Data {periode}: hadir <b>{otomasi.absen}{otomasi.terjadwal ? `/${otomasi.terjadwal}` : ""} hari</b> •
          tepat waktu <b>{otomasi.tepat}%</b> • absen lengkap <b>{otomasi.lengkap}%</b> •
          tugas harian selesai <b>{otomasi.tugasSelesai}/{otomasi.tugasTotal}</b> •
          tugas khusus: <b>{otomasi.tkSelesai} selesai (+{otomasi.tkPoin})</b>
          {otomasi.tkGagal > 0 && <> / <b style={{ color: "var(--danger)" }}>{otomasi.tkGagal} belum selesai (−{otomasi.tkMinus})</b></>}
          {" "}— C1 &amp; C2 terisi otomatis, silakan tinjau ulang.
        </div>
      )}

      {dipilih && (
        <>
          {KRITERIA.map((k) => (
            <div key={k.kode} className="card3d" style={{ marginTop: 14, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 6 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>
                  {k.kode} — {k.nama}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  bobot {k.bobot}% • nilai {hasil.nilaiKriteria[k.kode]?.toFixed(2) ?? "-"}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                {k.indikator.map((ind, i) => {
                  const val = skor[k.kode][i];
                  return (
                    <div key={i} className="card3d-inset" style={{ padding: "10px 12px" }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>
                        {i + 1}. {ind}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {SKALA.map((s) => (
                          <button
                            key={s.skor}
                            onClick={() => setSkorIndikator(k.kode, i, s.skor)}
                            title={s.kategori}
                            style={{
                              width: 40, height: 40, borderRadius: 10, border: "none",
                              fontWeight: 800, fontSize: 15, cursor: "pointer",
                              color: val === s.skor ? "#fff" : "var(--text-muted)",
                              background: val === s.skor
                                ? s.skor >= 4 ? "var(--green)" : s.skor === 3 ? "var(--orange)" : "var(--danger)"
                                : "var(--surface-2)",
                              boxShadow: val === s.skor ? "0 3px 0 rgba(0,0,0,0.25)" : "0 2px 0 var(--border)",
                              transform: val === s.skor ? "translateY(0)" : undefined,
                            }}
                          >
                            {s.skor}
                          </button>
                        ))}
                        <button
                          onClick={() => setSkorIndikator(k.kode, i, "tidak_dinilai")}
                          title="Tidak dinilai — indikator tidak dapat diamati periode ini"
                          style={{
                            padding: "0 12px", height: 40, borderRadius: 10,
                            border: val === "tidak_dinilai" ? "2px solid var(--orange-deep)" : "1px solid var(--border)",
                            background: "var(--surface)", color: "var(--text-muted)",
                            fontSize: 11.5, fontWeight: 700, cursor: "pointer",
                          }}
                        >
                          Tidak dinilai
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="card3d" style={{ marginTop: 14, padding: 18 }}>
            <label style={{ fontSize: 13, fontWeight: 700 }}>Catatan penilai (opsional)</label>
            <textarea
              value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2}
              style={{ width: "100%", marginTop: 6, padding: 12, borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontSize: 14, fontFamily: "inherit" }}
            />
            {pesan && (
              <div style={{ marginTop: 10, fontSize: 13.5, fontWeight: 700, color: pesan.startsWith("✓") ? "var(--green-deep)" : "var(--danger)" }}>
                {pesan}
              </div>
            )}
            <button className="btn3d" style={{ marginTop: 12 }} disabled={sibuk} onClick={simpan}>
              {sibuk ? "Menyimpan…" : `Simpan Penilaian — Nilai Akhir ${hasil.nilaiAkhir}`}
            </button>
          </div>
        </>
      )}

      {!dipilih && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 40 }}>
          <LoadingScreen label="Pilih Petugas untuk Menilai" />
        </div>
      )}
    </div>
  );
}
