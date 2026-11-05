# Kontribusi

Mulai dari [panduan lokal](src/README.md). Buat issue untuk bug atau pekerjaan baru, jelaskan perilaku yang diharapkan dan kriteria selesai. Gunakan data uji fiktif; jangan lampirkan token, OTP aktif, password, data pengguna, atau isi `.env`.

1. Ambil issue dan sepakati penanggung jawab di GitHub sebelum mengerjakan.
2. Buat branch `feat/nama-fitur`, `fix/nama-bug`, `test/nama-alur`, atau `docs/nama-dokumen` dari `main` terbaru.
3. Kerjakan perubahan dalam modul yang relevan. Backend memisahkan route, service dan repository; Flutter memisahkan screen, controller dan penyimpanan/API.
4. Jalankan pemeriksaan yang relevan. `cd src && ./scripts/test.sh` menjalankan backend/PostgreSQL serta Flutter. Perubahan Android native juga perlu emulator dan `./scripts/e2e.sh`.
5. Gunakan commit semantik, misalnya `fix(pickup): cegah konfirmasi ganda`.
6. Buka PR dengan `Closes #nomor`, tujuan, perubahan, bukti test dan screenshot jika UI berubah. Minta minimal satu anggota lain melakukan review sebelum merge.

`main` harus dapat dijalankan. Dependency lockfile wajib ikut perubahan dependensi. Jangan commit hasil build, database, media upload, keystore atau kredensial. Simpan APK di Release bila tim membuat rilis, bukan di riwayat source.

Ruang kerja modul: autentikasi/akun; katalog/penawaran; checkout/pembayaran demo; pickup/offline/notifikasi; pengaduan/ulasan/payout demo; pengujian/operasi. Pembagian orang mengikuti issue/PR yang benar-benar dikerjakan. Baseline awal hasil penyiapan source tidak menggantikan bukti kontribusi masing-masing anggota menurut M9.

Pengumpulan resmi M9 memakai tag `v9.0` atau revisi `v9.x` pada repo fork akademik sebelum 11 November 2026 21.50 WIB. Sinkronkan source final ke `src/` repo tersebut dan perbarui laporan, AI usage dan logbook sesuai pekerjaan nyata. Push di repo source ini tidak otomatis menjadi pengumpulan akademik.
