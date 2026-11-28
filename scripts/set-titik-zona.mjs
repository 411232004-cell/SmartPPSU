// Skrip satu kali: isi titik pusat semua zona dengan koordinat hasil geocoding
// Nominatim/OSM (batas administrasi resmi) — Kelurahan Duri Selatan, Tambora.
// Jalankan: node scripts/set-titik-zona.mjs
// Membaca FIREBASE_SERVICE_ACCOUNT dari .env (root project).

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(root, ".env"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);

initializeApp({ credential: cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore();

// Koordinat: centroid batas administrasi RW (OSM) + alamat kantor kelurahan
const TITIK = {
  rw_01: { lat: -6.1575635, lng: 106.8062638, radius: 250 },
  rw_02: { lat: -6.1601024, lng: 106.8063217, radius: 250 },
  rw_03: { lat: -6.1605226, lng: 106.8041146, radius: 250 },
  rw_04: { lat: -6.1604209, lng: 106.8023792, radius: 250 },
  rw_05: { lat: -6.1586222, lng: 106.8024047, radius: 250 },
  rw_06: { lat: -6.1579815, lng: 106.8034697, radius: 250 },
  // Jl. Duri Selatan VIII No. 9 — kantor kelurahan
  kantor: { lat: -6.1579545, lng: 106.8034572, radius: 150 },
  // pusat wilayah kelurahan (cakupan kerja seluruh RW)
  kelurahan: { lat: -6.1587842, lng: 106.8046704, radius: 650 },
};

for (const [id, t] of Object.entries(TITIK)) {
  await db.collection("zona").doc(id).set(
    { titik_pusat: { lat: t.lat, lng: t.lng }, radius_meter: t.radius },
    { merge: true }
  );
  console.log(`✓ ${id} → ${t.lat}, ${t.lng} (r=${t.radius}m)`);
}
console.log("\nSelesai — semua titik zona diperbarui dari data geocoding OSM.");
process.exit(0);
