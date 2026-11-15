/**
 * JEDA - Karakter Pendamping & Meter Aliran (js/lumi.js)
 * Sesuai PRD Bagian 14.1 & 14.2 (Fase G-2):
 * 
 * 1. G1: Karakter Lumi & Sistem Ucapan (JEDA.Lumi.say(key))
 *    - Gelembung ucapan JEDA.UI di bawah orb (y = 760 di L1)
 *    - Jeda minimal 4 detik antar ucapan (tidak spam / mengganggu)
 *    - Durasi tampil 2,5 detik, maksimal 2 baris (font 24 px)
 *    - Gaya tulisan hangat, suportif, bebas penghakiman (14.1)
 *    - Teks selalu menyertai warna (mematuhi BR-12)
 * 
 * 2. G2: Meter Aliran (Flow Meter)
 *    - Nilai 0 s.d. 100, murni visual, TIDAK MENGUBAH SKOR
 *    - Tiga cincin tipis di sekeliling orb dengan tiga ambang (33, 66, 100)
 *    - Ambang melintasi 33, 66, 100 memicu setCalm & Stage3D.pulse
 */
window.JEDA = window.JEDA || {};

JEDA.Lumi = (function() {
  // State Ucapan
  let currentScene = null;
  let bubbleContainer = null;
  let bubbleTimer = null;
  let lastSayTime = 0;
  const MIN_INTERVAL = 4000;      // Jeda minimal 4 detik antar ucapan (PRD 14.2)
  const DISPLAY_DURATION = 2500;  // Tampil 2,5 detik (PRD 14.2)

  let bubbleX = 960;
  let bubbleY = 760;

  // State Meter Aliran (0 s.d. 100)
  let flowValue = 0;
  let visualFlowValue = 0;
  let flowContainer = null;
  let flowGraphics = null;
  let orbCenter = { x: 960, y: 500 };
  let ringRadii = [138, 152, 166]; // 3 cincin konsentris tipis
  let currentTier = 0;             // 0: <33, 1: 33-65, 2: 66-99, 3: 100
  let flowTween = null;
  let showMeter = true;

  /**
   * Menggambar 3 cincin dan busur progres Meter Aliran secara presisi.
   */
  function drawFlowMeter() {
    if (!flowGraphics || !showMeter) return;
    flowGraphics.clear();

    const ox = orbCenter.x;
    const oy = orbCenter.y;
    const calmColor = JEDA.CFG ? JEDA.CFG.COLOR.calm : 0x7FE0C3;

    // 1. Gambar 3 cincin konsentris (Ambang 33, 66, 100)
    for (let i = 0; i < 3; i++) {
      const r = ringRadii[i];
      const isUnlocked = (i === 0 && flowValue >= 33) ||
                         (i === 1 && flowValue >= 66) ||
                         (i === 2 && flowValue >= 100);

      if (isUnlocked) {
        // Cincin aktif menyala lembut
        const glowColor = (i === 2) ? 0xA7F3D0 : calmColor;
        const glowAlpha = (i === 2) ? 0.95 : 0.85;
        flowGraphics.lineStyle(2.5, glowColor, glowAlpha);
        flowGraphics.strokeCircle(ox, oy, r);

        // Kilau pendar luar halus
        flowGraphics.lineStyle(1.0, 0xFFFFFF, 0.4);
        flowGraphics.strokeCircle(ox, oy, r + 1.5);
      } else {
        // Cincin belum terbuka (garis tipis abu transparan)
        flowGraphics.lineStyle(1.5, 0x2A3458, 0.35);
        flowGraphics.strokeCircle(ox, oy, r);
      }
    }

    // 2. Busur Progres Aliran Melingkar (0 s.d. 360 derajat)
    if (visualFlowValue > 0) {
      const arcRadius = ringRadii[1]; // Busur mengalir di cincin tengah
      const startAngle = Phaser.Math.DegToRad(-90); // Mulai dari puncak jam 12
      const sweepAngle = Phaser.Math.DegToRad((visualFlowValue / 100) * 360);
      const endAngle = startAngle + sweepAngle;

      flowGraphics.lineStyle(3.5, calmColor, 0.9);
      flowGraphics.beginPath();
      flowGraphics.arc(ox, oy, arcRadius, startAngle, endAngle, false);
      flowGraphics.strokePath();

      // Titik bintang bercahaya di ujung busur
      const tipX = ox + Math.cos(endAngle) * arcRadius;
      const tipY = oy + Math.sin(endAngle) * arcRadius;
      flowGraphics.fillStyle(0xFFFFFF, 1.0);
      flowGraphics.fillCircle(tipX, tipY, 3.5);
      flowGraphics.fillStyle(calmColor, 0.5);
      flowGraphics.fillCircle(tipX, tipY, 7);
    }

    // 3. Tiga Titik Ambang (Notch 33%, 66%, 100%)
    const thresholds = [
      { pct: 33, deg: -90 + (33 / 100) * 360, r: ringRadii[0] },
      { pct: 66, deg: -90 + (66 / 100) * 360, r: ringRadii[1] },
      { pct: 100, deg: -90 + 360, r: ringRadii[2] }
    ];

    thresholds.forEach((th, idx) => {
      const isReached = (flowValue >= th.pct);
      const rad = Phaser.Math.DegToRad(th.deg);
      const nx = ox + Math.cos(rad) * th.r;
      const ny = oy + Math.sin(rad) * th.r;

      if (isReached) {
        flowGraphics.fillStyle(0xFFFFFF, 1.0);
        flowGraphics.fillCircle(nx, ny, 3.5);
        flowGraphics.fillStyle(calmColor, 0.8);
        flowGraphics.fillCircle(nx, ny, 6.5);
      } else {
        flowGraphics.fillStyle(0x3B4870, 0.6);
        flowGraphics.fillCircle(nx, ny, 2.5);
      }
    });
  }

  return {
    /**
     * Inisialisasi Lumi dan Meter Aliran pada Scene aktif.
     * @param {Phaser.Scene} scene
     * @param {Object} options - { orbX, orbY, bubbleX, bubbleY, showMeter }
     */
    init(scene, options = {}) {
      currentScene = scene;
      const Layout = window.JEDA && JEDA.Layout;
      const cx = Layout ? Layout.cx() : JEDA.CFG.W / 2;

      bubbleX = options.bubbleX !== undefined ? options.bubbleX : cx;
      bubbleY = options.bubbleY !== undefined ? options.bubbleY : 760; // Sesuai PRD 14.5
      orbCenter.x = options.orbX !== undefined ? options.orbX : cx;
      orbCenter.y = options.orbY !== undefined ? options.orbY : 500;
      showMeter = options.showMeter !== false;

      // Bersihkan gelembung lama jika ada
      this.clearBubble();

      // Reset / siapkan container Meter Aliran
      if (flowContainer) {
        flowContainer.destroy();
        flowContainer = null;
      }

      if (showMeter && currentScene) {
        flowContainer = currentScene.add.container(0, 0).setDepth(10);
        flowGraphics = currentScene.add.graphics();
        flowContainer.add(flowGraphics);
        drawFlowMeter();
      }

      // Pertahankan nilai flow antar siklus pada level yang sama (reset awal 0 jika baru)
      if (options.resetFlow) {
        flowValue = 0;
        visualFlowValue = 0;
        currentTier = 0;
      }
    },

    /**
     * Memunculkan gelembung ucapan Lumi (PRD 14.1 & 14.2 G1).
     * @param {string} key - Kunci ucapan di JEDA.DATA.lumi (atau teks kustom)
     * @returns {boolean} true jika ucapan berhasil tampil, false jika terhalang jeda 4 detik
     */
    say(key) {
      if (!currentScene || !currentScene.sys || !currentScene.sys.isActive()) return false;

      const now = Date.now();
      // Enforce jeda minimal 4 detik antar ucapan (PRD Bagian 14.2)
      if (now - lastSayTime < MIN_INTERVAL) {
        return false;
      }

      // Ambil teks resmi dari JEDA.DATA.lumi
      let text = '';
      if (window.JEDA && JEDA.DATA && JEDA.DATA.lumi && JEDA.DATA.lumi[key]) {
        text = JEDA.DATA.lumi[key];
      } else {
        text = String(key);
      }

      if (!text) return false;
      lastSayTime = now;

      // Hapus gelembung lama secara langsung
      this.clearBubble();

      // Buat gelembung ucapan lewat komponen baku JEDA.UI
      if (window.JEDA && JEDA.UI && JEDA.UI.speechBubble) {
        bubbleContainer = JEDA.UI.speechBubble(currentScene, bubbleX, bubbleY, text);
      }

      if (!bubbleContainer) return false;

      // Animasi kemunculan lembut: alpha 0 -> 1, naik 8 px (Sine.easeOut 200 ms)
      bubbleContainer.setAlpha(0);
      const targetY = bubbleY;
      bubbleContainer.y = targetY + 10;

      currentScene.tweens.add({
        targets: bubbleContainer,
        alpha: 1,
        y: targetY,
        duration: 200,
        ease: 'Sine.easeOut'
      });

      // Hilang otomatis setelah 2,5 detik (PRD 14.2 G1)
      bubbleTimer = currentScene.time.delayedCall(DISPLAY_DURATION, () => {
        if (!bubbleContainer || !currentScene) return;
        currentScene.tweens.add({
          targets: bubbleContainer,
          alpha: 0,
          y: targetY - 8,
          duration: 200,
          ease: 'Sine.easeIn',
          onComplete: () => {
            this.clearBubble();
          }
        });
      });

      return true;
    },

    /**
     * Menambah atau mengurangi nilai Meter Aliran (PRD 14.2 G2).
     * MURNI VISUAL - TIDAK PERNAH MENGUBAH SKOR LEVEL.
     * @param {number} delta - Nilai perubahan (+20, +10, -10, -15, -20)
     */
    addFlow(delta) {
      const oldVal = flowValue;
      flowValue = Math.max(0, Math.min(100, flowValue + delta));

      // Animasi interpolasi angka progres meter aliran
      if (currentScene && currentScene.tweens) {
        if (flowTween) flowTween.stop();
        flowTween = currentScene.tweens.addCounter({
          from: visualFlowValue,
          to: flowValue,
          duration: 400,
          ease: 'Sine.easeOut',
          onUpdate: (tween) => {
            visualFlowValue = tween.getValue();
            drawFlowMeter();
          }
        });
      } else {
        visualFlowValue = flowValue;
        drawFlowMeter();
      }

      // Deteksi pemicu ambang batas (33, 66, 100)
      let newTier = 0;
      if (flowValue >= 100) newTier = 3;
      else if (flowValue >= 66) newTier = 2;
      else if (flowValue >= 33) newTier = 1;

      if (newTier > currentTier) {
        // Melintasi ambang ke atas: panggil Stage3D.setCalm & pulse (PRD 14.2 G2)
        if (window.JEDA && JEDA.Stage3D) {
          JEDA.Stage3D.setCalm(flowValue / 100);
          const pulseIntensity = newTier === 3 ? 0.7 : (newTier === 2 ? 0.5 : 0.4);
          JEDA.Stage3D.pulse(pulseIntensity);
        }
      }
      currentTier = newTier;
    },

    /**
     * Mengatur nilai Meter Aliran secara langsung.
     * @param {number} val - 0 s.d. 100
     */
    setFlow(val) {
      const oldVal = flowValue;
      flowValue = Math.max(0, Math.min(100, val));
      visualFlowValue = flowValue;
      drawFlowMeter();

      let newTier = 0;
      if (flowValue >= 100) newTier = 3;
      else if (flowValue >= 66) newTier = 2;
      else if (flowValue >= 33) newTier = 1;

      if (newTier > currentTier && window.JEDA && JEDA.Stage3D) {
        JEDA.Stage3D.setCalm(flowValue / 100);
        JEDA.Stage3D.pulse(0.4);
      }
      currentTier = newTier;
    },

    /**
     * Mengambil nilai Meter Aliran saat ini (0..100).
     */
    getFlow() {
      return flowValue;
    },

    /**
     * Membersihkan gelembung ucapan yang sedang tampil.
     */
    clearBubble() {
      if (bubbleTimer) {
        bubbleTimer.remove(false);
        bubbleTimer = null;
      }
      if (bubbleContainer) {
        bubbleContainer.destroy();
        bubbleContainer = null;
      }
    },

    /**
     * Membersihkan seluruh resource Lumi dan Meter Aliran saat scene berganti.
     */
    destroy() {
      this.clearBubble();
      if (flowTween) {
        flowTween.stop();
        flowTween = null;
      }
      if (flowContainer) {
        flowContainer.destroy();
        flowContainer = null;
      }
      flowGraphics = null;
      currentScene = null;
    }
  };
})();
