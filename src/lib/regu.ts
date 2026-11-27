// Kelompok penugasan PPSU Kelurahan Duri Selatan.
// Terpisah dari "zona" geofencing absensi — ini pembagian regu kerja.

export interface Regu {
  id: string;
  nama: string;
  wilayah: string;
  deskripsi: string;
}

export const REGU: Regu[] = [
  { id: "zona_1", nama: "Zona I", wilayah: "RW 01", deskripsi: "Bertugas di wilayah RW 01" },
  { id: "zona_2", nama: "Zona II", wilayah: "RW 02", deskripsi: "Bertugas di wilayah RW 02" },
  { id: "zona_3", nama: "Zona III", wilayah: "RW 03", deskripsi: "Bertugas di wilayah RW 03" },
  { id: "zona_4", nama: "Zona IV", wilayah: "RW 04", deskripsi: "Bertugas di wilayah RW 04" },
  { id: "zona_5", nama: "Zona V", wilayah: "RW 05", deskripsi: "Bertugas di wilayah RW 05" },
  { id: "zona_6", nama: "Zona VI", wilayah: "RW 06", deskripsi: "Bertugas di wilayah RW 06" },
  {
    id: "pesada",
    nama: "Pesada",
    wilayah: "Jl. Duri Raya & Jl. Moh Mansyur",
    deskripsi: "Bertugas di Jl. Duri Raya dan Jl. Moh Mansyur",
  },
  {
    id: "phb",
    nama: "PHB",
    wilayah: "Seluruh Kel. Duri Selatan",
    deskripsi: "Bertugas di saluran mikro kecil di seluruh wilayah Kel. Duri Selatan",
  },
  {
    id: "germor",
    nama: "Germor",
    wilayah: "RW 01 s.d. RW 06",
    deskripsi:
      "Mengangkut sampah di seluruh wilayah Kelurahan Duri Selatan dari RW 01 s.d. RW 06 serta membuangnya ke TPS",
  },
  {
    id: "rudal",
    nama: "Rudal",
    wilayah: "Kantor Kelurahan",
    deskripsi: "Bertugas mengelola kebersihan kantor kelurahan",
  },
  {
    id: "pamdal",
    nama: "Pamdal",
    wilayah: "Kantor Kelurahan",
    deskripsi: "Bertugas menjaga keamanan kantor",
  },
  {
    id: "driver",
    nama: "Driver",
    wilayah: "Sesuai kebutuhan",
    deskripsi: "Bertugas mengantar pimpinan serta mendokumentasikan sebuah acara",
  },
  {
    id: "operator",
    nama: "Operator",
    wilayah: "Kantor Kelurahan",
    deskripsi: "Membantu administrasi para kasi di kelurahan",
  },
];

export function namaRegu(id?: string): string {
  return REGU.find((r) => r.id === id)?.nama || "-";
}
