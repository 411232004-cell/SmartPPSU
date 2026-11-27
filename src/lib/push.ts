"use client";

import { isSupported, getMessaging, getToken } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";
import app, { db } from "./firebase";

// Daftarkan device ke FCM supaya notifikasi bunyi walau aplikasi tertutup.
// Dipanggil sekali setelah login — meminta izin notifikasi ke pengguna.
export async function daftarkanPush(uid: string) {
  try {
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) {
      console.warn("[push] browser tidak mendukung notifikasi/SW — wajib HTTPS atau localhost");
      return;
    }
    if (!(await isSupported())) {
      console.warn("[push] FCM tidak didukung browser ini");
      return;
    }

    const izin = await Notification.requestPermission();
    if (izin !== "granted") {
      console.warn(`[push] izin notifikasi: ${izin} — aktifkan di pengaturan situs browser`);
      return;
    }

    const vapid = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapid) {
      console.warn("[push] NEXT_PUBLIC_FIREBASE_VAPID_KEY belum diset");
      return;
    }

    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const token = await getToken(getMessaging(app), {
      vapidKey: vapid,
      serviceWorkerRegistration: reg,
    });
    if (token) {
      await setDoc(doc(db, "users", uid), { fcm_token: token }, { merge: true });
      console.log("[push] token FCM tersimpan");
    } else {
      console.warn("[push] getToken mengembalikan kosong");
    }
  } catch (e) {
    console.warn("[push] gagal mendaftar:", e);
  }
}
