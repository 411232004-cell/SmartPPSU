import { NextRequest, NextResponse } from "next/server";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue, Firestore } from "firebase-admin/firestore";
import { hitungSMART, SkorIndikator } from "@/lib/penilaian";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function db(): Firestore {
  if (!getApps().length) {
    const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!sa) throw new Error("Env FIREBASE_SERVICE_ACCOUNT belum diset");
    initializeApp({ credential: cert(JSON.parse(sa)) });
  }
  return getFirestore();
}

const skorPct = (p: number) => (p >= 0.95 ? 5 : p >= 0.8 ? 4 : p >= 0.6 ? 3 : p >= 0.4 ? 2 : 1);
const TD: SkorIndikator = "tidak_dinilai";

interface Stat {
  hadir: number; terjadwal: number; pctHadir: number;
  tepat: number; lengkap: number;
  tugasSelesai: number; tugasTotal: number;
  tkSelesai: number; tkGagal: number; bonus: number;
}

/** Statistik petugas dalam rentang tanggal (inklusif). */
async function hitungStat(
  dbx: Firestore, uid: string, regu: string | undefined,
  awal: string, akhir: string
): Promise<Stat> {
  // filter tanggal di kode — kombinasi where + range beda field butuh composite index
  const dlm = (t: string) => t >= awal && t <= akhir;
  const [absSnap, jadSnap, tugasSnap, notifSnap] = await Promise.all([
    dbx.collection("absensi").where("petugas_id", "==", uid).get(),
    dbx.collection("jadwal_shift").where("petugas_id", "==", uid).get(),
    dbx.collection("penugasan").where("petugas_id", "==", uid).get(),
    dbx.collection("notifikasi").where("jenis", "==", "tugas_khusus").get(),
  ]);

  const perTanggal: Record<string, Set<string>> = {};
  let tepatCount = 0, masukCount = 0;
  absSnap.docs.forEach((d) => {
    const r = d.data();
    if (!dlm(r.tanggal || "")) return;
    (perTanggal[r.tanggal] = perTanggal[r.tanggal] || new Set()).add(r.jenis);
    if (r.jenis === "masuk") {
      masukCount++;
      if ((r.telat_menit ?? 0) <= 5) tepatCount++;
    }
  });
  const hariMasuk = Object.keys(perTanggal).filter((t) => perTanggal[t].has("masuk"));
  const hariLengkap = hariMasuk.filter((t) =>
    perTanggal[t].has("pulang") && perTanggal[t].has("istirahat_selesai")
  );

  const hariKerja = jadSnap.docs.filter((d) => {
    const j = d.data();
    return j.shift !== "libur" && dlm(j.tanggal || "");
  }).length;
  const pctHadir = hariKerja ? hariMasuk.length / hariKerja : hariMasuk.length ? 1 : 0;
  const pctTepat = masukCount ? tepatCount / masukCount : 0;
  const pctLengkap = hariMasuk.length ? hariLengkap.length / hariMasuk.length : 0;

  const tugasAll = tugasSnap.docs.map((d) => d.data()).filter((t) => dlm(t.tanggal_tugas || ""));
  const tugasSelesai = tugasAll.filter((t) => t.status === "selesai").length;

  let tkSelesai = 0, tkGagal = 0, poinPlus = 0, poinMinus = 0;
  notifSnap.docs.forEach((d) => {
    const n = d.data();
    if (n.target_petugas_id !== uid && !(n.target === "regu" && n.target_regu === regu)) return;
    if (n.status === "selesai") { tkSelesai++; poinPlus += n.poin || 0; }
    else { tkGagal++; poinMinus += n.poin || 0; }
  });

  return {
    hadir: hariMasuk.length, terjadwal: hariKerja, pctHadir,
    tepat: Math.round(pctTepat * 100), lengkap: Math.round(pctLengkap * 100),
    tugasSelesai, tugasTotal: tugasAll.length,
    tkSelesai, tkGagal, bonus: poinPlus - poinMinus,
  };
}

function skorOtomatis(s: Stat) {
  const pctTugas = s.tugasTotal ? s.tugasSelesai / s.tugasTotal : 0;
  return {
    C1: [skorPct(s.pctHadir), skorPct(s.tepat / 100), skorPct(s.tepat / 100), TD, skorPct(s.lengkap / 100)],
    C2: [skorPct(pctTugas), skorPct(pctTugas), skorPct(pctTugas), TD, TD],
    C3: [TD, TD, TD, TD, TD],
    C4: [TD, TD, TD, TD, TD],
    C5: [TD, TD, TD, TD, TD],
  };
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const dbx = db();
    // tanggal berjalan dalam WIB (UTC+7)
    const wib = new Date(Date.now() + 7 * 3600 * 1000);
    const tahun = wib.getUTCFullYear();
    const periode = `${tahun}`;
    const bulanPrefix = `${tahun}-${String(wib.getUTCMonth() + 1).padStart(2, "0")}`;
    const awalTahun = `${periode}-01-01`;
    const akhirTahun = `${periode}-12-31`;
    const awalBulan = `${bulanPrefix}-01`;
    const akhirBulan = `${bulanPrefix}-31`;

    const users = await dbx.collection("users").where("peran", "==", "petugas_ppsu").get();
    const hasil: Record<string, unknown>[] = [];

    for (const u of users.docs) {
      const d = u.data();
      if (d.aktif === false) continue;

      const [stTahun, stBulan] = await Promise.all([
        hitungStat(dbx, u.id, d.regu, awalTahun, akhirTahun),
        hitungStat(dbx, u.id, d.regu, awalBulan, akhirBulan),
      ]);

      // snapshot bulanan — selalu ditimpa tiap jalan
      await dbx.collection("rekap_otomatis").doc(`${u.id}_${bulanPrefix}`).set({
        petugas_id: u.id,
        nama_petugas: d.nama || "-",
        bulan: bulanPrefix,
        statistik: stBulan,
        dihitung_pada: FieldValue.serverTimestamp(),
      });

      // nilai_akhir tahunan — jangan timpa jika admin sudah simpan manual
      const ref = dbx.collection("nilai_akhir").doc(`${u.id}_${periode}`);
      const cur = await ref.get();
      if (cur.exists && cur.data()?.sumber === "manual") {
        hasil.push({ uid: u.id, status: "dilewati (penilaian manual)" });
        continue;
      }

      const sm = hitungSMART(skorOtomatis(stTahun));
      const nilai = Math.min(100, Math.max(0, Math.round((sm.nilaiAkhir + stTahun.bonus) * 100) / 100));
      await ref.set({
        petugas_id: u.id,
        nama_petugas: d.nama || "-",
        periode,
        nilai_kriteria: sm.nilaiKriteria,
        bobot_ternormalisasi: sm.bobotTernormalisasi,
        utilitas: sm.utilitas,
        nilai_akhir: nilai,
        nilai_smart: sm.nilaiAkhir,
        bonus_tugas_khusus: stTahun.bonus,
        statistik: stTahun,
        sumber: "otomatis",
        dihitung_pada: FieldValue.serverTimestamp(),
      });
      hasil.push({ uid: u.id, nilai_akhir: nilai });
    }

    return NextResponse.json({ ok: true, periode, bulan: bulanPrefix, diproses: hasil.length, hasil });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
