# Aplikasi Android SisaRasa

Panduan lengkap: [../README.md](../README.md).

```bash
flutter pub get --enforce-lockfile
flutter run --dart-define=API_BASE=http://10.0.2.2:3100
```

Backend harus sudah hidup. HTTP hanya di build debug. Pada perangkat fisik gunakan endpoint HTTPS. Release menonaktifkan backup dan cleartext, memerlukan signing key privat, dan tidak memakai debug signature.

Antarmuka mengikuti desain final di `../design/sisarasa.figcraft`. Warna/typography ada pada `lib/core/theme/`; ilustrasi vektor pada `lib/core/widgets/brand_art.dart`. Pengaturan infrastruktur tersembunyi secara default; untuk build operator khusus tambahkan `--dart-define=DEVELOPER_SETTINGS=true`. Jangan aktifkan untuk distribusi pengguna.
