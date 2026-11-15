/**
 * JEDA - State Management (js/state.js)
 * Mengelola penyimpanan progres, pengaturan, dan riwayat permainan di localStorage.
 * Mengimplementasikan BR-01 (Kunci Level), BR-02 (Simpan Skor Terbaik), BR-13 (Hapus Data),
 * dan BR-14 (Pemulihan Data Rusak).
 */
window.JEDA = window.JEDA || {};

JEDA.State = {
  STORAGE_KEY: 'jeda_v1',
  data: null,
  recoveredFromCorrupt: false,

  // State sementara satu sesi (tidak disimpan di localStorage)
  session: {
    checkinStart: 0,
    checkinLabel: '',
    levelScores: { l1: 0, l2: 0, l3: 0 },
    distractHits: 0,
    panicHits: 0
  },

  /**
   * Mengembalikan objek data default sesuai skema PRD Bagian 9.
   */
  getDefaultData() {
    const today = new Date().toISOString().split('T')[0];
    return {
      v: 1,
      best: { l1: 0, l2: 0, l3: 0 },
      stars: { l1: 0, l2: 0, l3: 0 },
      fails: { l1: 0, l2: 0, l3: 0 },
      easy: { l1: false, l2: false, l3: false },
      settings: { reduceMotion: false, sound: false },
      runs: { date: today, count: 0 },
      consentHeavy: false // True jika pemain memilih 'Latihan napas ringan' di modal peduli
    };
  },

  /**
   * Inisialisasi dan memuat state dari localStorage.
   */
  init() {
    this.load();
  },

  /**
   * Memuat data dari localStorage dengan penanganan error (BR-14).
   */
  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) {
        this.data = this.getDefaultData();
        this.save();
        return;
      }

      const parsed = JSON.parse(raw);
      // Validasi integritas dan versi skema
      if (!parsed || typeof parsed !== 'object' || parsed.v !== 1) {
        throw new Error('Skema data tidak valid');
      }

      // Pastikan semua properti wajib ada
      const defaults = this.getDefaultData();
      this.data = {
        ...defaults,
        ...parsed,
        best: { ...defaults.best, ...(parsed.best || {}) },
        stars: { ...defaults.stars, ...(parsed.stars || {}) },
        fails: { ...defaults.fails, ...(parsed.fails || {}) },
        easy: { ...defaults.easy, ...(parsed.easy || {}) },
        settings: { ...defaults.settings, ...(parsed.settings || {}) },
        runs: { ...defaults.runs, ...(parsed.runs || {}) }
      };
    } catch (err) {
      console.warn('[JEDA.State] Gagal memuat data, memulihkan ke kondisi awal:', err);
      this.recoveredFromCorrupt = true;
      this.data = this.getDefaultData();
      this.save();
    }
  },

  /**
   * Menyimpan data saat ini ke localStorage.
   */
  save() {
    try {
      if (this.data) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
      }
    } catch (err) {
      console.error('[JEDA.State] Gagal menyimpan ke localStorage:', err);
    }
  },

  /**
   * Menghapus seluruh data pribadi dari localStorage (BR-13).
   */
  resetData() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (err) {
      console.error('[JEDA.State] Gagal menghapus localStorage:', err);
    }
    this.data = this.getDefaultData();
    this.session = {
      checkinStart: 0,
      checkinLabel: '',
      levelScores: { l1: 0, l2: 0, l3: 0 },
      distractHits: 0,
      panicHits: 0
    };
    this.save();
  },

  /**
   * Memeriksa apakah suatu level terbuka (BR-01 & BR-09).
   * Level 1 selalu terbuka.
   * Level 2 terbuka bila best.l1 >= 60 dan tidak diblokir modal peduli (consentHeavy).
   * Level 3 terbuka bila best.l2 >= 60 dan tidak diblokir modal peduli (consentHeavy).
   */
  isLevelUnlocked(level) {
    if (level === 1) return true;
    if (this.data.consentHeavy) return false;
    if (level === 2) return (this.data.best.l1 >= JEDA.CFG.PASS);
    if (level === 3) return (this.data.best.l2 >= JEDA.CFG.PASS);
    return false;
  },

  /**
   * Menyimpan hasil penyelesaian level (BR-02: hanya skor tertinggi yang disimpan).
   */
  saveLevelScore(level, score, stars) {
    const key = `l${level}`;
    if (!this.data.best[key] || score > this.data.best[key]) {
      this.data.best[key] = Math.round(score);
    }
    if (!this.data.stars[key] || stars > this.data.stars[key]) {
      this.data.stars[key] = stars;
    }
    this.save();
  },

  /**
   * Menyimpan checkin awal ke session.
   */
  setCheckin(score, label) {
    this.session.checkinStart = score;
    this.session.checkinLabel = label;
  },

  /**
   * Mode debug: buka semua level (U).
   */
  unlockAll() {
    this.data.best.l1 = 100;
    this.data.best.l2 = 100;
    this.data.best.l3 = 100;
    this.data.stars.l1 = 3;
    this.data.stars.l2 = 3;
    this.data.stars.l3 = 3;
    this.data.consentHeavy = false;
    this.save();
  },

  /**
   * Mendeteksi apakah URL mengandung parameter ?debug=1.
   */
  isDebug() {
    try {
      return window.location.search.includes('debug=1');
    } catch (e) {
      return false;
    }
  }
};

// Inisialisasi state langsung saat script dimuat
JEDA.State.init();
