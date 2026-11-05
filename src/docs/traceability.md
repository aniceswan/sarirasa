# Traceability SisaRasa

Acuan: [SKPL M5](https://github.com/zakyamani/IF2150-RPL-K01-G06/blob/main/docs/M5/K01_G06_SKPL.md) dan [DPPL M8](https://github.com/zakyamani/IF2150-RPL-K01-G06/blob/main/docs/M8/K01_G06_DPPL2.md). Test backend memakai PostgreSQL nyata; widget bukan bukti kamera fisik.

| Acuan | Implementasi dan bukti |
|---|---|
| KF01–02 | PaymentGateway dummy menandatangani callback; invoice, fee, QR pembayaran SIMULASI, resume dan sukses/gagal/expiry. `payment.test.ts`, `orders_test.dart`, `marketplace.test.ts`. QR dummy bukan QRIS bank nyata; tidak ada integrasi e-wallet nyata. |
| KF03–04 | Form seluruh field, harga diskon 50–70%, UTC/window dua jam, checkbox default kosong; held/ever-paid mencegah edit/tutup. `catalog.test.ts`, `acceptance-races.test.ts`, `offer-rules.test.ts`, `seller_test.dart`. |
| KF05 | Dashboard ID/jadwal, inbox PostgreSQL + outbox, WS ticket sekali pakai, reconnect/catch-up, history auto-refresh pada event order. `notifications.test.ts`, `notifications_test.dart`, `history_notifications_test.dart`; Tunnel HTTP/WS smoke nyata. |
| KF06–08 | DTO katalog anonim (setelah login), filter alergen, disclaimer, Haversine server dibulatkan, privacy sebelum paid. `catalog.test.ts`, `contracts.test.ts`, `catalog_test.dart`. |
| KF09 | Held→sold atomik, idempotency actor/key/body, callback dedupe. `payment.test.ts`, `marketplace.test.ts`: retry kembali ke order yang sama; 20 checkout kuota satu. |
| KF10–11 | Reveal sesudah paid; QR random single-use, OTP terikat order, 5 percobaan/15 menit, cache terenkripsi per akun. `pickup.test.ts`, `media.test.ts`, `orders_test.dart`; native marketplace OTP + QR display; native process recovery. |
| KF12 | Completion/payout/fee/net exact once, settlement worker + ledger. `pickup.test.ts`, `jobs.test.ts`, `review-payout.test.ts`, `marketplace.test.ts`; UI simulasi. |
| KF13 | Complaint alasan/bukti max dua privat, approve/reject, seller cancel full refund, hold, no-show, toko tutup diam 24h. `complaint.test.ts`, `jobs.test.ts`, `complaints_test.dart`, `order_actions_test.dart`. |
| KF14 | Riwayat semua state + audit atomik, metric hanya completed, rating unique completed-only. `review-payout.test.ts`, `payment.test.ts`, `marketplace.test.ts`; native review sesudah OTP. |
| KNF01 | PG transactions/constraints/row lock, audit+ledger+outbox atomic; payment/expiry, scan/OTP/complaint/no-show, stock contention, job crash/lease fencing. `acceptance-races.test.ts`: 11 barrier-controlled PG scenarios, kedua urutan deadline/pickup serta lease theft concurrent; `jobs.test.ts`: ack-loss/SIGTERM. Backup real restore. |
| KNF02 | Bcrypt cost 12 async, hashed rotating refresh/replay-family revocation, QR entropy/AES storage, private DTO/logging. `auth.test.ts`, `pickup.test.ts`, `media.test.ts`, `api_client_test.dart`. |
| KNF03 | `scripts/benchmark.sh`: >=30 pickup HTTP requests per jalur local/Tunnel, server durasi terpisah, p50/p95/max/failures. Lihat benchmark.json; bukan klaim kamera atau jaringan 3G aktual. |
| KNF04 | Flutter Android min29/target36, 320px/text scale2/keyboard; secure storage native; force-stop dan APK terpisah memulihkan paid QR dengan socket networking diblokir. Android15 emulator; physical/OEM/camera pending. |
| KNF05 | Anonim whitelist tanpa seller identity/address/photo/coords sebelum paid; shop media hanya owner/previous paid buyer, evidence hanya pihak transaksi. `catalog.test.ts`, `media.test.ts`, snapshot contracts. Bukan sertifikasi legal. |

UC01–07 dipetakan oleh KF di atas. Extended rules yang diputuskan pada spesifikasi implementasi: refund juga unavailable/allergen, fee default 5% snapshot configurable, settlement demo setelah satu jam, no password-reset/merchant-verification nyata. Monitoring opt-in tanpa FCM; tidak menjanjikan notifikasi saat app mati. Pemantau berhenti saat logout, Android timeout, atau kehilangan komunikasi dengan proses utama. Semua transfer/refund/saldo/bank hanya simulasi.

Implementasi dapat dijalankan lokal tanpa akun cloud. VPS memakai backend yang sama; origin ditetapkan saat build dan disembunyikan dari pengguna. Benchmark terbaru hanya mengukur HTTP lokal dan query PostgreSQL, bukan kamera atau jaringan publik. Bukti terbaru: [verification.md](verification.md).

## Kelas perancangan DPPL 4.1

| ID | Perancangan | Wujud implementasi |
| --- | --- | --- |
| C01 | Penjual | `users`/`merchant_profiles`; `backend/src/modules/merchants/{service,repository}.ts`; `android-app/lib/features/seller/profile_screen.dart` |
| C02 | Pembeli | `users`, preferensi alergen; `auth/{service,repository}.ts`; `allergen_screen.dart` dan `SessionStore` |
| C03 | Penawaran | `offers`; `offers/{service,repository,schema}.ts`, `catalog/service.ts`; `SellerOffer`/`Offer` dan `OfferFormController` |
| C04 | Pesanan | `orders`, reservation, audit; `orders/{service,repository}.ts`; `Order`, `OrderController`, `OrderRepository` |
| C05 | MetodePembayaran | `payment_intents`/`payment_events`; `payments/service.ts`, `DemoGateway`; `Payment` dan controller pembayaran |
| C06 | QRIS | QR invoice pada `payments/demo-gateway.ts` dan `payment_screen.dart`; simulasi, bukan QRIS bank yang dapat dibayar |
| C07 | EWallet | Pilihan metode pembayaran melalui adapter demo yang sama; tidak mengirim tagihan/menyimpan nomor e-wallet nyata |
| C08 | QRPickup | `pickup_credentials`; `pickup/service.ts`, `ScanController`, `OtpScreen`, `TicketCache` terenkripsi; token sekali pakai |
| C09 | Pengaduan | `complaints`/media/refund; `complaints/{service,repository}.ts`, `ComplaintController` dan layar bukti/tanggapan |
| C10 | Ulasan | `reviews`; `reviews/{service,repository}.ts`; `ReviewController`, `ReviewScreen`, `MerchantReviewsScreen` |
| C11 | RiwayatTransaksi | Query order/history pada `orders/repository.ts`; `HistoryScreen`, `SellerOrdersScreen`, `OrderDetailScreen` |

Path backend pada tabel setelah C02 disingkat relatif terhadap `backend/src/modules/`; path Flutter relatif terhadap `android-app/lib/`. Entity DPPL tidak dipaksakan menjadi kelas kosong: state diwujudkan lewat tabel/constraint, model typed, service dan repository. Perubahan alasan/desain dicatat di [laporan M9](../../docs/M9/K01_G06_Implementasi.md).
