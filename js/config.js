/**
 * JEDA - Konfigurasi Global & Konstanta
 * Definisi parameter permainan, palet warna, dan konstanta dimensi sesuai PRD Bagian 4 & 6.
 */
window.JEDA = window.JEDA || {};

JEDA.CFG = {
  W: 1920,
  H: 1080,
  USE_3D: true, // Panggung 3D Three.js aktif (PRD Bagian 13)
  PASS: 60,
  L1: {
    cycles: 6,
    inMs: 4000,
    outMs: 6000,
    tolFull: 1000,
    tolHalf: 2000,
    holdMaxMs: 8000,
    holdMinMs: 1000,
    distractLife: 5000,
    distractPenalty: 20
  },
  L1_EASY: {
    inMs: 3000,
    outMs: 4000,
    tolFull: 1500,
    tolHalf: 2500
  },
  L2: {
    thoughts: 10,
    maxOnScreen: 4,
    pileUpMs: 8000,
    panicPenalty: 25
  },
  L3: {
    scenarios: 3,
    meterStart: 70,
    meterReact: 15,
    meterStop: -30
  },
  GUARD: {
    spamActions: 5,
    spamWindowMs: 3000,
    spamPauseMs: 3000,
    idleHintMs: 15000,
    idlePauseMs: 60000
  },
  WEIGHT: {
    l1: 0.25,
    l2: 0.30,
    l3: 0.45
  },
  STARS: [60, 80, 90],
  FAILS_FOR_EASY: 3,
  RUNS_PER_DAY_NOTE: 3,

  // Palet Warna sesuai Bagian 4 PRD
  COLOR: {
    bgTop: 0x16163A,       // '#16163A' - atas latar
    bgMid: 0x2B4C7E,       // '#2B4C7E' - tengah latar
    bgBottom: 0xE8A598,    // '#E8A598' - cakrawala hangat di bawah
    calm: 0x7FE0C3,        // '#7FE0C3' - sinkron, benar, tenang
    warn: 0xFFD27A,        // '#FFD27A' - agak meleset
    off: 0xFF8FA3,         // '#FF8FA3' - jauh dari ritme, salah
    text: '#F4F1FF',       // teks utama
    muted: '#B9B5D6',      // teks sekunder
    panel: 0xFFFFFF,       // isi panel kaca (alpha 0.08)
    panelLine: 0xFFFFFF,   // garis tepi panel (alpha 0.20)
    hex: {
      bgTop: '#16163A',
      bgMid: '#2B4C7E',
      bgBottom: '#E8A598',
      calm: '#7FE0C3',
      warn: '#FFD27A',
      off: '#FF8FA3',
      text: '#F4F1FF',
      muted: '#B9B5D6'
    }
  },

  // Tipografi (Nunito 800 untuk judul, Nunito 600 untuk isi)
  // Ukuran sesuai Bagian 4: judul 66, subjudul 42, isi 33, keterangan 27
  FONT: {
    family: 'Nunito, Arial, sans-serif',
    title: 66,
    subtitle: 42,
    body: 33,
    caption: 27
  },

  // 3 Skin & Tema Visual Mindfulness (PRD Bagian 14.2 & 15.3 / Fase G-4 & R-3)
  // Syarat total bintang: Embun (0), Fajar (3), Aurora (6)
  SKINS: {
    embun: {
      id: 'embun',
      name: 'Embun',
      reqStars: 0,
      color: 0x7FE0C3,
      hex: '#7FE0C3',
      glow: 0xA7F3D0,
      desc: 'Bawaan: Ketenangan embun jernih'
    },
    fajar: {
      id: 'fajar',
      name: 'Fajar',
      reqStars: 3,
      color: 0xFFC98B,
      hex: '#FFC98B',
      glow: 0xFFE3A3,
      desc: 'Terbuka di 3 bintang: Kehangatan fajar keemasan'
    },
    aurora: {
      id: 'aurora',
      name: 'Aurora',
      reqStars: 6,
      color: 0xB69CFF,
      hex: '#B69CFF',
      glow: 0xC9B8FF,
      desc: 'Terbuka di 6 bintang: Lembayung mistis aurora malam'
    }
  }
};

/**
 * Tiga Tema Lengkap JEDA (PRD Bagian 15.3).
 * Mengatur seluruh suasana visual: langit, aksen tombol, cahaya lentera, partikel, dan suasana cahaya.
 * Warna status (calm, warn, off) tidak pernah berubah (BR-16).
 */
JEDA.THEMES = {
  embun: {
    id: 'embun',
    name: 'Embun',
    reqStars: 0,
    mood: 'Sejuk dan lembut',
    desc: 'Sejuk dan lembut (Bawaan: 0 ★)',
    sky: {
      top: '#0F2A3A',
      mid: '#2C6E7F',
      bottom: '#BFE8DC',
      topHex: 0x0F2A3A,
      midHex: 0x2C6E7F,
      bottomHex: 0xBFE8DC
    },
    btnAccent: {
      from: '#7FE0C3',
      to: '#5BC0DE',
      fromHex: 0x7FE0C3,
      toHex: 0x5BC0DE
    },
    lantern: '#BFFFE9',
    lanternHex: 0xBFFFE9,
    particles: '#D8F3EC',
    particlesHex: 0xD8F3EC,
    hemiSky: 0x2C6E7F,
    hemiGround: 0x0F2A3A,
    orbColor: 0x7FE0C3,
    color: 0x7FE0C3,
    hex: '#7FE0C3'
  },
  fajar: {
    id: 'fajar',
    name: 'Fajar',
    reqStars: 3,
    mood: 'Hangat dan cerah',
    desc: 'Hangat dan cerah (Total 3 ★)',
    sky: {
      top: '#3A2250',
      mid: '#E0735F',
      bottom: '#FFD08A',
      topHex: 0x3A2250,
      midHex: 0xE0735F,
      bottomHex: 0xFFD08A
    },
    btnAccent: {
      from: '#FFC98B',
      to: '#FF9E7A',
      fromHex: 0xFFC98B,
      toHex: 0xFF9E7A
    },
    lantern: '#FFE3A3',
    lanternHex: 0xFFE3A3,
    particles: '#FFD580',
    particlesHex: 0xFFD580,
    hemiSky: 0xE0735F,
    hemiGround: 0x3A2250,
    orbColor: 0xFFC98B,
    color: 0xFFC98B,
    hex: '#FFC98B'
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora',
    reqStars: 6,
    mood: 'Gelap dan magis',
    desc: 'Gelap dan magis (Total 6 ★)',
    sky: {
      top: '#050B24',
      mid: '#0E2A5A',
      bottom: '#3B2C7A',
      topHex: 0x050B24,
      midHex: 0x0E2A5A,
      bottomHex: 0x3B2C7A
    },
    btnAccent: {
      from: '#9BFFCB',
      to: '#B69CFF',
      fromHex: 0x9BFFCB,
      toHex: 0xB69CFF
    },
    lantern: '#C9B8FF',
    lanternHex: 0xC9B8FF,
    particles: '#A6FFD8',
    particlesHex: 0xA6FFD8,
    hemiSky: 0x0E2A5A,
    hemiGround: 0x050B24,
    orbColor: 0xB69CFF,
    color: 0xB69CFF,
    hex: '#B69CFF'
  }
};

/**
 * API Pengelola Tema JEDA (PRD Bagian 15.3 & BR-16).
 * JEDA.Theme.apply(name) mengganti aksen UI, memanggil Stage3D.setTheme dan FX.setTheme,
 * dan menyimpan state.skin dengan transisi silang 1,2 detik.
 */
JEDA.Theme = {
  /**
   * Menerapkan tema yang dipilih.
   * @param {string} name - 'embun' | 'fajar' | 'aurora'
   * @param {number} duration - Durasi transisi silang dalam ms (default 1200)
   * @returns {boolean} true jika tema berhasil diterapkan
   */
  apply(name, duration = 1200) {
    const key = (name || '').toLowerCase();
    const theme = JEDA.THEMES && JEDA.THEMES[key];
    if (!theme) return false;

    // Validasi syarat bintang total
    const totalStars = (window.JEDA && JEDA.State && JEDA.State.getTotalStars)
      ? JEDA.State.getTotalStars()
      : 0;
    if (totalStars < theme.reqStars) {
      return false;
    }

    // Perbarui aksen UI di CFG.COLOR (Warna status calm, warn, off TETAP per BR-16)
    if (window.JEDA && JEDA.CFG && JEDA.CFG.COLOR) {
      JEDA.CFG.COLOR.theme = theme;
      JEDA.CFG.COLOR.btnAccent = theme.btnAccent.fromHex;
      JEDA.CFG.COLOR.btnAccentGradient = [theme.btnAccent.fromHex, theme.btnAccent.toHex];
    }

    // Simpan ke state.skin
    if (window.JEDA && JEDA.State && JEDA.State.data) {
      JEDA.State.data.skin = key;
      JEDA.State.save();
    }

    // Panggil Stage3D.setTheme jika panggung 3D aktif
    if (window.JEDA && JEDA.Stage3D && JEDA.Stage3D.setTheme) {
      JEDA.Stage3D.setTheme(key, duration);
    } else if (window.JEDA && JEDA.Stage3D && JEDA.Stage3D.setSkin) {
      JEDA.Stage3D.setSkin(key);
    }

    // Panggil FX.setTheme untuk versi 2D
    if (window.JEDA && JEDA.FX && JEDA.FX.setTheme) {
      JEDA.FX.setTheme(key, duration);
    }

    // Perbarui variabel CSS untuk background jika DOM tersedia
    try {
      if (typeof document !== 'undefined') {
        if (document.documentElement) {
          document.documentElement.style.setProperty('--color-bg-top', theme.sky.top);
          document.documentElement.style.setProperty('--color-bg-mid', theme.sky.mid);
          document.documentElement.style.setProperty('--color-bg-bottom', theme.sky.bottom);
        }
        const stageEl = document.getElementById('stage3d');
        if (stageEl) {
          stageEl.style.transition = `background ${duration}ms ease`;
          stageEl.style.background = `radial-gradient(circle at 50% 25%, ${theme.sky.mid} 0%, ${theme.sky.top} 70%, #050510 100%)`;
        }
      }
    } catch (e) {}

    return true;
  },

  /**
   * Mengambil objek tema yang saat ini sedang aktif.
   * @returns {Object}
   */
  getCurrent() {
    const currentKey = (window.JEDA && JEDA.State && JEDA.State.data && JEDA.State.data.skin) || 'embun';
    return (JEDA.THEMES && JEDA.THEMES[currentKey]) || (JEDA.THEMES && JEDA.THEMES.embun);
  },

  /**
   * Memeriksa apakah tema tertentu sudah terbuka.
   * @param {string} name - 'embun' | 'fajar' | 'aurora'
   * @returns {boolean}
   */
  isUnlocked(name) {
    const key = (name || '').toLowerCase();
    const theme = JEDA.THEMES && JEDA.THEMES[key];
    if (!theme) return false;
    const totalStars = (window.JEDA && JEDA.State && JEDA.State.getTotalStars)
      ? JEDA.State.getTotalStars()
      : 0;
    return totalStars >= theme.reqStars;
  }
};
