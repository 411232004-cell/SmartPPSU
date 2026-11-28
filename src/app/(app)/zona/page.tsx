"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  listPetugas, updatePetugas, Petugas,
  buatNotifikasi, subscribeNotifikasi, Notif, pastikanZonaDefault,
} from "@/lib/data";
import { REGU, namaRegu } from "@/lib/regu";
import { auth } from "@/lib/firebase";
import { inputStyleDark as inputStyle } from "@/lib/ui";

export default function ZonaPage() {
  const { profil } = useAuth();
  const isAdmin = profil?.peran === "kasi_ekbang";
  const [petugas, setPetugas] = useState<Petugas[]>([]);
  const [pesan, setPesan] = useState("");

  const muat = useCallback(async () => {
    if (isAdmin) pastikanZonaDefault().catch(() => {});
    try {
      setPetugas(await listPetugas());
    } catch (e) {
      console.error("Gagal memuat daftar petugas:", e);
    }
  }, [isAdmin]);
  useEffect(() => { muat(); }, [muat]);

  const assign = async (petugasId: string, regu: string) => {
    if (!petugasId) return;
    await updatePetugas(petugasId, { regu });
    setPesan("✓ Regu diperbarui.");
    muat();
  };

  const aktif = petugas.filter((p) => p.aktif);
  const tanpaRegu = aktif.filter((p) => !p.regu || !REGU.some((r) => r.id === p.regu));

  // --- tugas khusus & edaran (admin) ---
  const [mode, setMode] = useState<"semua" | "regu" | "personel">("semua");
  const [reguTgt, setReguTgt] = useState(REGU[0].id);
  const [personelTgt, setPersonelTgt] = useState("");
  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [poin, setPoin] = useState(10);
  const [sibukKirim, setSibukKirim] = useState(false);
  const [tugasAktif, setTugasAktif] = useState<Notif[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    return subscribeNotifikasi((rows) =>
      setTugasAktif(rows.filter((n) => n.jenis === "tugas_khusus" && n.status !== "selesai"))
    );
  }, [isAdmin]);

  const kirim = async () => {
    if (!judul.trim() || !profil) return;
    if (mode === "personel" && !personelTgt) return;
    setSibukKirim(true);
    try {
      const edaran = mode === "semua";
      await buatNotifikasi({
        jenis: edaran ? "edaran" : "tugas_khusus",
        target: mode,
        target_regu: mode === "regu" ? reguTgt : undefined,
        target_petugas_id: mode === "personel" ? personelTgt : undefined,
        judul: judul.trim(),
        deskripsi: deskripsi.trim(),
        poin: edaran ? 0 : poin,
        dibuat_oleh: profil.uid,
        nama_pembuat: profil.nama,
      });
      setPesan(edaran ? "✓ Surat edaran terkirim ke seluruh PPSU." : "✓ Tugas khusus terkirim & target bebas GPS.");
      setJudul(""); setDeskripsi("");
      // kirim push notification ke device target (bunyi walau aplikasi tertutup)
      const idToken = await auth.currentUser?.getIdToken();
      if (idToken) {
        fetch("/api/push", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({
            judul: edaran ? `Edaran: ${judul.trim()}` : `Tugas khusus: ${judul.trim()}`,
            deskripsi: deskripsi.trim(),
            target: mode,
            target_petugas_id: mode === "personel" ? personelTgt : undefined,
            target_regu: mode === "regu" ? reguTgt : undefined,
          }),
        }).catch(() => {});
      }
    } catch (e) {
      setPesan(`Gagal mengirim: ${e instanceof Error ? e.message : e}`);
    } finally {
      setSibukKirim(false);
    }
  };

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
                      .filter((p) => !p.regu)
                      .map((p) => (
                        <option key={p.id} value={p.id}>{p.nama}</option>
                      ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>

        {isAdmin && (
          <div className="zona-card" style={{ marginTop: 20 }}>
            <div className="zona-card-head">
              <div>
                <div className="zona-name">Tugas Khusus &amp; Surat Edaran</div>
                <div className="zona-wilayah">Kirim penugasan atau pengumuman — notif masuk ke petugas</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              {([
                ["semua", "Semua PPSU (Edaran)"],
                ["regu", "Per Regu/Zona"],
                ["personel", "Per Personel"],
              ] as const).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`zona-tgt-btn${mode === m ? " active" : ""}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === "regu" && (
              <select style={{ ...inputStyle, marginBottom: 10 }} value={reguTgt} onChange={(e) => setReguTgt(e.target.value)}>
                {REGU.map((r) => (
                  <option key={r.id} value={r.id}>{r.nama} — {r.wilayah}</option>
                ))}
              </select>
            )}
            {mode === "personel" && (
              <select style={{ ...inputStyle, marginBottom: 10 }} value={personelTgt} onChange={(e) => setPersonelTgt(e.target.value)}>
                <option value="">— Pilih personel —</option>
                {aktif.map((p) => (
                  <option key={p.id} value={p.id}>{p.nama} ({namaRegu(p.regu)})</option>
                ))}
              </select>
            )}

            <input
              style={{ ...inputStyle, marginBottom: 10 }}
              placeholder={mode === "semua" ? "Judul edaran…" : "Judul tugas khusus…"}
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
            />
            <textarea
              style={{ ...inputStyle, minHeight: 70, resize: "vertical", marginBottom: 10 }}
              placeholder="Deskripsi / isi pengumuman…"
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
            />
            {mode !== "semua" && (
              <label className="zona-field-label" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
                Poin bonus saat selesai:
                <input
                  type="number" min={0} max={50} value={poin}
                  onChange={(e) => setPoin(Number(e.target.value) || 0)}
                  style={{ ...inputStyle, width: 80 }}
                />
              </label>
            )}
            <button
              className="btn3d"
              style={{ width: "100%", padding: "11px 16px" }}
              disabled={sibukKirim || !judul.trim() || (mode === "personel" && !personelTgt)}
              onClick={kirim}
            >
              {sibukKirim ? "Mengirim…" : mode === "semua" ? "Kirim Surat Edaran ke Semua PPSU" : "Kirim Tugas Khusus"}
            </button>

            {tugasAktif.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div className="zona-list-label" style={{ fontSize: 11, fontWeight: 800, marginBottom: 6 }}>
                  TUGAS KHUSUS BERJALAN
                </div>
                {tugasAktif.map((n) => (
                  <div key={n.id} className="zona-members" style={{ marginBottom: 6 }}>
                    <span className="zona-chip" style={{ fontSize: 11.5 }}>
                      {n.judul} → {n.target === "personel" ? petugas.find((p) => p.id === n.target_petugas_id)?.nama || "personel" : namaRegu(n.target_regu)}
                      {" "}• {n.status === "diterima" ? `diterima ${n.diterima_oleh || ""}` : "menunggu ACC"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
