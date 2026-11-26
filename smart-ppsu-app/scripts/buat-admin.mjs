// Skrip satu kali: buat akun Kasi Ekbang pertama.
// Jalankan: node scripts/buat-admin.mjs "email" "password" "nama"
// Membaca kredensial Firebase dari file .env di root project.

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(root, ".env"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const [email, password, nama] = process.argv.slice(2);
if (!email || !password || !nama) {
  console.error('Pakai: node scripts/buat-admin.mjs "email" "password" "nama"');
  process.exit(1);
}
if (password.length < 6) {
  console.error("Password minimal 6 karakter.");
  process.exit(1);
}

const app = initializeApp({
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

const auth = getAuth(app);
const db = getFirestore(app);

try {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, "users", cred.user.uid), {
    nama,
    email,
    peran: "kasi_ekbang",
    niap: "",
    zona_id: "",
    aktif: true,
    dibuat_pada: serverTimestamp(),
  });
  console.log(`✓ Akun Kasi Ekbang dibuat: ${nama} <${email}> (uid: ${cred.user.uid})`);
  console.log("Silakan login di aplikasi dengan email & password tersebut.");
  process.exit(0);
} catch (e) {
  if (e.code === "auth/email-already-in-use") {
    console.error("Email ini sudah terdaftar. Pakai email lain, atau reset password di Firebase Console.");
  } else {
    console.error(`Gagal: ${e.code || e.message}`);
  }
  process.exit(1);
}
