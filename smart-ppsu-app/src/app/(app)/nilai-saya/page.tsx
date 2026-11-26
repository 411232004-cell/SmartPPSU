"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { KRITERIA } from "@/lib/penilaian";
import { useAuth } from "@/lib/auth";

interface Nilai {
  periode: string;
  nilai_akhir: number;
  nilai_kriteria: Record<string, number | null>;
  dihitung_pada?: { toDate: () => Date };
}

export default function NilaiSayaPage() {
  const { profil } = useAuth();
  const [list, setList] = useState<Nilai[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profil) return;
    getDocs(query(collection(db, "nilai_akhir"), where("petugas_id", "==", profil.uid)))
      .then((snap) => {
        setList(
          snap.docs.map((d) => d.data() as Nilai)
            .sort((a, b) => b.periode.localeCompare(a.periode))
        );
        setLoading(false);
      });
  }, [profil]);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h1 className="page-title">Nilai Kinerja Saya</h1>
      <p className="page-sub">Hasil penilaian SMART per periode (12 bulan) dari Kasi Ekbang.</p>

      {loading && <div className="card3d" style={{ marginTop: 16, padding: 20, fontSize: 13, color: "var(--text-muted)" }}>Memuat…</div>}

      {!loading && list.length === 0 && (
        <div className="card3d" style={{ marginTop: 16, padding: 20, fontSize: 14, color: "var(--text-muted)" }}>
          Belum ada hasil penilaian. Nilai muncul setelah Kasi Ekbang menilai periode berjalan.
        </div>
      )}

      {list.map((n) => (
        <div key={n.periode} className="card3d" style={{ marginTop: 14, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Periode {n.periode}</div>
            <div style={{
              fontSize: 26, fontWeight: 800,
              color: n.nilai_akhir >= 75 ? "var(--green-deep)" : n.nilai_akhir >= 50 ? "var(--orange-deep)" : "var(--danger)",
            }}>
              {n.nilai_akhir}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 12 }}>
            {KRITERIA.map((k) => {
              const v = n.nilai_kriteria?.[k.kode];
              return (
                <div key={k.kode} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, fontSize: 12, fontWeight: 800, color: "var(--orange-deep)" }}>{k.kode}</div>
                  <div style={{ flex: 1, fontSize: 12.5, color: "var(--text-muted)" }}>{k.nama}</div>
                  <div style={{ width: 44, textAlign: "right", fontSize: 13, fontWeight: 800 }}>
                    {v !== null && v !== undefined ? v.toFixed(2) : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
