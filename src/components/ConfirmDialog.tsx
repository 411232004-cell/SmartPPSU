"use client";

import { useState } from "react";

/**
 * Dialog konfirmasi custom — pengganti confirm() bawaan browser.
 * Pakai: const { tanya, dialog } = useConfirmDialog();
 *        if (await tanya("Judul", "Pesan…")) { ... }
 *        render {dialog} di akhir JSX.
 */
export function useConfirmDialog() {
  const [req, setReq] = useState<{
    judul: string;
    pesan: string;
    okLabel?: string;
    bahaya?: boolean;
    resolve: (v: boolean) => void;
  } | null>(null);

  const tanya = (
    judul: string,
    pesan: string,
    opt?: { okLabel?: string; bahaya?: boolean }
  ) =>
    new Promise<boolean>((resolve) =>
      setReq({ judul, pesan, okLabel: opt?.okLabel, bahaya: opt?.bahaya, resolve })
    );

  const tutup = (v: boolean) => {
    req?.resolve(v);
    setReq(null);
  };

  const dialog = req ? (
    <div className="konf-backdrop" onClick={() => tutup(false)}>
      <div className="konf-card" onClick={(e) => e.stopPropagation()}>
        <div className="konf-head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/logo-sm.png" alt="" width={40} height={40} style={{ borderRadius: "50%" }} />
          <div className="konf-judul">{req.judul}</div>
        </div>
        <div className="konf-pesan">{req.pesan}</div>
        <div className="konf-aksi">
          <button className="btn3d ghost" onClick={() => tutup(false)}>Batal</button>
          <button
            className={`btn3d${req.bahaya ? " konf-bahaya" : ""}`}
            onClick={() => tutup(true)}
          >
            {req.okLabel || "Ya, lanjutkan"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { tanya, dialog };
}
