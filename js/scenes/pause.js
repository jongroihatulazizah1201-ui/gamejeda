/**
 * JEDA - PauseScene (js/scenes/pause.js)
 * Overlay jeda otomatis (BR-06 & BR-08) atau manual:
 * Menampilkan: "Dijeda. Lanjut kapan pun kamu siap." dan tombol Lanjut.
 * 
 * Sepenuhnya patuh pada PRD Bagian 14.3 sampai 14.5:
 * - Panel tengah terpusat di Layout.cx(), Layout.cy()
 * - Tombol sama lebar 280, tinggi 88, aksi utama di kanan (Prinsip 6)
 * - Keyboard Esc & Enter untuk melanjutkan (Prinsip 15)
 */
class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene' });
  }

  init(data) {
    this.returnTo = data && data.returnTo ? data.returnTo : null;
  }

  create() {
    const Layout = JEDA.Layout;
    const cx = Layout.cx();
    const cy = Layout.cy();

    // 1. Overlay Gelap semi-transparan
    this.add.rectangle(cx, cy, Layout.W, Layout.H, 0x070716, 0.88).setInteractive();

    // 2. Panel Kaca Tengah (Lebar 840, tinggi 480, radius 32)
    const cardW = 840;
    const cardH = 480;
    const bg = this.add.graphics();
    // 100% Solid Base
    bg.fillStyle(0x0E1026, 1.0);
    bg.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    bg.fillStyle(0x16163A, 0.96);
    bg.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    bg.lineStyle(2, JEDA.CFG.COLOR.panelLine, 0.35);
    bg.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);

    // 3. Judul & Subjudul (PRD Bagian 5.6)
    const title = this.add.text(cx, cy - 110, 'Dijeda.', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '44px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    const sub = this.add.text(cx, cy - 42, 'Lanjut kapan pun kamu siap.', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '33px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted
    }).setOrigin(0.5).setResolution(2);

    const hint = this.add.text(cx, cy + 16, 'Tarik napas sejenak sebelum kembali melanjutkan latihan.', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted
    }).setOrigin(0.5).setResolution(2);

    // 4. Dua Tombol Aksi Baku (Tinggi 88, lebar 280, jarak 32, aksi utama di kanan)
    const btnW = 280;
    const btnH = 88;
    const btnGap = 32;
    const btnY = cy + 130;
    const btnXs = Layout.rowCenter([btnW, btnW], btnGap);

    // Kiri: Aksi Sekunder (Ke Menu Utama)
    const menuBtn = JEDA.UI.createButton(this, btnXs[0], btnY, btnW, btnH, 'Ke Menu Utama', () => {
      this.scene.stop();
      if (this.returnTo) {
        this.scene.stop(this.returnTo);
      }
      this.scene.start('CheckinScene');
    }, { radius: 44, fontSize: 33 });

    // Kanan: Aksi Utama (Lanjut)
    const resumeBtn = JEDA.UI.createButton(this, btnXs[1], btnY, btnW, btnH, 'Lanjut', () => {
      this.resumeGame();
    }, { primary: true, radius: 44, fontSize: 33 });

    // 5. Dukungan Keyboard (Prinsip 15: Esc / Enter untuk lanjut)
    if (this.input.keyboard) {
      this.input.keyboard.once('keydown-ESC', () => this.resumeGame());
      this.input.keyboard.once('keydown-ENTER', () => this.resumeGame());
    }

    // 6. Pasang listener debug grid 'G'
    Layout.attachDebugKeyListener(this);
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
