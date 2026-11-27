import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { supabase, FOTO_BUCKET } from "./supabase";
import { sha256Hex, jarakMeter } from "./capture";

export type JenisAbsen =
  | "masuk"
  | "istirahat_mulai"
  | "istirahat_selesai"
  | "pulang";

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

export interface SimpanAbsensiInput {
  petugasId: string;
  namaPetugas: string;
  jenis: JenisAbsen;
  foto: Blob;
  lat: number;
  lng: number;
  akurasi: number;
  zona: Zona;
}

export interface SimpanAbsensiHasil {
  id: string;
  fotoUrl: string;
  dalamZona: boolean;
  jarakMeter: number;
}

export async function simpanAbsensi(
  input: SimpanAbsensiInput
): Promise<SimpanAbsensiHasil> {
  const jarak = Math.round(
    jarakMeter(input.lat, input.lng, input.zona.lat, input.zona.lng)
  );
  const dalamZona = jarak <= input.zona.radiusMeter;
  const fotoHash = await sha256Hex(input.foto);

  const now = new Date();
  const periode = `${now.getFullYear()}`;
  const path = `${periode}/${input.petugasId}/absen_${input.jenis}_${now.getTime()}.jpg`;

  const { error: upErr } = await supabase.storage
    .from(FOTO_BUCKET)
    .upload(path, input.foto, { contentType: "image/jpeg", upsert: false });
  if (upErr) throw new Error(`Upload foto gagal: ${upErr.message}`);

  const { data: pub } = supabase.storage.from(FOTO_BUCKET).getPublicUrl(path);
  const fotoUrl = pub?.publicUrl ?? path;

  const doc = await addDoc(collection(db, "absensi"), {
    petugas_id: input.petugasId,
    nama_petugas: input.namaPetugas,
    zona_id: input.zona.id,
    jenis: input.jenis,
    tanggal: now.toISOString().slice(0, 10),
    waktu_server: serverTimestamp(),
    koordinat: { lat: input.lat, lng: input.lng, akurasi: input.akurasi },
    foto_url: fotoUrl,
    foto_path: path,
    foto_hash_sha256: fotoHash,
    dalam_zona: dalamZona,
    jarak_meter: jarak,
    status: dalamZona ? "sah" : "mencurigakan",
  });

  return { id: doc.id, fotoUrl, dalamZona, jarakMeter: jarak };
}
