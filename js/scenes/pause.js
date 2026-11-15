/**
 * JEDA - PauseScene (js/scenes/pause.js)
 * Overlay jeda otomatis (BR-06 & BR-08) atau manual:
 * Menampilkan: "Dijeda. Lanjut kapan pun kamu siap." dan tombol Lanjut.
 */
class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene' });
  }

  init(data) {
    this.returnTo = data && data.returnTo ? data.returnTo : null;
  }

  create() {
    const W = JEDA.CFG.W;
    const H = JEDA.CFG.H;
    const cx = W / 2;
    const cy = H / 2;

    // 1. Overlay Gelap semi-transparan yang memblokir klik ke layer bawah
    const backdrop = this.add.rectangle(cx, cy, W, H, 0x070716, 0.88).setInteractive();

    // 2. Panel Kaca Tengah
    const cardW = 760;
    const cardH = 460;
    const bg = this.add.graphics();
    bg.fillStyle(0x16163A, 0.95);
    bg.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    bg.lineStyle(2, JEDA.CFG.COLOR.panelLine, 0.35);
    bg.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);

    // 3. Ikon Jeda & Teks Utama (PRD Bagian 5.6)
    const title = this.add.text(cx, cy - 90, 'Dijeda.', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '52px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    const sub = this.add.text(cx, cy - 25, 'Lanjut kapan pun kamu siap.', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '26px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted
    }).setOrigin(0.5).setResolution(2);

    const hint = this.add.text(cx, cy + 25, 'Tarik napas sejenak sebelum kembali melanjutkan latihan.', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '20px',
      fontStyle: '400',
      color: JEDA.CFG.COLOR.hex.muted
    }).setOrigin(0.5).setResolution(2);

    // 4. Tombol Lanjut (Melanjutkan scene yang dijeda)
    const resumeBtn = JEDA.UI.createButton(this, cx, cy + 115, 320, 64, 'Lanjut', () => {
      this.resumeGame();
    }, { primary: true, radius: 32 });

    // Tombol Menu Utama
    const menuBtn = JEDA.UI.createButton(this, cx, cy + 185, 240, 48, 'Ke Menu Utama', () => {
      this.scene.stop();
      if (this.returnTo) {
        this.scene.stop(this.returnTo);
      }
      this.scene.start('CheckinScene');
    }, { fontSize: 18, radius: 24 });
  }

  /**
   * Menutup overlay jeda dan melanjutkan level scene.
   */
  resumeGame() {
    this.scene.stop();
    if (this.returnTo && this.scene.isPaused(this.returnTo)) {
      this.scene.resume(this.returnTo);
    }
  }
}

window.PauseScene = PauseScene;
