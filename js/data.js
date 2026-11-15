/**
 * JEDA - Data Konten Permainan (js/data.js)
 * Konten resmi Bagian 8 PRD:
 * - 8.1 Gelembung Pikiran Level 2 (10 pikiran, kategori, dan petunjuk)
 * - 8.2 Skenario Level 3 (Pemicu, reaksi langsung, respons STOP, dan kunci observe)
 */
window.JEDA = window.JEDA || {};

JEDA.DATA = {
  /**
   * 30 Gelembung Pikiran Level 2 (PRD Bagian 8.1 & 15.5)
   * 10 pikiran lama + 20 pikiran baru yang mencakup akademik, sosial, keuangan, dan masa depan.
   * Komposisi dek: 8 Cemas, 8 Rencana, 7 Menilai Diri, 7 Kenangan.
   * Tiap item memiliki id, text, cat, category, dan hint edukatif yang hangat & bebas penghakiman.
   */
  thoughts: [
    // --- 10 Pikiran Awal (PRD Bagian 8.1) ---
    {
      id: 1,
      text: 'Aku pasti gagal presentasi besok.',
      cat: 'Cemas',
      category: 'Cemas',
      hint: 'Pikiran ini mencemaskan hal buruk yang belum tentu terjadi, bukan rencana nyata.'
    },
    {
      id: 2,
      text: 'Besok pagi aku bagi tugas kelompok dulu.',
      cat: 'Rencana',
      category: 'Rencana',
      hint: 'Ini adalah langkah praktis ke depan yang terjadwal, bukan kekhawatiran.'
    },
    {
      id: 3,
      text: 'Kenapa aku begini terus?',
      cat: 'Menilai Diri',
      category: 'Menilai Diri',
      hint: 'Pikiran ini menghakimi dan menyalahkan diri sendiri.'
    },
    {
      id: 4,
      text: 'Waktu itu aku salah bicara di kelas.',
      cat: 'Kenangan',
      category: 'Kenangan',
      hint: 'Pikiran ini menengok ke peristiwa masa lalu yang sudah berlalu.'
    },
    {
      id: 5,
      text: 'Bagaimana kalau IPK-ku turun?',
      cat: 'Cemas',
      category: 'Cemas',
      hint: 'Ini adalah rasa takut akan kemungkinan di masa depan.'
    },
    {
      id: 6,
      text: 'Nanti malam aku cicil bab dua.',
      cat: 'Rencana',
      category: 'Rencana',
      hint: 'Pikiran ini berupa agenda konkret yang hendak dikerjakan.'
    },
    {
      id: 7,
      text: 'Aku nggak sepintar teman-temanku.',
      cat: 'Menilai Diri',
      category: 'Menilai Diri',
      hint: 'Pikiran ini membandingkan dan merendahkan kapasitas dirimu.'
    },
    {
      id: 8,
      text: 'Dulu dosen pernah menegurku di depan semua orang.',
      cat: 'Kenangan',
      category: 'Kenangan',
      hint: 'Ini adalah rekaman memori masa lalu yang terputar kembali.'
    },
    {
      id: 9,
      text: 'Kalau dosen marah, aku harus bagaimana?',
      cat: 'Cemas',
      category: 'Cemas',
      hint: 'Pikiran ini mengantisipasi skenario menakutkan yang belum tentu terjadi.'
    },
    {
      id: 10,
      text: 'Aku harus balas pesan grup sebelum jam lima.',
      cat: 'Rencana',
      category: 'Rencana',
      hint: 'Pikiran ini tentang rencana tindakan yang perlu diselesaikan hari ini.'
    },

    // --- 20 Pikiran Tambahan (PRD Bagian 15.5) ---
    // Cemas Tambahan (5 item)
    {
      id: 11,
      text: 'Kalau tugas akhirku tidak selesai tepat waktu, bagaimana?',
      cat: 'Cemas',
      category: 'Cemas',
      hint: 'Pikiran ini mencemaskan masa depan yang belum terjadi, bukan masalah saat ini.'
    },
    {
      id: 12,
      text: 'Bagaimana kalau uang bulananku tidak cukup?',
      cat: 'Cemas',
      category: 'Cemas',
      hint: 'Ini adalah rasa khawatir akan kemungkinan kekurangan, bukan tindakan nyata.'
    },
    {
      id: 13,
      text: 'Jangan-jangan temanku diam-diam kesal padaku.',
      cat: 'Cemas',
      category: 'Cemas',
      hint: 'Pikiran ini mengasumsikan perasaan orang lain tanpa bukti nyata.'
    },
    {
      id: 14,
      text: 'Setelah lulus nanti aku takut menganggur.',
      cat: 'Cemas',
      category: 'Cemas',
      hint: 'Ini adalah kecemasan tentang masa depan karir yang belum dihadapi.'
    },
    {
      id: 15,
      text: 'Kalau aku salah jawab di kelas, semua orang akan menertawakanku.',
      cat: 'Cemas',
      category: 'Cemas',
      hint: 'Pikiran ini membesar-besarkan rasa malu atas skenario yang belum terjadi.'
    },

    // Rencana Tambahan (5 item)
    {
      id: 16,
      text: 'Setelah kelas aku mau ke perpustakaan.',
      cat: 'Rencana',
      category: 'Rencana',
      hint: 'Ini adalah niat tindakan nyata yang akan kamu lakukan nanti.'
    },
    {
      id: 17,
      text: 'Akhir pekan ini aku rapikan catatan kuliah.',
      cat: 'Rencana',
      category: 'Rencana',
      hint: 'Pikiran ini berupa agenda konkret yang dijadwalkan ke depan.'
    },
    {
      id: 18,
      text: 'Aku harus daftar magang sebelum Jumat.',
      cat: 'Rencana',
      category: 'Rencana',
      hint: 'Ini adalah langkah terencana dengan batas waktu tertentu.'
    },
    {
      id: 19,
      text: 'Nanti sore aku cuci baju dulu baru mengerjakan laporan.',
      cat: 'Rencana',
      category: 'Rencana',
      hint: 'Pikiran ini mengatur urutan aktivitas praktis yang hendak dilakukan.'
    },
    {
      id: 20,
      text: 'Besok aku tanya dosen soal revisi.',
      cat: 'Rencana',
      category: 'Rencana',
      hint: 'Ini adalah rencana komunikasi terarah untuk menyelesaikan tugas.'
    },

    // Menilai Diri Tambahan (5 item)
    {
      id: 21,
      text: 'Aku selalu lambat dibanding teman-temanku.',
      cat: 'Menilai Diri',
      category: 'Menilai Diri',
      hint: 'Pikiran ini menghakimi diri dengan perbandingan yang memberatkan.'
    },
    {
      id: 22,
      text: 'Aku nggak cocok di jurusan ini.',
      cat: 'Menilai Diri',
      category: 'Menilai Diri',
      hint: 'Ini adalah vonis keras terhadap kemampuan dan potensi dirimu sendiri.'
    },
    {
      id: 23,
      text: 'Orang lain terlihat lebih sukses dariku.',
      cat: 'Menilai Diri',
      category: 'Menilai Diri',
      hint: 'Pikiran ini mengukur harga diri dari penampilan luar orang lain.'
    },
    {
      id: 24,
      text: 'Aku malas, makanya hidupku berantakan.',
      cat: 'Menilai Diri',
      category: 'Menilai Diri',
      hint: 'Ini adalah pelabelan negatif terhadap diri sendiri tanpa belas kasih.'
    },
    {
      id: 25,
      text: 'Aku payah dalam presentasi.',
      cat: 'Menilai Diri',
      category: 'Menilai Diri',
      hint: 'Pikiran ini memberi penilaian buruk menyeluruh terhadap satu keterampilan.'
    },

    // Kenangan Tambahan (5 item)
    {
      id: 26,
      text: 'Kemarin aku diam saja saat kerja kelompok.',
      cat: 'Kenangan',
      category: 'Kenangan',
      hint: 'Ini adalah memori tentang kejadian kemarin yang sudah berlalu.'
    },
    {
      id: 27,
      text: 'Waktu semester dua nilaiku jelek sekali.',
      cat: 'Kenangan',
      category: 'Kenangan',
      hint: 'Pikiran ini menengok kembali masa lalu yang sudah tidak bisa diubah.'
    },
    {
      id: 28,
      text: 'Tadi pagi temanku cuek saat kusapa.',
      cat: 'Kenangan',
      category: 'Kenangan',
      hint: 'Ini adalah rekaman peristiwa tadi pagi yang masih terngiang.'
    },
    {
      id: 29,
      text: 'Dulu aku pernah ditolak masuk organisasi itu.',
      cat: 'Kenangan',
      category: 'Kenangan',
      hint: 'Pikiran ini mengingat penolakan lama yang telah usai.'
    },
    {
      id: 30,
      text: 'Minggu lalu aku terlambat dan semua orang melihatku.',
      cat: 'Kenangan',
      category: 'Kenangan',
      hint: 'Ini adalah kilas balik kejadian minggu lalu yang telah lewat.'
    }
  ],

  /**
   * 3 Skenario Level 3 (PRD Bagian 8.2)
   */
  scenarios: [
    {
      id: 1,
      title: 'Email Belum Dibalas',
      trigger: 'Dua hari email revisi skripsimu belum dibalas dosen. Tenggat besok.',
      reactionConsequence: 'Kamu mengirim tiga pesan beruntun yang menekan. Balasan dosen makin singkat dan suasana menjadi dingin.',
      keys: ['Cemas', 'Kesal'],
      emotions: ['Cemas', 'Kesal', 'Bosan', 'Tenang'],
      bestResponse: {
        score: 100,
        text: 'Kirim satu pesan sopan menanyakan waktu terbaik, lalu kerjakan bagian lain dulu.'
      },
      fairResponse: {
        score: 60,
        text: 'Menunggu sampai besok tanpa melakukan apa-apa.'
      },
      poorResponse: {
        score: 0,
        text: 'Kirim pesan marah karena merasa diabaikan.'
      }
    },
    {
      id: 2,
      title: 'Teman Tidak Mengerjakan Tugas',
      trigger: 'Rani belum mengirim bagiannya. Presentasi 3 jam lagi, grup ramai.',
      reactionConsequence: 'Kamu menulis di grup bahwa semua orang tidak bertanggung jawab. Suasana tegang dan Rani menghilang.',
      keys: ['Kesal', 'Cemas'],
      emotions: ['Kesal', 'Cemas', 'Senang', 'Lega'],
      bestResponse: {
        score: 100,
        text: 'Hubungi Rani langsung, tanyakan kendalanya, tawarkan pembagian ulang.'
      },
      fairResponse: {
        score: 60,
        text: 'Minta anggota lain mengambil alih tanpa bicara dengan Rani.'
      },
      poorResponse: {
        score: 0,
        text: 'Mengerjakan semuanya sendiri sambil menyimpan kesal.'
      }
    },
    {
      id: 3,
      title: 'Kritik di Depan Kelas',
      trigger: 'Dosen bilang slide-mu kurang jelas di depan seluruh kelas.',
      reactionConsequence: 'Kamu membantah di depan kelas. Diskusi berubah canggung dan kamu pulang dengan pikiran berat.',
      keys: ['Malu', 'Kesal'],
      emotions: ['Malu', 'Kesal', 'Bangga', 'Semangat'],
      bestResponse: {
        score: 100,
        text: 'Catat poinnya, ucapkan terima kasih, minta contoh perbaikan setelah kelas.'
      },
      fairResponse: {
        score: 60,
        text: 'Diam dan menghindari dosen setelah kelas.'
      },
      poorResponse: {
        score: 0,
        text: 'Mengeluh ke teman sekelas saat itu juga.'
      }
    }
  ],

  /**
   * 14 Ucapan Lumi (PRD Bagian 14.1 & 14.2 G1)
   * Pendamping mindfulness yang hangat, ringkas, dan bebas penghakiman.
   */
  lumi: {
    intro_l1: 'Hai, aku Lumi. Ikuti napasku, tahan saat aku membesar.',
    cycle_good: 'Napasmu pas. Rasakan pelan-pelannya.',
    cycle_off: 'Tidak apa-apa. Kembali ke napas.',
    distract_hit: 'Perhatianmu tadi pergi. Kembali ke napas.',
    storm: 'Badai datang. Tetap di napasmu.',
    storm_pass: 'Kamu melewati badai. Lenteranya makin terang.',
    l2_intro: 'Pikiran itu seperti awan. Beri nama, lalu biarkan lewat.',
    l2_correct: 'Pas. Awannya melayang pergi.',
    l2_wrong: 'Hampir. Coba lihat lagi isinya.',
    panic: 'Pelan-pelan. Tarik napas dulu.',
    l3_intro: 'Kadang yang terbaik adalah berhenti sebentar.',
    stop_s: 'Berhenti. Dunia ikut menunggu.',
    level_pass: 'Satu lentera menyala.',
    result_low: 'Perasaan bisa naik turun. Mengamatinya sudah bagian dari latihan.'
  },

  /**
   * Leksikon Kata Kunci Mode Jurnal (PRD Bagian 15.6)
   */
  lexicon: {
    'Cemas': [
      'takut', 'khawatir', 'cemas', 'bagaimana kalau', 'gimana kalau', 'jangan-jangan',
      'deg-degan', 'panik', 'pasti gagal', 'gagal', 'takutnya', 'was-was', 'gelisah',
      'bingung', 'gugup', 'ragu', 'stres', 'stress', 'takut salah', 'menakutkan'
    ],
    'Rencana': [
      'besok', 'nanti', 'harus', 'mau', 'akan', 'rencana', 'target', 'jadwal',
      'kerjakan', 'cicil', 'sebelum jam', 'nanti sore', 'minggu depan', 'siap-siap',
      'mulai', 'persiapan', 'agendakan', 'daftar', 'hubungi', 'belajar'
    ],
    'Menilai Diri': [
      'aku bodoh', 'nggak becus', 'tidak becus', 'kenapa aku', 'selalu salah', 'tidak pernah',
      'payah', 'malas', 'tidak pintar', 'tidak cocok', 'kurang', 'lemah', 'gagal total',
      'lambat', 'payah banget', 'bego', 'bodohnya aku', 'nggak berguna', 'tidak berguna'
    ],
    'Kenangan': [
      'dulu', 'kemarin', 'waktu itu', 'pernah', 'tadi', 'minggu lalu', 'masih ingat',
      'semester lalu', 'waktu semester', 'bulan lalu', 'tadi pagi', 'kemarin aku',
      'masa lalu', 'teringat', 'teringat saat', 'kejadian itu', 'tahun lalu'
    ]
  },

  /**
   * Kata Kunci Deteksi Krisis & Bahaya Diri (PRD Bagian 15.6 & BR-20)
   */
  crisis: [
    'bunuh diri', 'ingin mati', 'akhiri hidup', 'mengakhiri hidup',
    'menyakiti diri', 'tidak mau hidup', 'capek hidup', 'mau mati',
    'pengen mati', 'suicide', 'self harm', 'potong nadi', 'lompat dari'
  ]
};
