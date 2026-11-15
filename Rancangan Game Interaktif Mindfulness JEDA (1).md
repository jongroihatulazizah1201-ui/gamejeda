# Rancangan Game Interaktif Mindfulness: "JEDA"

Dokumen Rancangan Game Learning | Seleksi Magang IODA Academy (Game Learning Developer) | Disusun sebagai Lead Game Learning Developer

> **Status sumber (dicek ulang 15 November 2026).** Angka I-NAMHS dan nomor 119 ext. 8 sudah terverifikasi di beberapa sumber. Angka DataReportal belum terverifikasi. Rincian tiap angka ada di bagian Catatan Sumber. Buka sumber aslinya dan cantumkan tautannya di slide.

## Ringkasan Satu Paragraf

**JEDA** adalah game web 3 level yang melatih pemain berhenti sejenak di tengah banjir notifikasi dan tekanan, lalu merespons dengan sadar. Level 1 melatih **napas** sebagai jangkar, Level 2 melatih **mengenali dan melabeli pikiran**, Level 3 melatih **memilih respons, bukan bereaksi** pada situasi nyata mahasiswa. Game ini bukan terapi. Game ini adalah latihan keterampilan dasar mindfulness yang ringan, tanpa tekanan waktu, dan bisa dimainkan 5 sampai 8 menit per sesi.

---

## 1. Target Pengguna dan Problem Statement

### 1.1 Fenomena nyata yang diangkat

Kita memilih satu fenomena yang spesifik, bukan "orang stres" secara umum:

**Fenomena: kewalahan digital dan stres akademik pada mahasiswa dan anak muda yang membuat mereka sulit fokus dan mudah bereaksi impulsif.**

Bukti pendukung (status verifikasi tertera di tiap poin dan di bagian Catatan Sumber):

- **Data utama untuk usia 15 sampai 24 tahun (SKI 2023).** Survei Kesehatan Indonesia 2023 menemukan depresi paling banyak dialami kelompok usia 15 sampai 24 tahun, yang paling dekat dengan target JEDA. *Status: dilaporkan media ([JawaPos](https://www.jawapos.com/pendidikan/2609210129/problem-kesehatan-mental-masih-besar-di-papua-barat-konselor-sebaya-digiatkan)); ambil angka persennya dari laporan SKI Kemenkes.*
- **Konteks remaja (I-NAMHS 2022).** Survei ini mencatat 34,9% remaja (setara 15,5 juta) punya masalah kesehatan mental dalam 12 bulan terakhir, dan 5,5% (setara 2,45 juta) memenuhi kriteria gangguan mental. *Catatan: respondennya usia 10 sampai 17 tahun, bukan mahasiswa. "Masalah" tidak sama dengan "gangguan". Status: terverifikasi di beberapa sumber ([UNAIR](https://unair.ac.id/?p=167009), [jurnal UMPR](https://journal.umpr.ac.id/index.php/bijaksana/article/download/10343/5692)).*
- **Kesenjangan bantuan.** Hanya sekitar 2,6% remaja dengan masalah kesehatan mental yang mengakses layanan (I-NAMHS). Layanan Healing119 Kemenkes dipakai 15.424 pengguna dalam tujuh minggu pada Juli sampai Agustus 2025, dan Kemenkes mengakui layanan jiwa di puskesmas belum sepenuhnya optimal. *Status: sumber sekunder ([jurnal UMPR](https://journal.umpr.ac.id/index.php/bijaksana/article/download/10343/5692), [RM.id](https://rm.id/baca-berita/government-action/284452/kemenkes-ingatkan-pentingnya-kesehatan-jiwa-di-segala-situasi)).*
- **Beban layar.** Rata-rata waktu internet harian pengguna Indonesia disebut sekitar 7 sampai 8 jam (DataReportal, Digital 2024 Indonesia). *Status: BELUM terverifikasi. Buka laporan DataReportal dan salin angkanya langsung sebelum dipakai.*
- **Skala global (WHO).** Sekitar 1 dari 7 anak usia 10 sampai 19 tahun hidup dengan gangguan mental. *Status: dikuatkan sumber sekunder ([JPNN](https://jogja.jpnn.com/jogja-terkini/14091/masalah-mental-membayangi-remaja-indonesia-pakar-ugm-tekankan-pentingnya-deteksi-dini)); kutip dari [halaman WHO](https://www.who.int/news-room/fact-sheets/detail/adolescent-mental-health).*

### 1.2 Target pengguna

|  | Penjelasan |
| --- | --- |
| **Pengguna utama** | Mahasiswa dan lulusan baru usia 18 sampai 25 tahun di Indonesia, pengguna smartphone dan laptop harian, mengalami stres akademik atau karier awal |
| **Pengguna sekunder** | Pelajar SMA akhir, peserta bootcamp dan program magang |
| **Bukan target** | Orang dengan krisis kesehatan mental akut atau yang butuh terapi. Mereka diarahkan ke bantuan profesional (lihat aturan BR-09) |

**Persona utama: Raka (21), mahasiswa semester 5 di Semarang.**

- **Situasi:** kuliah, tugas kelompok, dan magang paruh waktu berjalan bersamaan. HP berbunyi terus dari grup WhatsApp dan media sosial.
- **Perilaku:** membuka HP tanpa sadar saat mengerjakan tugas, menunda, lalu panik mendekati tenggat. Membalas pesan dalam keadaan emosi.
- **Kebutuhan:** latihan singkat yang tidak terasa menggurui, bisa dilakukan di sela kuliah, dan memberi rasa kemajuan.
- **Hambatan:** bosan dengan aplikasi meditasi audio panjang, merasa tidak punya waktu 20 menit, takut dianggap "lebay" kalau mencari bantuan.

### 1.3 Problem statement

> Mahasiswa dan anak muda Indonesia terpapar notifikasi dan tekanan akademik hampir sepanjang hari, tetapi tidak punya latihan singkat, menarik, dan gratis untuk **menyadari kondisi dirinya dan berhenti sejenak sebelum bereaksi**. Aplikasi meditasi yang ada umumnya berbasis audio panjang, berbayar, dan berbahasa Inggris sehingga kurang menarik bagi pemain yang butuh latihan aktif.

**Pernyataan solusi:** game pendek berbahasa Indonesia yang mengubah tiga keterampilan inti mindfulness (napas, kesadaran pikiran, respons sadar) menjadi tantangan interaktif yang dimainkan, bukan didengarkan.

### 1.4 Indikator keberhasilan (untuk dijelaskan saat interview)

- Pemain menyelesaikan ketiga level dalam kurang dari 10 menit total.
- Skor suasana hati (mood check-in) setelah bermain sama atau lebih baik dari sebelum bermain pada mayoritas sesi.
- Pemain bisa menjelaskan kembali teknik STOP setelah Level 3 (diukur lewat kuis refleksi singkat).

---

## 2. Tujuan Pembelajaran

Tujuan ditulis dalam format *setelah bermain, pemain mampu...* dan dipetakan ke taksonomi Bloom (kognitif), Krathwohl (afektif), dan Simpson (psikomotorik).

### 2.1 Kognitif (pengetahuan)

| Kode | Tujuan | Tingkat | Dilatih di |
| --- | --- | --- | --- |
| K1 | Menjelaskan arti mindfulness dengan bahasa sendiri: memperhatikan saat ini tanpa menghakimi | Memahami (C2) | Pengantar dan Level 1 |
| K2 | Mengelompokkan pikiran ke jenis: cemas, rencana, penilaian diri, kenangan | Menganalisis (C4) | Level 2 |
| K3 | Membedakan *reaksi otomatis* dan *respons sadar* pada suatu pemicu | Menganalisis (C4) | Level 3 |
| K4 | Menerapkan langkah STOP (Stop, Take a breath, Observe, Proceed) pada situasi baru | Menerapkan (C3) | Level 3 |

### 2.2 Afektif (sikap dan perasaan)

| Kode | Tujuan | Tingkat | Dilatih di |
| --- | --- | --- | --- |
| A1 | Menyadari dan menamai emosi yang sedang dirasakan | Menerima (receiving) | Check-in awal |
| A2 | Menerima munculnya pikiran dan emosi tanpa menilainya benar atau salah | Merespons | Level 2 |
| A3 | Menghargai jeda sebagai langkah yang bernilai sebelum bertindak | Menghargai (valuing) | Level 3 dan refleksi |

### 2.3 Psikomotorik (keterampilan gerak)

| Kode | Tujuan | Tingkat | Dilatih di |
| --- | --- | --- | --- |
| P1 | Mengatur ritme napas dengan mengikuti pola tahan dan lepas (tarik 4 detik, hembus 6 detik) | Terpandu (guided response) | Level 1 |
| P2 | Mengendalikan gerakan tangan (klik, seret, tahan) secara tenang dan tepat, termasuk menahan diri tidak menekan gangguan | Mekanis | Level 1 sampai 2 |
| P3 | Menjalankan urutan STOP dengan lancar tanpa petunjuk | Respons kompleks | Level 3 |

> **Mengapa ini kuat saat interview:** setiap mekanik game punya tujuan belajar yang jelas. Jika ditanya "kenapa ada notifikasi palsu di Level 1?", jawabannya P2 dan K3: melatih tidak bereaksi pada gangguan.

---

## 3. Alur Penggunaan (User Flow) Level 1 sampai 3

### 3.1 Peta layar (cocok dengan syarat demo 3 sampai 6 layar)

| No | Layar | Fungsi |
| --- | --- | --- |
| 1 | Mulai dan Check-in | Disclaimer singkat, pilih suasana hati (skala 1 sampai 5) |
| 2 | Level 1: Napas | Latihan ritme napas dengan gangguan |
| 3 | Level 2: Awan Pikiran | Melabeli pikiran yang melayang |
| 4 | Level 3: Jeda di Situasi Nyata | Skenario bercabang dengan STOP |
| 5 | Hasil dan Refleksi | Skor, bintang, check-in akhir, umpan balik |

Satu alur utama dari awal sampai akhir: layar 1 sampai 5, dengan layar 3 dan 4 terkunci sampai level sebelumnya lulus.

### 3.2 Alur umum

1. Pemain membuka game dan membaca disclaimer: *"JEDA adalah latihan, bukan pengganti bantuan profesional."*
2. Check-in: "Bagaimana perasaanmu sekarang?" (1 sampai 5 plus pilihan label emosi).
3. Tutorial singkat 20 detik sebelum Level 1.
4. Level 1 lalu Level 2 lalu Level 3. Setiap level dibuka setelah level sebelumnya mencapai skor minimum.
5. Layar hasil: skor, bintang, perbandingan check-in awal dan akhir, satu kalimat refleksi, tombol main ulang.

### 3.3 Level 1: "Napas" (jangkar perhatian)

**Tujuan:** P1, P2, K1.

**Cerita singkat:** Raka duduk di perpustakaan menjelang tenggat. Layar HP-nya penuh notifikasi.

**Langkah pemain:**

1. Lingkaran napas muncul di tengah layar.
2. **Tahan** tombol atau spasi saat lingkaran mengembang (tarik napas, 4 detik).
3. **Lepas** saat lingkaran mengecil (hembus napas, 6 detik).
4. Selama 6 siklus, bubble notifikasi palsu muncul ("Grup kelas: PING!", "Diskon 50%!"). Pemain **tidak boleh menekannya**. Perhatian tetap pada lingkaran.
5. Level selesai setelah 6 siklus. Skor dihitung dan umpan balik muncul.

**Kondisi menang:** skor 60 atau lebih. **Kondisi belum lulus:** pemain boleh mengulang tanpa batas.

### 3.4 Level 2: "Awan Pikiran" (mengamati dan melabeli pikiran)

**Tujuan:** K2, A2, P2.

**Konsep:** teknik *labeling* dan *cognitive defusion*. Pikiran dilihat sebagai awan yang lewat, bukan fakta yang harus diikuti.

**Langkah pemain:**

1. Gelembung pikiran melayang di langit, misalnya "Aku pasti gagal presentasi", "Besok harus bagi tugas", "Kenapa aku begini terus?", "Dulu aku salah bicara".
2. Pemain **menyeret** tiap gelembung ke keranjang label yang tepat: **Cemas**, **Rencana**, **Menilai Diri**, **Kenangan**.
3. Label benar: gelembung berubah menjadi awan dan melayang pergi disertai umpan balik lembut. Label salah: gelembung kembali dengan petunjuk, tanpa hukuman.
4. Ada satu momen "napas ulang": jika terlalu banyak gelembung menumpuk, pemain diajak kembali ke napas 1 siklus (menghubungkan Level 1).
5. Selesai setelah 10 gelembung.

**Kondisi menang:** akurasi 60% atau lebih dan tidak ada panik klik (lihat BR-05).

### 3.5 Level 3: "Jeda di Situasi Nyata" (skenario bercabang)

**Tujuan:** K3, K4, A3, P3.

**Konsep:** tiga skenario pendek yang nyata untuk mahasiswa, misalnya:

- Dosen belum membalas email revisi padahal tenggat besok.
- Teman kelompok tidak mengerjakan bagiannya.
- Mendapat kritik tajam di depan kelas.

**Langkah pemain tiap skenario:**

1. Pemain melihat pemicu dan perasaan Raka (meter emosi naik).
2. Pemain memilih: **Langsung bereaksi** atau **Jeda dengan STOP**.
3. Jika memilih STOP, pemain menyelesaikan 4 langkah mini: *Stop* (tekan tombol jeda), *Take a breath* (1 siklus napas), *Observe* (pilih emosi yang dirasakan), *Proceed* (pilih respons terbaik dari 3 pilihan).
4. Cerita bercabang. Reaksi impulsif membawa konsekuensi realistis (percakapan memburuk). Respons sadar membawa hasil lebih baik. **Tidak ada jawaban yang mempermalukan pemain**, tetapi konsekuensi ditampilkan jelas.
5. Setelah 3 skenario, layar hasil muncul.

**Catatan desain:** Level 3 harus terasa seperti cerita, bukan kuis, supaya mekanismenya melatih keputusan, bukan hafalan.

### 3.6 Diagram alur singkat

`Mulai → Check-in → Tutorial → Level 1 (skor ≥ 60?) → Level 2 (skor ≥ 60?) → Level 3 → Hasil dan Refleksi → Main ulang / Selesai`

Jika skor di bawah 60, pemain menerima umpan balik dan opsi mengulang atau memakai *mode ramah* (BR-07).

---

## 4. Mekanisme Game, Sistem Skor, dan Aturan Bisnis

### 4.1 Prinsip desain

1. **Tanpa timer yang menekan.** Mindfulness tidak boleh dilatih dengan stres. Level diukur dari siklus atau item, bukan hitung mundur.
2. **Hukuman lembut.** Kesalahan memberi umpan balik, bukan kegagalan keras.
3. **Kemajuan terlihat.** Bintang, meter ketenangan, dan perbandingan check-in.
4. **Sesi pendek.** Satu run penuh 5 sampai 8 menit.
5. **Aksesibel.** Bisa dimainkan dengan mouse, sentuh, dan keyboard. Ada opsi kurangi gerakan.

### 4.2 Mekanik inti per level

| Level | Mekanik | Input | Tantangan | Umpan balik |
| --- | --- | --- | --- | --- |
| 1 Napas | Ritme tahan dan lepas | Tahan dan lepas tombol/spasi | Menjaga ritme dan mengabaikan notifikasi palsu | Warna lingkaran: hijau (sinkron), kuning (agak meleset), merah muda (jauh) |
| 2 Awan Pikiran | Seret dan label | Drag and drop | Mengklasifikasi pikiran dengan benar dan tidak panik | Gelembung menjadi awan, pesan lembut |
| 3 Jeda | Skenario bercabang dan STOP | Klik pilihan | Memilih jeda dan respons terbaik | Meter emosi, hasil cerita |

### 4.3 Sistem skor: "Skor Sadar" 0 sampai 100 per level

**Level 1 (Napas):**

| Komponen | Bobot | Cara hitung |
| --- | --- | --- |
| Sinkronisasi napas | 60% | Rata-rata ketepatan durasi tahan (target 4 detik) dan lepas (target 6 detik) per siklus. Toleransi ±1 detik penuh, ±2 detik separuh |
| Ketahanan terhadap gangguan | 30% | 100 dikurangi 20 per notifikasi palsu yang ditekan, minimum 0 |
| Konsistensi | 10% | Jumlah siklus berurutan yang sinkron dibagi 6 |

**Level 2 (Awan Pikiran):**

| Komponen | Bobot | Cara hitung |
| --- | --- | --- |
| Akurasi label | 70% | Label benar pada percobaan pertama dibagi 10 |
| Ketenangan | 20% | Dikurangi jika ada klik beruntun cepat (lihat BR-05) |
| Penyelesaian | 10% | Semua gelembung terselesaikan |

**Level 3 (Jeda):**

| Komponen | Bobot | Cara hitung |
| --- | --- | --- |
| Memilih jeda | 40% | Berapa skenario di mana pemain memilih STOP |
| Kualitas respons | 40% | Respons terbaik 100, cukup baik 60, impulsif 0 |
| Penyelesaian STOP | 20% | 4 langkah dilakukan lengkap |

**Bintang:**

| Skor | Hasil |
| --- | --- |
| 0 sampai 59 | Belum lulus, umpan balik dan ulangi |
| 60 sampai 79 | 1 bintang |
| 80 sampai 89 | 2 bintang |
| 90 sampai 100 | 3 bintang |

**Skor akhir:** rata-rata tertimbang Level 1 (25%), Level 2 (30%), Level 3 (45%). Bobot Level 3 terbesar karena ia mengukur tujuan akhir: menerapkan jeda di situasi nyata.

**Alasan skor ini (siap dijelaskan):** skor tidak mengukur "seberapa tenang" pemain, karena itu tidak bisa diukur dari klik. Skor mengukur **perilaku yang dilatih**: ritme napas, kemampuan melabeli, dan keputusan menjeda.

### 4.4 Progres dan penguncian

- Level 2 terkunci sampai Level 1 lulus (skor ≥ 60). Level 3 terkunci sampai Level 2 lulus.
- Skor terbaik disimpan dan dipakai untuk bintang. Main ulang tidak menurunkan skor terbaik.
- Progres disimpan di penyimpanan browser (localStorage) agar aman saat halaman dimuat ulang.

### 4.5 Aturan bisnis dan penanganan edge case

Aturan bertanda ★ **wajib terlihat berjalan di demo** (syarat minimal dua aturan).

| Kode | Aturan | Penanganan edge case |
| --- | --- | --- |
| BR-01 ★ | **Penguncian level.** Level berikutnya hanya terbuka jika skor level sebelumnya ≥ 60. | Tombol Level 2 dan 3 tampil terkunci dengan pesan "Selesaikan Level 1 dulu". |
| BR-02 | **Level tanpa batas percobaan.** Pemain boleh mengulang kapan saja. | Skor terbaik yang dipakai. Tidak ada nyawa atau penalti. |
| BR-03 ★ | **Notifikasi palsu Level 1.** Menekan notifikasi mengurangi skor ketahanan dan memunculkan umpan balik lembut: *"Perhatianmu tadi pergi. Kembali ke napas."* | Skor ketahanan tidak turun di bawah 0. |
| BR-04 | **Tahan terlalu lama atau terlalu singkat.** Tahan lebih dari 8 detik otomatis dihitung selesai dan lingkaran mengecil. Tahan kurang dari 1 detik tidak dihitung sebagai siklus. | Pemain tidak terjebak. Siklus tidak sah diulang tanpa penalti. |
| BR-05 ★ | **Anti panik klik dan tebak asal.** Jika pemain mengklik atau menyeret lebih dari 5 aksi dalam 3 detik, game menampilkan *"Pelan-pelan. Tarik napas dulu"* dan menjeda 3 detik. | Mencegah menebak acak dan melatih kesadaran. Tidak ada hukuman skor selain komponen Ketenangan. |
| BR-06 | **Tidak ada input.** Jika tidak ada aksi 15 detik, muncul petunjuk lembut. Setelah 60 detik, sesi dijeda dan disimpan. | Tidak ada penalti. Pemain bisa lanjut. |
| BR-07 | **Mode ramah.** Jika pemain gagal 3 kali berturut-turut di level yang sama, game menawarkan ritme napas lebih mudah (3 detik tarik, 4 detik hembus), toleransi lebih lebar, dan petunjuk lebih banyak. | Level tetap bisa lulus. Skor ditandai "mode ramah" tanpa mempermalukan pemain. |
| BR-08 | **Tab disembunyikan atau pindah aplikasi.** Game otomatis dijeda saat tab tidak aktif. | Timer siklus berhenti. Pemain melanjutkan dari titik terakhir. |
| BR-09 ★ | **Check-in distres.** Jika pemain memilih tingkat suasana hati terendah (sangat tertekan) atau memilih label seperti panik atau ingin menyakiti diri, game menampilkan pesan peduli dan pilihan layanan bantuan profesional (misalnya layanan Healing119 Kemenkes lewat telepon 119 ext. 8 dan situs Healing119.id, keduanya ditampilkan karena panggilan bisa terkendala operator atau lokasi), lalu menawarkan latihan napas ringan saja. | Game tidak dilanjutkan ke level skenario berat tanpa persetujuan pemain. Game tidak mengklaim menyembuhkan. |
| BR-10 | **Check-in akhir lebih buruk.** Jika suasana hati akhir lebih rendah dari awal, pesan netral: *"Perasaan bisa naik turun. Mengamatinya sudah bagian dari latihan."* | Tidak ada klaim keberhasilan palsu. Disarankan coba lagi atau berbicara dengan orang tepercaya. |
| BR-11 | **Batas sesi sehat.** Setelah 3 run penuh dalam satu hari, game menyarankan istirahat dari layar. | Tidak memblokir, hanya mengingatkan. |
| BR-12 | **Aksesibilitas.** Opsi *kurangi gerakan*, suara mati secara default, teks keterangan untuk semua suara, tidak mengandalkan warna saja untuk umpan balik. | Pemain dengan sensitivitas gerakan atau buta warna tetap bisa bermain. |
| BR-13 | **Privasi.** Tidak meminta nama atau data pribadi. Data check-in hanya tersimpan di perangkat. | Tombol "hapus data saya" tersedia. |
| BR-14 | **Data hilang atau rusak.** Jika penyimpanan browser kosong atau rusak, game mulai dari awal dengan pesan ramah, tanpa error. | Mencegah layar putih. |

### 4.6 Tabel keputusan singkat untuk interview

| Pertanyaan pewawancara | Jawaban singkat |
| --- | --- |
| Kenapa tidak ada timer? | Tekanan waktu bertentangan dengan tujuan mindfulness. Level diukur dari siklus dan item. |
| Kenapa notifikasi palsu? | Meniru gangguan nyata dan melatih tidak bereaksi (P2, K3). |
| Kenapa ada BR-09? | Game bukan terapi. Pemain yang sedang tertekan berat butuh bantuan manusia, bukan level. |
| Kenapa bobot Level 3 terbesar? | Level 3 mengukur transfer ke kehidupan nyata, tujuan akhir game. |
| Bagaimana tahu game efektif? | Perbandingan check-in awal dan akhir plus kuis refleksi singkat. Untuk bukti kuat perlu uji pengguna lebih besar. |

---

## 5. Referensi dari Aplikasi Nyata

Riset dilakukan dengan membandingkan aplikasi yang sudah ada, lalu menentukan **apa yang diambil, apa yang diubah, dan apa yang sengaja tidak diambil**. Cek ulang fitur terbaru di tiap aplikasi sebelum membuat slide.

| Aplikasi | Yang dipelajari | Yang diambil untuk JEDA | Yang tidak diambil dan alasannya |
| --- | --- | --- | --- |
| **Calm** | Latihan napas visual (Breathe Bubble), suasana tenang, check-in suasana hati harian | Lingkaran napas yang mengembang dan mengecil di Level 1, nuansa visual dan suara lembut, check-in suasana hati | Konten audio panjang dan model berlangganan. JEDA gratis dan berbasis aksi pendek |
| **Headspace** | Kursus bertahap dari dasar ke lanjut, animasi sederhana yang menjelaskan konsep, tutorial singkat | Struktur 3 level yang naik bertahap, penjelasan konsep lewat animasi dan bahasa sederhana | Katalog besar dan kursus puluhan hari. Terlalu luas untuk demo |
| **Forest** | Mekanik komitmen: pohon tumbuh jika kamu tidak membuka aplikasi lain | Ide bahwa **tidak mengganggu** menjadi inti permainan, diadaptasi jadi "jangan tekan notifikasi palsu" di Level 1 | Pohon mati sebagai hukuman. JEDA memakai umpan balik lembut |
| **Smiling Mind** | Program mindfulness gratis untuk anak muda dan sekolah | Fokus pada pengguna muda, bahasa sederhana, sesi pendek | Format audio terpandu panjang |
| **Finch** | Gamifikasi perawatan diri dengan karakter pendamping dan tujuan kecil | Umpan balik hangat, tujuan kecil, kemajuan yang terasa menyenangkan | Ketergantungan pada streak harian yang berisiko menambah tekanan |

### Pelajaran lintas aplikasi

1. **Sesi pendek dan terstruktur** meningkatkan kemungkinan dipakai berulang.
2. **Visual napas** lebih mudah diikuti daripada instruksi teks.
3. **Hukuman keras** (pohon mati, streak hilang) berisiko menambah tekanan pada pemain yang sudah tertekan, sehingga bertentangan dengan tujuan mindfulness. Ini keputusan desain JEDA, bukan temuan riset yang sudah teruji. JEDA menghindarinya.
4. **Celah pasar:** sedikit aplikasi mindfulness berbahasa Indonesia yang berbentuk **game aktif** dan memakai **skenario kehidupan mahasiswa** (tugas, grup WhatsApp, dosen). Ini diferensiasi JEDA.

### Dasar konsep (untuk dijelaskan, bukan dikutip panjang)

- **Mindfulness-Based Stress Reduction (Jon Kabat-Zinn):** definisi mindfulness sebagai memperhatikan saat ini dengan sengaja dan tanpa menghakimi, dasar K1 dan A2.
- **Labeling dan cognitive defusion** (dari pendekatan ACT dan riset *affect labeling*): menamai pikiran dan emosi membantu jarak dari pikiran, dasar Level 2.
- **STOP** (praktik umum dalam program mindfulness): jeda singkat sebelum merespons, dasar Level 3.

Kamu perlu membuka sumber aslinya dan mencatat tautan tiap rujukan di slide.

### Catatan Sumber (dicek 15 November 2026)

| Angka atau klaim | Sumber yang kubuka | Status | Yang kamu lakukan |
| --- | --- | --- | --- |
| 34,9% masalah dan 5,5% gangguan (I-NAMHS 2022, usia 10 sampai 17) | [UNAIR](https://unair.ac.id/?p=167009), [jurnal UMPR](https://journal.umpr.ac.id/index.php/bijaksana/article/download/10343/5692) | Terverifikasi di beberapa sumber sekunder | Kutip laporan asli I-NAMHS (UGM) dan sebut rentang usianya |
| Depresi paling banyak di usia 15 sampai 24 (SKI 2023) | [JawaPos](https://www.jawapos.com/pendidikan/2609210129/problem-kesehatan-mental-masih-besar-di-papua-barat-konselor-sebaya-digiatkan) | Sumber sekunder | Ambil angka persen dari laporan SKI Kemenkes |
| 2,6% remaja mengakses layanan | [jurnal UMPR](https://journal.umpr.ac.id/index.php/bijaksana/article/download/10343/5692) | Sumber sekunder | Cocokkan dengan laporan I-NAMHS |
| 15.424 pengguna Healing119 dalam 7 minggu (Juli sampai Agustus 2025) | [RM.id](https://rm.id/baca-berita/government-action/284452/kemenkes-ingatkan-pentingnya-kesehatan-jiwa-di-segala-situasi) | Sumber media | Tulis "menurut Kemenkes, dikutip RM.id" |
| 119 ext. 8 adalah Healing119, gratis | [Kemenkes](https://kemkes.go.id/id/wamenkes-dante-ajak-masyarakat-kenali-gejala-gangguan-jiwa), [FAQ Kemenkes](https://kesprimkom.kemkes.go.id/assets/uploads/contents/others/FAQ_Cegah_Bunuh_Diri%2C_Dukung_Kesehatan_Jiwa__Kenali_Layanan_Healing119.id.pdf) | Terverifikasi di situs Kemenkes | Tampilkan nomor dan situs; layanan bukan pengganti diagnosis atau perawatan profesional |
| 7 sampai 8 jam internet per hari (DataReportal) | Belum dibuka | **Belum terverifikasi** | Buka laporan Digital Indonesia terbaru dan salin angkanya |
| 1 dari 7 remaja global (WHO) | [JPNN](https://jogja.jpnn.com/jogja-terkini/14091/masalah-mental-membayangi-remaja-indonesia-pakar-ugm-tekankan-pentingnya-deteksi-dini) | Dikuatkan sumber sekunder | Kutip dari halaman WHO |
| Hukuman keras (pohon mati, streak hilang) memicu rasa bersalah | Tidak ditemukan | **Bukan klaim riset** | Presentasikan sebagai keputusan desain |

---

## Langkah Berikutnya

1. **PRD (Product Requirements Document)** untuk pedoman membangun dengan Antigravity dan Phaser: scene, struktur file, state, tugas per fase, dan prompt siap pakai untuk Antigravity.
2. **Kerangka 10 slide** yang memuat tiga bagian wajib (user story, aturan bisnis, riset).
3. **Skrip presentasi 10 menit** dan daftar pertanyaan jebakan beserta jawabannya.

Demo dibuat sebagai satu file HTML (Phaser dimuat dari CDN atau dibundel) agar bisa langsung dibuka di browser dan di-deploy ke Netlify.
