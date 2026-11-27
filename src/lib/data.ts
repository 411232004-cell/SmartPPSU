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
  const cons: QueryConstraint[] = [orderBy("tanggal_tugas", "desc"), limit(200)];
  if (filter?.petugas_id) cons.unshift(where("petugas_id", "==", filter.petugas_id));
  if (filter?.tanggal) cons.unshift(where("tanggal_tugas", "==", filter.tanggal));
  if (filter?.status) cons.unshift(where("status", "==", filter.status));
  const snap = await getDocs(query(collection(db, "penugasan"), ...cons));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Penugasan, "id">) }));
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
  const snap = await getDocs(query(
    collection(db, "progres_foto"),
    where("penugasan_id", "==", penugasan_id),
    orderBy("waktu_server", "asc")
  ));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProgresFoto, "id">) }));
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
