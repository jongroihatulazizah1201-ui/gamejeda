/**
 * JEDA - Mode Jurnal (js/journal.js)
 * Sesuai PRD Bagian 15.6, BR-19, dan BR-20:
 * 
 * Fitur:
 * - Klasifikasi di perangkat menggunakan aturan kata kunci (on-device keyword classifier)
 * - Pembersihan dan normalisasi bahasa percakapan / informal
 * - Penanganan ambiguitas (margin pemenang minimal 1 kecocokan)
 * - Pengisian otomatis dari dek bawaan bila kurang dari 10 (tiap kategori minimal 2)
 * - BR-19: Privasi penuh, tidak disimpan di localStorage, penjelasan kata kunci, tombol Tidak cocok
 * - BR-20: Deteksi krisis (crisis keywords) membatalkan jurnal dan membuka modal peduli
 * 
 * Contoh Uji (Test Examples):
 * 1. "Bagaimana kalau aku gagal dalam ujian nanti?" -> Cemas (kata kunci: "bagaimana kalau", "gagal")
 * 2. "Besok aku harus mulai mengerjakan laporan akhir." -> Rencana (kata kunci: "besok", "harus", "mulai", "kerjakan")
 * 3. "Dulu waktu semester satu nilaiku jelek sekali." -> Kenangan (kata kunci: "dulu", "waktu semester")
 */

window.JEDA = window.JEDA || {};
window.JEDA.DATA = window.JEDA.DATA || {};

// =========================================================================
// 1. DATA KATA KUNCI (Lexicon & Crisis)
// =========================================================================

JEDA.DATA.lexicon = {
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
};

JEDA.DATA.crisis = [
  'bunuh diri', 'ingin mati', 'akhiri hidup', 'mengakhiri hidup',
  'menyakiti diri', 'tidak mau hidup', 'capek hidup', 'mau mati',
  'pengen mati', 'suicide', 'self harm', 'potong nadi', 'lompat dari'
];

// =========================================================================
// 2. MODUL JEDA.Journal
// =========================================================================

JEDA.Journal = (function() {
  /**
   * Menyeragamkan variasi percakapan / slang Indonesia agar cocok dengan leksikon.
   */
  function normalizeText(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/\b(gak|nggak|ga|gk|ndak)\b/gi, 'tidak')
      .replace(/\b(blm)\b/gi, 'belum')
      .replace(/\b(bgt|bngt)\b/gi, 'banget')
      .replace(/\b(dgn)\b/gi, 'dengan')
      .replace(/\b(sdh|udh|udah)\b/gi, 'sudah')
      .replace(/\b(bener|beneran)\b/gi, 'benar')
      .replace(/\b(gimana)\b/gi, 'bagaimana')
      .replace(/\b(kalo)\b/gi, 'kalau')
      .replace(/\b(tp|tpi)\b/gi, 'tapi')
      .replace(/\b(bisa|bs)\b/gi, 'bisa');
  }

  return {
    /**
     * Memecah paragraf jurnal menjadi kalimat-kalimat (12 s.d. 140 karakter, maks 12 kalimat).
     * @param {string} text - Teks masukan dari textarea
     * @returns {string[]}
     */
    split(text) {
      if (!text || typeof text !== 'string') return [];
      // Pecah per tanda baca (. ! ?) atau baris baru
      const rawSentences = text.split(/[\.\!\?\n\r]+/);
      const results = [];

      for (let i = 0; i < rawSentences.length; i++) {
        const trimmed = rawSentences[i].trim();
        // Syarat panjang kalimat: 12 sampai 140 karakter
        if (trimmed.length >= 12 && trimmed.length <= 140) {
          results.push(trimmed);
          if (results.length >= 12) break; // Maksimal 12 kalimat
        }
      }
      return results;
    },

    /**
     * Menilai apakah teks mengandung tanda-tanda krisis atau bahaya diri (BR-20).
     * @param {string} text
     * @returns {boolean}
     */
    crisis(text) {
      if (!text || typeof text !== 'string') return false;
      const lower = text.toLowerCase();
      const crisisList = JEDA.DATA.crisis || [];
      return crisisList.some(kw => lower.includes(kw));
    },

    /**
     * Mengklasifikasi satu kalimat ke dalam salah satu dari 4 kategori (Cemas, Rencana, Menilai Diri, Kenangan).
     * Syarat: Kategori pemenang harus unggul MINIMAL 1 kecocokan dari peringkat kedua.
     * @param {string} sentence
     * @returns {Object|null} { cat, hits, margin, matchedWord } atau null bila ambigu / 0 kecocokan
     */
    classify(sentence) {
      if (!sentence) return null;
      const norm = normalizeText(sentence);
      const lexicon = JEDA.DATA.lexicon || {};

      const scores = {
        'Cemas': { hits: 0, words: [] },
        'Rencana': { hits: 0, words: [] },
        'Menilai Diri': { hits: 0, words: [] },
        'Kenangan': { hits: 0, words: [] }
      };

      for (const [cat, wordList] of Object.entries(lexicon)) {
        for (const w of wordList) {
          if (norm.includes(w)) {
            scores[cat].hits++;
            scores[cat].words.push(w);
          }
        }
      }

      // Urutkan berdasarkan skor tertinggi
      const sorted = Object.entries(scores).sort((a, b) => b[1].hits - a[1].hits);
      const winner = sorted[0];
      const runnerUp = sorted[1];

      // Bila tidak ada kata kunci yang cocok sama sekali
      if (winner[1].hits === 0) return null;

      // Ambang batas keyakinan: margin pemenang minimal 1 kecocokan dari posisi kedua
      const margin = winner[1].hits - runnerUp[1].hits;
      if (margin < 1) {
        return null; // Ambigu, dibuang sesuai PRD 15.6
      }

      return {
        cat: winner[0],
        hits: winner[1].hits,
        margin: margin,
        matchedWord: winner[1].words[0]
      };
    },

    /**
     * Membangun dek monster dari jurnal.
     * Mengisi dari dek bawaan bila kurang dari 10 dan memastikan tiap kategori minimal 2 (BR-19).
     * @param {string} text
     * @returns {Object} { monsters, dropped, crisis }
     */
    build(text) {
      // 1. Cek Krisis (BR-20)
      if (this.crisis(text)) {
        return {
          monsters: [],
          dropped: [],
          crisis: true
        };
      }

      // 2. Pecah Kalimat
      const sentences = this.split(text);
      const monsters = [];
      const dropped = [];

      sentences.forEach((sentence, idx) => {
        const res = this.classify(sentence);
        if (res) {
          monsters.push({
            id: 'journal_' + Date.now() + '_' + idx,
            text: sentence,
            cat: res.cat,
            hint: `Aku mengira ini ${res.cat} karena kata '${res.matchedWord}'.`,
            isJournal: true,
            matchedWord: res.matchedWord,
            hasFailed: false
          });
        } else {
          dropped.push(sentence);
        }
      });

      // 3. Pastikan tiap kategori minimal 2 monster dan total 10 monster (BR-19)
      const categories = ['Cemas', 'Rencana', 'Menilai Diri', 'Kenangan'];
      const defaultThoughts = (JEDA.DATA && JEDA.DATA.thoughts) ? JEDA.DATA.thoughts : [];

      // Periksa kebutuhan per kategori
      categories.forEach(cat => {
        let count = monsters.filter(m => m.cat === cat).length;
        if (count < 2) {
          const needed = 2 - count;
          const candidates = defaultThoughts.filter(t => t.cat === cat && !monsters.some(m => m.id === t.id));
          for (let i = 0; i < needed && i < candidates.length; i++) {
            monsters.push({
              ...candidates[i],
              isJournal: false,
              hasFailed: false
            });
          }
        }
      });

      // 4. Jika total masih kurang dari 10, lengkapi hingga 10 dari dek bawaan
      if (monsters.length < 10) {
        const remainingNeeded = 10 - monsters.length;
        const available = defaultThoughts.filter(t => !monsters.some(m => m.id === t.id));
        // Acak kandidat pengisi
        for (let i = available.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [available[i], available[j]] = [available[j], available[i]];
        }
        for (let i = 0; i < remainingNeeded && i < available.length; i++) {
          monsters.push({
            ...available[i],
            isJournal: false,
            hasFailed: false
          });
        }
      }

      // Potong jika lebih dari 10
      const finalDeck = monsters.slice(0, 10);

      // Acak urutan agar bervariasi
      for (let i = finalDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [finalDeck[i], finalDeck[j]] = [finalDeck[j], finalDeck[i]];
      }

      return {
        monsters: finalDeck,
        dropped: dropped,
        crisis: false
      };
    }
  };
})();
