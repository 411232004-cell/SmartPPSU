import {
  collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp, Timestamp,
  QueryConstraint, Unsubscribe,
} from "firebase/firestore";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { db, getSecondaryAuth } from "./firebase";
import { supabase, FOTO_BUCKET } from "./supabase";
import { sha256Hex } from "./capture";
import type { Zona, JenisAbsen } from "./absensi";

export type { Zona, JenisAbsen };

// ---------- ZONA ----------
export async function listZona(): Promise<Zona[]> {
  const snap = await getDocs(collection(db, "zona"));
  return snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id, nama: x.nama_zona || x.nama || "Zona",
      lat: x.titik_pusat?.lat ?? x.lat ?? 0,
      lng: x.titik_pusat?.lng ?? x.lng ?? 0,
      radiusMeter: x.radius_meter ?? x.radiusMeter ?? 300,
    };
  });
}

export async function getZona(id: string): Promise<Zona | null> {
  const snap = await getDoc(doc(db, "zona", id));
  if (!snap.exists()) return null;
  const x = snap.data();
  return {
    id: snap.id, nama: x.nama_zona || "Zona",
    lat: x.titik_pusat?.lat ?? 0, lng: x.titik_pusat?.lng ?? 0,
    radiusMeter: x.radius_meter ?? 300,
  };
}

export async function simpanZona(z: {
  id?: string; nama: string; lat: number; lng: number; radiusMeter: number;
  alamat?: string; jamMasuk?: string; jamPulang?: string;
}) {
  const data = {
    nama_zona: z.nama, alamat: z.alamat || "",
    titik_pusat: { lat: z.lat, lng: z.lng },
    radius_meter: z.radiusMeter,
    jadwal_kerja: { jam_masuk: z.jamMasuk || "07:00", jam_pulang: z.jamPulang || "15:00" },
  };
  if (z.id) await updateDoc(doc(db, "zona", z.id), data);
  else await addDoc(collection(db, "zona"), data);
}

/** Set titik pusat (dan radius) zona — dipakai admin dari lokasi RW sebenarnya. */
export async function updateTitikZona(id: string, lat: number, lng: number, radiusMeter?: number) {
  const data: Record<string, unknown> = { titik_pusat: { lat, lng } };
  if (radiusMeter) data.radius_meter = radiusMeter;
  await updateDoc(doc(db, "zona", id), data);
}

/** Ganti nama/alamat zona tanpa menyentuh titik pusat. */
export async function updateNamaZona(id: string, nama: string, alamat?: string) {
  const data: Record<string, unknown> = { nama_zona: nama };
  if (alamat !== undefined) data.alamat = alamat;
  await updateDoc(doc(db, "zona", id), data);
}

/** Hapus dokumen zona — regu yang terkait zona ini kembali bebas GPS. */
export async function hapusZona(id: string) {
  const { deleteDoc } = await import("firebase/firestore");
  await deleteDoc(doc(db, "zona", id));
}

// ---------- PETUGAS ----------
export interface Petugas {
  id: string;
  nama: string;
  email: string;
  peran: "petugas_ppsu" | "kasi_ekbang";
  zona_id?: string;
  regu?: string;
  niap?: string;
  aktif: boolean;
  shift?: "pagi" | "sore";
  bebas_gps?: boolean;
  poin_bonus?: number;
}

export async function listPetugas(hanyaPetugas = true): Promise<Petugas[]> {
  const q = hanyaPetugas
    ? query(collection(db, "users"), where("peran", "==", "petugas_ppsu"))
    : query(collection(db, "users"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    nama: d.data().nama || "-",
    email: d.data().email || "-",
    peran: d.data().peran || "petugas_ppsu",
    zona_id: d.data().zona_id,
    regu: d.data().regu,
    niap: d.data().niap,
    aktif: d.data().aktif !== false,
    shift: d.data().shift,
    bebas_gps: d.data().bebas_gps === true,
    poin_bonus: d.data().poin_bonus ?? 0,
  }));
}

/** Buat akun Auth + dokumen users. Memakai secondary auth agar sesi Kasi Ekbang tidak hilang. */
export async function buatAkunPetugas(input: {
  nama: string; email: string; password: string; zona_id?: string; niap?: string;
}) {
  const sec = getSecondaryAuth();
  const cred = await createUserWithEmailAndPassword(sec, input.email, input.password);
  await setDoc(doc(db, "users", cred.user.uid), {
    nama: input.nama,
    email: input.email,
    niap: input.niap || "",
    peran: "petugas_ppsu",
    zona_id: input.zona_id || "",
    aktif: true,
    dibuat_pada: serverTimestamp(),
  });
  await signOut(sec);
  return cred.user.uid;
}

export async function updatePetugas(id: string, data: Partial<Petugas>) {
  await updateDoc(doc(db, "users", id), data as Record<string, unknown>);
}

// ---------- PENUGASAN ----------
export interface Penugasan {
  id: string;
  petugas_id: string;
  nama_petugas?: string;
  zona_id: string;
  jenis_pekerjaan: string;
  deskripsi: string;
  prioritas: "rendah" | "normal" | "tinggi";
  tanggal_tugas: string; // yyyy-mm-dd
  target_selesai?: string;
  status: "ditugaskan" | "proses" | "selesai" | "tertunda";
  alasan_penundaan?: string;
  dibuat_oleh?: string;
}

export async function listPenugasan(filter?: {
  petugas_id?: string; tanggal?: string; status?: string;
}): Promise<Penugasan[]> {
  // tanpa orderBy server-side (hindari composite index) — sort di kode
  const cons: QueryConstraint[] = [limit(500)];
  if (filter?.petugas_id) cons.unshift(where("petugas_id", "==", filter.petugas_id));
  if (filter?.tanggal) cons.unshift(where("tanggal_tugas", "==", filter.tanggal));
  if (filter?.status) cons.unshift(where("status", "==", filter.status));
  const snap = await getDocs(query(collection(db, "penugasan"), ...cons));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Penugasan, "id">) }))
    .sort((a, b) => b.tanggal_tugas.localeCompare(a.tanggal_tugas))
    .slice(0, 200);
}

export async function tambahPenugasan(t: Omit<Penugasan, "id" | "status">) {
  await addDoc(collection(db, "penugasan"), {
    ...t, status: "ditugaskan", dibuat_pada: serverTimestamp(),
  });
}

export async function updateStatusTugas(
  id: string, status: Penugasan["status"], alasan?: string
) {
  await updateDoc(doc(db, "penugasan", id), {
    status, alasan_penundaan: alasan || "",
    diupdate_pada: serverTimestamp(),
  });
}

// ---------- PROGRES FOTO ----------
export interface ProgresFoto {
  id: string;
  penugasan_id: string;
  petugas_id: string;
  tahap: "0" | "50" | "100";
  foto_url: string;
  dalam_zona: boolean;
  keterangan?: string;
  waktu_server?: Timestamp;
  koordinat?: { lat: number; lng: number };
}

export async function listProgres(penugasan_id: string): Promise<ProgresFoto[]> {
  // tanpa orderBy server-side (hindari composite index) — sort di kode
  const snap = await getDocs(query(
    collection(db, "progres_foto"),
    where("penugasan_id", "==", penugasan_id)
  ));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<ProgresFoto, "id">) }))
    .sort(
      (a, b) =>
        (a.waktu_server?.toMillis?.() ?? 0) -
        (b.waktu_server?.toMillis?.() ?? 0)
    );
}

export async function simpanProgres(input: {
  penugasan_id: string; petugas_id: string; nama_petugas: string;
  tahap: "0" | "50" | "100"; foto: Blob;
  lat: number; lng: number; akurasi: number;
  dalam_zona: boolean; jarak_meter: number; keterangan?: string;
}) {
  const now = new Date();
  const path = `${now.getFullYear()}/${input.petugas_id}/progres_${input.tahap}_${input.penugasan_id}_${now.getTime()}.jpg`;
  const fotoHash = await sha256Hex(input.foto);

  const { error } = await supabase.storage
    .from(FOTO_BUCKET)
    .upload(path, input.foto, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error(`Upload foto gagal: ${error.message}`);

  const { data: pub } = supabase.storage.from(FOTO_BUCKET).getPublicUrl(path);
  await addDoc(collection(db, "progres_foto"), {
    penugasan_id: input.penugasan_id,
    petugas_id: input.petugas_id,
    nama_petugas: input.nama_petugas,
    tahap: input.tahap,
    waktu_server: serverTimestamp(),
    koordinat: { lat: input.lat, lng: input.lng, akurasi: input.akurasi },
    foto_url: pub?.publicUrl ?? path,
    foto_path: path,
    foto_hash_sha256: fotoHash,
    dalam_zona: input.dalam_zona,
    jarak_meter: input.jarak_meter,
    keterangan: input.keterangan || "",
  });
}

// ---------- LAPORAN KENDALA ----------
export async function simpanKendala(input: {
  petugas_id: string; nama_petugas: string; penugasan_id?: string;
  jenis: string; deskripsi: string; lat?: number; lng?: number; foto?: Blob | null;
}) {
  let foto_url = "", foto_path = "", foto_hash = "";
  if (input.foto) {
    foto_hash = await sha256Hex(input.foto);
    foto_path = `${new Date().getFullYear()}/${input.petugas_id}/kendala_${Date.now()}.jpg`;
    const { error } = await supabase.storage
      .from(FOTO_BUCKET).upload(foto_path, input.foto, { contentType: "image/jpeg" });
    if (error) throw new Error(`Upload foto gagal: ${error.message}`);
    foto_url = supabase.storage.from(FOTO_BUCKET).getPublicUrl(foto_path).data.publicUrl;
  }
  await addDoc(collection(db, "laporan_kendala"), {
    petugas_id: input.petugas_id,
    nama_petugas: input.nama_petugas,
    penugasan_id: input.penugasan_id || "",
    jenis: input.jenis,
    deskripsi: input.deskripsi,
    koordinat: input.lat !== undefined ? { lat: input.lat, lng: input.lng } : null,
    foto_url, foto_path, foto_hash_sha256: foto_hash,
    waktu_server: serverTimestamp(),
  });
}

// ---------- MONITORING REALTIME (Kasi Ekbang) ----------
export function subscribeAbsensiHariIni(cb: (rows: Record<string, unknown>[]) => void): Unsubscribe {
  const today = new Date().toISOString().slice(0, 10);
  // orderBy di sisi klien — where + orderBy beda field butuh composite index
  return onSnapshot(
    query(collection(db, "absensi"), where("tanggal", "==", today)),
    (snap) => {
      const rows = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Record<string, unknown>[];
      rows.sort((a, b) => {
        const ta = (a.waktu_server as { toMillis?: () => number })?.toMillis?.() ?? 0;
        const tb = (b.waktu_server as { toMillis?: () => number })?.toMillis?.() ?? 0;
        return tb - ta;
      });
      cb(rows);
    },
    (err) => console.warn("Listener absensi gagal:", err.message)
  );
}

export function subscribeProgresTerbaru(cb: (rows: Record<string, unknown>[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, "progres_foto"), orderBy("waktu_server", "desc"), limit(30)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => console.warn("Listener progres gagal:", err.message)
  );
}

// ---------- ZONA DEFAULT (geofence per regu) ----------
// Titik pusat perkiraan Kelurahan Duri Selatan, Tambora — admin bisa koreksi via UI zona
const PUSAT = { lat: -6.1538, lng: 106.8033 };
const ZONA_DEFAULT: { id: string; nama: string; alamat: string; radius: number }[] = [
  { id: "rw_01", nama: "RW 01", alamat: "Wilayah RW 01 Kel. Duri Selatan", radius: 250 },
  { id: "rw_02", nama: "RW 02", alamat: "Wilayah RW 02 Kel. Duri Selatan", radius: 250 },
  { id: "rw_03", nama: "RW 03", alamat: "Wilayah RW 03 Kel. Duri Selatan", radius: 250 },
  { id: "rw_04", nama: "RW 04", alamat: "Wilayah RW 04 Kel. Duri Selatan", radius: 250 },
  { id: "rw_05", nama: "RW 05", alamat: "Wilayah RW 05 Kel. Duri Selatan", radius: 250 },
  { id: "rw_06", nama: "RW 06", alamat: "Wilayah RW 06 Kel. Duri Selatan", radius: 250 },
  { id: "kantor", nama: "Kantor Kelurahan Duri Selatan", alamat: "Kantor Kel. Duri Selatan", radius: 150 },
  { id: "kelurahan", nama: "Seluruh Kel. Duri Selatan", alamat: "Seluruh wilayah Kel. Duri Selatan", radius: 1500 },
];

/** Buat dokumen zona default yang belum ada (tidak menimpa yang sudah diatur admin). */
export async function pastikanZonaDefault() {
  await Promise.all(
    ZONA_DEFAULT.map(async (z) => {
      const ref = doc(db, "zona", z.id);
      if ((await getDoc(ref)).exists()) return;
      await setDoc(ref, {
        nama_zona: z.nama,
        alamat: z.alamat,
        titik_pusat: PUSAT,
        radius_meter: z.radius,
        jadwal_kerja: { jam_masuk: "07:00", jam_pulang: "15:00" },
      });
    })
  );
}

// ---------- JADWAL SHIFT ----------
export interface JadwalShift {
  id: string;
  tanggal: string; // yyyy-mm-dd
  petugas_id: string;
  nama_petugas?: string;
  shift: "pagi" | "sore" | "libur";
}

export async function listJadwalBulan(prefix: string): Promise<JadwalShift[]> {
  const snap = await getDocs(
    query(
      collection(db, "jadwal_shift"),
      where("tanggal", ">=", `${prefix}-01`),
      where("tanggal", "<=", `${prefix}-31`)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<JadwalShift, "id">) }));
}

export async function listJadwalTanggal(tanggal: string): Promise<JadwalShift[]> {
  const snap = await getDocs(
    query(collection(db, "jadwal_shift"), where("tanggal", "==", tanggal))
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<JadwalShift, "id">) }));
}

export async function setJadwalShift(
  tanggal: string,
  p: { id: string; nama: string },
  shift: "pagi" | "sore" | "libur"
) {
  await setDoc(
    doc(db, "jadwal_shift", `${tanggal}_${p.id}`),
    { tanggal, petugas_id: p.id, nama_petugas: p.nama, shift },
    { merge: true }
  );
}

/** Shift petugas di tanggal tertentu: jadwal harian → default profil → "pagi". */
export async function getShiftUntuk(petugasId: string, tanggal: string): Promise<string | undefined> {
  const snap = await getDoc(doc(db, "jadwal_shift", `${tanggal}_${petugasId}`));
  return snap.exists() ? (snap.data().shift as string) : undefined;
}

// ---------- NOTIFIKASI: TUGAS KHUSUS & SURAT EDARAN ----------
export interface Notif {
  id: string;
  jenis: "tugas_khusus" | "edaran";
  target: "personel" | "regu" | "semua";
  target_petugas_id?: string;
  target_regu?: string;
  judul: string;
  deskripsi: string;
  poin: number;
  status: "baru" | "diterima" | "selesai";
  diterima_oleh?: string;
  diselesaikan_oleh?: string;
  dibaca_oleh: string[];
  dibuat_oleh: string;
  nama_pembuat: string;
  dibuat_pada?: Timestamp;
}

/** Apakah notif ini ditujukan ke profil ini. */
export function notifUntuk(n: Notif, profil: { uid: string; regu?: string; peran: string }): boolean {
  if (n.target === "semua") return profil.peran === "petugas_ppsu";
  if (n.target === "personel") return n.target_petugas_id === profil.uid;
  return !!profil.regu && n.target_regu === profil.regu;
}

export async function buatNotifikasi(input: {
  jenis: "tugas_khusus" | "edaran";
  target: "personel" | "regu" | "semua";
  target_petugas_id?: string;
  target_regu?: string;
  judul: string;
  deskripsi: string;
  poin?: number;
  dibuat_oleh: string;
  nama_pembuat: string;
}) {
  await addDoc(collection(db, "notifikasi"), {
    jenis: input.jenis,
    target: input.target,
    target_petugas_id: input.target_petugas_id || "",
    target_regu: input.target_regu || "",
    judul: input.judul,
    deskripsi: input.deskripsi,
    poin: input.poin ?? 0,
    status: "baru",
    dibaca_oleh: [],
    dibuat_oleh: input.dibuat_oleh,
    nama_pembuat: input.nama_pembuat,
    dibuat_pada: serverTimestamp(),
  });
  // Tugas khusus → target bebas kunci GPS selama tugas berjalan
  if (input.jenis === "tugas_khusus") {
    if (input.target === "personel" && input.target_petugas_id) {
      await updateDoc(doc(db, "users", input.target_petugas_id), { bebas_gps: true });
    } else if (input.target === "regu" && input.target_regu) {
      await setBebasGpsRegu(input.target_regu, true);
    }
  }
}

async function setBebasGpsRegu(reguId: string, nilai: boolean) {
  const snap = await getDocs(query(collection(db, "users"), where("regu", "==", reguId)));
  await Promise.all(snap.docs.map((d) => updateDoc(d.ref, { bebas_gps: nilai })));
}

export function subscribeNotifikasi(cb: (rows: Notif[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, "notifikasi"), orderBy("dibuat_pada", "desc"), limit(100)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Notif, "id">) }))),
    (err) => console.warn("Listener notifikasi gagal:", err.message)
  );
}

export async function terimaNotif(id: string, nama: string) {
  await updateDoc(doc(db, "notifikasi", id), {
    status: "diterima",
    diterima_oleh: nama,
  });
}

/** Apakah user masih punya tugas khusus lain yang belum selesai. */
async function tugasKhususAktifUntuk(uid: string, regu?: string): Promise<boolean> {
  const snap = await getDocs(
    query(collection(db, "notifikasi"), where("jenis", "==", "tugas_khusus"))
  );
  return snap.docs.some((d) => {
    const n = d.data();
    if (n.status === "selesai") return false;
    if (n.target === "semua") return true;
    if (n.target === "personel") return n.target_petugas_id === uid;
    if (n.target === "regu") return n.target_regu === regu;
    return false;
  });
}

/** Selesaikan tugas khusus: beri poin ke target + kembalikan kunci GPS. */
export async function selesaiNotif(n: Notif, nama: string) {
  await updateDoc(doc(db, "notifikasi", n.id), {
    status: "selesai",
    diselesaikan_oleh: nama,
    diselesaikan_pada: serverTimestamp(),
  });
  if (n.jenis !== "tugas_khusus") return;
  const poin = n.poin || 0;
  const beriPoin = async (uid: string) => {
    const ref = doc(db, "users", uid);
    const u = (await getDoc(ref)).data();
    const cur = u?.poin_bonus ?? 0;
    // kunci GPS dibuka kembali HANYA kalau tidak ada tugas khusus lain yang masih berjalan
    const masihAda = await tugasKhususAktifUntuk(uid, u?.regu);
    await updateDoc(ref, { bebas_gps: masihAda, poin_bonus: cur + poin });
  };
  if (n.target === "personel" && n.target_petugas_id) {
    await beriPoin(n.target_petugas_id);
  } else if (n.target === "regu" && n.target_regu) {
    const snap = await getDocs(query(collection(db, "users"), where("regu", "==", n.target_regu)));
    await Promise.all(snap.docs.map((d) => beriPoin(d.id)));
  } else {
    // target "semua" — buka kunci semua yang tidak punya tugas khusus lain
    const usnap = await getDocs(query(collection(db, "users"), where("bebas_gps", "==", true)));
    await Promise.all(usnap.docs.map(async (d) => {
      if (!(await tugasKhususAktifUntuk(d.id, d.data().regu))) {
        await updateDoc(d.ref, { bebas_gps: false });
      }
    }));
  }
}

export async function tandaiDibaca(id: string, uid: string) {
  const ref = doc(db, "notifikasi", id);
  const cur = (await getDoc(ref)).data()?.dibaca_oleh ?? [];
  if (!cur.includes(uid)) await updateDoc(ref, { dibaca_oleh: [...cur, uid] });
}
