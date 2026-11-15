/**
 * JEDA - Visual Effects Helper (js/fx.js)
 * Helper pembuatan efek visual prosedural sesuai PRD Bagian 4:
 * - Latar gradasi senja & vinyet
 * - Partikel debu melayang lembut (mematuhi BR-12 Mode Kurangi Gerakan)
 * - Transisi halus antar scene (fadeOut/fadeIn 350ms)
 * - Orb napas 3 lapis bertumpuk blend mode ADD
 */
window.JEDA = window.JEDA || {};

JEDA.FX = {
  /**
   * Menampilkan latar belakang terpadu: gradasi senja, 40 debu melayang, dan vinyet.
   * @param {Phaser.Scene} scene
   */
  createBackground(scene) {
    const W = JEDA.CFG.W;
    const H = JEDA.CFG.H;
    const is3D = !!(JEDA.CFG && JEDA.CFG.USE_3D && JEDA.Stage3D && JEDA.Stage3D.isActive && JEDA.Stage3D.isActive());

    // 1. Gambar latar gradasi (disembunyikan bila panggung 3D aktif)
    const bg = scene.add.image(W / 2, H / 2, 'bg_gradient').setDepth(-100);
    if (is3D) bg.setAlpha(0);

    // 2. Debu melayang jika mode kurangi gerakan tidak aktif dan 3D tidak aktif
    const reduceMotion = JEDA.State && JEDA.State.data && JEDA.State.data.settings.reduceMotion;
    const dustGroup = [];

    if (!is3D && !reduceMotion && scene.textures.exists('dust')) {
      for (let i = 0; i < 40; i++) {
        const x = Phaser.Math.Between(W * 0.02, W * 0.98);
        const y = Phaser.Math.Between(H * 0.02, H * 0.98);
        const scale = Phaser.Math.FloatBetween(0.4, 1.2);
        const baseAlpha = Phaser.Math.FloatBetween(0.15, 0.6);

        const p = scene.add.image(x, y, 'dust')
          .setScale(scale)
          .setAlpha(baseAlpha)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(-90);

        scene.tweens.add({
          targets: p,
          y: y - Phaser.Math.Between(30, 80),
          x: x + Phaser.Math.Between(-30, 30),
          alpha: { from: baseAlpha, to: Phaser.Math.FloatBetween(0.1, 0.3) },
          duration: Phaser.Math.Between(4500, 8500),
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
          delay: Phaser.Math.Between(0, 2000)
        });

        dustGroup.push(p);
      }
    }

    // 3. Lapisan vinyet gelap (bila 3D aktif, vinyet ditangani CSS layar penuh agar tidak ada garis batas 16:9)
    const vignette = scene.add.image(W / 2, H / 2, 'vignette')
      .setAlpha(is3D ? 0 : 0.35)
      .setDepth(-80);

    return { bg, dustGroup, vignette };
  },

  /**
   * Transisi halus keluar dan masuk antar scene sesuai Bagian 4 PRD (350 ms).
   */
  transitionTo(scene, nextSceneKey, data = {}) {
    let transitioned = false;
    const executeTransition = () => {
      if (!transitioned) {
        transitioned = true;
        scene.scene.start(nextSceneKey, data);
      }
    };

    scene.cameras.main.fadeOut(350, 13, 13, 30);
    scene.cameras.main.once('camerafadeoutcomplete', executeTransition);
    // Safety fallback agar transisi tidak pernah macet
    scene.time.delayedCall(450, executeTransition);
  },

  /**
   * Membuat orb napas 3 lapis bertumpuk (inti, cincin dalam, cincin luar) dengan blend ADD.
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   * @param {number} colorHex
   */
  createOrb(scene, x, y, radius = 90, colorHex = JEDA.CFG.COLOR.calm) {
    const container = scene.add.container(x, y);

    // Cincin luar (alpha lembut 0.15)
    const outerRing = scene.add.circle(0, 0, radius * 1.5, colorHex, 0.15)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Cincin dalam (alpha sedang 0.35)
    const innerRing = scene.add.circle(0, 0, radius * 1.15, colorHex, 0.35)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Inti orb (alpha terang 0.85)
    const core = scene.add.circle(0, 0, radius * 0.75, colorHex, 0.85)
      .setBlendMode(Phaser.BlendModes.ADD);

    container.add([outerRing, innerRing, core]);
    container.outerRing = outerRing;
    container.innerRing = innerRing;
    container.core = core;

    return container;
  }
};
