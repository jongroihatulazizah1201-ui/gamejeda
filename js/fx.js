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

    if (is3D) {
      // Dalam mode 3D, seluruh latar (gradasi senja, bintang, dan vinyet) digambar Three.js & CSS 100vw x 100vh tanpa batas 16:9
      return { bg: null, dustGroup: [], vignette: null };
    }

    // 1. Gambar latar gradasi (khusus mode 2D)
    const bg = scene.add.image(W / 2, H / 2, 'bg_gradient').setDepth(-100);

    // 2. Debu melayang jika mode kurangi gerakan tidak aktif dan 3D tidak aktif
    const reduceMotion = JEDA.State && JEDA.State.data && JEDA.State.data.settings.reduceMotion;
    const dustGroup = [];

    if (!reduceMotion && scene.textures.exists('dust')) {
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

    // 3. Lapisan vinyet gelap (khusus mode 2D)
    const vignette = scene.add.image(W / 2, H / 2, 'vignette')
      .setAlpha(0.35)
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

    const is3D = !!(JEDA.CFG && JEDA.CFG.USE_3D && JEDA.Stage3D && JEDA.Stage3D.isActive && JEDA.Stage3D.isActive());
    if (is3D) {
      scene.cameras.main.fadeOut(250, 0, 0, 0);
    } else {
      scene.cameras.main.fadeOut(350, 13, 13, 30);
    }
    scene.cameras.main.once('camerafadeoutcomplete', executeTransition);
    // Safety fallback agar transisi tidak pernah macet
    scene.time.delayedCall(300, executeTransition);
  },

  /**
   * Menerapkan tema visual pada versi 2D (PRD Bagian 15.3).
   * @param {string} themeName - 'embun' | 'fajar' | 'aurora'
   * @param {number} duration - Durasi transisi (default 1200)
   */
  setTheme(themeName, duration = 1200) {
    let name = (themeName || 'embun').toLowerCase();
    if (name === 'senja') name = 'fajar';
    const themes = (window.JEDA && JEDA.THEMES) || {};
    const theme = themes[name] || themes.embun;
    if (!theme) return;

    if (window.JEDA && JEDA.CFG && JEDA.CFG.COLOR) {
      JEDA.CFG.COLOR.bgTop = theme.sky.topHex;
      JEDA.CFG.COLOR.bgMid = theme.sky.midHex;
      JEDA.CFG.COLOR.bgBottom = theme.sky.bottomHex;
      JEDA.CFG.COLOR.hex.bgTop = theme.sky.top;
      JEDA.CFG.COLOR.hex.bgMid = theme.sky.mid;
      JEDA.CFG.COLOR.hex.bgBottom = theme.sky.bottom;
    }
  },

  /**
   * Mengambil warna numerik heksadesimal dari skin aktif (PRD Bagian 14.2 G5).
   * @param {string|null} skinId - ID skin opsional, atau baca dari JEDA.State.data.skin
   * @returns {number}
   */
  getSkinColor(skinId = null) {
    let id = skinId || (window.JEDA && JEDA.State && JEDA.State.data && JEDA.State.data.skin) || 'embun';
    if (id === 'senja') id = 'fajar';
    const skins = (window.JEDA && JEDA.CFG && JEDA.CFG.SKINS) || {};
    if (skins[id]) {
      return skins[id].color;
    }
    return (window.JEDA && JEDA.CFG && JEDA.CFG.COLOR && JEDA.CFG.COLOR.calm) || 0x7FE0C3;
  },

  /**
   * Pembuat orb napas dinamis berdasarkan skin aktif (PRD Bagian 14.2 G5 / Fase G-4).
   * Kontrak resmi JEDA.FX.orb sesuai PRD 14.2.
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   * @param {number|null} colorHex
   * @returns {Phaser.GameObjects.Container}
   */
  orb(scene, x, y, radius = 90, colorHex = null) {
    const color = colorHex !== null ? colorHex : this.getSkinColor();
    return this.createOrb(scene, x, y, radius, color);
  },

  /**
   * Membuat orb napas 3 lapis bertumpuk (inti, cincin dalam, cincin luar) dengan blend ADD.
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   * @param {number|null} colorHex
   */
  createOrb(scene, x, y, radius = 90, colorHex = null) {
    const color = colorHex !== null ? colorHex : this.getSkinColor();
    const container = scene.add.container(x, y);

    // Cincin luar (alpha lembut 0.15)
    const outerRing = scene.add.circle(0, 0, radius * 1.5, color, 0.15)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Cincin dalam (alpha sedang 0.35)
    const innerRing = scene.add.circle(0, 0, radius * 1.15, color, 0.35)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Inti orb (alpha terang 0.85)
    const core = scene.add.circle(0, 0, radius * 0.75, color, 0.85)
      .setBlendMode(Phaser.BlendModes.ADD);

    container.add([outerRing, innerRing, core]);
    container.outerRing = outerRing;
    container.innerRing = innerRing;
    container.core = core;

    return container;
  }
};
