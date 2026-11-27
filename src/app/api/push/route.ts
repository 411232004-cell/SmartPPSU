import { NextRequest, NextResponse } from "next/server";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function initAdmin() {
  if (!getApps().length) {
    const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!sa) throw new Error("Env FIREBASE_SERVICE_ACCOUNT belum diset");
    initializeApp({ credential: cert(JSON.parse(sa)) });
  }
}

export async function POST(req: NextRequest) {
  try {
    initAdmin();
    const idToken = req.headers.get("authorization")?.replace("Bearer ", "").trim();
    if (!idToken) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const decoded = await getAuth().verifyIdToken(idToken);
    const dbx = getFirestore();
    const caller = await dbx.collection("users").doc(decoded.uid).get();
    if (caller.data()?.peran !== "kasi_ekbang") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { judul, deskripsi, target, target_petugas_id, target_regu } = await req.json();
    const users = await dbx.collection("users").where("peran", "==", "petugas_ppsu").get();
    const tokens: string[] = [];
    users.docs.forEach((d) => {
      const u = d.data();
      const cocok =
        target === "semua" ||
        d.id === target_petugas_id ||
        (target === "regu" && u.regu === target_regu);
      if (cocok && u.fcm_token) tokens.push(u.fcm_token);
    });
    if (!tokens.length) return NextResponse.json({ ok: true, terkirim: 0 });

    const res = await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title: judul || "Smart PPSU", body: deskripsi || "" },
      data: { url: "/notifikasi" },
      webpush: { fcmOptions: { link: "/notifikasi" } },
    });
    return NextResponse.json({ ok: true, terkirim: res.successCount, gagal: res.failureCount });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
