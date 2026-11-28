// Skrip satu kali: ganti nama "Petugas PPSU 01..25" → nama orang + NIAP.
// Jalankan: node scripts/rename-petugas.mjs
// Membaca FIREBASE_SERVICE_ACCOUNT dari .env (root project).

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(root, ".env"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);

initializeApp({ credential: cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)) });
const db = getFirestore();
const auth = getAuth();

// 15 laki-laki + 10 perempuan
const NAMA_BARU = [
  "Sigit Prasetyo", "Iwan Setiawan", "Ahmad Fauzi", "Budi Santoso", "Agus Riyanto",
  "Dedi Kurniawan", "Eko Prasetyo", "Joko Susilo", "Hendra Wijaya", "Slamet Riyadi",
  "Supriyanto", "Muhammad Ridwan", "Fajar Ramadhan", "Ilham Saputra", "Yanto Hermawan",
  "Siti Aminah", "Dewi Lestari", "Ratna Sari", "Sri Wahyuni", "Nur Hidayah",
  "Rina Marlina", "Wati Setiawati", "Endang Lestari", "Yuni Astuti", "Fitri Rahmawati",
];

const snap = await db.collection("users").where("peran", "==", "petugas_ppsu").get();
const semua = snap.docs.map((d) => ({ id: d.id, email: d.data().email || "", namaLama: d.data().nama || "" }));

// akun non-ppsuXX (tes lama) → nonaktifkan supaya daftar personel bersih
const tes = semua.filter((d) => !/^ppsu\d+@ppsu\.id$/.test(d.email));
for (const t of tes) {
  await db.collection("users").doc(t.id).update({ aktif: false });
  console.log(`– Nonaktifkan akun tes: ${t.email} (${t.namaLama})`);
}

const docs = semua
  .filter((d) => /^ppsu\d+@ppsu\.id$/.test(d.email))
  .sort((a, b) => {
    const na = parseInt(a.email.match(/(\d+)/)?.[1] || "999");
    const nb = parseInt(b.email.match(/(\d+)/)?.[1] || "999");
    return na - nb || a.email.localeCompare(b.email);
  });

if (docs.length > NAMA_BARU.length) {
  console.error(`Ada ${docs.length} petugas, hanya ${NAMA_BARU.length} nama tersedia — periksa dulu.`);
  process.exit(1);
}

for (let i = 0; i < docs.length; i++) {
  const d = docs[i];
  const nama = NAMA_BARU[i];
  const niap = `PPSU-DS-${String(i + 1).padStart(3, "0")}`;
  await db.collection("users").doc(d.id).update({ nama, niap });
  await auth.updateUser(d.id, { displayName: nama }).catch(() => {});
  console.log(`✓ ${d.email} → ${nama} (${niap})  [sebelumnya: ${d.namaLama}]`);
}
console.log(`\nSelesai — ${docs.length} akun petugas diperbarui.`);
process.exit(0);
