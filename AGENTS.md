# Smart PPSU — Panduan Maintainer

PWA absensi & penilaian kinerja PPSU Kelurahan Duri Selatan.

## Stack

- **Next.js 15** (App Router, Turbopack) + React 19 + TypeScript
- **Firebase**: Auth (email), Firestore (data), FCM (push notif)
- **Supabase Storage**: foto absensi/progres (bucket `foto-ppsu`)
- **Leaflet + OSM/Esri**: peta zona geofencing (tanpa API key)
- Deploy: **Vercel** (auto-deploy dari branch `main`)

## Perintah

```bash
npm run dev     # dev server
npm run lint    # eslint (wajib bersih sebelum commit)
npm run build   # build produksi — verifikasi utama sebelum push
```

## Struktur

- `src/lib/` — logika murni & akses data:
  - `data.ts` — semua operasi Firestore (CRUD users/zona/penugasan/jadwal/notifikasi)
  - `absensi.ts` — konstanta jenis absen, jadwal shift, window waktu
  - `regu.ts` — daftar regu, pemetaan regu → geofence (`rw` = wajib selfie)
  - `capture.ts` — kamera, GPS, watermark, kompresi foto
  - `penilaian.ts` — skoring SMART C1–C5
  - `ui.ts` — style bersama (`inputStyle`/`inputStyleDark`) + `fetchRetry`
- `src/app/(app)/` — halaman dalam-shell (butuh login; layout ada guard)
- `src/app/api/` — `push` (verifikasi ID token admin) & `rekap-penilaian` (CRON_SECRET)
- `src/components/` — komponen UI; `ConfirmDialog` + `useConfirmDialog()` untuk semua konfirmasi (JANGAN pakai `confirm()` bawaan)
- `scripts/` — skrip Node satu-kali (rename akun, set titik zona) — jalankan via `node --env-file=.env scripts/xxx.mjs`

## Konvensi penting

- **Firestore rules** (`firestore.rules`) = sumber kebenaran akses; UI `isAdmin` hanya kosmetik. Setiap operasi tulis baru HARUS ada rule-nya, dan rules harus di-publish manual di Firebase Console.
- Dokumen absensi & progres foto bersifat append-only (rules larang update/delete).
- ID dokumen pola: `jadwal_shift` = `{tanggal}_{uid}`; `absensi` = `{tanggal}_{uid}_{jenis}`.
- Selfie absen hanya untuk regu geofence `rw` (Zona I–VI); regu lain tombol saja.
- Tema siang/malam via `data-theme` di `<html>` + variabel CSS di `globals.css`; selalu pakai `var(--…)` jangan warna hardcode.
- lib export berat (jspdf, xlsx) selalu `await import()` di handler — jangan import statis.
- Commit message singkat bahasa Indonesia; push ke `main` = auto-deploy.

## Env yang dibutuhkan

- `NEXT_PUBLIC_*` — config Firebase client + Supabase anon (lihat `.env`)
- `FIREBASE_SERVICE_ACCOUNT` — JSON service account (API routes + scripts)
- `CRON_SECRET` — Bearer token untuk `/api/rekap-penilaian`
- `NEXT_PUBLIC_VAPID_KEY` — kunci Web Push FCM
