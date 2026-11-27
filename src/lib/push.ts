"use client";

import { isSupported, getMessaging, getToken } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";
import app, { db } from "./firebase";

// Daftarkan device ke FCM supaya notifikasi bunyi walau aplikasi tertutup.
// Dipanggil sekali setelah login — meminta izin notifikasi ke pengguna.
export async function daftarkanPush(uid: string) {
  try {
    if (!(await isSupported()) || typeof Notification === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const izin = await Notification.requestPermission();
    if (izin !== "granted") return;

    const vapid = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapid) return; // belum diset — push dimatikan diam-diam

    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const token = await getToken(getMessaging(app), {
      vapidKey: vapid,
      serviceWorkerRegistration: reg,
    });
    if (token) {
      await setDoc(doc(db, "users", uid), { fcm_token: token }, { merge: true });
    }
  } catch {
    // push opsional — kegagalan tidak boleh mengganggu app
  }
}
