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

  // 3 Skin Orb Mindfulness (PRD Bagian 14.2 G5 / Fase G-4)
  // Syarat total bintang: Embun (0), Fajar (3), Aurora (6)
  SKINS: {
    embun: {
      id: 'embun',
      name: 'Embun',
      reqStars: 0,
      color: 0x7FE0C3,
      hex: '#7FE0C3',
      glow: 0xA7F3D0,
      desc: 'Bawaan: Ketenangan embun jernih & langit senja syahdu'
    },
    fajar: {
      id: 'fajar',
      name: 'Fajar',
      reqStars: 3,
      color: 0xFFD27A,
      hex: '#FFD27A',
      glow: 0xFDE68A,
      desc: 'Terbuka di 3 bintang: Kehangatan fajar & langit merah keemasan'
    },
    aurora: {
      id: 'aurora',
      name: 'Aurora',
      reqStars: 6,
      color: 0xA78BFA,
      hex: '#A78BFA',
      glow: 0xE9D5FF,
      desc: 'Terbuka di 6 bintang: Lembayung mistis aurora & langit kutub zamrud'
    }
  }
};
