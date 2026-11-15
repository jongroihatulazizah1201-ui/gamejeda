/**
 * JEDA - Inisialisasi Game
 * Konfigurasi Phaser.Game sesuai Bagian 5 PRD.
 * Menunggu font lokal Nunito paling lama 1500 ms sebelum memulai engine.
 */
function initJedaGame() {
  const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: JEDA.CFG.W,
    height: JEDA.CFG.H,
    backgroundColor: '#0d0d1e',
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false
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
}

// Menunggu font lokal termuat paling lama 1500 ms (PRD Bagian 2)
window.addEventListener('DOMContentLoaded', () => {
  let started = false;
  const launch = () => {
    if (!started) {
      started = true;
      initJedaGame();
    }
  };

  // Batas waktu tunggu font 1500 ms
  const timeoutId = setTimeout(launch, 1500);

  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('800 66px Nunito'),
      document.fonts.load('600 33px Nunito')
    ]).then(() => {
      clearTimeout(timeoutId);
      launch();
    }).catch(() => {
      clearTimeout(timeoutId);
      launch();
    });
  } else {
    clearTimeout(timeoutId);
    launch();
  }
});
