# Visual — Data Angka Jadi Diagram, Seketika

Aplikasi web untuk mengubah data angka menjadi berbagai bentuk visual secara instan.
Cukup **tempel atau ketik** datanya, diagram langsung muncul. Tanpa build step, tanpa
dependensi eksternal, tanpa server — semuanya berjalan di browser.

**Demo langsung:** <https://denimulyawan.github.io/visual/>

---

## Fitur

| | |
|---|---|
| **13 jenis visual** | Batang, batang horizontal, garis, area, pie, donat, radar, sebaran, gelembung, peta panas, treemap, gauge, corong |
| **Langsung tampil** | Diagram diperbarui begitu data diketik (tanpa tombol) |
| **Tempel dari Excel** | Salin sel dari Excel / Google Sheets lalu tempel — pemisah Tab, koma, titik koma, dan `\|` dideteksi otomatis |
| **Editor tabel** | Mode tabel dengan sel yang bisa diedit, tombol tambah/hapus baris & kolom, navigasi Tab/Enter |
| **Format angka fleksibel** | `Rp 1.500.000`, `1,234.56`, `1.234,56`, `12,5%`, `(250)` = negatif, `1,2 jt` = 1.200.000 |
| **Pintar membaca data** | Deteksi baris judul, kolom label, kolom angka, dan kolom yang harus dilewati |
| **8 palet warna** | Samudra, Senja, Rimba, Beri, Permen, Korporat, Monokrom, Neon — plus tema terang & gelap |
| **Kustomisasi** | Judul, label sumbu, legenda, label nilai, garis bantu, urutan data, mode batang (berdampingan / bertumpuk / 100%), ketebalan garis, animasi |
| **Statistik otomatis** | Jumlah, rata-rata, median, min, maks, simpangan baku, dan banyak data per seri |
| **Ekspor** | PNG (2000×1120), SVG (vektor, bisa diedit), CSV, dan salin gambar ke clipboard |
| **Interaktif** | Tooltip berisi nilai saat kursor diarahkan ke elemen diagram |
| **Pribadi** | Data tidak pernah dikirim ke mana pun; tersimpan lokal di browser Anda |

---

## Cara memakai

1. Buka `index.html` (atau halaman demo).
2. Masukkan data di panel kiri — tempel dari Excel, ketik manual, atau muat berkas CSV.
3. Pilih jenis visual di panel kanan.
4. Atur tampilan lewat tombol **⚙ Opsi**, lalu unduh hasilnya.

Belum punya data? Pilih salah satu **Contoh data** di panel kiri.

---

## Format data

Data dibaca sebagai tabel. Baris pertama dianggap nama kolom bila terlihat seperti judul.

**Satu kolom angka** — tiap angka jadi satu batang:

```
Nilai
42
58
71
```

**Dua kolom** — kolom pertama label, kolom kedua nilai:

```
Bulan,Penjualan
Jan,120
Feb,185
Mar,164
```

**Tiga kolom atau lebih** — kolom pertama label, sisanya beberapa seri:

```
Bulan,Penjualan,Target
Jan,120,100
Feb,185,150
Mar,164,150
```

**Semua kolom angka** — kolom pertama dipakai sebagai sumbu X (ideal untuk
Sebaran & Gelembung), sisanya seri Y:

```
Tinggi,Berat
150,45
155,48
160,55
```

### Aturan pembacaan

- Kolom berisi teks di kolom pertama → dianggap **label kategori**.
- Kolom pertama berisi angka semua → dianggap **sumbu X numerik**.
- Kolom yang mayoritas bukan angka akan **dilewati** (dengan pemberitahuan).
- Sel kosong dibiarkan kosong (bukan nol), sehingga garis terputus di titik itu.
- Baris kosong dan baris berawalan `#` diabaikan.

### Format angka yang didukung

| Tulisan | Dibaca sebagai | Catatan |
|---|---|---|
| `1.500.000` | 1500000 | titik = pemisah ribuan |
| `1,234.56` | 1234.56 | gaya Inggris |
| `1.234,56` | 1234.56 | gaya Indonesia (pilih format angka **Indonesia**) |
| `12,5` | 12.5 | koma desimal |
| `Rp 2.500.000` | 2500000 | awalan mata uang diabaikan |
| `(250)` | −250 | tanda kurung = negatif |
| `12,5%` | 12.5 | tanda persen dilepas |
| `1,2 jt` | 1200000 | akhiran `rb`/`k`, `jt`/`juta`/`m`, `bn`/`miliar` |

Karena `1.234` bisa berarti seribu dua ratus tiga puluh empat **atau** satu koma dua
tiga empat, gunakan pilihan **Format angka** untuk memastikan hasilnya.

---

## Jenis visual

| Jenis | Paling cocok untuk |
|---|---|
| **Batang** | Membandingkan nilai antar kategori |
| **Batang Horizontal** | Kategori dengan nama panjang |
| **Garis** | Tren dari waktu ke waktu |
| **Area** | Tren sekaligus menunjukkan volume (bisa bertumpuk / 100%) |
| **Pie** | Porsi terhadap keseluruhan |
| **Donat** | Porsi dengan total di tengah |
| **Radar** | Perbandingan beberapa indikator antar entitas |
| **Sebaran** | Hubungan antara dua variabel |
| **Gelembung** | Tiga variabel sekaligus (X, Y, ukuran) |
| **Peta Panas** | Pola pada matriks data |
| **Treemap** | Komposisi bertingkat menurut ukuran |
| **Gauge** | Pencapaian terhadap target |
| **Corong** | Tahapan yang menyusut |

> Pie, donat, treemap, corong, dan gauge menggunakan **seri pertama** bila data
> memiliki lebih dari satu seri.

---

## Pintasan papan tombol

| Tombol | Fungsi |
|---|---|
| `Ctrl`/`Cmd` + `Enter` | Perbarui diagram |
| `Tab` | Pindah ke sel berikutnya (mode tabel) |
| `Enter` / `↑` / `↓` | Pindah baris (mode tabel) |

---

## Struktur proyek

```
visual/
├── index.html                 # aplikasi (satu halaman)
├── assets/
│   ├── css/style.css          # tampilan, tema terang & gelap
│   └── js/
│       ├── parse.js           # pembaca data, format angka, statistik, skala
│       ├── charts.js          # mesin gambar 13 visual (SVG murni)
│       └── app.js             # antarmuka: input, opsi, ekspor
├── tools/
│   ├── render-test.mjs        # uji otomatis semua jenis visual
│   └── galeri.html            # halaman pratinjau semua visual
├── data/contoh-penjualan.csv  # contoh berkas
└── README.md
```

---

## Menjalankan & menguji

Aplikasi tidak butuh proses build. Buka `index.html` langsung, atau jalankan server lokal:

```bash
python -m http.server 8080      # lalu buka http://localhost:8080
```

Menjalankan uji render (memeriksa seluruh jenis visual terhadap 9 kumpulan data,
termasuk nilai kosong, negatif, dan format angka Indonesia):

```bash
node tools/render-test.mjs
```

Melihat semua visual sekaligus: buka `tools/galeri.html`.

---

## Bagaimana diagram dibuat

Tidak memakai pustaka grafik apa pun. Setiap diagram disusun sebagai SVG murni
dengan warna, ukuran huruf, dan garis ditulis sebagai **atribut elemen** (bukan
kelas CSS). Konsekuensinya, hasil ekspor SVG/PNG tetap tampil benar di luar halaman
ini — misalnya saat ditempel ke dokumen, presentasi, atau diunggah ke media sosial.

Diagram memakai `viewBox` tetap `1000 × 560`, sehingga skalanya tetap tajam di
ukuran layar mana pun dan saat diekspor.

---

## Lisensi

[MIT](LICENSE) — bebas dipakai, diubah, dan dibagikan.
