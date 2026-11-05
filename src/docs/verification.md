# Verifikasi lokal — 5 November 2026

Dijalankan dari source repo `sarirasa/src`, bukan dari APK lama atau desain statis. API/worker/PostgreSQL dijalankan melalui Compose terpisah dari proyek lama. Pengujian backend/backup diulang setelah UID/GID container disesuaikan dengan pengguna Linux lokal; 47 tetap lulus. Node22.18, Flutter3.47.2/Dart3.13.2, PostgreSQL15, Android15/API35 x86_64 emulator kosong khusus pengujian, target SDK36.

| Pemeriksaan | Hasil |
| --- | --- |
| Setup, migrasi, API dan worker | Layanan sehat; `/health/ready` ready |
| `scripts/test.sh`: typecheck dan PostgreSQL/backend | 47 lulus, 0 gagal; termasuk unit, kontrak, e2e HTTP, race/idempotensi, otorisasi/media, worker, backup/restore dan kegagalan backup |
| Flutter unit/widget | 63 lulus, 0 gagal |
| `flutter analyze` dan formatter | Bersih; 102 file Dart, 0 perubahan formatter yang tertinggal |
| `scripts/test/signing_test.py` | 1 lulus: release menolak signing yang hilang sebelum build |
| Native marketplace | 1 lulus: registrasi, pembayaran demo, QR, OTP, completion, ulasan dan payout demo |
| Native process recovery | 1 lulus: force-stop/separate APK invocation, secure cache, networking diblokir, QR/OTP offline, logout menghapus cache |
| Native notification denial | 1 lulus: izin POST_NOTIFICATIONS ditolak, akun tetap dapat digunakan |
| Native notification timeout | 1 lulus: service aktif, HOME/screen-off, batas dataSync dipercepat5detik, callback dan pemulihan; timeout asli dikembalikan |
| Native notification navigation | 1 lulus: service opt-in, penghentian saat logout, guard actor/epoch pada tap akun lama |
| Native cached offline ticket | 1 lulus: persistensi secure storage dan peringatan tiket yang lewat jadwal |
| Desain native final | 53 layar, 3 halaman, 180 tujuan navigasi valid; tidak ada layar server pada desain pengguna |

Regresi baru secara khusus memastikan kontrol IP/server tidak muncul di login/akun kedua peran, layar developer tidak dapat dibuka tanpa flag, UUID/koordinat tidak tampil pada tiket, serta QR dan OTP tampak lebih awal pada viewport412×916. Pengujian aksesibilitas mencakup320px/text scale2 dan keyboard.

Screenshot implementasi dari widget renderer ada di [assets/](assets/), termasuk [ringkasan](assets/app-overview.png). Native tests memakai API lokal nyata untuk marketplace dan recovery, sedangkan skenario plugin/izin memakai fixture sesuai masing-masing test; bukan semua skenario native menggunakan jaringan produksi.

## Profiling

`./scripts/benchmark.sh`: database disposable berisi dataset1.000 user/300 merchant/5.000 penawaran, 30 validasi pickup HTTP lokal berurutan, 0 gagal. p50 **4,47ms**, p95 **5,67ms**, max **14,46ms**; p95 waktu server **4,39ms**. Bcrypt cost12 **213ms**. Query katalog `EXPLAIN ANALYZE`: **0,729ms**, top-N heapsort27kB. Data lengkap: [benchmark.json](evidence/benchmark.json).

Ukuran dataset ini belum membutuhkan tambahan index pada query katalog yang diukur: planner memilih sequential scan dan seluruh request lokal masih cepat. Benchmark ini tidak mengukur beban serentak, kamera, UI perangkat, internet/3G, DNS atau kapasitas VPS.

## Batas bukti

Belum diuji pada dua HP/kamera fisik, sensor GPS/izin nyata, perangkat minimum API29, kebijakan baterai OEM atau pemantauan berjam-jam. Timeout dipercepat memverifikasi callback Android, bukan soak enam jam. Source dan APK baru tidak otomatis berarti deployment VM ikut diperbarui. Tidak mengklaim verifikasi yang belum dilakukan.

Ringkasan terstruktur: [test-summary.json](evidence/test-summary.json). Instruksi reproduksi: [README](../README.md) dan [tests](../tests/README.md). Keuangan, bank, pembayaran dan refund tetap SIMULASI.
