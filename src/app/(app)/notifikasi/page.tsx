"use client";

import { useEffect, useState } from "react";
import {
  subscribeNotifikasi, Notif, notifUntuk,
  terimaNotif, selesaiNotif, tandaiDibaca,
} from "@/lib/data";
import { namaRegu } from "@/lib/regu";
import { useAuth } from "@/lib/auth";
import LoadingScreen from "@/components/LoadingScreen";

export default function NotifikasiPage() {
  const { profil } = useAuth();
  const [semua, setSemua] = useState<Notif[] | null>(null);
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [pesan, setPesan] = useState("");

  useEffect(() => subscribeNotifikasi(setSemua), []);

  const milikku = (semua || []).filter((n) => profil && notifUntuk(n, profil));

  // tandai semua notif yang ditujukan ke saya sebagai dibaca
  useEffect(() => {
    if (!profil || !semua) return;
    milikku.forEach((n) => {
      if (!n.dibaca_oleh?.includes(profil.uid)) tandaiDibaca(n.id, profil.uid);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil, semua]);

  const aksi = async (n: Notif, jenis: "acc" | "selesai") => {
    if (!profil) return;
    setSibuk(n.id);
    try {
      if (jenis === "acc") {
        await terimaNotif(n.id, profil.nama);
        setPesan(`✓ "${n.judul}" diterima — ${n.target === "regu" ? "berlaku untuk seluruh regu" : ""}`.trim());
      } else {
        await selesaiNotif(n, profil.nama);
        setPesan(`✓ "${n.judul}" selesai — kunci GPS kembali normal & poin dibagikan.`);
      }
    } catch (e) {
      setPesan(`Gagal: ${e instanceof Error ? e.message : e}`);
    } finally {
      setSibuk(null);
    }
  };

  if (semua === null) return <LoadingScreen label="Memuat Notifikasi" />;

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <h1 className="page-title">Notifikasi</h1>
      <p className="page-sub">Surat edaran &amp; tugas khusus dari pimpinan.</p>

      {pesan && (
        <div className="card3d" style={{ marginTop: 12, padding: 10, fontSize: 13, fontWeight: 600, color: "var(--green-deep)" }}>{pesan}</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        {milikku.length === 0 && (
          <div className="card3d" style={{ padding: 22, fontSize: 14, color: "var(--text-muted)", textAlign: "center" }}>
            Belum ada notifikasi untuk Anda.
          </div>
        )}
        {milikku.map((n) => {
          const tugas = n.jenis === "tugas_khusus";
          const selesai = n.status === "selesai";
          const badge = tugas
            ? n.target === "personel" ? "TUGAS KHUSUS — PERSONEL" : `TUGAS KHUSUS — ${namaRegu(n.target_regu)}`
            : "SURAT EDARAN";
          return (
            <div key={n.id} className="card3d" style={{ padding: 16, opacity: selesai ? 0.75 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10 }}>
                <div>
                  <span style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: 0.4,
                    padding: "3px 9px", borderRadius: 7, display: "inline-block",
                    background: tugas ? "var(--orange-soft)" : "var(--surface-2)",
                    color: tugas ? "#fff" : "var(--text-muted)",
                  }}>
                    {badge}
                  </span>
                  <div style={{ fontWeight: 800, fontSize: 15, marginTop: 7 }}>{n.judul}</div>
                  <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 3 }}>{n.deskripsi}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 6 }}>
                    dari {n.nama_pembuat}
                    {tugas && n.poin > 0 ? ` • +${n.poin} poin` : ""}
                    {n.diterima_oleh ? ` • diterima ${n.diterima_oleh}` : ""}
                    {n.diselesaikan_oleh ? ` • selesai oleh ${n.diselesaikan_oleh}` : ""}
                  </div>
                </div>
                {tugas && (
                  <span style={{
                    fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 8,
                    background: "var(--surface-2)", whiteSpace: "nowrap",
                    color: selesai ? "var(--green-deep)" : n.status === "diterima" ? "#c78a00" : "var(--orange-deep)",
                  }}>
                    {selesai ? "SELESAI" : n.status === "diterima" ? "DIKERJAKAN" : "BARU"}
                  </span>
                )}
              </div>
              {tugas && !selesai && (
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  {n.status === "baru" && (
                    <button className="btn3d" style={{ padding: "8px 18px", fontSize: 13 }} disabled={sibuk === n.id} onClick={() => aksi(n, "acc")}>
                      ✋ ACC Tugas
                    </button>
                  )}
                  {n.status === "diterima" && (
                    <button className="btn3d green" style={{ padding: "8px 18px", fontSize: 13 }} disabled={sibuk === n.id} onClick={() => aksi(n, "selesai")}>
                      ✓ Selesai — Kembali ke Zona
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
