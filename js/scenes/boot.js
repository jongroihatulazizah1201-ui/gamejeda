/**
 * JEDA - BootScene (js/scenes/boot.js)
 * Membuat tekstur prosedural lewat kode, memuat font, lalu beralih ke CheckinScene.
 */
class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    this.cameras.main.resetFX();
    const W = JEDA.CFG.W;
    const H = JEDA.CFG.H;

    // 1. Buat tekstur prosedural lewat kode (sesuai PRD Bagian 4)
    this.createProceduralTextures();

    // 2. Tampilkan latar gradasi senja (hanya saat mode 2D aktif; mode 3D ditangani Three.js layar penuh)
    const is3D = !!(JEDA.CFG && JEDA.CFG.USE_3D && JEDA.Stage3D && JEDA.Stage3D.isActive && JEDA.Stage3D.isActive());
    if (is3D) {
      if (JEDA.Stage3D) JEDA.Stage3D.setMode('menu');
    } else {
      this.bg = this.add.image(W / 2, H / 2, 'bg_gradient');
      this.createFloatingDust();
      this.vignette = this.add.image(W / 2, H / 2, 'vignette').setAlpha(0.35);
    }

    // 5. Tampilkan judul JEDA dan subjudul di atas latar
    this.showTitle();

    // 6. Pasang pengawas visibilitas tab global (BR-08) dan listener debug grid
    if (JEDA.Guard && JEDA.Guard.attachVisibilityListener) {
      JEDA.Guard.attachVisibilityListener(this.game);
    }
    if (JEDA.Layout && JEDA.Layout.attachDebugKeyListener) {
      JEDA.Layout.attachDebugKeyListener(this);
    }

    // 7. Lanjut ke CheckinScene setelah animasi awal atau saat pemain mengklik layar (UX ramah)
    let hasSkipped = false;
    const proceed = () => {
      if (!hasSkipped) {
        hasSkipped = true;
        JEDA.FX.transitionTo(this, 'CheckinScene');
      }
    };
    this.input.once('pointerdown', proceed);
    if (this.input.keyboard) this.input.keyboard.once('keydown', proceed);
    this.time.delayedCall(1600, proceed);
  }

  /**
   * Membuat tekstur kanvas prosedural tanpa menggunakan file gambar eksternal.
   */
  createProceduralTextures() {
    const W = JEDA.CFG.W;
    const H = JEDA.CFG.H;

    // A. Tekstur Latar Gradasi Senja 1920x1080 (bgTop -> bgMid -> bgBottom)
    if (!this.textures.exists('bg_gradient')) {
      const bgCanvas = this.textures.createCanvas('bg_gradient', W, H);
      const bgCtx = bgCanvas.context;
      const grad = bgCtx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, JEDA.CFG.COLOR.hex.bgTop);       // #16163A (atas)
      grad.addColorStop(0.55, JEDA.CFG.COLOR.hex.bgMid);    // #2B4C7E (tengah)
      grad.addColorStop(1, JEDA.CFG.COLOR.hex.bgBottom);    // #E8A598 (cakrawala hangat)
      bgCtx.fillStyle = grad;
      bgCtx.fillRect(0, 0, W, H);
      bgCanvas.refresh();
    }

    // B. Tekstur Vinyet Radial Gelap di tepi layar (1920x1080)
    if (!this.textures.exists('vignette')) {
      const vigCanvas = this.textures.createCanvas('vignette', W, H);
      const vigCtx = vigCanvas.context;
      const vigGrad = vigCtx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.65);
      vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vigGrad.addColorStop(0.65, 'rgba(10, 12, 30, 0.3)');
      vigGrad.addColorStop(1, 'rgba(5, 5, 18, 0.95)');
      vigCtx.fillStyle = vigGrad;
      vigCtx.fillRect(0, 0, W, H);
      vigCanvas.refresh();
    }

    // C. Tekstur Titik Debu Bercahaya
    if (!this.textures.exists('dust')) {
      const dustCanvas = this.textures.createCanvas('dust', 24, 24);
      const dCtx = dustCanvas.context;
      const dGrad = dCtx.createRadialGradient(12, 12, 0, 12, 12, 12);
      dGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      dGrad.addColorStop(0.35, 'rgba(255, 240, 220, 0.6)');
      dGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      dCtx.fillStyle = dGrad;
      dCtx.fillRect(0, 0, 24, 24);
      dustCanvas.refresh();
    }
  }

  /**
   * Menampilkan 40 titik debu bercahaya yang melayang perlahan dengan tween Sine.easeInOut.
   */
  createFloatingDust() {
    this.dustParticles = [];
    const count = 40;
    const W = JEDA.CFG.W;
    const H = JEDA.CFG.H;

    for (let i = 0; i < count; i++) {
      const startX = Phaser.Math.Between(W * 0.02, W * 0.98);
      const startY = Phaser.Math.Between(H * 0.02, H * 0.98);
      const scale = Phaser.Math.FloatBetween(0.4, 1.2);
      const baseAlpha = Phaser.Math.FloatBetween(0.2, 0.65);

      const p = this.add.image(startX, startY, 'dust')
        .setScale(scale)
        .setAlpha(baseAlpha)
        .setBlendMode(Phaser.BlendModes.ADD);

      // Gerak mengambang halus (Sine.easeInOut)
      this.tweens.add({
        targets: p,
        y: startY - Phaser.Math.Between(35, 95),
        x: startX + Phaser.Math.Between(-35, 35),
        alpha: { from: baseAlpha, to: Phaser.Math.FloatBetween(0.1, 0.35) },
        duration: Phaser.Math.Between(4500, 8500),
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2500)
      });

      this.dustParticles.push(p);
    }
  }

  /**
   * Menampilkan judul JEDA dan subjudul di tengah layar.
   * Menggunakan setResolution(2) agar tipografi tajam sesuai Bagian 4 PRD.
   */
  showTitle() {
    const cx = JEDA.CFG.W / 2;
    const cy = JEDA.CFG.H / 2;

    // Posisi teks tepat di tengah ruang langit (bebas tabrakan dari orb di atas dan pulau di bawah)
    this.titleText = this.add.text(cx, cy - 75, 'JEDA', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '66px',
      fontStyle: '800',
      color: '#FFFFFF',
      shadow: { offsetX: 0, offsetY: 3, blur: 14, color: 'rgba(5, 5, 20, 0.9)', fill: true }
    }).setOrigin(0.5).setResolution(2).setAlpha(0);

    this.subtitleText = this.add.text(cx, cy - 5, 'Latihan berhenti sejenak', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '33px',
      fontStyle: '600',
      color: '#CBD5E1',
      shadow: { offsetX: 0, offsetY: 2, blur: 10, color: 'rgba(5, 5, 20, 0.85)', fill: true }
    }).setOrigin(0.5).setResolution(2).setAlpha(0);

    // Kapsul petunjuk interaksi (frosted pill beraksen tenang, bebas tabrakan dari lentera pulau)
    this.hintContainer = this.add.container(cx, cy + 70).setAlpha(0);
    const pillW = 520;
    const pillH = 56;
    const pillBg = this.add.graphics();
    pillBg.fillStyle(0x141738, 0.92);
    pillBg.fillRoundedRect(-pillW / 2, -pillH / 2, pillW, pillH, 28);
    pillBg.lineStyle(2, 0x7FE0C3, 0.7);
    pillBg.strokeRoundedRect(-pillW / 2, -pillH / 2, pillW, pillH, 28);

    const hintText = this.add.text(0, 0, 'Klik di mana saja untuk melanjutkan', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '700',
      color: '#FFFFFF'
    }).setOrigin(0.5).setResolution(2);

    this.hintContainer.add([pillBg, hintText]);

    // Animasi kemunculan cepat dan tegas
    this.tweens.add({
      targets: [this.titleText, this.subtitleText, this.hintContainer],
      alpha: 1,
      y: '-=12',
      duration: 500,
      ease: 'Sine.easeOut',
      stagger: 120,
      onComplete: () => {
        // Denyut halus pada kapsul petunjuk
        this.tweens.add({
          targets: this.hintContainer,
          alpha: { from: 1, to: 0.65 },
          yoyo: true,
          repeat: -1,
          duration: 1200,
          ease: 'Sine.easeInOut'
        });
      }
    });
  }
}

window.BootScene = BootScene;
