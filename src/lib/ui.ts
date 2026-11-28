import type { CSSProperties } from "react";

// Style input terpusat — dipakai form di seluruh halaman agar konsisten.
// Varian gelap dipakai di halaman ber-background foto (mis. zona).

export const inputStyle: CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  border: "1px solid var(--border)", background: "var(--surface)",
  color: "var(--text)", fontSize: 14, fontFamily: "inherit",
};

export const inputStyleDark: CSSProperties = {
  width: "100%", padding: "8px 10px", borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.25)", background: "rgba(0,0,0,0.3)",
  color: "#fff", fontSize: 12.5, fontFamily: "inherit",
};

// Fetch dengan retry + backoff ringan — untuk panggilan API eksternal
// yang rawan gagal sesaat (Nominatim, dsb).
export async function fetchRetry(
  url: string,
  init?: RequestInit,
  percobaan = 2,
): Promise<Response> {
  let err: unknown;
  for (let i = 0; i <= percobaan; i++) {
    try {
      const res = await fetch(url, init);
      if (res.ok || i === percobaan) return res;
    } catch (e) {
      err = e;
    }
    await new Promise((r) => setTimeout(r, 800 * (i + 1)));
  }
  throw err instanceof Error ? err : new Error("Permintaan jaringan gagal");
}
