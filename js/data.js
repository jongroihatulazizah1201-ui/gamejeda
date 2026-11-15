/**
 * JEDA - Data Konten Permainan (js/data.js)
 * Konten resmi Bagian 8 PRD:
 * - 8.1 Gelembung Pikiran Level 2 (10 pikiran, kategori, dan petunjuk)
 * - 8.2 Skenario Level 3 (Pemicu, reaksi langsung, respons STOP, dan kunci observe)
 */
window.JEDA = window.JEDA || {};

JEDA.DATA = {
  /**
   * 10 Gelembung Pikiran Level 2 (PRD Bagian 8.1)
   * Kategori: Cemas, Rencana, Menilai Diri, Kenangan
   */
  thoughts: [
    {
      id: 1,
      text: 'Aku pasti gagal presentasi besok.',
      category: 'Cemas',
      hint: 'Pikiran ini mencemaskan hal buruk yang belum tentu terjadi, bukan rencana nyata.'
    },
    {
      id: 2,
      text: 'Besok pagi aku bagi tugas kelompok dulu.',
      category: 'Rencana',
      hint: 'Ini adalah langkah praktis ke depan yang terjadwal, bukan kekhawatiran.'
    },
    {
      id: 3,
      text: 'Kenapa aku begini terus?',
      category: 'Menilai Diri',
      hint: 'Pikiran ini menghakimi dan menyalahkan diri sendiri.'
    },
    {
      id: 4,
      text: 'Waktu itu aku salah bicara di kelas.',
      category: 'Kenangan',
      hint: 'Pikiran ini menengok ke peristiwa masa lalu yang sudah berlalu.'
    },
    {
      id: 5,
      text: 'Bagaimana kalau IPK-ku turun?',
      category: 'Cemas',
      hint: 'Ini adalah rasa takut akan kemungkinan di masa depan.'
    },
    {
      id: 6,
      text: 'Nanti malam aku cicil bab dua.',
      category: 'Rencana',
      hint: 'Pikiran ini berupa agenda konkret yang hendak dikerjakan.'
    },
    {
      id: 7,
      text: 'Aku nggak sepintar teman-temanku.',
      category: 'Menilai Diri',
      hint: 'Pikiran ini membandingkan dan merendahkan kapasitas dirimu.'
    },
    {
      id: 8,
      text: 'Dulu dosen pernah menegurku di depan semua orang.',
      category: 'Kenangan',
      hint: 'Ini adalah rekaman memori masa lalu yang terputar kembali.'
    },
    {
      id: 9,
      text: 'Kalau dosen marah, aku harus bagaimana?',
      category: 'Cemas',
      hint: 'Pikiran ini mengantisipasi skenario menakutkan yang belum tentu terjadi.'
    },
    {
      id: 10,
      text: 'Aku harus balas pesan grup sebelum jam lima.',
      category: 'Rencana',
      hint: 'Pikiran ini tentang rencana tindakan yang perlu diselesaikan hari ini.'
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
  }
};
