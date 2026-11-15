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
    panicHits: 0,
    l1Passed: false,
    l2FirstTry: 0,
    l2Accuracy: 0,
    l2Passed: false,
    l3StopCount: 0,
    l3AllStop: false,
    l3Passed: false
  },

  /**
   * Mengembalikan objek data default sesuai skema PRD Bagian 9 & 14.2 (Fase G-3).
   */
  getDefaultData() {
    const today = new Date().toISOString().split('T')[0];
    return {
      v: 1,
      best: { l1: 0, l2: 0, l3: 0 },
      stars: { l1: 0, l2: 0, l3: 0 },
      fails: { l1: 0, l2: 0, l3: 0 },
      easy: { l1: false, l2: false, l3: false },
      settings: {
        reduceMotion: false,
        sound: false,
        seen: { intro: false, l1: false, l2: false, l3: false }
      },
      runs: { date: today, count: 0 },
      consentHeavy: false, // True jika pemain memilih 'Latihan napas ringan' di modal peduli
      badges: [],          // PRD 14.2: Daftar lencana positif yang diraih
      skin: 'embun'        // PRD 14.2: Skin visual orb aktif ('embun' | 'fajar' | 'aurora')
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

      // Pastikan semua properti wajib ada, termasuk migrasi kolom badges, skin, dan settings.seen (PRD 14.2, 15.2 & BR-14)
      const defaults = this.getDefaultData();
      const needsMigration = !Array.isArray(parsed.badges) ||
                             typeof parsed.skin !== 'string' ||
                             !parsed.settings ||
                             !parsed.settings.seen;

      const defaultSeen = { intro: false, l1: false, l2: false, l3: false };
      const currentSettings = parsed.settings || {};
      const mergedSettings = {
        reduceMotion: Boolean(currentSettings.reduceMotion),
        sound: Boolean(currentSettings.sound),
        seen: {
          ...defaultSeen,
          ...(typeof currentSettings.seen === 'object' && currentSettings.seen ? currentSettings.seen : {})
        }
      };

      this.data = {
        ...defaults,
        ...parsed,
        best: { ...defaults.best, ...(parsed.best || {}) },
        stars: { ...defaults.stars, ...(parsed.stars || {}) },
        fails: { ...defaults.fails, ...(parsed.fails || {}) },
        easy: { ...defaults.easy, ...(parsed.easy || {}) },
        settings: mergedSettings,
        runs: { ...defaults.runs, ...(parsed.runs || {}) },
        badges: Array.isArray(parsed.badges) ? parsed.badges : [],
        skin: (typeof parsed.skin === 'string' && parsed.skin) ? parsed.skin : 'embun'
      };

      // Simpan pembaruan jika data lama belum punya kolom badges dan skin
      if (needsMigration) {
        this.save();
      }
    } catch (err) {
      console.warn('[JEDA.State] Gagal memuat data, memulihkan ke kondisi awal:', err);
      this.recoveredFromCorrupt = true;
      this.data = this.getDefaultData();
      this.save();
    }
  },

  /**
   * Mengecek apakah lencana tertentu sudah pernah diraih.
   * @param {string} badgeId
   * @returns {boolean}
   */
  hasBadge(badgeId) {
    return Array.isArray(this.data && this.data.badges) && this.data.badges.includes(badgeId);
  },

  /**
   * Membuka lencana baru dan menyimpannya ke state.
   * @param {string} badgeId
   * @returns {boolean} true jika baru pertama kali diraih
   */
  unlockBadge(badgeId) {
    if (!this.data) return false;
    if (!Array.isArray(this.data.badges)) {
      this.data.badges = [];
    }
    if (!this.data.badges.includes(badgeId)) {
      this.data.badges.push(badgeId);
      this.save();
      return true;
    }
    return false;
  },

  /**
   * Memeriksa apakah kartu petunjuk tertentu sudah pernah dilihat (BR-15).
   * @param {string} key - 'intro' | 'l1' | 'l2' | 'l3'
   * @returns {boolean}
   */
  hasSeen(key) {
    if (!this.data || !this.data.settings || !this.data.settings.seen) return false;
    return Boolean(this.data.settings.seen[key]);
  },

  /**
   * Menandai kartu petunjuk tertentu sudah dilihat dan menyimpannya ke state (BR-15).
   * @param {string} key - 'intro' | 'l1' | 'l2' | 'l3'
   */
  markSeen(key) {
    if (!this.data) return;
    if (!this.data.settings) this.data.settings = {};
    if (!this.data.settings.seen) {
      this.data.settings.seen = { intro: false, l1: false, l2: false, l3: false };
    }
    this.data.settings.seen[key] = true;
    this.save();
  },

  /**
   * Menghitung total bintang yang telah diraih di seluruh level (maksimal 9).
   * @returns {number}
   */
  getTotalStars() {
    if (!this.data || !this.data.stars) return 0;
    const s = this.data.stars;
    return (s.l1 || 0) + (s.l2 || 0) + (s.l3 || 0);
  },

  /**
   * Mengatur skin orb yang aktif jika syarat bintang terpenuhi (PRD 14.2 G5).
   * @param {string} skinId - 'embun' | 'fajar' | 'aurora'
   * @returns {boolean} true jika skin berhasil diterapkan
   */
  setSkin(skinId) {
    if (!this.data) return false;
    const skins = (window.JEDA && JEDA.CFG && JEDA.CFG.SKINS) || {};
    const skin = skins[skinId];
    if (!skin) return false;

    const totalStars = this.getTotalStars();
    if (totalStars < skin.reqStars) {
      return false;
    }

    this.data.skin = skinId;
    this.save();

    if (window.JEDA && JEDA.Stage3D && JEDA.Stage3D.setSkin) {
      JEDA.Stage3D.setSkin(skinId);
    }
    return true;
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
