"use client";

import { isSupported, getMessaging, getToken } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";
import app, { db } from "./firebase";

export type PushStatus = "unsupported" | "no_vapid" | "denied" | "aktif" | "error";

export function izinNotif(): "default" | "granted" | "denied" | "unsupported" {
  return typeof Notification === "undefined" ? "unsupported" : Notification.permission;
}

// Daftarkan device ke FCM supaya notifikasi bunyi walau aplikasi tertutup.
// Panggil dari gestur pengguna (klik) — requestPermission butuh itu di mobile.
export async function daftarkanPush(uid: string): Promise<PushStatus> {
  try {
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) {
      return "unsupported";
    }
    if (!(await isSupported())) return "unsupported";

    const izin = await Notification.requestPermission();
    if (izin !== "granted") return "denied";

    const vapid = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapid) return "no_vapid";

    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const token = await getToken(getMessaging(app), {
      vapidKey: vapid,
      serviceWorkerRegistration: reg,
    });
    if (!token) return "error";
    await setDoc(doc(db, "users", uid), { fcm_token: token }, { merge: true });
    return "aktif";
  } catch (e) {
    console.warn("[push] gagal mendaftar:", e);
    return "error";
  }
}
