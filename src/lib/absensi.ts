import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { supabase, FOTO_BUCKET } from "./supabase";
import { sha256Hex, jarakMeter } from "./capture";

export type JenisAbsen =
  | "masuk"
  | "istirahat_mulai"
  | "istirahat_selesai"
  | "pulang";

export type Shift = "pagi" | "sore" | "libur";

export interface Zona {
  id: string;
  nama: string;
  lat: number;
  lng: number;
  radiusMeter: number;
}

// Zona fallback (demo) — nanti diambil dari koleksi "zona" di Firestore
export const ZONA_DEMO: Zona = {
  id: "zona-duri-selatan",
  nama: "Zona Kelurahan Duri Selatan",
  lat: -6.1538, // perkiraan Duri Selatan, Tambora — sesuaikan di data zona
  lng: 106.8033,
  radiusMeter: 500,
};

// Jadwal jam per shift: [jam, menit] lokal
export const JADWAL_SHIFT: Record<"pagi" | "sore", Record<JenisAbsen, [number, number]>> = {
  pagi: {
    masuk: [7, 0],
    istirahat_mulai: [12, 0],
    istirahat_selesai: [13, 0],
    pulang: [15, 0],
  },
  sore: {
    masuk: [15, 0],
    istirahat_mulai: [18, 0],
    istirahat_selesai: [19, 0],
    pulang: [23, 0],
  },
};

export const LABEL_JENIS: Record<JenisAbsen, string> = {
  masuk: "Absen Masuk",
  istirahat_mulai: "Mulai Istirahat",
  istirahat_selesai: "Kembali Kerja",
  pulang: "Absen Pulang",
};

// Tombol absen yang tampil ke petugas — mulai istirahat dihapus,
// cukup: masuk → kembali kerja (sehabis istirahat) → pulang
export const URUTAN_JENIS: JenisAbsen[] = [
  "masuk",
  "istirahat_selesai",
  "pulang",
];

// Tombol boleh diklik mulai N menit sebelum jam jadwal
export const MENIT_AWAL = 5;

export function jamJadwal(shift: "pagi" | "sore", jenis: JenisAbsen, basis: Date): Date {
  const [j, m] = JADWAL_SHIFT[shift][jenis];
  const d = new Date(basis);
  d.setHours(j, m, 0, 0);
  return d;
}

export function fmtJam(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}.${String(d.getMinutes()).padStart(2, "0")}`;
}

export interface SimpanAbsensiInput {
  petugasId: string;
  namaPetugas: string;
  jenis: JenisAbsen;
  foto?: Blob;
  lat: number | null;
  lng: number | null;
  akurasi: number;
  zona: Zona | null; // null = bebas GPS (driver/operator/tugas khusus)
  shift?: string;
  telat_menit?: number; // menit melewati jam jadwal (0 = tepat/lebih awal)
}

export interface SimpanAbsensiHasil {
  id: string;
  fotoUrl: string;
  dalamZona: boolean;
  jarakMeter: number | null;
}

export async function simpanAbsensi(
  input: SimpanAbsensiInput
): Promise<SimpanAbsensiHasil> {
  const jarak =
    input.zona && input.lat !== null && input.lng !== null
      ? Math.round(jarakMeter(input.lat, input.lng, input.zona.lat, input.zona.lng))
      : null;
  const dalamZona = input.zona ? (jarak !== null && jarak <= input.zona.radiusMeter) : true;

  const now = new Date();
  let fotoUrl = "";
  let path = "";
  let fotoHash = "";
  if (input.foto) {
    fotoHash = await sha256Hex(input.foto);
    const periode = `${now.getFullYear()}`;
    path = `${periode}/${input.petugasId}/absen_${input.jenis}_${now.getTime()}.jpg`;
    const { error: upErr } = await supabase.storage
      .from(FOTO_BUCKET)
      .upload(path, input.foto, { contentType: "image/jpeg", upsert: false });
    if (upErr) throw new Error(`Upload foto gagal: ${upErr.message}`);
    const { data: pub } = supabase.storage.from(FOTO_BUCKET).getPublicUrl(path);
    fotoUrl = pub?.publicUrl ?? path;
  }

  const doc = await addDoc(collection(db, "absensi"), {
    petugas_id: input.petugasId,
    nama_petugas: input.namaPetugas,
    zona_id: input.zona?.id ?? "bebas",
    jenis: input.jenis,
    tanggal: now.toISOString().slice(0, 10),
    waktu_server: serverTimestamp(),
    koordinat:
      input.lat !== null && input.lng !== null
        ? { lat: input.lat, lng: input.lng, akurasi: input.akurasi }
        : null,
    foto_url: fotoUrl,
    foto_path: path,
    foto_hash_sha256: fotoHash,
    dalam_zona: dalamZona,
    jarak_meter: jarak,
    shift: input.shift ?? "",
    telat_menit: input.telat_menit ?? 0,
    status: dalamZona ? "sah" : "mencurigakan",
  });

  return { id: doc.id, fotoUrl, dalamZona, jarakMeter: jarak };
}
