# Implementasi SisaRasa — M9

Acuan: [ketentuan resmi M9](https://github.com/RPL-24/IF2150-RPL/blob/main/docs/M9/KXX_GYY_Implementasi.md), [SKPL M5](https://github.com/zakyamani/IF2150-RPL-K01-G06/blob/main/docs/M5/K01_G06_SKPL.md), APL dan DPPL M8 pada repo akademik. Upstream diperiksa 5 November 2026: folder milestone terakhir yang tersedia adalah M9. Deadline pada spesifikasi: **11 November 2026, 21.50 WIB**.

Repo ini adalah source aplikasi final untuk kolaborasi. Pengumpulan resmi tetap melalui `main` dan tag `v9.x` pada fork akademik. Seluruh source berada di [src/](../../src/), README aplikasi di [src/README.md](../../src/README.md). Dokumen milestone lama tidak diubah.

## B.1 Perubahan dari DPPL

| Rancangan | Implementasi | Alasan |
| --- | --- | --- |
| Client-server dan layered | Android Flutter; HTTP Express/TypeScript; route → service → repository; PostgreSQL dan worker durable | Struktur peran/layer tetap terlihat dan dapat dijalankan tanpa akun cloud |
| Autentikasi implisit pada use case | Login/registrasi kedua peran, JWT access token dan refresh berotasi; `/api/v1/auth` | Otorisasi kepemilikan dan pemisahan peran pada seluruh transaksi |
| Filter alergen dalam katalog | Layar filter tersendiri dengan delapan alergen dan disclaimer | Ruang layar Android dan peringatan kontaminasi silang tetap terbaca |
| QR pickup dari server | Tiket disimpan terenkripsi per akun dan dapat dibuka offline; validasi mitra tetap online | Pembeli tetap dapat menunjukkan tiket ketika sinyal lemah |
| Status pesanan sederhana | Pending payment, paid, cancelled, completed, dispute, refunded, no-show serta riwayat audit | Pengaduan/refund dan worker tidak menimpa state terminal |
| Pembayaran QRIS/e-wallet eksternal | Adapter demo dengan invoice, callback terverifikasi, gagal/expiry, refund dan payout SIMULASI | Scope demo tanpa akun bank atau uang nyata; QR pembayaran bukan QRIS bank |
| Layar awal dan akun memuat pengaturan server | IP/URL dan UUID internal disembunyikan; operator memakai konfigurasi build | Informasi infrastruktur tidak membantu pengguna menyelesaikan pemesanan |
| UI DPPL awal | Desain FigCraft terbaru: krem/hijau, Lato/serif, ilustrasi tas tersambung dan komponen seragam | Hierarki lebih jelas, layout responsif dan alur tiket diprioritaskan |

## B.2 Best practices dan bukti

| Praktik | Bukti faktual |
| --- | --- |
| Dependency dan reproduksi | Lockfile npm/Flutter, Compose PostgreSQL lokal, seed fiktif, README dengan versi dan perintah |
| Keamanan repo | `.env.example`, ignore secrets/build/media, private signing, kontrol developer tersembunyi |
| Pengujian | [Verifikasi terbaru](../../src/docs/verification.md); test backend, Flutter, native Android dan backup/restore |
| Issue/PR | [Template issue](../../.github/ISSUE_TEMPLATE/) dan [PR](../../.github/pull_request_template.md); [CONTRIBUTING](../../CONTRIBUTING.md) mengatur branch, review anggota lain dan hubungan issue |
| CI | [Workflow](../../.github/workflows/ci.yml) menjalankan backend/PostgreSQL serta Flutter dengan dependency terkunci |
| Commit/review anggota | Baseline disiapkan dalam satu riwayat nyata; source ini tidak mengarang PR, review atau kontribusi lima anggota |

### B.2.1 Profiling

`src/scripts/benchmark.sh` menyiapkan 1.000 user, 300 merchant dan 5.000 penawaran fiktif dalam PostgreSQL disposable, lalu mengukur 30 request validasi pickup berurutan serta query `EXPLAIN (ANALYZE, BUFFERS)`. Tidak memerlukan tunnel/akun provider.

Hasil 5 November 2026: p50 HTTP lokal **4,47 ms**, p95 **5,67 ms**, maksimum **14,46 ms**, **0 gagal**. p95 proses server **4,39 ms**. Query katalog LIMIT20: **0,729 ms**, top-N heapsort27kB, shared-buffer hit97. Bcrypt cost12: **213 ms**. Dataset yang hampir seluruhnya aktif membuat planner memilih sequential scan yang masih cepat pada ukuran pilot; hasil ini belum membenarkan tambahan index untuk query tersebut. Index background/constraint transaksi tetap dipakai sesuai query lain. Angka ini tidak mengukur kamera, UI ponsel, 3G atau beban serentak. [Data profiling](../../src/docs/evidence/benchmark.json).

## B.3 Kendala dan batas bukti

Seluruh UC01–UC07 memiliki implementasi dan pengujian; transaksi finansial memang simulasi. Registrasi mandiri merchant bukan verifikasi identitas fisik. Notifikasi opt-in tunduk pada pembatasan Android, inbox tetap dapat disinkronkan. Kamera dua HP, GPS/izin fisik, API29 pada hardware minimum, baterai OEM dan 3G belum dinyatakan terverifikasi. Hasil lokal tidak otomatis membuktikan deployment atau kapasitas VM.

## B.4 Kontribusi anggota

Kontribusi per anggota harus berasal dari issue, commit dan PR yang benar-benar dilakukan. Baseline source ini disiapkan dengan bantuan AI atas instruksi pemilik repo; ia tidak dipisahkan menjadi commit palsu atas nama anggota lain. Tim mencatat pembagian dan persentase sebenarnya pada laporan akademik berdasarkan pekerjaan/review mereka. Tidak ada angka kontribusi individual yang diada-adakan dalam source ini.

## B.5 Traceability

[Pemetaan C01–C11 DPPL beserta KF01–KF14/KNF01–KNF05](../../src/docs/traceability.md) menghubungkan setiap entity perancangan ke tabel, model typed, service/repository dan layar Flutter. Adapter C06/C07 secara eksplisit dipetakan sebagai simulasi, bukan integrasi bank nyata.
