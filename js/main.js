/**
 * JEDA - Inisialisasi Game
 * Konfigurasi Phaser.Game sesuai Bagian 5 PRD.
 * Menunggu font lokal Nunito paling lama 1500 ms sebelum memulai engine.
 */
function initJedaGame() {
  // Inisialisasi Panggung 3D Three.js di latar belakang (PRD Bagian 13)
  const stage3dEl = document.getElementById('stage3d');
  if (JEDA.CFG.USE_3D && window.THREE && JEDA.Stage3D && stage3dEl) {
    const ok = JEDA.Stage3D.init(stage3dEl);
    if (!ok) {
      JEDA.CFG.USE_3D = false;
      console.warn('[JEDA] WebGL 3D gagal diinisialisasi, fallback ke mode 2D.');
    }
  } else {
    JEDA.CFG.USE_3D = false;
  }

  // Sembunyikan elemen canvas 3D jika mode 2D aktif
  if (!JEDA.CFG.USE_3D && stage3dEl) {
    stage3dEl.style.display = 'none';
  }

  const is3D = !!JEDA.CFG.USE_3D;

  const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: JEDA.CFG.W,
    height: JEDA.CFG.H,
    transparent: is3D,
    backgroundColor: is3D ? undefined : '#0d0d1e',
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false,
      clearBeforeRender: true
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [
      BootScene,
      CheckinScene,
      Level1Scene,
      Level2Scene,
      Level3Scene,
      ResultScene,
      PauseScene
    ]
  };

  // Instansiasi game pada namespace global JEDA
  window.JEDA.game = new Phaser.Game(config);

  // Setelah game terinisialisasi, sembunyikan banner brand LCP secara halus
  setTimeout(() => {
    const brand = document.getElementById('game-brand');
    if (brand) {
      brand.style.opacity = '0';
    }
  }, 1800);
}

// Menunggu font lokal termuat paling lama 1500 ms (PRD Bagian 2 & Poin 1 UI/UX)
window.addEventListener('DOMContentLoaded', async () => {
  let started = false;
  const launch = () => {
    if (!started) {
      started = true;
      initJedaGame();
    }
  };

  // Batas waktu tunggu font 1500 ms
  const timeoutId = setTimeout(() => {
    console.warn('[JEDA] Batas waktu pemuatan font tercapai (1500 ms), memulai game.');
    launch();
  }, 1500);

  if (document.fonts && document.fonts.load) {
    try {
      await Promise.all([
        document.fonts.load('600 24px Nunito'),
        document.fonts.load('800 24px Nunito'),
        document.fonts.load('700 27px Nunito'),
        document.fonts.load('800 33px Nunito'),
        document.fonts.load('800 66px Nunito')
      ]);
      clearTimeout(timeoutId);
      launch();
    } catch (e) {
      clearTimeout(timeoutId);
      launch();
    }
  } else {
    clearTimeout(timeoutId);
    launch();
  }
});
