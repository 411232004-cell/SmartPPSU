"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { listPetugas, updatePetugas, Petugas } from "@/lib/data";
import { REGU } from "@/lib/regu";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.25)", background: "rgba(0,0,0,0.3)",
  color: "#fff", fontSize: 12.5, fontFamily: "inherit",
};

export default function ZonaPage() {
  const { profil } = useAuth();
  const isAdmin = profil?.peran === "kasi_ekbang";
  const [petugas, setPetugas] = useState<Petugas[]>([]);
  const [pesan, setPesan] = useState("");

  const muat = async () => setPetugas(await listPetugas());
  useEffect(() => { muat(); }, []);

  const assign = async (petugasId: string, regu: string) => {
    if (!petugasId) return;
    await updatePetugas(petugasId, { regu });
    setPesan("✓ Regu diperbarui.");
    muat();
  };

  const aktif = petugas.filter((p) => p.aktif);
  const tanpaRegu = aktif.filter((p) => !p.regu || !REGU.some((r) => r.id === p.regu));

  return (
    <div className="zona-page">
      <div className="zona-inner">
        <h1 className="zona-title">Regu &amp; Zona Tugas</h1>
        <p className="zona-sub">
          Pembagian regu PPSU Kelurahan Duri Selatan — 6 zona RW + regu khusus.
          {isAdmin ? " Kamu bisa memasukkan petugas ke regu lewat kartu di bawah." : ""}
        </p>

        {pesan && (
          <div className="zona-card" style={{ padding: "10px 16px", marginBottom: 14, fontSize: 13, fontWeight: 600, color: "#9be8b8" }}>
            {pesan}
          </div>
        )}

        <div className="zona-grid">
          {REGU.map((r) => {
            const members = aktif.filter((p) => p.regu === r.id);
            const isMine = profil?.regu === r.id;
            return (
              <div key={r.id} className={`zona-card${isMine ? " mine" : ""}`}>
                <div className="zona-card-head">
                  <div>
                    <div className="zona-name">{r.nama}</div>
                    <div className="zona-wilayah">{r.wilayah}</div>
                  </div>
                  {isMine && <span className="zona-badge">Regu kamu</span>}
                </div>
                <p className="zona-desc">{r.deskripsi}</p>

                <div className="zona-members">
                  {members.map((m) => (
                    <span key={m.id} className="zona-chip">
                      {m.nama}
                      {isAdmin && (
                        <button
                          type="button"
                          className="zona-chip-x"
                          aria-label={`Keluarkan ${m.nama} dari ${r.nama}`}
                          onClick={() => assign(m.id, "")}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                  {members.length === 0 && (
                    <span className="zona-empty">Belum ada anggota</span>
                  )}
                </div>

                {isAdmin && (
                  <select
                    style={inputStyle}
                    value=""
                    onChange={(e) => { assign(e.target.value, r.id); e.target.value = ""; }}
                  >
                    <option value="">＋ Tambah anggota…</option>
                    {aktif
                      .filter((p) => p.regu !== r.id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>{p.nama}</option>
                      ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>

        {isAdmin && tanpaRegu.length > 0 && (
          <div className="zona-card" style={{ marginTop: 18 }}>
            <div className="zona-card-head">
              <div>
                <div className="zona-name">Belum masuk regu</div>
                <div className="zona-wilayah">{tanpaRegu.length} petugas</div>
              </div>
            </div>
            <div className="zona-members">
              {tanpaRegu.map((p) => (
                <span key={p.id} className="zona-chip dim">{p.nama}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
