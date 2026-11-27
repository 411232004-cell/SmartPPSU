// Kelompok penugasan PPSU Kelurahan Duri Selatan.
// Terpisah dari "zona" geofencing absensi — ini pembagian regu kerja.

export type GeofenceMode = "rw" | "kantor" | "kelurahan" | "bebas";

export interface Regu {
  id: string;
  nama: string;
  wilayah: string;
  deskripsi: string;
  geofence: GeofenceMode;
  zonaId?: string; // id dok di koleksi "zona" untuk mode rw/kantor/kelurahan
}

export const REGU: Regu[] = [
  { id: "zona_1", nama: "Zona I", wilayah: "RW 01", deskripsi: "Bertugas di wilayah RW 01", geofence: "rw", zonaId: "rw_01" },
  { id: "zona_2", nama: "Zona II", wilayah: "RW 02", deskripsi: "Bertugas di wilayah RW 02", geofence: "rw", zonaId: "rw_02" },
  { id: "zona_3", nama: "Zona III", wilayah: "RW 03", deskripsi: "Bertugas di wilayah RW 03", geofence: "rw", zonaId: "rw_03" },
  { id: "zona_4", nama: "Zona IV", wilayah: "RW 04", deskripsi: "Bertugas di wilayah RW 04", geofence: "rw", zonaId: "rw_04" },
  { id: "zona_5", nama: "Zona V", wilayah: "RW 05", deskripsi: "Bertugas di wilayah RW 05", geofence: "rw", zonaId: "rw_05" },
  { id: "zona_6", nama: "Zona VI", wilayah: "RW 06", deskripsi: "Bertugas di wilayah RW 06", geofence: "rw", zonaId: "rw_06" },
  {
    id: "pesada",
    nama: "Pesada",
    wilayah: "Jl. Duri Raya & Jl. Moh Mansyur",
    deskripsi: "Bertugas di Jl. Duri Raya dan Jl. Moh Mansyur",
    geofence: "kelurahan",
    zonaId: "kelurahan",
  },
  {
    id: "phb",
    nama: "PHB",
    wilayah: "Seluruh Kel. Duri Selatan",
    deskripsi: "Bertugas di saluran mikro kecil di seluruh wilayah Kel. Duri Selatan",
    geofence: "kelurahan",
    zonaId: "kelurahan",
  },
  {
    id: "germor",
    nama: "Germor",
    wilayah: "RW 01 s.d. RW 06",
    deskripsi:
      "Mengangkut sampah di seluruh wilayah Kelurahan Duri Selatan dari RW 01 s.d. RW 06 serta membuangnya ke TPS",
    geofence: "kelurahan",
    zonaId: "kelurahan",
  },
  {
    id: "rudal",
    nama: "Rudal",
    wilayah: "Kantor Kelurahan",
    deskripsi: "Bertugas mengelola kebersihan kantor kelurahan",
    geofence: "kantor",
    zonaId: "kantor",
  },
  {
    id: "pamdal",
    nama: "Pamdal",
    wilayah: "Kantor Kelurahan",
    deskripsi: "Bertugas menjaga keamanan kantor",
    geofence: "kantor",
    zonaId: "kantor",
  },
  {
    id: "driver",
    nama: "Driver",
    wilayah: "Sesuai kebutuhan",
    deskripsi: "Bertugas mengantar pimpinan serta mendokumentasikan sebuah acara",
    geofence: "bebas",
  },
  {
    id: "operator",
    nama: "Operator",
    wilayah: "Kantor Kelurahan",
    deskripsi: "Membantu administrasi para kasi di kelurahan",
    geofence: "bebas",
  },
];

export function reguById(id?: string): Regu | undefined {
  return REGU.find((r) => r.id === id);
}

export function namaRegu(id?: string): string {
  return reguById(id)?.nama || "-";
}
