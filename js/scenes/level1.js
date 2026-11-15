/**
 * JEDA - Level1Scene (js/scenes/level1.js)
 * Layar 2: Latihan Napas (Napas Berkesadaran)
 * 
 * Sepenuhnya patuh pada PRD Bagian 14.3 sampai 14.5:
 * - Header: Nama level di kiri, status siklus di kanan (sejajar margin 120 px)
 * - Orb di (W/2, 500)
 * - Titik siklus di y = 860 menggunakan JEDA.Layout.rowCenter
 * - Tombol modal hasil sama lebar, tinggi 88 px, aksi utama di kanan
 * - Input tahan mouse atau Spasi (BR-04)
 * - Notifikasi palsu (BR-03)
 * - Kalkulasi skor menggunakan fungsi murni JEDA.Score.calcL1
 */
class Level1Scene extends Phaser.Scene {
  constructor() {
    super({ key: 'Level1Scene' });
  }

  init(data) {
    this.easyMode = data && data.easyMode ? true : (JEDA.State.data.easy.l1 || false);
  }

  create() {
    const Layout = JEDA.Layout;
    const cx = Layout.cx();

    // Parameter siklus
    const cfg = this.easyMode ? JEDA.CFG.L1_EASY : JEDA.CFG.L1;
    this.inMs = cfg.inMs;         // Waktu target tarik napas (4000 / 3000 ms)
    this.outMs = cfg.outMs;       // Waktu target hembus napas (6000 / 4000 ms)
    this.tolFull = cfg.tolFull;   // Toleransi skor 1.0 (1000 / 1500 ms)
    this.tolHalf = cfg.tolHalf;   // Toleransi skor 0.5 (2000 / 2500 ms)
    this.holdMaxMs = JEDA.CFG.L1.holdMaxMs || 8000;
    this.holdMinMs = JEDA.CFG.L1.holdMinMs || 1000;

    // State permainan
    this.totalCycles = JEDA.CFG.L1.cycles || 6;
    this.currentCycle = 1;
    this.completedCycles = [];
    this.distractHits = 0;
    this.isHolding = false;
    this.holdStartTime = 0;
    this.releaseStartTime = 0;
    this.state = 'WAITING_HOLD'; // WAITING_HOLD | HOLDING | RELEASING | FINISHED
    this.maxHoldTimer = null;
    this.isFinished = false;

    // State Badai Notifikasi (PRD 14.2 G3)
    this.isStormActive = false;
    this.stormDistractHits = 0;
    this.stormTimer = null;
    this.stormFog = null;
    this.stormPassedAwarded = false;
    this.scheduledDistractTimers = [];

    // 1. Latar Belakang & Vinyet
    JEDA.FX.createBackground(this);
    if (JEDA.Stage3D) {
      JEDA.Stage3D.setMode('l1');
      JEDA.Stage3D.setSync('good');
      JEDA.Stage3D.setBreath(0.2);
    }
    this.cameras.main.fadeIn(350);

    // 2. Header di Zona Header (0 - 120 px)
    this.createHeader();

    // 3. Panel Petunjuk & Status di atas Orb (y = 250)
    const pillW = 880;
    const pillH = 88;
    const headerPill = this.add.graphics();
    headerPill.fillStyle(0x12142E, 0.94);
    headerPill.fillRoundedRect(cx - pillW / 2, 250 - pillH / 2, pillW, pillH, 28);
    headerPill.lineStyle(2, 0x3F486E, 0.7);
    headerPill.strokeRoundedRect(cx - pillW / 2, 250 - pillH / 2, pillW, pillH, 28);

    this.instructionText = this.add.text(cx, 232, 'Tahan untuk menarik napas, lepas untuk menghembuskan.', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '33px',
      fontStyle: '700',
      color: '#FFFFFF'
    }).setOrigin(0.5).setResolution(2);

    this.feedbackText = this.add.text(cx, 268, 'Mulai dengan menekan dan menahan...', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.calm
    }).setOrigin(0.5).setResolution(2);

    // 4. Orb Tiga Lapis di (W/2, 500) sesuai PRD 14.5
    this.createGlowingOrb(cx, 500);

    // 5. Enam Titik Indikator Siklus di y = 860 (PRD 14.5)
    this.createCycleIndicators(cx, 860);

    // 6. Setup Sistem Input (Mouse & Tombol Spasi)
    this.setupInputListeners();

    // 7. Penjadwalan Notifikasi Palsu (BR-03)
    this.distractionsScheduled = false;
    if (JEDA.State.hasSeen('l1')) {
      this.scheduleDistractions();
      this.distractionsScheduled = true;
    }

    // 8. Pasang listener debug grid 'G'
    Layout.attachDebugKeyListener(this);

    // 9. Pengawas Idle (BR-06)
    if (JEDA.Guard && JEDA.Guard.startIdleMonitor) {
      JEDA.Guard.startIdleMonitor(this);
    }

    // 10. Karakter Pendamping Lumi & Meter Aliran (PRD 14.2 Fase G-2)
    if (JEDA.Lumi) {
      JEDA.Lumi.init(this, {
        orbX: cx,
        orbY: 500,
        bubbleX: cx,
        bubbleY: 760,
        showMeter: true,
        resetFlow: true
      });
      this.time.delayedCall(700, () => {
        if (!this.isFinished) JEDA.Lumi.say('intro_l1');
      });
    }

    // 11. Tampilkan kartu petunjuk otomatis saat pertama kali dibuka (PRD 15.2 & BR-15)
    this.isHelpOpen = false;
    if (!JEDA.State.hasSeen('l1')) {
      this.time.delayedCall(350, () => {
        this.showHelpModal();
      });
    }

    this.events.on('shutdown', () => {
      if (this.stormTimer) {
        this.stormTimer.remove(false);
        this.stormTimer = null;
      }
      if (this.stormFog) {
        this.stormFog.destroy();
        this.stormFog = null;
      }
      if (JEDA.Lumi) JEDA.Lumi.destroy();
    });
  }

  /**
   * Membuat header navigasi dan indikator mode di Zona Header (y: 0 - 120 px).
   */
  createHeader() {
    const Layout = JEDA.Layout;
    const headerY = 64;
    const btnW = 200;
    const btnH = 48;

    // Kiri: Tombol Menu (rata margin kiri 120 px)
    const leftX = Layout.M + btnW / 2;
    JEDA.UI.createButton(this, leftX, headerY, btnW, btnH, '← Menu', () => {
      if (JEDA.Stage3D) JEDA.Stage3D.setMode('menu');
      JEDA.FX.transitionTo(this, 'CheckinScene');
    }, { fontSize: 27, radius: 24 });

    // Tengah: Judul Level (Prinsip 8: Hierarki teks 33 px)
    const modeTitle = this.easyMode ? 'Level 1: Napas (Mode Ramah)' : 'Level 1: Napas';
    this.titleText = this.add.text(Layout.cx(), headerY, modeTitle, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '33px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    // Kanan: Tombol Bantuan (?) dan Kapsul status siklus (rata margin kanan 1800 px)
    const helpBtnSize = 48;
    const helpBtnX = (Layout.W - Layout.M) - helpBtnSize / 2; // 1800 - 24 = 1776
    this.helpButton = JEDA.UI.createButton(this, helpBtnX, headerY, helpBtnSize, helpBtnSize, '?', () => {
      this.showHelpModal();
    }, { fontSize: 27, radius: 24 });

    const progW = 208; // Kelipatan 8 (26 * 8)
    const progX = helpBtnX - helpBtnSize / 2 - 16 - progW / 2; // 1752 - 16 - 104 = 1632
    const progContainer = this.add.container(progX, headerY);
    const progBg = this.add.graphics();
    progBg.fillStyle(0x181A3C, 0.95);
    progBg.fillRoundedRect(-progW / 2, -btnH / 2, progW, btnH, 24);
    progBg.lineStyle(2, 0x485278, 0.65);
    progBg.strokeRoundedRect(-progW / 2, -btnH / 2, progW, btnH, 24);

    this.cycleCounterText = this.add.text(0, 0, `Siklus 1/${this.totalCycles}`, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '24px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.calm
    }).setOrigin(0.5).setResolution(2);
    progContainer.add([progBg, this.cycleCounterText]);
  }

  /**
   * Menampilkan kartu petunjuk Level 1 (PRD 15.2 & BR-15).
   */
  showHelpModal() {
    this.isHelpOpen = true;
    JEDA.UI.helpCard(this, {
      type: 'l1',
      title: 'Petunjuk Level 1: Napas',
      subtitle: 'Pengantar K1: Memperhatikan saat ini tanpa menghakimi.',
      steps: [
        { num: 1, text: 'Tahan Spasi atau klik kiri saat Lumi membesar.', key: 'Tahan Spasi / Klik' },
        { num: 2, text: 'Lepas saat Lumi mengecil.', key: 'Lepas' },
        { num: 3, text: 'Abaikan notifikasi yang muncul. Tetap di napasmu.', key: 'Fokus' }
      ],
      keys: ['Spasi', 'Klik Kiri'],
      onDone: () => {
        this.isHelpOpen = false;
        JEDA.State.markSeen('l1');
        if (!this.distractionsScheduled && !this.isFinished) {
          this.scheduleDistractions();
          this.distractionsScheduled = true;
        }
      }
    });
  }

  /**
   * Membuat Orb 3 Lapis di (W/2, 500) dengan blend mode ADD.
   */
  createGlowingOrb(cx, cy) {
    this.orbContainer = this.add.container(cx, cy);
    const baseR = 85;
    const skinColor = (window.JEDA && JEDA.FX && JEDA.FX.getSkinColor) ? JEDA.FX.getSkinColor() : JEDA.CFG.COLOR.calm;

    // Cincin Luar (alpha 0.15)
    this.outerRing = this.add.circle(0, 0, baseR * 1.85, skinColor, 0.15)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Cincin Dalam (alpha 0.35)
    this.innerRing = this.add.circle(0, 0, baseR * 1.35, skinColor, 0.35)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Inti Orb (alpha 0.85)
    this.coreCircle = this.add.circle(0, 0, baseR * 0.85, skinColor, 0.85)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.orbContainer.add([this.outerRing, this.innerRing, this.coreCircle]);

    // Jika Stage3D aktif, sembunyikan visual orb 2D (orb 3D Three.js tampil di belakang)
    if (JEDA.CFG.USE_3D && JEDA.Stage3D && JEDA.Stage3D.isActive()) {
      this.orbContainer.setAlpha(0);
    }

    // Animasi idle berdenyut pelan
    this.idlePulse = this.tweens.add({
      targets: this.orbContainer,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
  }

  /**
   * Membuat 6 titik indikator siklus di y = 860 menggunakan JEDA.Layout.rowCenter.
   */
  createCycleIndicators(cx, y) {
    const Layout = JEDA.Layout;
    this.indicators = [];
    const dotWidths = [32, 32, 32, 32, 32, 32];
    const dotXs = Layout.rowCenter(dotWidths, 24);

    // Kapsul pembungkus indikator di y = 860
    const pillW = 420;
    const pillH = 56;
    const indPill = this.add.graphics();
    indPill.fillStyle(0x12142E, 0.94);
    indPill.fillRoundedRect(cx - pillW / 2, y - pillH / 2, pillW, pillH, 28);
    indPill.lineStyle(2, 0x3F486E, 0.7);
    indPill.strokeRoundedRect(cx - pillW / 2, y - pillH / 2, pillW, pillH, 28);

    for (let i = 0; i < this.totalCycles; i++) {
      const ix = dotXs[i];
      const g = this.add.graphics();
      this.drawIndicatorDot(g, ix, y, 'empty');
      this.indicators.push({ g, x: ix, y, status: 'empty' });
    }
  }

  drawIndicatorDot(graphics, x, y, status, color = JEDA.CFG.COLOR.panelLine) {
    graphics.clear();
    const r = 12;
    if (status === 'filled') {
      graphics.fillStyle(color, 0.95);
      graphics.fillCircle(x, y, r);
      graphics.lineStyle(2, 0xFFFFFF, 0.9);
      graphics.strokeCircle(x, y, r);
    } else if (status === 'active') {
      graphics.fillStyle(JEDA.CFG.COLOR.panel, 0.3);
      graphics.fillCircle(x, y, r);
      graphics.lineStyle(2, JEDA.CFG.COLOR.calm, 0.9);
      graphics.strokeCircle(x, y, r);
    } else {
      graphics.fillStyle(JEDA.CFG.COLOR.panel, 0.08);
      graphics.fillCircle(x, y, r);
      graphics.lineStyle(2, JEDA.CFG.COLOR.panelLine, 0.25);
      graphics.strokeCircle(x, y, r);
    }
  }

  /**
   * Mengatur listener input mouse dan keyboard Spasi.
   */
  setupInputListeners() {
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Pointer down (mouse)
    this.input.on('pointerdown', (pointer, targets) => {
      if (targets && targets.length > 0) return;
      this.handleActionStart();
    });

    // Pointer up (mouse)
    this.input.on('pointerup', () => {
      this.handleActionEnd();
    });

    // Keyboard Spasi
    this.spaceKey.on('down', () => {
      this.handleActionStart();
    });
    this.spaceKey.on('up', () => {
      this.handleActionEnd();
    });

    this.onWindowPointerUp = () => {
      if (this.isHolding) {
        this.handleActionEnd();
      }
    };
    window.addEventListener('pointerup', this.onWindowPointerUp);
    window.addEventListener('blur', this.onWindowPointerUp);

    this.events.once('shutdown', () => {
      window.removeEventListener('pointerup', this.onWindowPointerUp);
      window.removeEventListener('blur', this.onWindowPointerUp);
    });
  }

  /**
   * Pemain mulai menahan (tarik napas).
   */
  handleActionStart() {
    if (this.isFinished || this.isHolding || this.isHelpOpen) return;

    if (this.state === 'RELEASING' && this.releaseStartTime > 0) {
      const releaseDuration = Date.now() - this.releaseStartTime;
      this.finalizePreviousCycle(releaseDuration);
    }

    if (this.currentCycle > this.totalCycles) return;

    this.isHolding = true;
    this.state = 'HOLDING';
    this.holdStartTime = Date.now();

    if (JEDA.Stage3D) {
      JEDA.Stage3D.setSync('good');
    }

    if (this.idlePulse) this.idlePulse.pause();
    this.tweens.killTweensOf(this.orbContainer);

    this.feedbackText.setText(`Siklus ${this.currentCycle}/6: Tarik napas...`);
    this.feedbackText.setColor(JEDA.CFG.COLOR.hex.text);

    const ind = this.indicators[this.currentCycle - 1];
    if (ind) this.drawIndicatorDot(ind.g, ind.x, ind.y, 'active');

    this.orbContainer.setScale(1.0);
    this.holdTween = this.tweens.add({
      targets: this.orbContainer,
      scaleX: 1.75,
      scaleY: 1.75,
      duration: this.inMs,
      ease: 'Sine.easeInOut'
    });

    // BR-04: Tahan > 8 s dihentikan otomatis
    if (this.maxHoldTimer) this.maxHoldTimer.remove(false);
    this.maxHoldTimer = this.time.delayedCall(this.holdMaxMs, () => {
      if (this.isHolding) {
        JEDA.UI.toast(this, 'Lepaskan napasmu secara perlahan.');
        this.handleActionEnd();
      }
    });
  }

  /**
   * Pemain melepas tombol (hembuskan napas).
   */
  handleActionEnd() {
    if (!this.isHolding || this.isFinished) return;

    if (this.maxHoldTimer) {
      this.maxHoldTimer.remove(false);
      this.maxHoldTimer = null;
    }

    const holdDuration = Date.now() - this.holdStartTime;
    this.isHolding = false;

    // BR-04: Tahan < 1 s tidak dihitung dan siklus diulang
    if (holdDuration < this.holdMinMs) {
      this.feedbackText.setText('Tahan sedikit lebih lama...');
      this.feedbackText.setColor(JEDA.CFG.COLOR.hex.warn);
      this.state = 'WAITING_HOLD';

      const ind = this.indicators[this.currentCycle - 1];
      if (ind) this.drawIndicatorDot(ind.g, ind.x, ind.y, 'empty');

      this.tweens.add({
        targets: this.orbContainer,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 400,
        ease: 'Sine.easeOut',
        onComplete: () => {
          if (this.idlePulse) this.idlePulse.resume();
        }
      });
      return;
    }

    this.state = 'RELEASING';
    this.releaseStartTime = Date.now();
    this.currentHoldDuration = holdDuration;

    this.feedbackText.setText(`Siklus ${this.currentCycle}/6: Hembuskan napas perlahan...`);
    this.feedbackText.setColor(JEDA.CFG.COLOR.hex.text);

    if (this.holdTween) this.holdTween.stop();
    this.tweens.add({
      targets: this.orbContainer,
      scaleX: 1.0,
      scaleY: 1.0,
      duration: this.outMs,
      ease: 'Sine.easeInOut'
    });

    if (this.currentCycle === this.totalCycles) {
      this.time.delayedCall(this.outMs, () => {
        if (this.state === 'RELEASING' && !this.isFinished) {
          const finalRelease = Date.now() - this.releaseStartTime;
          this.finalizePreviousCycle(finalRelease);
        }
      });
    }
  }

  /**
   * Menyelesaikan evaluasi satu siklus napas.
   */
  finalizePreviousCycle(releaseDuration) {
    const cycleIndex = this.currentCycle;
    const holdDuration = this.currentHoldDuration;

    const inScore = this.calcAccuracy(holdDuration, this.inMs);
    const outScore = this.calcAccuracy(releaseDuration, this.outMs);
    const cycleScore = (inScore + outScore) / 2;

    this.completedCycles.push({
      cycle: cycleIndex,
      holdMs: holdDuration,
      releaseMs: releaseDuration,
      inScore,
      outScore,
      score: cycleScore
    });

    let dotColor = JEDA.CFG.COLOR.off;
    let feedbackWord = 'Kembali ke napas';
    let syncState = 'off';

    if (cycleScore >= 0.75) {
      dotColor = JEDA.CFG.COLOR.calm;
      feedbackWord = 'Pas';
      syncState = 'good';
      if (JEDA.Lumi) {
        JEDA.Lumi.addFlow(20);
        JEDA.Lumi.say('cycle_good');
      }
    } else if (cycleScore >= 0.5) {
      dotColor = JEDA.CFG.COLOR.warn;
      feedbackWord = 'Sedikit meleset';
      syncState = 'warn';
      if (JEDA.Lumi) {
        JEDA.Lumi.addFlow(10);
        JEDA.Lumi.say('cycle_good');
      }
    } else {
      if (JEDA.Lumi) {
        JEDA.Lumi.addFlow(-15);
        JEDA.Lumi.say('cycle_off');
      }
    }

    if (JEDA.Stage3D) {
      JEDA.Stage3D.setSync(syncState);
      if (cycleScore >= 0.75) {
        JEDA.Stage3D.pulse(0.6);
      }
    }

    this.feedbackText.setText(feedbackWord);
    this.feedbackText.setColor(syncState === 'good' ? JEDA.CFG.COLOR.hex.calm : (syncState === 'warn' ? JEDA.CFG.COLOR.hex.warn : JEDA.CFG.COLOR.hex.off));

    const ind = this.indicators[cycleIndex - 1];
    if (ind) {
      this.drawIndicatorDot(ind.g, ind.x, ind.y, 'filled', dotColor);
      ind.status = 'filled';
      this.tweens.add({
        targets: ind.g,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 150,
        yoyo: true,
        ease: 'Sine.easeOut'
      });
    }

    this.currentCycle++;
    if (this.cycleCounterText && this.currentCycle <= this.totalCycles) {
      this.cycleCounterText.setText(`Siklus ${this.currentCycle}/${this.totalCycles}`);
    }

    // G3: Memicu Badai Notifikasi pada Siklus 5 dan 6 (PRD 14.2 G3)
    if (this.currentCycle === 5) {
      this.startStorm();
    }

    if (this.currentCycle > this.totalCycles) {
      this.finishLevel();
    }
  }

  calcAccuracy(actual, target) {
    const diff = Math.abs(actual - target);
    if (diff <= this.tolFull) return 1.0;
    if (diff <= this.tolHalf) return 0.5;
    return 0.0;
  }

  /**
   * Menjadwalkan kemunculan notifikasi palsu (BR-03).
   */
  scheduleDistractions() {
    const Layout = JEDA.Layout;
    const distractMessages = [
      'Grup Kelas: PING!',
      'Diskon 50% hari ini!',
      'Kamu punya 12 pesan baru',
      'Info Terkini: Jangan lupa tugas!'
    ];

    this.scheduledDistractTimers = [];
    // Notifikasi normal pada siklus 1-4 (muncul di detik 6, 16, 26)
    const times = [6000, 16000, 26000];
    times.forEach((ms, idx) => {
      const timer = this.time.delayedCall(ms, () => {
        if (!this.isFinished && !this.isStormActive) {
          this.spawnDistractionCard(Layout.W, distractMessages[idx % distractMessages.length], 190, 5000);
        }
      });
      this.scheduledDistractTimers.push(timer);
    });
  }

  /**
   * Memicu Badai Notifikasi pada Siklus 5 dan 6 (PRD 14.2 G3).
   * - Interval notifikasi palsu menjadi ~1.2 detik (biasanya 3 detik)
   * - Kabut gelap alpha 0.25 menutupi latar
   * - Karakter Lumi mengucap 'storm'
   */
  startStorm() {
    if (this.isStormActive || this.isFinished) return;
    this.isStormActive = true;
    this.stormDistractHits = 0;

    const Layout = JEDA.Layout;

    // 1. Kabut gelap alpha 0.25 menutupi latar belakang
    this.stormFog = this.add.graphics().setDepth(20);
    this.stormFog.fillStyle(0x06081A, 1.0);
    this.stormFog.fillRect(0, 0, Layout.W, Layout.H);
    this.stormFog.setAlpha(0);

    this.tweens.add({
      targets: this.stormFog,
      alpha: 0.25,
      duration: 800,
      ease: 'Sine.easeOut'
    });

    // 2. Karakter Lumi mengucap dialog resmi 'storm'
    if (JEDA.Lumi) {
      JEDA.Lumi.say('storm');
    }

    // 3. Batalkan jadwal jeda distraksi normal yang tersisa
    if (this.scheduledDistractTimers) {
      this.scheduledDistractTimers.forEach(t => t && t.remove && t.remove(false));
      this.scheduledDistractTimers = [];
    }

    // 4. Badai notifikasi palsu berkecepatan tinggi (~1.2 detik per notifikasi)
    const stormMessages = [
      'Grup Kelas: PING!',
      'Diskon 50% berakhir!',
      'Kamu punya 12 pesan baru',
      'Info Terkini: Jangan lupa tugas!',
      'Notifikasi: 3 pesan mendesak',
      'Trending: Berita terkini hari ini',
      'Temanmu baru saja menandaimu'
    ];
    let stormMsgIdx = 0;

    this.stormTimer = this.time.addEvent({
      delay: 1200,
      callback: () => {
        if (!this.isFinished && this.isStormActive) {
          const msg = stormMessages[stormMsgIdx % stormMessages.length];
          stormMsgIdx++;
          // Variasi posisi Y berjenjang (160, 240, 320) di atas batas orb (y = 500)
          const stormY = 160 + ((stormMsgIdx % 3) * 80);
          this.spawnDistractionCard(Layout.W, msg, stormY, 3000);
        }
      },
      loop: true
    });
  }

  /**
   * Mengakhiri Badai Notifikasi dan mengevaluasi hasil ketahanan.
   */
  endStorm() {
    if (!this.isStormActive) return;
    this.isStormActive = false;

    if (this.stormTimer) {
      this.stormTimer.remove(false);
      this.stormTimer = null;
    }

    if (this.stormFog) {
      this.tweens.add({
        targets: this.stormFog,
        alpha: 0,
        duration: 600,
        ease: 'Sine.easeIn',
        onComplete: () => {
          if (this.stormFog) {
            this.stormFog.destroy();
            this.stormFog = null;
          }
        }
      });
    }

    // Evaluasi keberhasilan: bila pemain melewati badai tanpa mengklik notifikasi (PRD 14.2 G3)
    if (this.stormDistractHits === 0 && !this.stormPassedAwarded) {
      this.stormPassedAwarded = true;

      // 1. Lumi mengucap storm_pass
      if (JEDA.Lumi) {
        this.time.delayedCall(400, () => {
          JEDA.Lumi.say('storm_pass');
        });
      }

      // 2. Lentera level itu menyala 50% lebih terang
      if (JEDA.Stage3D && JEDA.Stage3D.boostLantern) {
        JEDA.Stage3D.boostLantern(0);
      }

      // 3. Cek lencana Tidak Menoleh jika 0 klik sepanjang permainan
      if (this.distractHits === 0 && JEDA.State && JEDA.State.unlockBadge) {
        const unlocked = JEDA.State.unlockBadge('no_distract');
        if (unlocked) {
          this.time.delayedCall(1200, () => {
            JEDA.UI.toast(this, 'Lencana Diraih: Tidak Menoleh 🛡️');
          });
        }
      }
    }
  }

  /**
   * Memunculkan satu kartu notifikasi palsu dari tepi kanan (BR-03).
   */
  spawnDistractionCard(W, message, yPos = 190, lifeMs = 5000) {
    const Layout = JEDA.Layout;
    const cardW = 380;
    const cardH = 80;
    const startX = W + 220;
    const targetX = Layout.W - Layout.M - cardW / 2;
    const targetY = yPos;

    const container = this.add.container(startX, targetY).setDepth(500);
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a3a, 0.94);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);
    bg.lineStyle(2, JEDA.CFG.COLOR.warn, 0.6);
    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);

    const icon = this.add.text(-cardW / 2 + 25, 0, '🔔', { fontSize: '28px' }).setOrigin(0, 0.5);
    const text = this.add.text(-cardW / 2 + 65, 0, message, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0, 0.5).setResolution(2);

    container.add([bg, icon, text]);
    container.setSize(cardW, cardH);
    container.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-cardW / 2, -cardH / 2, cardW, cardH),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true
    });

    container.on('pointerdown', (pointer) => {
      pointer.event.stopPropagation();
      this.handleDistractionClicked(container);
    });

    this.tweens.add({
      targets: container,
      x: targetX,
      duration: 350,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.time.delayedCall(lifeMs, () => {
          if (container.active) {
            this.tweens.add({
              targets: container,
              x: startX,
              alpha: 0,
              duration: 300,
              ease: 'Sine.easeIn',
              onComplete: () => container.destroy()
            });
          }
        });
      }
    });
  }

  /**
   * Menangani klik pada notifikasi palsu (BR-03).
   */
  handleDistractionClicked(container) {
    container.destroy();
    this.distractHits++;

    if (this.isStormActive) {
      this.stormDistractHits++;
    }

    if (JEDA.Lumi) {
      JEDA.Lumi.addFlow(-10);
      JEDA.Lumi.say('distract_hit');
    }

    JEDA.UI.toast(this, 'Perhatianmu tadi pergi. Kembali ke napas.');
    this.flashOrbOff();

    if (JEDA.Stage3D) {
      if (JEDA.Stage3D.flashDistraction) {
        JEDA.Stage3D.flashDistraction();
      } else {
        JEDA.Stage3D.setSync('off');
        this.time.delayedCall(500, () => {
          if (JEDA.Stage3D) JEDA.Stage3D.setSync('good');
        });
      }
    }
  }

  flashOrbOff() {
    const offColor = JEDA.CFG.COLOR.off;
    const skinColor = (window.JEDA && JEDA.FX && JEDA.FX.getSkinColor) ? JEDA.FX.getSkinColor() : JEDA.CFG.COLOR.calm;

    this.outerRing.setFillStyle(offColor, 0.35);
    this.innerRing.setFillStyle(offColor, 0.6);
    this.coreCircle.setFillStyle(offColor, 0.95);

    this.time.delayedCall(500, () => {
      if (this.outerRing && this.innerRing && this.coreCircle) {
        this.outerRing.setFillStyle(skinColor, 0.15);
        this.innerRing.setFillStyle(skinColor, 0.35);
        this.coreCircle.setFillStyle(skinColor, 0.85);
      }
    });
  }

  /**
   * Menyelesaikan Level 1 dan menampilkan ringkasan skor.
   */
  finishLevel() {
    if (this.isFinished) return;
    this.isFinished = true;

    // Akhiri Badai Notifikasi jika masih berjalan (PRD 14.2 G3)
    this.endStorm();

    if (JEDA.Stage3D) {
      JEDA.Stage3D.setBreath(0.35);
      JEDA.Stage3D.pulse(0.7);
    }

    const result = JEDA.Score.calcL1(this.completedCycles, this.distractHits);

    // Simpan metrik performa ke sesi untuk evaluasi lencana (PRD 14.2 G4)
    JEDA.State.session.distractHits = this.distractHits;
    JEDA.State.session.l1Passed = result.passed;
    JEDA.State.session.levelScores.l1 = result.score;

    if (result.passed) {
      if (JEDA.Lumi) JEDA.Lumi.say('level_pass');
      JEDA.State.saveLevelScore(1, result.score, result.stars);
      JEDA.State.data.fails.l1 = 0;
      if (JEDA.Stage3D) {
        JEDA.Stage3D.setLanterns(1);
        if (JEDA.Stage3D.celebratePass) {
          JEDA.Stage3D.celebratePass();
        }
      }
    } else {
      if (JEDA.Lumi) JEDA.Lumi.say('result_low');
      JEDA.State.data.fails.l1 = (JEDA.State.data.fails.l1 || 0) + 1;
    }
    JEDA.State.save();

    // Evaluasi lencana yang relevan dengan Level 1 (Tidak Menoleh & Napas Penuh)
    if (window.JEDA && JEDA.Score && JEDA.Score.badges) {
      const badgeRes = JEDA.Score.badges({
        l1Score: result.score,
        distractHits: this.distractHits,
        l1Passed: result.passed
      });
      if (badgeRes.newlyUnlocked && badgeRes.newlyUnlocked.length > 0) {
        const badgeObj = JEDA.Score.BADGES.find(b => b.id === badgeRes.newlyUnlocked[0]);
        if (badgeObj) {
          this.time.delayedCall(1200, () => {
            JEDA.UI.toast(this, `Lencana Diraih: ${badgeObj.name} ${badgeObj.icon}`);
          });
        }
      }
    }

    if (!result.passed && JEDA.State.data.fails.l1 >= 3 && !JEDA.State.data.easy.l1) {
      this.time.delayedCall(800, () => {
        JEDA.UI.showFriendlyModeOffer(this, 'Level 1: Napas', () => {
          JEDA.State.data.easy.l1 = true;
          JEDA.State.save();
          this.scene.restart({ easyMode: true });
        });
      });
      return;
    }

    this.time.delayedCall(800, () => {
      this.showResultSummary(result);
    });
  }

  /**
   * Menampilkan panel kaca ringkasan hasil skor Level 1 menggunakan Layout simetris.
   */
  showResultSummary(result) {
    const Layout = JEDA.Layout;
    const cx = Layout.cx();
    const cy = Layout.cy();

    const modal = this.add.container(cx, cy).setDepth(2000);

    const cardW = Layout.panelSize.M; // 960 px
    const cardH = 620;

    const bg = this.add.graphics();
    bg.fillStyle(0x16163A, 0.96);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 32);
    bg.lineStyle(2, result.passed ? JEDA.CFG.COLOR.calm : JEDA.CFG.COLOR.warn, 0.5);
    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 32);
    modal.add(bg);

    // Judul
    const titleStr = result.passed ? 'Latihan Napas Selesai' : 'Perlu Latihan Lagi';
    const title = this.add.text(0, -cardH / 2 + 65, titleStr, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '44px',
      fontStyle: '800',
      color: result.passed ? JEDA.CFG.COLOR.hex.calm : JEDA.CFG.COLOR.hex.warn
    }).setOrigin(0.5).setResolution(2);

    // Bintang
    const starStr = '★'.repeat(result.stars) + '☆'.repeat(3 - result.stars);
    const stars = this.add.text(0, -cardH / 2 + 125, starStr, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '44px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.warn
    }).setOrigin(0.5).setResolution(2);

    // Komponen Skor (3 kotak berjarak simetris)
    const rowY = -cardH / 2 + 220;
    const compBoxW = 250;
    const compBoxH = 120;
    const compWidths = [compBoxW, compBoxW, compBoxW];
    const compXs = [-282, 0, 282]; // Relatif terhadap pusat modal

    const comps = [
      { name: 'Sinkron', val: `${result.sinkron}%`, desc: 'Kesesuaian Ritme' },
      { name: 'Ketahanan', val: `${result.ketahanan}%`, desc: `${this.distractHits} Distraksi` },
      { name: 'Konsisten', val: `${result.konsisten}%`, desc: 'Rangkaian Terbaik' }
    ];

    comps.forEach((c, idx) => {
      const bx = compXs[idx];
      const bgg = this.add.graphics();
      bgg.fillStyle(0x1A1D40, 0.95);
      bgg.fillRoundedRect(bx - compBoxW / 2, rowY - compBoxH / 2, compBoxW, compBoxH, 16);
      bgg.lineStyle(1.5, 0x485278, 0.7);
      bgg.strokeRoundedRect(bx - compBoxW / 2, rowY - compBoxH / 2, compBoxW, compBoxH, 16);

      const nameT = this.add.text(bx, rowY - 32, c.name, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '27px',
        fontStyle: '600',
        color: JEDA.CFG.COLOR.hex.muted
      }).setOrigin(0.5).setResolution(2);

      const valT = this.add.text(bx, rowY + 6, c.val, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '33px',
        fontStyle: '800',
        color: JEDA.CFG.COLOR.hex.text
      }).setOrigin(0.5).setResolution(2);

      const descT = this.add.text(bx, rowY + 42, c.desc, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '27px',
        fontStyle: '400',
        color: JEDA.CFG.COLOR.hex.muted
      }).setOrigin(0.5).setResolution(2);

      modal.add([bgg, nameT, valT, descT]);
    });

    // Total Skor (Prinsip 8: Hierarki teks 33 px)
    const scoreText = this.add.text(0, rowY + 125, `Skor Akhir Level 1: ${result.score}`, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '33px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    modal.add([title, stars, scoreText]);

    // Tombol Tindakan Baku (Tinggi 88, sama lebar 300, teks 33 px, aksi utama di kanan)
    const btnY = cardH / 2 - 76;
    const btnW = 300;
    const btnH = 88;
    const btnGap = 32;

    if (result.passed) {
      // Kiri: Aksi sekunder (Ulangi Latihan)
      const repeatBtn = JEDA.UI.createButton(this, -(btnW / 2 + btnGap / 2), btnY, btnW, btnH, 'Ulangi Latihan', () => {
        if (JEDA.Stage3D) {
          JEDA.Stage3D.setMode('l1');
          JEDA.Stage3D.setSync('good');
        }
        this.scene.restart();
      }, { radius: 44, fontSize: 33 });

      // Kanan: Aksi utama (Lanjut ke Level 2)
      const nextBtn = JEDA.UI.createButton(this, (btnW / 2 + btnGap / 2), btnY, btnW, btnH, 'Lanjut ke Level 2', () => {
        if (JEDA.Stage3D) JEDA.Stage3D.setMode('l2');
        JEDA.FX.transitionTo(this, 'Level2Scene');
      }, { primary: true, radius: 44, fontSize: 33 });

      modal.add([repeatBtn, nextBtn]);
    } else {
      // Kiri: Menu Utama
      const menuBtn = JEDA.UI.createButton(this, -(btnW / 2 + btnGap / 2), btnY, btnW, btnH, 'Menu Utama', () => {
        if (JEDA.Stage3D) JEDA.Stage3D.setMode('menu');
        JEDA.FX.transitionTo(this, 'CheckinScene');
      }, { radius: 44, fontSize: 33 });

      // Kanan: Ulangi Latihan
      const repeatBtn = JEDA.UI.createButton(this, (btnW / 2 + btnGap / 2), btnY, btnW, btnH, 'Ulangi Latihan', () => {
        if (JEDA.Stage3D) {
          JEDA.Stage3D.setMode('l1');
          JEDA.Stage3D.setSync('good');
        }
        this.scene.restart();
      }, { primary: true, radius: 44, fontSize: 33 });

      modal.add([menuBtn, repeatBtn]);
    }

    modal.setAlpha(0);
    this.tweens.add({
      targets: modal,
      alpha: 1,
      duration: 300,
      ease: 'Sine.easeOut'
    });
  }

  /**
   * Update per-frame: sinkronisasi ritme pernapasan ke panggung 3D (PRD 13.2).
   */
  update(time, delta) {
    if (!JEDA.Stage3D || !JEDA.Stage3D.isActive()) return;

    if (this.state === 'HOLDING' && this.holdStartTime > 0) {
      const elapsed = Date.now() - this.holdStartTime;
      const t = Math.min(1.0, elapsed / this.inMs);
      JEDA.Stage3D.setBreath(t);
    } else if (this.state === 'RELEASING' && this.releaseStartTime > 0) {
      const elapsed = Date.now() - this.releaseStartTime;
      const t = Math.max(0.0, 1.0 - (elapsed / this.outMs));
      JEDA.Stage3D.setBreath(t);
    } else if (this.state === 'WAITING_HOLD') {
      const idleT = 0.18 + Math.sin(time * 0.0025) * 0.07;
      JEDA.Stage3D.setBreath(idleT);
    }
  }
}

window.Level1Scene = Level1Scene;
