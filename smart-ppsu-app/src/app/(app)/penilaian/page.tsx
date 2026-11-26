"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, addDoc, setDoc, doc, serverTimestamp } from "firebase/firestore";
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

  useEffect(() => { listPetugas().then(setPetugas); }, []);

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

      await setDoc(doc(db, "nilai_akhir", `${dipilih.id}_${periode}`), {
        penilaian_id: nilai.id,
        petugas_id: dipilih.id,
        nama_petugas: dipilih.nama,
        periode,
        nilai_kriteria: hasil.nilaiKriteria,
        bobot_ternormalisasi: hasil.bobotTernormalisasi,
        utilitas: hasil.utilitas,
        nilai_akhir: hasil.nilaiAkhir,
        dihitung_pada: serverTimestamp(),
      });

      setPesan(`✓ Penilaian ${dipilih.nama} tersimpan — Nilai akhir SMART: ${hasil.nilaiAkhir}`);
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
          </div>
        )}
      </div>

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
