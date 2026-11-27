// Instrumen Penilaian Kinerja Individu Petugas PPSU — Kelurahan Duri Selatan
// Metode SMART: 5 kriteria, 25 indikator, skala 1-5, bobot total 100%

export type SkorIndikator = number | "tidak_dinilai"; // 1-5 atau tidak dinilai

export interface Kriteria {
  kode: string;
  nama: string;
  bobot: number; // persen
  indikator: string[];
}

export const KRITERIA: Kriteria[] = [
  {
    kode: "C1",
    nama: "Kehadiran dan kedisiplinan",
    bobot: 15,
    indikator: [
      "Kehadiran sesuai jadwal kerja",
      "Ketepatan waktu hadir dan memulai pekerjaan",
      "Kepatuhan terhadap ketentuan jam kerja",
      "Penggunaan seragam dan atribut kerja sesuai ketentuan",
      "Konsistensi mengikuti jadwal dan arahan kerja",
    ],
  },
  {
    kode: "C2",
    nama: "Penyelesaian tugas dan produktivitas",
    bobot: 25,
    indikator: [
      "Penyelesaian pekerjaan sesuai penugasan",
      "Pencapaian target pekerjaan yang disepakati",
      "Ketepatan waktu penyelesaian pekerjaan",
      "Kemampuan menangani pekerjaan sesuai skala prioritas",
      "Konsistensi menuntaskan pekerjaan yang menjadi tanggung jawabnya",
    ],
  },
  {
    kode: "C3",
    nama: "Kualitas hasil pekerjaan",
    bobot: 25,
    indikator: [
      "Kesesuaian hasil pekerjaan dengan instruksi atau standar teknis",
      "Kerapian dan kebersihan hasil pekerjaan",
      "Ketuntasan pekerjaan pada area yang ditugaskan",
      "Minimnya pekerjaan ulang akibat kesalahan pelaksanaan",
      "Kesesuaian hasil pekerjaan dengan kondisi dan kebutuhan lokasi",
    ],
  },
  {
    kode: "C4",
    nama: "Pelaporan dan dokumentasi pekerjaan",
    bobot: 15,
    indikator: [
      "Kelengkapan informasi laporan pekerjaan",
      "Ketepatan waktu penyampaian laporan",
      "Ketersediaan dokumentasi pekerjaan",
      "Kesesuaian dokumentasi dengan pekerjaan yang dilaksanakan",
      "Kejelasan informasi sehingga pekerjaan dapat ditelusuri",
    ],
  },
  {
    kode: "C5",
    nama: "Keselamatan kerja, tanggung jawab, dan kepatuhan prosedur",
    bobot: 20,
    indikator: [
      "Penggunaan APD sesuai jenis dan risiko pekerjaan",
      "Penggunaan peralatan kerja sesuai prosedur",
      "Kepatuhan terhadap instruksi keselamatan dan prosedur kerja",
      "Pelaporan kondisi berbahaya, kerusakan alat, atau kendala kerja",
      "Tanggung jawab menjaga dan menggunakan peralatan kerja",
    ],
  },
];

export const SKALA = [
  { skor: 1, kategori: "Tidak memenuhi" },
  { skor: 2, kategori: "Kurang memenuhi" },
  { skor: 3, kategori: "Cukup memenuhi" },
  { skor: 4, kategori: "Memenuhi dengan baik" },
  { skor: 5, kategori: "Sangat baik/konsisten" },
] as const;

export interface HasilSMART {
  nilaiKriteria: Record<string, number | null>; // Cj per kriteria (null jika semua tidak dinilai)
  utilitas: Record<string, number>; // Uj
  bobotTernormalisasi: Record<string, number>; // Wj
  nilaiAkhir: number; // 0-100
}

/**
 * Hitung nilai akhir SMART.
 * skor[kodeKriteria] = array 5 skor indikator (1-5 atau "tidak_dinilai").
 * Jika ada indikator "tidak_dinilai", rata-rata & bobot dinormalisasi ulang
 * secara konsisten sesuai ketentuan instrumen.
 */
export function hitungSMART(
  skor: Record<string, SkorIndikator[]>
): HasilSMART {
  const nilaiKriteria: Record<string, number | null> = {};
  const bobotTernormalisasi: Record<string, number> = {};
  const utilitas: Record<string, number> = {};

  let totalBobotAktif = 0;
  const bobotAktif: Record<string, number> = {};

  for (const k of KRITERIA) {
    const arr = skor[k.kode] ?? [];
    const dinilai = arr.filter((s): s is number => typeof s === "number");
    nilaiKriteria[k.kode] = dinilai.length
      ? dinilai.reduce((a, b) => a + b, 0) / dinilai.length
      : null;
    if (nilaiKriteria[k.kode] !== null) {
      bobotAktif[k.kode] = k.bobot;
      totalBobotAktif += k.bobot;
    }
  }

  let nilaiAkhir = 0;
  for (const k of KRITERIA) {
    const cj = nilaiKriteria[k.kode];
    if (cj === null || totalBobotAktif === 0) {
      bobotTernormalisasi[k.kode] = 0;
      utilitas[k.kode] = 0;
      continue;
    }
    const wj = bobotAktif[k.kode] / totalBobotAktif;
    const uj = (cj - 1) / (5 - 1);
    bobotTernormalisasi[k.kode] = wj;
    utilitas[k.kode] = uj;
    nilaiAkhir += wj * uj;
  }

  return {
    nilaiKriteria,
    utilitas,
    bobotTernormalisasi,
    nilaiAkhir: Math.round(nilaiAkhir * 10000) / 100, // 0-100, 2 desimal
  };
}
