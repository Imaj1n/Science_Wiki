# Science Wiki

**Science Wiki** adalah sebuah platform web interaktif berbasis web statis (HTML, CSS, JavaScript) yang berfungsi sebagai ensiklopedia sains. Proyek ini dilengkapi dengan navigasi kategori, fitur pencarian materi, serta komponen antarmuka yang interaktif.

---

## 📁 Struktur Repositori

```text
Science_Wiki/
├── index.html            # Halaman utama & struktur antarmuka ensiklopedia
├── README.md             # Dokumentasi proyek
├── script/
│   ├── script.js         # Logika utama (pencarian, navigasi dinamis, DOM event)
│   └── extras.js         # Fitur tambahan & utilitas pendukung
└── style/
    ├── style.css         # Tata letak dasar & styling umum
    ├── style2.css        # Komponen gaya sekunder & modul visual
    └── features.css      # Styling khusus komponen fitur interaktif
```

---

## 🛠️ Komponen & Teknologi

| Berkas / Direktori | Fungsi Utama |
| :--- | :--- |
| `index.html` | Menyusun struktur kerangka utama halaman ensiklopedia sains. |
| `script/script.js` | Mengatur manipulasi DOM, filter materi, dan fungsionalitas pencarian. |
| `script/extras.js` | Menangani fungsi utilitas tambahan dan modul interaksi ekstra. |
| `style/style.css` | Mengatur aturan desain global, *typography*, dan skema warna. |
| `style/style2.css` | Menyediakan tata letak alternatif dan elemen visual responsif. |
| `style/features.css` | Mengatur desain khusus untuk kartu konten, tombol, dan modul fitur. |

---

## 🚀 Cara Menjalankan Project

1. **Clone repositori ini:**
   ```bash
   git clone https://github.com/imaj1n/science_wiki.git
   ```

2. **Masuk ke direktori proyek:**
   ```bash
   cd science_wiki
   ```

3. **Buka aplikasi di browser:**
   - Cukup buka file `index.html` langsung dengan peramban web (Chrome, Edge, Firefox).
   - Atau gunakan ekstensi **Live Server** di VS Code untuk pengalaman pengembangan yang lebih akurat.

---

## 💻 Penggunaan

1. Gunakan kolom pencarian di halaman utama untuk mencari topik sains tertentu.
2. Filter materi berdasarkan kategori topik ilmu pengetahuan yang tersedia.
3. Nikmati tampilan yang sudah dioptimalkan untuk berbagai layar media.

---

## 📄 Lisensi

Proyek ini dibuat untuk tujuan edukasi dan pembelajaran open-source.

---

## ✍️ Editor: Render Manual, Sinkron Scroll & Variabel Reaktif

**Tombol Render (seperti Compile di Overleaf)**
- Mengetik tidak merender; status menjadi *Belum dirender*. Render lewat tombol **Render** atau **Ctrl/Cmd + Enter**.
- Centang **Auto-render** untuk render otomatis 0,9 detik setelah berhenti mengetik.

**Sinkron scroll** (centang *Sync scroll*, aktif secara default, hanya saat editor & pratinjau berdampingan)
- Scroll editor → pratinjau ke blok hasil render dari baris itu; scroll pratinjau → editor ke barisnya.
- Peta baris dihitung saat Render; setelah mengetik banyak sebelum Render, posisi bisa meleset sedikit.

**Variabel reaktif di dalam rumus** (tulis di dalam `$...$` / `$$...$$`; definisi boleh di mana saja)

| Sintaks | Arti |
| :--- | :--- |
| `\var{x = 3 [-10, 10]}` | definisikan x (nilai awal 3, rentang opsional `[min, maks, langkah]`), tampil sebagai angka yang bisa di-drag |
| `\var{x}` | tampilkan angka x (bisa di-drag) di tempat lain; semua kemunculan ikut berubah |
| `\sym{x}` | tampilkan **huruf** x yang bisa di-drag (tooltip menunjukkan nilai) |
| `\fn{f(x) = x^2}` | definisikan fungsi f; rumusnya tampil apa adanya |
| `\val{f(x)}` / `\valn{f(x)}{2}` | tampilkan hasil hitung (atau dibulatkan 2 desimal) |
| `\calc{y = f(x) + 1}` | hitung, simpan sebagai `y` (bisa dipakai di rumus lain), dan tampilkan nilainya |

Contoh:

```text
$$\fn{f(x) = x^{2}}$$
Dengan $x = \var{x = 3 [-10, 10]}$ maka $f(\var{x}) = \val{f(x)}$.
Hasilnya dipakai lagi: $y = \calc{y = f(x) + 1}$, sehingga $y^{2} = \val{y^{2}}$.
```

Catatan: ekspresi memakai sintaks mathjs (beberapa LaTeX dikonversi: `\cdot \times \frac \sqrt ^{ } \pi \sin`). Hindari `*` di dalam `$...$` (dibaca markdown sebagai cetak miring); pakai `\cdot` atau spasi.
Klik dua kali pada angka mengembalikannya ke nilai awal. Tidak berlaku di blok `steps` dan `graph`.

---

## 🎲 Distribusi & variabel acak

Distribusi tersedia: **Normal, LogNormal, Uniform, Exponential, Bernoulli, Binomial, Poisson, Geometric** (`script/random.js`).
Angka acak memakai *seed* (hasil bisa diulang persis).

**Di flow engine** (kode node)
- `random()`, `normal(mu, sigma)`, `lognormal`, `uniform(a, b)`, `exponential(rate)`, `bernoulli(p)`, `binomial(n, p)`, `poisson(lambda)`, `geometric(p)`, `randint(a, b)`, `choice(larik)`, `shuffle(larik)`, `times(n, fn)`.
  Tambahkan jumlah sebagai argumen terakhir untuk mendapat larik: `xs = normal(0, 1, 500)`.
- Fungsi peluang: `normpdf(x, mu, s)`, `normcdf`, `norminv`, `binompmf(k, n, p)`, `binomcdf`, `poissonpmf`, `expcdf`, `unifpdf`, ... (awalan `norm unif exp lognorm bern binom poisson geom` + `pdf`/`pmf`/`cdf`/`inv`).
- `seed: 42` pada diagram membuat hasil tetap; tanpa `seed:` seed dipilih acak saat dimuat. Tombol **🎲 Acak ulang** (muncul otomatis) mengambil seed baru; *Ulangi*, *Mundur*, dan *Eksplorasi* memakai seed yang sama.
- Tampilan histogram: `view: hist | variabel | jumlah-bin atau auto | Distribusi(param)`
  contoh `view: hist | xs | auto | Normal(mu, 1)` — larik atau nilai tiap langkah digambar sebagai histogram, kurva/massa teoretis berwarna merah, plus n, rata-rata, s, μ, σ.

**Di variabel reaktif** (dalam `$...$`)
- `\rv{z \sim Normal(x, 1)}` — peubah acak; parameter boleh memakai variabel lain. Seret = geser persentil, klik = sampel baru, klik dua kali = sampel awal. Tooltip menampilkan grafik distribusi dan F(z). Gunakan `\sim` (bukan `~`) agar tidak dibaca markdown.
- `\val{normcdf(3, x, 1)}`, `\val{k + 1}`, `\calc{w = 2 \cdot z}` bekerja dengan peubah acak seperti variabel biasa.
- Nilai awal setiap peubah acak ditentukan namanya (deterministik); u yang sama dipakai saat parameter berubah, jadi `z - x` tetap saat `x` di-drag.

## 🎨 Syntax highlighting editor
Centang **Highlight** (aktif default). Mewarnai heading, rumus (perintah LaTeX, `\var \fn \val \calc \rv`, nama distribusi), kode inline, `[[tautan]]`, `{{istilah}}`, `#tag`, callout `:::`, kutipan, daftar, tabel, komentar HTML, blok kode (python, js, cpp, julia, dll.) dan blok ```` ```flow ````.
Dokumen > ±60 KB diwarnai satu frame setelah mengetik; > 300 KB ditampilkan polos.
