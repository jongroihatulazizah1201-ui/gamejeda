# PRD JEDA: Pedoman Build dengan Antigravity dan Phaser

Nov 15, 2026 · @popi

Dokumen ini adalah satu-satunya sumber kebenaran untuk membangun demo JEDA: game mindfulness desktop 3 level, dibuat dengan Phaser 3, satu folder proyek, tanpa backend, dan siap di-deploy ke Netlify. Isi dokumen ini mengikuti Dokumen Rancangan JEDA. Bila ada selisih, **PRD ini yang berlaku** (lihat catatan keputusan di bagian 6).

**Mencari tujuan belajar, level, skor, atau tantangan?** Semuanya ada di **bagian 1**, tepat di bawah tabel Ruang Lingkup. Rumus skor lengkap ada di bagian 6.

## 1. Ruang Lingkup

|  | Isi |
| --- | --- |
| **Tujuan build** | Demo HTML interaktif 5 layar, satu alur utama dari awal sampai akhir, memenuhi syarat tugas IODA |
| **Platform** | Desktop saja (mouse + keyboard), layar 1920x1080 yang diskalakan mengikuti jendela browser |
| **Bahasa** | Seluruh teks game dalam Bahasa Indonesia |
| **Bukan tujuan** | Backend, login, database, suara berbayar, aset gambar, dukungan HP, akun pengguna |
| **Aturan bisnis wajib terlihat di demo** | BR-01 (kunci level), BR-03 (notifikasi palsu), BR-05 (anti panik klik), BR-09 (check-in distres). Syarat tugas hanya minimal dua, jadi empat ini memberi cadangan |

**Layar demo (5):** Check-in, Level 1 Napas, Level 2 Awan Pikiran, Level 3 Jeda, Hasil. Layar Boot dan Pause bukan layar utama.

### Tujuan Belajar dan Mekanik Permainan

Setiap mekanik di PRD ada karena melatih satu tujuan belajar dari Dokumen Rancangan JEDA (bagian 2). Kode K = kognitif, A = afektif, P = psikomotorik.

| Kode | Tujuan: setelah bermain, pemain mampu... | Mekanik yang melatih | Yang terlihat di demo |
| --- | --- | --- | --- |
| K1 | Menjelaskan arti mindfulness dengan bahasa sendiri | Kartu pengantar 3 kalimat sebelum Level 1, lalu latihan napas | Kartu pengantar muncul sebelum orb |
| K2 | Mengelompokkan pikiran: cemas, rencana, menilai diri, kenangan | Level 2: seret 10 gelembung ke 4 keranjang label | Skor Akurasi label |
| K3 | Membedakan reaksi otomatis dan respons sadar | Level 3: pilihan Langsung bereaksi atau Jeda dengan STOP, dengan konsekuensi cerita berbeda | Dua jalur cerita di tiap skenario |
| K4 | Menerapkan langkah STOP pada situasi baru | Level 3: empat langkah S, T, O, P | Huruf S, T, O, P terisi satu per satu |
| A1 | Menyadari dan menamai emosi | Check-in memilih skor dan label emosi, serta langkah Observe | Label emosi di layar 1 dan langkah O |
| A2 | Menerima pikiran tanpa menilai | Level 2: gelembung berubah menjadi awan, umpan balik lembut tanpa hukuman | Gelembung terangkat menjadi awan |
| A3 | Menghargai jeda sebelum bertindak | Meter emosi turun 30 saat memilih STOP, serta perbandingan check-in awal dan akhir | Meter emosi dan layar Hasil |
| P1 | Mengatur ritme napas 4 detik tarik, 6 detik hembus | Level 1: tahan dan lepas mengikuti orb | Titik siklus hijau, kuning, atau merah muda |
| P2 | Mengendalikan gerakan tangan dengan tenang | Level 1: tidak mengklik notifikasi palsu. Level 2: seret tepat ke keranjang | Skor Ketahanan dan Tenang |
| P3 | Menjalankan urutan STOP dengan lancar | Level 3: STOP tanpa petunjuk. Mode ramah memberi petunjuk tambahan | Langkah STOP tanpa bantuan |

**Tambahan yang diminta tabel ini:** Level 1 perlu satu kartu pengantar singkat (untuk K1), dengan isi sekitar tiga kalimat: apa itu mindfulness (memperhatikan saat ini tanpa menghakimi), kenapa napas jadi jangkar, dan cara bermain. Kartu muncul sekali sebelum siklus pertama dan bisa dilewati dengan tombol Lanjut.

**Ringkasan mekanik: level, tantangan, dan skor**

|  | Level 1: Napas | Level 2: Awan Pikiran | Level 3: Jeda di Situasi Nyata |
| --- | --- | --- | --- |
| **Tujuan belajar utama** | K1, P1, P2 | K2, A2, P2 | K3, K4, A3, P3 |
| **Mekanik inti** | Tahan dan lepas tombol mengikuti orb (tarik 4 detik, hembus 6 detik), 6 siklus | Seret 10 gelembung pikiran ke 4 keranjang label | 3 skenario bercabang: Langsung bereaksi atau Jeda dengan STOP (4 langkah) |
| **Tantangan** | Menjaga ritme dan tidak menekan notifikasi palsu | Melabeli pikiran dengan tepat dan tidak panik klik | Memilih jeda, mengenali emosi, dan memilih respons terbaik |
| **Skor Sadar (0 sampai 100)** | 60% Sinkron, 30% Ketahanan, 10% Konsisten | 70% Akurasi, 20% Tenang, 10% Selesai | 40% Jeda, 40% Respons, 20% Observe |
| **Syarat membuka level berikutnya** | Skor 60 atau lebih | Skor 60 atau lebih | Menutup permainan di layar Hasil |
| **Bobot ke skor akhir** | 25% | 30% | 45% |

**Progres dan hadiah:** bintang per level (60 sampai 79 satu bintang, 80 sampai 89 dua, 90 ke atas tiga), skor terbaik tersimpan, dan pada revisi 3D tiap level lulus menyalakan satu lentera di taman (bagian 13). **Tanpa timer yang menekan**, karena tekanan waktu bertentangan dengan tujuan mindfulness.

## 2. Keputusan Teknis

| Keputusan | Pilihan | Alasan |
| --- | --- | --- |
| Engine | **Phaser 3.80.1**, file `phaser.min.js` disimpan di folder `lib/` | Versi dikunci agar kode dari agent tidak memakai API Phaser 4. File lokal membuat demo tetap jalan saat internet Zoom tidak stabil |
| Modul JS | **Script klasik** (`<script src>` berurutan) dengan satu namespace global `JEDA`. Tanpa `import`/`export` | ES module gagal dibuka lewat `file://`. Dengan script klasik, `index.html` bisa dibuka langsung dari folder |
| Visual | Semua grafik dibuat lewat kode (Graphics dan `generateTexture`), tanpa file gambar | Cepat, ringan, dan tidak ada risiko aset hilang |
| Font | Nunito disimpan lokal di folder fonts/ (woff2 berat 400, 600, 800) dan didaftarkan lewat @font-face, dengan cadangan `Arial, sans-serif` | Font tetap termuat saat dibuka lewat file://. Game menunggu font paling lama 1500 ms, lalu jalan dengan cadangan |
| Penyimpanan | `localStorage` dengan `try/catch` | Syarat BR-14. Cukup untuk progres dan pengaturan |
| Suara | **Tidak ada di versi inti.** Opsional di fase 6 memakai WebAudio sederhana | Browser memblokir suara otomatis, dan BR-12 meminta suara mati secara default |
| Deploy | Netlify Drop (seret folder), uji di jendela incognito | Syarat pengumpulan tugas |

## 3. Struktur Proyek

```text
jeda/
  index.html          # memuat font, phaser, lalu semua file js sesuai urutan
  PRD.md              # salinan dokumen ini untuk agent
  lib/phaser.min.js   # Phaser 3.80.1, diunduh sekali
  css/style.css       # @font-face Nunito, latar halaman, pusatkan canvas
  fonts/              # nunito-400, nunito-600, nunito-800 (woff2)
  js/
    config.js         # konstanta, palet, teks (namespace JEDA.CFG)
    data.js           # pikiran Level 2, skenario Level 3, label emosi
    state.js          # JEDA.State: simpan/muat progres, pengaturan, hitung hari
    score.js          # JEDA.Score: fungsi murni penghitung skor
    guard.js          # JEDA.Guard: deteksi panik klik, idle, tab tersembunyi
    ui.js             # helper: panel kaca, tombol, bintang, toast, modal
    fx.js             # helper: latar gradasi, partikel, orb bercahaya
    scenes/
      boot.js         # buat tekstur, muat font, lanjut ke Checkin
      checkin.js      # layar 1
      level1.js       # layar 2
      level2.js       # layar 3
      level3.js       # layar 4
      result.js       # layar 5
      pause.js        # overlay jeda
    main.js           # new Phaser.Game dengan daftar scene
```

Urutan `<script>` di `index.html` harus: `phaser.min.js`, `config`, `data`, `state`, `score`, `guard`, `fx`, `ui`, semua `scenes/*`, terakhir `main`.

## 4. Desain Visual

Tujuannya tampak seperti game polesan, tetapi tetap cepat dibuat. Semua dibangun dari bentuk, gradasi, cahaya, dan gerak halus.

**Palet (simpan di `CFG.COLOR`):**

| Token | Hex | Pemakaian |
| --- | --- | --- |
| `bgTop` | `#16163A` | atas latar |
| `bgMid` | `#2B4C7E` | tengah latar |
| `bgBottom` | `#E8A598` | cakrawala hangat di bawah |
| `calm` | `#7FE0C3` | sinkron, benar, tenang |
| `warn` | `#FFD27A` | agak meleset |
| `off` | `#FF8FA3` | jauh dari ritme, salah |
| `text` | `#F4F1FF` | teks utama |
| `muted` | `#B9B5D6` | teks sekunder |
| `panel` | `#FFFFFF` alpha 0,08 | isi panel kaca |
| `panelLine` | `#FFFFFF` alpha 0,20 | garis tepi panel |

**Teknik yang dipakai (semua murah):**

1. **Latar gradasi senja:** satu tekstur kanvas dengan `addColorStop`, ditambah 40 titik debu bercahaya yang melayang lambat (partikel).
2. **Vinyet:** satu tekstur radial gelap di tepi layar, alpha 0,35.
3. **Panel kaca:** rounded rectangle isi `panel`, garis `panelLine` 1,5 px, sudut 24 px.
4. **Orb napas:** tiga lingkaran bertumpuk (inti, cincin dalam, cincin luar) dengan blend mode `ADD` dan alpha berbeda, ditambah emitter partikel kecil yang berputar pelan di sekelilingnya.
5. **Gerak:** semua tween memakai `Sine.easeInOut`. Transisi antar scene: `cameras.main.fadeOut(350)` lalu `fadeIn(350)`.
6. **Tipografi:** judul Nunito 800, isi Nunito 600. Ukuran: judul 66, subjudul 42, isi 33, keterangan 27. Semua objek Text memakai setResolution(2) agar huruf tajam.
7. **Tombol:** panel kaca dengan hover naik 2 px dan cahaya menguat. Status terkunci memakai alpha 0,4 dan ikon gembok yang digambar dengan Graphics.
8. **Umpan balik:** warna orb dan kata pendek di atasnya ("Pas", "Sedikit meleset", "Kembali ke napas") berubah sesuai ketepatan.

**Mode kurangi gerakan (BR-12):** mematikan partikel melayang dan semua guncangan kamera. Tween napas tetap jalan karena itu inti permainan, tetapi tanpa efek tambahan.

## 5. Spesifikasi Layar

Semua koordinat untuk kanvas 1920x1080. Tulis posisi sebagai turunan W dan H (misalnya W/2, H/2), bukan angka tetap. Konfigurasi Phaser: `type: Phaser.AUTO`, `scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }`.

### 5.1 Layar 1: Check-in (`CheckinScene`)

1. Panel tengah berisi judul **JEDA**, subjudul "Latihan berhenti sejenak", dan disclaimer kecil: "JEDA adalah latihan, bukan pengganti bantuan profesional."
2. Pertanyaan "Bagaimana perasaanmu sekarang?" dengan 5 tombol bulat berlabel 1 sampai 5 (1 = sangat tertekan, 5 = sangat tenang).
3. Pilihan satu label emosi dari: Tenang, Lelah, Cemas, Kewalahan, Sedih, Panik, **Aku merasa tidak aman**.
4. Tombol **Mulai** aktif hanya jika skor dan label sudah dipilih.
5. Di bawah ada daftar tiga kartu level (Napas, Awan Pikiran, Jeda) dengan bintang terbaik dan gembok sesuai BR-01. Kartu level terbuka diklik langsung untuk melompat ke level itu.
6. Pojok kanan atas: ikon pengaturan (kurangi gerakan, hapus data saya).
7. Jika skor = 1 atau label = Panik atau Aku merasa tidak aman, tampil modal peduli sesuai BR-09.

### 5.2 Layar 2: Level 1 Napas (`Level1Scene`)

- Orb di tengah layar (pusat di W/2, H/2). Teks petunjuk di atasnya: "Tahan untuk menarik napas, lepas untuk menghembuskan."
- **Input:** tahan tombol kiri mouse **atau** tahan Spasi. Orb mengembang selama ditahan, mengecil selama dilepas.
- Progres siklus: 6 titik di bawah orb, terisi sesuai ketepatan (hijau, kuning, merah muda).
- Notifikasi palsu: kartu kaca kecil muncul dari tepi kanan ("Grup Kelas: PING!", "Diskon 50% hari ini", "Kamu punya 12 pesan baru"), tinggal 5 detik. Boleh diklik, tetapi jangan (BR-03).
- Akhir level: panel ringkasan skor dan umpan balik, tombol **Lanjut** (jika lulus) atau **Ulangi**.

### 5.3 Layar 3: Level 2 Awan Pikiran (`Level2Scene`)

- Langit gradasi, 10 gelembung pikiran muncul satu per satu (maks 4 di layar) dan melayang pelan dari kiri ke kanan.
- Empat keranjang label di bawah, tiap keranjang bentuk awan kecil: **Cemas, Rencana, Menilai Diri, Kenangan**.
- **Input:** seret gelembung ke keranjang. Lepas di luar keranjang, gelembung kembali melayang.
- Benar: gelembung berubah menjadi awan putih dan terangkat ke atas lalu hilang. Salah: gelembung bergetar ringan, keranjang menampilkan petunjuk teks, gelembung kembali.
- Jika 4 gelembung menumpuk lebih dari 8 detik, muncul ajakan "Tarik napas sebentar" dengan satu siklus napas mini (pemain menahan 4 detik lalu melepas).

### 5.4 Layar 4: Level 3 Jeda (`Level3Scene`)

Tiga skenario berurutan (data di bagian 8). Tiap skenario:

1. Kartu pemicu dan meter emosi (bar horizontal, mulai 70).
2. Dua tombol besar: **Langsung bereaksi** dan **Jeda dengan STOP**.
3. Jalur reaksi: tampil konsekuensi, meter naik 15, lalu skenario berikutnya.
4. Jalur STOP (4 langkah, ditandai huruf S, T, O, P di atas): **S**, tekan tombol Stop (orb membeku); **T**, satu siklus napas mini; **O**, pilih emosi yang dirasakan; **P**, pilih satu dari tiga respons. Meter turun 30.
5. Setelah tiga skenario, masuk layar Hasil.

### 5.5 Layar 5: Hasil (`ResultScene`)

Skor tiap level dan skor akhir, bintang (animasi muncul satu per satu), perbandingan check-in awal dan akhir (pemain memilih ulang skor 1 sampai 5), satu kalimat refleksi sesuai BR-10, tombol **Main lagi** dan **Menu**. Bila BR-11 aktif, tampil pengingat istirahat.

### 5.6 Overlay Pause (`PauseScene`)

Dibuka otomatis saat tab tidak aktif (BR-08) atau tidak ada input 60 detik (BR-06). Menampilkan "Dijeda. Lanjut kapan pun kamu siap." dan tombol **Lanjut**.

## 6. Konfigurasi dan Rumus Skor

```js
JEDA.CFG = {
  W: 1920, H: 1080,
  PASS: 60,
  L1: { cycles: 6, inMs: 4000, outMs: 6000, tolFull: 1000, tolHalf: 2000,
        holdMaxMs: 8000, holdMinMs: 1000, distractLife: 5000, distractPenalty: 20 },
  L1_EASY: { inMs: 3000, outMs: 4000, tolFull: 1500, tolHalf: 2500 },
  L2: { thoughts: 10, maxOnScreen: 4, pileUpMs: 8000, panicPenalty: 25 },
  L3: { scenarios: 3, meterStart: 70, meterReact: 15, meterStop: -30 },
  GUARD: { spamActions: 5, spamWindowMs: 3000, spamPauseMs: 3000,
           idleHintMs: 15000, idlePauseMs: 60000 },
  WEIGHT: { l1: 0.25, l2: 0.30, l3: 0.45 },
  STARS: [60, 80, 90],
  FAILS_FOR_EASY: 3, RUNS_PER_DAY_NOTE: 3
};
```

**Level 1.** Tiap siklus punya dua ukuran: lama tahan (target `inMs`) dan lama lepas sampai tahan berikutnya (target `outMs`). Ketepatan satu ukuran: 1 bila selisih ≤ `tolFull`, 0,5 bila ≤ `tolHalf`, selain itu 0. Nilai siklus = rata-rata dua ukuran. Tahan di atas `holdMaxMs` dihentikan otomatis (BR-04), di bawah `holdMinMs` tidak dihitung dan siklus diulang.

```text
Sinkron   = rata-rata nilai siklus x 100
Ketahanan = max(0, 100 - 20 x jumlah notifikasi palsu yang diklik)
Konsisten = (rangkaian terpanjang siklus dengan nilai >= 0,75) / 6 x 100
Skor L1   = 0,6 Sinkron + 0,3 Ketahanan + 0,1 Konsisten
```

**Level 2.**

```text
Akurasi   = (gelembung benar di percobaan pertama) / 10 x 100
Tenang    = max(0, 100 - 25 x jumlah kejadian panik klik)
Selesai   = (gelembung terselesaikan) / 10 x 100
Skor L2   = 0,7 Akurasi + 0,2 Tenang + 0,1 Selesai
```

**Level 3.** Jalur reaksi bernilai respons 0. Jalur STOP bernilai sesuai pilihan respons (terbaik 100, cukup 60, kurang tepat 0).

```text
Jeda      = (jumlah skenario yang memilih STOP) / 3 x 100
Respons   = rata-rata nilai respons tiga skenario
Observe   = rata-rata (emosi dipilih sesuai kunci skenario ? 100 : 0) pada jalur STOP; 0 bila tidak ada jalur STOP
Skor L3   = 0,4 Jeda + 0,4 Respons + 0,2 Observe
```

**Akhir.** Skor akhir = 0,25 L1 + 0,30 L2 + 0,45 L3. Bintang per level: 60 sampai 79 satu bintang, 80 sampai 89 dua, 90 ke atas tiga, di bawah 60 belum lulus. Semua nilai dibulatkan ke bilangan bulat di tahap akhir saja.

**Catatan keputusan (PRD menimpa dokumen rancangan):**

1. Syarat lulus Level 2 hanya **skor ≥ 60**. Panik klik cuma mengurangi komponen Tenang, tidak memblokir kelulusan. Dokumen rancangan menyebut "tidak ada panik klik" sebagai syarat dan itu tidak konsisten dengan rumus skor.
2. Komponen Level 3 "Penyelesaian STOP" diganti **Observe** (kecocokan emosi yang dipilih), karena jalur STOP selalu diselesaikan penuh dan komponen lama akan selalu sama dengan komponen Jeda.
3. Pilihan respons terburuk bernilai 0 meski pemain sudah menjeda. Alasannya, jeda saja belum cukup. Respons juga perlu dipilih dengan sadar.

## 7. Aturan Bisnis dan Implementasinya

Prioritas: **P0** wajib jadi dan terlihat di demo, **P1** sebaiknya jadi, **P2** hanya jika waktu cukup.

| Kode | Prioritas | Perilaku di kode | Tempat | Cara uji |
| --- | --- | --- | --- | --- |
| BR-01 | P0 | Level 2 terbuka bila `best.l1 >= 60`, Level 3 bila `best.l2 >= 60`. Kartu terkunci menampilkan gembok dan toast "Selesaikan Level 1 dulu" saat diklik | `state.js`, `checkin.js` | Hapus data, klik Level 2, harus terkunci |
| BR-02 | P1 | Level bisa diulang tanpa batas, skor terbaik yang disimpan (`max`) | `state.js` | Main ulang dengan skor lebih rendah, bintang tetap |
| BR-03 | P0 | Klik notifikasi palsu menambah `distractHits`, toast "Perhatianmu tadi pergi. Kembali ke napas.", orb berkedip `off` | `level1.js` | Klik 3 notifikasi, Ketahanan = 40 |
| BR-04 | P1 | Tahan > 8 s berhenti otomatis, tahan < 1 s tidak dihitung dan siklus diulang | `level1.js` | Tahan 10 s, lepas cepat |
| BR-05 | P0 | Lebih dari 5 `pointerdown` dalam 3 s di level 2 atau 3 memunculkan overlay "Pelan-pelan. Tarik napas dulu.", input mati 3 s, `panicHits` +1 | `guard.js` | Klik cepat sampai overlay muncul |
| BR-06 | P1 | 15 s tanpa aksi: petunjuk lembut. 60 s: buka Pause | `guard.js` | Diamkan layar |
| BR-07 | P1 | `failCount[level] >= 3` menawarkan mode ramah (`L1_EASY`, petunjuk tambahan di Level 2 dan 3). Skor ditandai "mode ramah" | `state.js`, tiap level | Gagal 3 kali berturut-turut |
| BR-08 | P1 | Event `visibilitychange` (hidden) membuka Pause dan menghentikan timer siklus | `guard.js`, `pause.js` | Pindah tab |
| BR-09 | P0 | Check-in skor 1, label Panik, atau Aku merasa tidak aman membuka modal peduli: teks hangat, **119 ext. 8** dan **healing119.id** berdampingan, catatan bahwa layanan bukan pengganti perawatan profesional. Tombol: **Latihan napas ringan** (hanya Level 1 mode ramah) dan **Aku sudah lebih baik, lanjutkan**. Level 2 dan 3 tetap tertutup sampai pemain memilih tombol kedua | `checkin.js`, `ui.js` | Pilih skor 1 |
| BR-10 | P1 | Check-in akhir < awal: "Perasaan bisa naik turun. Mengamatinya sudah bagian dari latihan." Tidak ada klaim berhasil | `result.js` | Pilih skor akhir lebih rendah |
| BR-11 | P2 | `runsToday >= 3` memunculkan pengingat istirahat di Hasil | `state.js`, `result.js` | Selesaikan 3 run |
| BR-12 | P1 | Pengaturan kurangi gerakan, suara mati default, teks selalu menyertai umpan balik warna | `ui.js`, `fx.js` | Aktifkan pengaturan |
| BR-13 | P1 | Tidak ada input nama atau data pribadi. Tombol **Hapus data saya** menghapus `localStorage` kunci `jeda_v1` | `state.js` | Klik tombol, data kosong |
| BR-14 | P1 | Bila data rusak atau tidak ada, mulai dari awal dengan toast ramah, tanpa error | `state.js` | Ketik `localStorage.setItem('jeda_v1','{{')` lalu muat ulang |

## 8. Konten Data

### 8.1 Gelembung pikiran Level 2 (`JEDA.DATA.thoughts`)

| No | Teks | Kategori |
| --- | --- | --- |
| 1 | Aku pasti gagal presentasi besok. | Cemas |
| 2 | Besok pagi aku bagi tugas kelompok dulu. | Rencana |
| 3 | Kenapa aku begini terus? | Menilai Diri |
| 4 | Waktu itu aku salah bicara di kelas. | Kenangan |
| 5 | Bagaimana kalau IPK-ku turun? | Cemas |
| 6 | Nanti malam aku cicil bab dua. | Rencana |
| 7 | Aku nggak sepintar teman-temanku. | Menilai Diri |
| 8 | Dulu dosen pernah menegurku di depan semua orang. | Kenangan |
| 9 | Kalau dosen marah, aku harus bagaimana? | Cemas |
| 10 | Aku harus balas pesan grup sebelum jam lima. | Rencana |

Urutan kemunculan diacak, kecuali tidak boleh ada tiga kategori sama berturut-turut. Petunjuk salah label: kalimat pendek seperti "Pikiran ini tentang rencana ke depan, bukan kekhawatiran." Setiap pikiran perlu satu petunjuk.

### 8.2 Skenario Level 3 (`JEDA.DATA.scenarios`)

|  | Skenario 1: Email belum dibalas | Skenario 2: Teman tidak mengerjakan | Skenario 3: Kritik di depan kelas |
| --- | --- | --- | --- |
| **Pemicu** | Dua hari email revisi skripsimu belum dibalas dosen. Tenggat besok. | Rani belum mengirim bagiannya. Presentasi 3 jam lagi, grup ramai. | Dosen bilang slide-mu kurang jelas di depan seluruh kelas. |
| **Konsekuensi reaksi langsung** | Kamu mengirim tiga pesan beruntun yang menekan. Balasan dosen makin singkat. | Kamu menulis di grup bahwa semua orang tidak bertanggung jawab. Suasana tegang dan Rani menghilang. | Kamu membantah di depan kelas. Diskusi berubah canggung dan kamu pulang dengan pikiran berat. |
| **Kunci emosi (Observe)** | Cemas, Kesal | Kesal, Cemas | Malu, Kesal |
| **Respons terbaik (100)** | Kirim satu pesan sopan menanyakan waktu terbaik, lalu kerjakan bagian lain dulu. | Hubungi Rani langsung, tanyakan kendalanya, tawarkan pembagian ulang. | Catat poinnya, ucapkan terima kasih, minta contoh perbaikan setelah kelas. |
| **Respons cukup (60)** | Menunggu sampai besok tanpa melakukan apa-apa. | Minta anggota lain mengambil alih tanpa bicara dengan Rani. | Diam dan menghindari dosen setelah kelas. |
| **Respons kurang tepat (0)** | Kirim pesan marah karena merasa diabaikan. | Mengerjakan semuanya sendiri sambil menyimpan kesal. | Mengeluh ke teman sekelas saat itu juga. |

Setiap skenario menampilkan empat pilihan emosi di langkah Observe: dua kunci ditambah dua pengecoh (misalnya Senang, Bosan). Pilihan emosi boleh satu saja. Nilainya 100 bila yang dipilih termasuk kunci.

## 9. State dan Penyimpanan

Kunci `localStorage`: `jeda_v1`.

```js
{
  v: 1,
  best:   { l1: 0, l2: 0, l3: 0 },
  stars:  { l1: 0, l2: 0, l3: 0 },
  fails:  { l1: 0, l2: 0, l3: 0 },
  easy:   { l1: false, l2: false, l3: false },
  settings: { reduceMotion: false, sound: false },
  runs:   { date: '2026-11-16', count: 0 },
  consentHeavy: false
}
```

State sementara satu sesi (tidak disimpan): `checkinStart`, `checkinLabel`, `levelScores`, `distractHits`, `panicHits`. `consentHeavy` hanya berlaku untuk sesi berjalan dan kembali ke `false` saat check-in baru. Semua akses `localStorage` dibungkus `try/catch`. Bila `JSON.parse` gagal atau `v !== 1`, pakai nilai awal dan tampilkan toast.

**Mode debug:** bila URL berakhir `?debug=1`, tampilkan nilai skor di pojok dan aktifkan tombol `U` (buka semua level) dan `R` (reset data). Ini mempercepat pengujian dan latihan demo.

## 10. Fase Kerja dan Kriteria Selesai

Total perkiraan sekitar 6 jam kerja. Bila tenggatmu pukul 09.00 besok pagi, pakai jalur darurat di bawah tabel.

| Fase | Isi | Perkiraan | Selesai bila |
| --- | --- | --- | --- |
| P0 | Kerangka proyek: struktur folder, `index.html`, `phaser.min.js`, `config.js`, `main.js`, `BootScene` dengan latar gradasi dan font | 30 menit | Buka `index.html`, latar senja dan teks "JEDA" tampil |
| P1 | `state.js`, `guard.js`, `ui.js`, `fx.js`, `CheckinScene` lengkap dengan BR-01 dan BR-09 | 60 menit | Skor 1 memunculkan modal peduli. Level 2 terkunci pada data kosong |
| P2 | `score.js` (fungsi murni) dan `Level1Scene` lengkap dengan BR-03, BR-04 | 90 menit | Enam siklus bisa dimainkan, skor muncul, notifikasi palsu mengurangi Ketahanan |
| P3 | `Level2Scene` lengkap dengan BR-05 | 75 menit | Sepuluh gelembung bisa diseret dan dilabeli, klik cepat memicu overlay |
| P4 | `Level3Scene` dengan tiga skenario dan jalur STOP | 75 menit | Dua jalur (reaksi dan STOP) berjalan di ketiga skenario |
| P5 | `ResultScene`, `PauseScene`, BR-06, 07, 08, 10, 12, 13, 14 | 60 menit | Satu alur penuh dari Check-in sampai Hasil tanpa error di konsol |
| P6 | Poles visual, pengujian, deploy | 45 menit | Checklist di bagian 12 lengkap |

**Jalur darurat (waktu kurang dari 4 jam):** kerjakan P0, P1, P2, P3, P4 dengan fitur P0 saja, ResultScene versi sederhana, lalu P6. Tunda BR-04, 06, 07, 08, 10 sampai 14 dan semua efek partikel tambahan. Jangan menghapus Level 3 karena itulah bobot terbesar.

**P0.5 Poles visual (30 sampai 40 menit, setelah P0, sebelum P1):** bangun sekali helper tampilan di `fx.js` dan `ui.js` (latar berlapis, orb bercahaya, panel kaca, tombol kapsul) supaya semua layar berikutnya otomatis terlihat bagus. Selesai bila judul JEDA tajam dengan huruf Nunito, orb bercahaya bernapas, dan tombol Mulai punya efek hover. Setelah fase ini, jangan poles lagi sampai Level 3 selesai.

## 11. Aturan untuk Agent dan Prompt Antigravity

Salin bagian ini ke file aturan proyek bila Antigravity-mu mendukungnya, dan selalu simpan PRD ini sebagai `PRD.md` di folder proyek.

**Aturan untuk agent:**

1. Baca `PRD.md` penuh sebelum menulis kode. Jangan menambah fitur di luar PRD.
2. Pakai Phaser 3.80.1. Jangan memakai API Phaser 4.
3. Script klasik dengan namespace `JEDA`. Dilarang `import`, `export`, bundler, npm, dan framework tambahan.
4. Tanpa file gambar atau suara; satu-satunya aset adalah file font lokal. Semua grafik lewat kode.
5. Semua teks game Bahasa Indonesia. Semua angka konfigurasi diambil dari `JEDA.CFG`, tidak ditulis ulang.
6. Fungsi skor di `score.js` murni (tanpa Phaser dan tanpa DOM) supaya bisa diuji di konsol.
7. Beri komentar singkat berbahasa Indonesia di awal tiap file dan tiap fungsi penting, menjelaskan tujuannya.
8. Setelah tiap fase: berikan daftar file yang berubah dan cara mengujinya. Jangan lanjut ke fase berikutnya sebelum diminta.

**Prompt P0 (kerangka):**

> Baca PRD.md. Kerjakan fase P0 saja. Buat struktur folder bagian 3, index.html dengan urutan script yang benar, config.js sesuai bagian 6, main.js, dan BootScene yang membuat tekstur latar gradasi, vinyet, dan titik debu, memuat font Nunito, lalu menampilkan judul JEDA di atas latar. Phaser dimuat dari lib/phaser.min.js. Jelaskan cara menjalankannya dan hentikan setelah P0.

**Prompt P0.5 (poles visual):**

> Baca PRD.md bagian 4. Kerjakan hanya P0.5, jangan mulai P1. Masalah sekarang: teks buram, font Nunito belum termuat, dan tidak ada hierarki visual. Perbaiki: (1) CFG.W dan CFG.H menjadi 1920 dan 1080, semua posisi turunan W dan H, ukuran font sesuai bagian 4, render antialias aktif, semua Text memakai setResolution(2). (2) Font Nunito lokal di fonts/ lewat @font-face, tunggu document.fonts.load sebelum new Phaser.Game dengan batas 1500 ms. (3) fx.js: latar berlapis (gradasi senja, dua blob cahaya buram yang bergerak pelan, debu partikel dua lapis, vinyet) dan JEDA.FX.orb(scene, x, y, r) dengan tiga lingkaran blend ADD, postFX glow, tween napas, dan emitter partikel yang mengitari. (4) ui.js: JEDA.UI.panel (kaca, radius 32, bayangan, animasi masuk) dan JEDA.UI.button (kapsul bergradasi, hover 1,04, tekan 0,97, status disabled). (5) BootScene menampilkan orb, judul, subjudul, dan tombol Mulai dengan fade-in 600 ms. Berhenti setelah itu dan jelaskan apa yang diubah.

**Prompt P1 (check-in dan state):**

> Fase P1 dari PRD.md. Tulis state.js, guard.js, ui.js, fx.js dan CheckinScene sesuai bagian 5.1 dan 9. Wajib: BR-01 (kunci level), BR-09 (modal peduli dengan 119 ext. 8 dan healing119.id), BR-13, BR-14. Tambahkan mode debug ?debug=1. Tunjukkan cara menguji tiap aturan seperti tabel bagian 7.

**Prompt P2 (Level 1):**

> Fase P2 dari PRD.md. Tulis score.js (fungsi murni untuk ketiga level, sesuai rumus bagian 6) dan Level1Scene sesuai bagian 5.2. Wajib: orb tiga lapis dengan blend ADD, input tahan mouse atau Spasi, notifikasi palsu, BR-03 dan BR-04. Berikan contoh pemanggilan fungsi skor di konsol dengan angka masukan beserta hasil yang diharapkan.

**Prompt P3 (Level 2):**

> Fase P3 dari PRD.md. Tulis Level2Scene sesuai bagian 5.3 memakai data bagian 8.1. Wajib: seret dan lepas, petunjuk saat salah, mini napas saat gelembung menumpuk, BR-05 lewat guard.js. Panik klik hanya mengurangi komponen Tenang.

**Prompt P4 (Level 3):**

> Fase P4 dari PRD.md. Tulis Level3Scene sesuai bagian 5.4 memakai data bagian 8.2. Dua jalur per skenario, empat langkah STOP, meter emosi, dan skor sesuai rumus bagian 6. Gunakan data dari data.js, jangan menulis teks skenario langsung di scene.

**Prompt P5 (hasil dan pelengkap):**

> Fase P5 dari PRD.md. Tulis ResultScene dan PauseScene, lalu implementasikan BR-06, 07, 08, 10, 11, 12. Cek seluruh alur dari Check-in sampai Hasil dan perbaiki error konsol.

**Prompt P6 (perbaikan bug):**

> Jalankan ceklis pengujian bagian 12 satu per satu. Untuk tiap butir yang gagal, jelaskan penyebabnya dalam bahasa sederhana, perbaiki, dan tunjukkan diff-nya. Jangan mengubah hal lain.

**Bila hasil agent tidak sesuai:** tulis "Kamu menyimpang dari PRD bagian X. Perbaiki hanya itu." Jangan menulis ulang seluruh file.

## 12. Pengujian, Deploy, dan Pengumpulan

**Ceklis pengujian:**

- [ ] Buka `index.html` langsung (tanpa server). Tidak ada error di konsol.
- [ ] Data kosong: Level 2 dan 3 terkunci (BR-01).
- [ ] Check-in skor 1 memunculkan modal dengan 119 ext. 8 dan healing119.id (BR-09).
- [ ] Level 1: klik notifikasi palsu menurunkan Ketahanan (BR-03). Tahan 10 detik berhenti otomatis (BR-04).
- [ ] Level 2: klik cepat memunculkan "Pelan-pelan" (BR-05). Gelembung salah kembali tanpa hukuman.
- [ ] Level 3: jalur reaksi dan jalur STOP sama-sama bisa dimainkan di ketiga skenario.
- [ ] Hasil: bintang, skor akhir, dan perbandingan check-in tampil. Skor akhir sesuai hitungan manual.
- [ ] Muat ulang di tengah Level 2: progres level (skor terbaik) tetap ada (BR-14 dan penyimpanan).
- [ ] Pindah tab saat Level 1: game dijeda (BR-08).
- [ ] Ukuran jendela diubah: game tetap proporsional dan terpusat.
- [ ] Uji skor manual: tahan tepat 4 s dan lepas 6 s enam kali tanpa mengklik notifikasi harus menghasilkan Skor L1 = 100.

**Deploy dan pengumpulan:**

1. Buka Netlify Drop, seret seluruh folder `jeda/` (pastikan `index.html` ada di akar folder).
2. Buka tautan hasilnya di jendela incognito dan jalankan ceklis bagian 12 sekali lagi.
3. Ekspor slide ke PDF. Beri nama file sesuai format `NamaLengkap_Posisi` (contoh `SitiAminah_GameLearningDeveloper`).
4. Kirim tautan Netlify dan PDF lewat formulir sebelum **pukul 09.00 WIB** di hari interviewmu. Tugas yang telat tidak dinilai.
5. Siapkan juga salinan folder di laptop, karena demo akan dibagikan layar saat Zoom.

**Kemampuan menjelaskan saat tanya jawab:** untuk tiap fase, tanyakan ke agent "jelaskan fungsi ini baris demi baris". Pewawancara akan menguji alasan alur dan aturanmu, bukan sekadar hasil kodenya. Latih tiga jawaban: kenapa tidak ada timer, kenapa ada BR-09, dan kenapa bobot Level 3 terbesar.

## 13. Lapisan 3D dengan Three.js (Tambahan Revisi)

**Alasan revisi:** versi 2D terasa pasif dan membosankan. Revisi ini menambah panggung 3D yang bereaksi pada permainan, dan kemajuan pemain tampak sebagai taman lentera yang menyala. Bagian ini menambah dan menimpa bagian 2 (Engine) dan bagian 4 (Visual). Aturan bisnis, rumus skor, dan data tidak berubah.

**Keputusan:** Phaser tetap untuk logika, input, dan UI. Three.js r128 menggambar panggung 3D di kanvas terpisah di belakang Phaser. Phaser dibuat transparan. Bila WebGL Three.js gagal, `CFG.USE_3D = false` dan game memakai tampilan 2D yang sudah ada.

### 13.1 Arsitektur

1. `index.html` punya dua elemen: `#stage3d` (kanvas Three.js, `position: fixed`, memenuhi jendela, `z-index: 0`, `pointer-events: none`) dan `#game` (induk Phaser, `z-index: 1`).
2. Konfigurasi Phaser: tambahkan `transparent: true` dan hapus `backgroundColor`. CSS `body` diberi warna cadangan `#16163A`.
3. Berkas baru: `lib/three.min.js` (Three.js r128, unduh sekali dari cdnjs lalu simpan lokal) dan `js/stage3d.js` (namespace `JEDA.Stage3D`). Urutan script: `phaser`, `three`, `config`, `data`, `state`, `score`, `guard`, `stage3d`, `fx`, `ui`, semua `scenes/*`, `main`.
4. Saat `CFG.USE_3D` aktif, scene tidak menggambar latar gradasi dan orb 2D. Teks, titik siklus, panel, dan tombol Phaser tetap tampil di atas panggung 3D.
5. Orb 3D selalu di pusat layar. Elemen UI Phaser diposisikan relatif terhadap `W/2, H/2`.

### 13.2 Kontrak `JEDA.Stage3D`

```js
JEDA.Stage3D.init(parentEl)         // true bila berhasil, false bila WebGL gagal
JEDA.Stage3D.setMode(name)          // 'menu' | 'l1' | 'l2' | 'l3' | 'result' (kamera dan suasana)
JEDA.Stage3D.setBreath(t)           // 0..1, ukuran orb
JEDA.Stage3D.setSync(state)         // 'good' | 'warn' | 'off' (warna cahaya)
JEDA.Stage3D.pulse(intensity)       // denyut dan semburan partikel, 0..1
JEDA.Stage3D.setLanterns(count)     // 0..3 lentera menyala
JEDA.Stage3D.setCalm(v)             // 0..1 kecerahan suasana
JEDA.Stage3D.freeze(on)             // melambatkan semua gerak (langkah S di STOP)
JEDA.Stage3D.setReduceMotion(on)    // BR-12
JEDA.Stage3D.destroy()
```

Scene hanya memanggil metode ini, tidak menyentuh objek Three.js langsung. Semua panggilan harus aman bila `USE_3D` salah (dibungkus pengecekan di `Stage3D`).

### 13.3 Isi panggung 3D

| Elemen | Spesifikasi |
| --- | --- |
| **Langit** | Bola besar bergradasi warna titik (`bgTop`, `bgMid`, `bgBottom`), kabut tipis, 600 bintang `Points` berkilau pelan |
| **Orb napas** | `SphereGeometry` 64x64 dengan cahaya tepi (fresnel) lewat `ShaderMaterial`, halo sprite beralaskan tekstur radial dari canvas dengan blending additive, `PointLight` di dalamnya. Skala 0,8 sampai 1,6 mengikuti `setBreath`. Warna berpindah ke `calm`, `warn`, `off` sesuai `setSync` |
| **Partikel** | 300 titik mengitari orb. `pulse` melepas semburan keluar lalu kembali |
| **Awan** | 8 awan low poly dari `IcosahedronGeometry` dengan `flatShading`, putih alpha 0,85, melayang pelan. Di Level 2 awan lebih banyak bergerak |
| **Taman lentera** | 3 pulau melayang (kerucut terbalik dan cakram atas) dengan lentera berisi bola emisif dan `PointLight`. Awalnya abu redup. `setLanterns(n)` menyalakan n lentera dengan animasi emisif 0 ke 2 selama 1,2 detik. Semua pulau naik-turun lembut (`sin`) |
| **Kamera** | `PerspectiveCamera` fov 50. Preset: menu (lebar), l1 (dekat orb), l2 (miring ke arah awan), l3 (lebar dengan taman), result (mundur memperlihatkan taman). Transisi 1,2 detik dengan easing. Parallax mouse maksimal 0,3 unit. Bila kurangi gerakan aktif, parallax dan awan melayang dimatikan |
| **Pencahayaan** | `AmbientLight` dan `HemisphereLight`. Tanpa bayangan dan tanpa postprocessing, glow ditiru dengan sprite additive |
| **Performa** | `pixelRatio = min(devicePixelRatio, 2)`, render berhenti saat tab tersembunyi, target 60 fps di laptop biasa |

### 13.4 Animasi dan umpan balik (agar tidak membosankan)

| Peristiwa | Reaksi 3D | Reaksi 2D |
| --- | --- | --- |
| Napas pas (L1) | Orb membesar halus, cincin cahaya menyebar | Kata "Pas", titik siklus hijau |
| Siklus selesai | Semburan partikel kecil | Titik siklus menyala |
| Notifikasi palsu diklik (BR-03) | Orb berkedip merah muda dan meredup 0,5 detik | Toast umpan balik |
| Gelembung benar (L2) | `pulse(0.5)`, `setCalm` naik 0,1, awan baru muncul | Gelembung berubah jadi awan |
| Panik klik (BR-05) | Suasana meredup, kamera mundur sedikit | Overlay "Pelan-pelan" |
| Langkah S di STOP (L3) | `freeze(true)`: semua gerak melambat sekitar 90% selama 1 detik | Huruf S menyala |
| Lulus level | Lentera berikutnya menyala dengan sinar naik, kamera berputar pelan | Bintang muncul satu per satu |
| Layar Hasil | Kamera mundur memperlihatkan seluruh taman | Skor dan bintang |

Suara opsional (hanya bila waktu ada): chime sederhana dengan WebAudio, mati secara default (BR-12).

### 13.5 Fase tambahan dan aturan potong

Tenggat: **Senin, 16 November, pukul 09.00 WIB**. Urutan kerja dan batas waktu:

| Fase | Isi | Perkiraan | Selesai bila |
| --- | --- | --- | --- |
| 0 | **Cadangan.** Salin folder menjadi `jeda_2d_backup/`, lalu deploy versi 2D yang berjalan ke Netlify | 15 menit | Ada tautan Netlify yang bisa dibuka dan sudah memuat alur 5 layar |
| 3D-1 | `lib/three.min.js`, `stage3d.js` dengan langit, orb, partikel, kamera mode menu dan l1, Phaser transparan | 2 jam | Orb 3D bernapas di belakang Check-in dan Level 1 |
| 3D-2 | Awan, taman lentera, `setMode` semua mode, hook ke semua scene | 1,5 jam | Lentera menyala sesuai level lulus, kamera berpindah antar level |
| 3D-3 | Animasi dan umpan balik bagian 13.4, kurangi gerakan, fallback 2D | 1 jam | Tabel 13.4 terlihat di game |
| Akhir | Uji ceklis bagian 12, deploy ulang, slide | 1 jam+ | Tautan Netlify baru lolos uji di incognito |

**Aturan potong:** bila Fase 3D-1 belum menampilkan orb 3D dalam 3 jam sejak mulai, hentikan 3D dan lanjut dengan versi 2D dan P0.5. Jangan mengutak-atik 3D sampai larut malam. Waktu istirahat dan latihan presentasi lebih berharga.

### 13.6 Prompt Antigravity

**Prompt 3D-1:**

> Baca PRD.md bagian 13. Kerjakan fase 3D-1 saja. Tambahkan lib/three.min.js (Three.js r128, saya taruh manual), js/stage3d.js dengan namespace JEDA.Stage3D sesuai kontrak 13.2, kanvas #stage3d di index.html, dan ubah konfigurasi Phaser menjadi transparent: true. Implementasikan langit, orb napas dengan shader cahaya tepi dan halo, partikel pengorbit, serta kamera untuk mode menu dan l1. Tambahkan CFG.USE\_3D dengan fallback ke 2D bila WebGL gagal. Hubungkan Level1Scene ke setBreath dan setSync. Jangan mengubah aturan bisnis, skor, atau data. Jelaskan cara melihat hasilnya.

**Prompt 3D-2:**

> Fase 3D-2 dari PRD.md bagian 13. Tambahkan awan low poly, tiga pulau dan lentera, setLanterns, setCalm, dan kamera untuk mode l2, l3, result. Hubungkan Level2Scene, Level3Scene, CheckinScene, dan ResultScene ke Stage3D sesuai tabel 13.4. Tampilkan jumlah lentera sesuai level yang lulus.

**Prompt 3D-3:**

> Fase 3D-3 dari PRD.md bagian 13. Implementasikan semua umpan balik di tabel 13.4, freeze untuk langkah S, mode kurangi gerakan, dan penghentian render saat tab tersembunyi. Pastikan game tetap berjalan normal saat CFG.USE\_3D salah.

### 13.7 Cara menjelaskannya saat interview

Tampilan 3D bukan hiasan. Ia berfungsi sebagai **umpan balik visual** atas tujuan belajar: orb yang bernapas mengikuti ritme (P1), gangguan yang meredupkan orb melatih tidak bereaksi (P2), dan taman lentera yang menyala menunjukkan kemajuan (A3). Siapkan satu kalimat: "Visual 3D membuat kemajuan latihan terlihat, tetapi aturan dan skornya tetap sama sehingga hasil belajarnya bisa diukur."

## 14. Gamifikasi "Penjaga Lentera" dan Prinsip UI/UX (Tambahan Revisi)

**Alasan revisi:** gamifikasi awal hanya sistem nilai (skor, bintang, kunci level) sehingga terasa datar, dan tata letak layar tidak simetris. Bagian ini menambah cerita, karakter, ketegangan, hadiah, dan sistem tata letak yang memaksa semua elemen rapi. **Rumus skor dan aturan bisnis BR-01 sampai BR-14 tidak berubah.** Semua tambahan memakai penguatan positif dan tidak memakai hukuman, kelangkaan, atau streak.

### 14.1 Cerita dan karakter

Dunia **Hening** tertutup kabut **Bising**. Pemain adalah penjaga lentera, ditemani **Lumi**, orb pendamping yang sama dengan orb napas. Tiap level yang lulus menyalakan satu pulau di taman (bagian 13). Lumi menyampaikan kartu pengantar K1 dan semua umpan balik.

**Gaya tulisan Lumi:** hangat, pendek (maksimal 2 baris dan 60 karakter), tidak menggurui, tidak menghakimi, tidak pernah menyebut pemain gagal atau buruk, dan tidak mengklaim menyembuhkan. Contoh yang benar: Napasmu pas. Rasakan pelan-pelannya. Contoh yang salah: Kamu gagal, coba lagi!

### 14.2 Fitur gamifikasi

| Kode | Fitur | Prioritas | Perilaku |
| --- | --- | --- | --- |
| G1 | **Lumi bicara** | P0 | Umpan balik tampil sebagai gelembung ucapan di bawah orb. Satu kalimat per kejadian, jeda minimal 4 detik antar ucapan, tampil 2,5 detik. Teks selalu menyertai warna (BR-12) |
| G2 | **Meter Aliran** | P0 | Cincin tipis di sekeliling orb yang naik tiap siklus pas. Murni visual, tidak masuk skor |
| G3 | **Badai Notifikasi** | P0 | Mini-boss di akhir Level 1: siklus 5 dan 6 dipenuhi notifikasi |
| G4 | **Lencana positif** | P1 | Lima lencana untuk perilaku yang dilatih |
| G5 | **Skin orb** | P2 | Warna orb baru terbuka sesuai total bintang |

**G1: ucapan Lumi** (disimpan di `JEDA.DATA.lumi`, dipanggil lewat `JEDA.Lumi.say(key)`):

| Kunci | Ucapan |
| --- | --- |
| intro\_l1 | Hai, aku Lumi. Ikuti napasku, tahan saat aku membesar. |
| cycle\_good | Napasmu pas. Rasakan pelan-pelannya. |
| cycle\_off | Tidak apa-apa. Kembali ke napas. |
| distract\_hit | Perhatianmu tadi pergi. Kembali ke napas. |
| storm | Badai datang. Tetap di napasmu. |
| storm\_pass | Kamu melewati badai. Lenteranya makin terang. |
| l2\_intro | Pikiran itu seperti awan. Beri nama, lalu biarkan lewat. |
| l2\_correct | Pas. Awannya melayang pergi. |
| l2\_wrong | Hampir. Coba lihat lagi isinya. |
| panic | Pelan-pelan. Tarik napas dulu. |
| l3\_intro | Kadang yang terbaik adalah berhenti sebentar. |
| stop\_s | Berhenti. Dunia ikut menunggu. |
| level\_pass | Satu lentera menyala. |
| result\_low | Perasaan bisa naik turun. Mengamatinya sudah bagian dari latihan. |

**G2: Meter Aliran.** Nilai 0 sampai 100. Level 1: naik 20 tiap siklus bernilai 0,75 atau lebih, naik 10 bila 0,5 sampai kurang dari 0,75, turun 15 bila kurang dari 0,5, turun 10 tiap notifikasi diklik. Level 2: naik 10 tiap label benar di percobaan pertama, turun 10 tiap salah, turun 20 tiap panik klik. Batas 0 dan 100, tidak pernah reset mendadak. Ambang 33, 66, 100 menyalakan cincin ke-1, ke-2, ke-3 dan memanggil `Stage3D.setCalm(nilai/100)` serta `pulse`.

**G3: Badai Notifikasi.** Di siklus 5 dan 6 Level 1 interval munculnya notifikasi palsu menjadi sekitar 1,2 detik (biasanya 3 detik), kabut gelap alpha 0,25 menutupi latar, dan Lumi mengucap `storm`. Bila pemain melewati kedua siklus tanpa mengklik notifikasi, Lumi mengucap `storm_pass`, lentera level itu menyala 50% lebih terang, dan lencana Tidak Menoleh dicek. BR-03 tetap berlaku utuh: klik tetap mengurangi Ketahanan 20 poin.

**G4: Lencana** (dicek di `score.js` lewat `JEDA.Score.badges(run)` dan disimpan di `state.badges`):

| Lencana | Syarat |
| --- | --- |
| Tidak Menoleh | Level 1 dengan 0 notifikasi diklik |
| Napas Penuh | Skor Level 1 sebesar 90 atau lebih |
| Penamai Pikiran | Akurasi label Level 2 sebesar 80% atau lebih |
| Jeda Sebelum Balas | Memilih STOP di ketiga skenario Level 3 |
| Penjaga Lentera | Ketiga level lulus dalam satu run |

Lencana muncul sebagai toast saat diraih dan sebagai lima slot di layar Hasil. Lencana terbuka berwarna, yang belum terbuka berupa siluet abu bergaris putus. **Tidak ada pesan negatif untuk lencana yang belum diraih.**

**G5: Skin orb (opsional).** Tiga warna orb: Embun (bawaan), Fajar (terbuka di total 3 bintang), Aurora (terbuka di total 6 bintang). Pemain memilih di pengaturan. Skin hanya mengganti palet orb di `Stage3D` dan `JEDA.FX.orb`.

**Tambahan state:** `badges: []` dan `skin: 'embun'` di kunci `jeda_v1`. Bila data lama tidak punya kolom ini, isi nilai awal tanpa error (BR-14).

### 14.3 Prinsip UI/UX yang wajib diikuti

**Penyebab umum tata letak tidak simetris:** (1) teks dan tombol memakai origin bawaan Phaser di pojok kiri atas, bukan tengah, (2) posisi ditulis sebagai angka tetap yang berbeda-beda, (3) lebar tombol mengikuti panjang teks sehingga tidak seragam, (4) jarak antar elemen tidak memakai skala yang konsisten, (5) tiap scene membuat gaya sendiri.

| No | Prinsip | Aturan yang bisa diuji |
| --- | --- | --- |
| 1 | **Satu sumbu tengah** | Semua elemen utama berpusat di `x = W/2`. Teks, tombol, dan panel yang di tengah wajib `setOrigin(0.5)`. Dilarang menulis koordinat tetap |
| 2 | **Grid 12 kolom** | Margin kiri dan kanan 120 px, jarak antar kolom (gutter) 24 px, lebar kolom 118 px. Elemen sejajar ke kolom, bukan ke angka acak |
| 3 | **Skala jarak 8 px** | Semua jarak, padding, dan ukuran memakai 8, 16, 24, 32, 48, 64, 96, atau 128. Dilarang angka lain |
| 4 | **Tiga zona vertikal** | Header y 0 sampai 120 (nama level di kiri, jeda dan pengaturan di kanan, sejajar margin). Konten y 120 sampai 900. Aksi y 900 sampai 1080 |
| 5 | **Ukuran panel baku** | Lebar S 720, M 960, L 1200, selalu di tengah, padding dalam 48, sudut 32 |
| 6 | **Tombol seragam** | Tinggi 88, lebar minimum 280, bentuk kapsul, teks 33 px di tengah horizontal dan vertikal. Tombol sejajar selalu sama lebar, jarak 32. Aksi utama di kanan, aksi sekunder di kiri |
| 7 | **Satu aksi utama per layar** | Tombol utama bergradasi `calm`. Tombol sekunder berupa kaca bergaris. Tidak boleh ada dua tombol bergradasi di layar yang sama |
| 8 | **Hierarki teks** | Maksimal 3 ukuran teks per layar. Ukuran minimum 27 px. Teks tengah hanya untuk maksimal 2 baris, lebih dari itu rata kiri. Panjang baris maksimal 56 karakter |
| 9 | **Hukum Hick** | Maksimal 4 pilihan per keputusan dalam satu baris. Bila lebih (misalnya 7 label emosi), susun 4 baris atas dan 3 baris bawah, keduanya rata tengah |
| 10 | **Kontras dan warna** | Kontras teks minimal 4,5:1. Teks gelap `#16163A` di atas tombol `calm`. Warna tidak pernah menjadi satu-satunya petunjuk (BR-12) |
| 11 | **Fokus perhatian** | Orb di tengah adalah titik fokus. Elemen lain di tepi dan tidak lebih terang dari orb. Satu instruksi pada satu waktu, maksimal 2 kalimat |
| 12 | **Umpan balik cepat** | Setiap hover atau klik direspons dalam 100 ms (naik 1,04, tekan 0,97, cahaya menguat) |
| 13 | **Gerak** | Mikro 150 ms, panel 300 ms, transisi layar 450 ms. Easing `Sine.easeOut` untuk masuk dan `Sine.easeIn` untuk keluar. Hanya satu elemen bergerak menonjol pada satu waktu |
| 14 | **Konsistensi komponen** | Scene hanya memakai komponen `JEDA.UI` (panel, button, chip, toast, modal, badgeSlot, meter). Dilarang membuat gaya baru di dalam scene |
| 15 | **Keyboard** | Enter menekan aksi utama, Esc membuka Pause, Spasi menahan napas di Level 1. Elemen terfokus punya garis tepi terlihat |

### 14.4 Sistem tata letak `JEDA.Layout` (supaya simetri otomatis)

Buat `js/layout.js` yang menjadi satu-satunya sumber posisi.

```js
JEDA.Layout = {
  W: 1920, H: 1080, M: 120, G: 24, COL: 118,
  cx() { return this.W / 2; },
  colLeft(c) { return this.M + (c - 1) * (this.COL + this.G); },      // c = 1..12
  colSpan(c, n) { return n * this.COL + (n - 1) * this.G; },          // lebar n kolom
  rowCenter(widths, gap) {},   // kembalikan array pusat x agar baris rata tengah dan simetris
  stackCenter(heights, gap, centerY) {}, // kembalikan array pusat y untuk tumpukan vertikal
  zone: { header: [0, 120], content: [120, 900], action: [900, 1080] }
};
```

`rowCenter` menghitung total lebar (jumlah lebar ditambah gap) lalu mulai dari `W/2 - total/2`, sehingga baris selalu simetris terhadap sumbu tengah. **Mode debug (`?debug=1`, tombol `G`)** menggambar garis tengah, garis margin, kolom, dan zona agar penyimpangan langsung terlihat. Tiap komponen `JEDA.UI` menerima posisi dari `Layout`, tidak dari scene.

### 14.5 Struktur tata letak per layar

| Layar | Susunan dari atas ke bawah (semua berpusat di sumbu tengah) |
| --- | --- |
| Check-in | Logo JEDA (y 160), subjudul, panel M berisi pertanyaan, 5 tombol bulat 96 px dengan jarak 32 (`rowCenter`), label emosi baris 4 lalu 3. Tombol Mulai 48 px di bawah panel. Tiga kartu level sama lebar (`colSpan(…, 4)`) di zona aksi |
| Level 1 | Header: nama level kiri, jeda dan pengaturan kanan. Orb di (W/2, 500). Gelembung Lumi di y 760. Enam titik siklus di y 860 (`rowCenter`). Meter Aliran sebagai cincin di sekeliling orb |
| Level 2 | Header sama. Area gelembung y 200 sampai 760. Empat keranjang label sama lebar 360 dengan jarak 48 (`rowCenter`) di y 900 |
| Level 3 | Huruf S, T, O, P di y 120 (`rowCenter`). Panel L berisi pemicu di y 400. Meter emosi lebar 720 di bawahnya. Dua tombol besar sama lebar 420 dengan jarak 48 di y 760 |
| Hasil | Skor akhir di tengah, tiga bintang (`rowCenter`), tiga kartu skor level sama lebar, lima slot lencana (`rowCenter`), tombol Main lagi dan Menu sama lebar |

### 14.6 Berkas tambahan

`js/layout.js`, `js/lumi.js`, dan fungsi `badges` di `score.js`. Urutan `<script>`: `layout` sebelum `ui` dan `fx`, `lumi` sesudah `ui`.

### 14.7 Fase dan prioritas

Urutan gabungan dengan fase 3D (bagian 13) karena tenggat Senin 09.00 WIB. **Kerjakan berurutan dari atas dan berhenti bila waktu habis:**

| Urutan | Fase | Isi | Perkiraan |
| --- | --- | --- | --- |
| 1 | G-1 | `layout.js`, rapikan semua scene yang ada ke `Layout` dan komponen `JEDA.UI`, mode debug grid | 45 sampai 60 menit |
| 2 | G-2 | Lumi (G1) dan Meter Aliran (G2) | 60 menit |
| 3 | 3D-1 | Panggung 3D dasar (bagian 13) | 2 jam |
| 4 | G-3 | Badai Notifikasi (G3) dan lencana (G4) | 50 menit |
| 5 | 3D-2 | Awan dan taman lentera | 1,5 jam |
| 6 | 3D-3 | Animasi dan umpan balik | 1 jam |
| 7 | G-4 | Skin orb (G5), hanya bila waktu sisa | 20 menit |

**Alasan G-1 paling awal:** tata letak yang tidak simetris merusak kesan semua fitur lain, termasuk 3D. Memperbaikinya lebih dulu memberi dampak terbesar dengan biaya terkecil.

### 14.8 Ceklis UI/UX

- [ ] Dengan mode debug, garis tengah memotong tengah judul, panel, dan tombol utama di semua layar. Selisih maksimal 2 px.
- [ ] Semua jarak antar elemen kelipatan 8 px.
- [ ] Tombol yang sejajar punya lebar sama. Hanya ada satu tombol bergradasi per layar.
- [ ] Tidak ada teks di bawah 27 px dan tidak ada teks yang terpotong atau keluar panel.
- [ ] Margin kiri dan kanan sama (120 px) di semua layar.
- [ ] Hover, tekan, dan status disabled terlihat jelas.
- [ ] Ukuran jendela 1366x768, 1920x1080, dan 2560x1440: tata letak tetap proporsional dan terpusat.
- [ ] Zoom browser 100% dan 125%: tidak ada yang tumpang tindih.
- [ ] Lumi tidak berbicara lebih sering dari sekali tiap 4 detik, dan semua ucapan sesuai gaya 14.1.
- [ ] Meter Aliran tidak pernah mengubah skor level.

### 14.9 Prompt Antigravity

**Prompt G-1 (layout dan simetri):**

> Baca PRD.md bagian 14.3 sampai 14.5. Kerjakan fase G-1 saja. Buat js/layout.js sesuai kontrak 14.4 (W 1920, H 1080, margin 120, gutter 24, kolom 118, fungsi cx, colLeft, colSpan, rowCenter, stackCenter, zone). Refactor SEMUA scene yang sudah ada (Checkin, Level1, Level2, Level3, Result, Pause) agar semua posisi berasal dari JEDA.Layout dan komponen JEDA.UI, tanpa koordinat tetap. Semua teks dan tombol di tengah memakai setOrigin(0.5). Ikuti 15 prinsip di bagian 14.3 (skala jarak 8 px, tombol tinggi 88 dan lebar seragam, satu tombol utama per layar, tiga ukuran teks maksimal). Tambahkan mode debug (?debug=1, tombol G) yang menggambar garis tengah, margin, kolom, dan zona. Jangan mengubah logika, skor, atau aturan bisnis. Setelah selesai, daftar tiap layar dan bagian yang kamu ubah, dan jelaskan cara menguji simetri dengan mode debug.

**Prompt G-2 (Lumi dan Meter Aliran):**

> Fase G-2 dari PRD.md bagian 14. Tambahkan JEDA.DATA.lumi (14 ucapan di 14.2), js/lumi.js dengan JEDA.Lumi.say(key) (gelembung ucapan dari JEDA.UI di bawah orb, jeda minimal 4 detik, tampil 2,5 detik, maksimal 2 baris), dan Meter Aliran sesuai aturan G2 (cincin di sekeliling orb dengan tiga ambang 33, 66, 100). Hubungkan ke Level 1 dan Level 2. Meter Aliran tidak boleh mengubah skor. Ikuti gaya tulisan Lumi dan prinsip UI/UX di 14.3.

**Prompt G-3 (Badai dan lencana):**

> Fase G-3 dari PRD.md bagian 14. Implementasikan Badai Notifikasi (G3) di siklus 5 dan 6 Level 1, serta JEDA.Score.badges(run) untuk lima lencana (G4) dengan penyimpanan di state.badges dan tampilan lima slot di ResultScene memakai komponen JEDA.UI.badgeSlot. Lencana belum terbuka berupa siluet abu bergaris putus tanpa pesan negatif. BR-03 tetap utuh. Tambahkan pengisian nilai awal untuk data lama yang belum punya kolom badges dan skin.

**Prompt G-4 (opsional, skin orb):**

> Fase G-4 dari PRD.md bagian 14. Tambahkan tiga skin orb (Embun, Fajar, Aurora) dengan syarat total bintang 0, 3, dan 6, pilihan di pengaturan, tersimpan di state.skin. Skin hanya mengganti palet orb di JEDA.FX.orb dan Stage3D.

**Prompt audit (pakai kapan pun tampilan terasa tidak rapi):**

> Audit seluruh scene terhadap ceklis 14.8. Untuk setiap pelanggaran sebutkan file, baris, dan prinsip yang dilanggar. Perbaiki hanya pelanggaran itu dan jangan mengubah yang lain.
