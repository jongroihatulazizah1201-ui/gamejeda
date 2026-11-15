/**
 * JEDA - Level3Scene (js/scenes/level3.js)
 * Layar 4: Level 3 Jeda S.T.O.P.
 * Fitur Utama:
 * - 3 skenario berurutan menggunakan data dari data.js (JEDA.DATA.scenarios)
 * - Meter emosi horizontal (mulai 70, +15 reaksi langsung, -30 jalur STOP)
 * - Dua jalur per skenario: "Langsung bereaksi" vs "Jeda dengan STOP"
 * - Jalur STOP 4 langkah: S (Stop), T (Take a breath), O (Observe emosi), P (Proceed respon)
 * - Perhitungan skor resmi Bagian 6 PRD menggunakan JEDA.Score.calcL3
 */
class Level3Scene extends Phaser.Scene {
  constructor() {
    super({ key: 'Level3Scene' });
  }

  create() {
    const W = JEDA.CFG.W;
    const H = JEDA.CFG.H;
    const cx = W / 2;

    // Ambil data dari data.js (Dilarang menulis teks skenario langsung di scene)
    this.scenarios = JEDA.DATA.scenarios || [];
    this.currentScenarioIndex = 0;
    this.scenarioResults = [];

    // Meter emosi awal = 70 (PRD Bagian 5.4 & 6)
    this.emotionMeter = JEDA.CFG.L3.meterStart || 70;

    // 1. Latar Belakang & Vinyet
    JEDA.FX.createBackground(this);
    this.cameras.main.fadeIn(350);

    // 2. Header
    this.createHeader(W);

    // 3. Meter Emosi Horizontal
    this.createEmotionMeter(cx, 140);

    // 4. Kontainer Utama Konten Skenario
    this.scenarioContainer = this.add.container(0, 0);

    // 5. Muat Skenario Pertama
    this.loadScenario(this.currentScenarioIndex);

    // 6. Pengawas Idle (BR-06)
    if (JEDA.Guard && JEDA.Guard.startIdleMonitor) {
      JEDA.Guard.startIdleMonitor(this);
    }
  }

  /**
   * Membuat header navigasi dan status skenario.
   */
  createHeader(W) {
    JEDA.UI.createButton(this, 140, 65, 180, 50, '← Menu', () => {
      JEDA.FX.transitionTo(this, 'CheckinScene');
    }, { fontSize: 20, radius: 25 });

    this.titleText = this.add.text(W / 2, 50, 'Level 3: Jeda S.T.O.P.', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '32px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    this.stepCounterText = this.add.text(W / 2, 88, 'Skenario 1 dari 3', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '20px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted
    }).setOrigin(0.5).setResolution(2);
  }

  /**
   * Membuat Meter Emosi Horizontal (mulai 70).
   */
  createEmotionMeter(cx, y) {
    this.meterContainer = this.add.container(cx, y);
    const meterW = 560;
    const meterH = 26;

    // Label meter
    this.meterLabel = this.add.text(0, -24, `Tingkat Emosi: ${this.emotionMeter}%`, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '20px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    // Track latar belakang
    const track = this.add.graphics();
    track.fillStyle(0x0e0e24, 0.8);
    track.fillRoundedRect(-meterW / 2, -meterH / 2, meterW, meterH, 13);
    track.lineStyle(2, JEDA.CFG.COLOR.panelLine, 0.35);
    track.strokeRoundedRect(-meterW / 2, -meterH / 2, meterW, meterH, 13);

    // Bar isi
    this.meterBar = this.add.graphics();
    this.meterW = meterW;
    this.meterH = meterH;
    this.renderMeterBar(this.emotionMeter);

    this.meterContainer.add([this.meterLabel, track, this.meterBar]);
  }

  /**
   * Render ulang bar isi meter emosi.
   */
  renderMeterBar(value) {
    this.meterBar.clear();
    const clamped = Phaser.Math.Clamp(value, 0, 100);
    const w = (clamped / 100) * (this.meterW - 4);
    const h = this.meterH - 4;

    let color = JEDA.CFG.COLOR.calm;
    if (clamped > 65) {
      color = JEDA.CFG.COLOR.off;
    } else if (clamped > 35) {
      color = JEDA.CFG.COLOR.warn;
    }

    if (w > 0) {
      this.meterBar.fillStyle(color, 0.9);
      this.meterBar.fillRoundedRect(-this.meterW / 2 + 2, -this.meterH / 2 + 2, w, h, 11);
    }

    if (this.meterLabel) {
      this.meterLabel.setText(`Tingkat Emosi: ${Math.round(clamped)}%`);
    }
  }

  /**
   * Mengubah nilai meter emosi dengan animasi tween halus.
   */
  animateMeterDelta(delta, onComplete) {
    const targetValue = Phaser.Math.Clamp(this.emotionMeter + delta, 0, 100);
    const startVal = this.emotionMeter;

    this.tweens.addCounter({
      from: startVal,
      to: targetValue,
      duration: 600,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        const current = tween.getValue();
        this.renderMeterBar(current);
      },
      onComplete: () => {
        this.emotionMeter = targetValue;
        if (typeof onComplete === 'function') onComplete();
      }
    });
  }

  /**
   * Memuat skenario berdasarkan index (0, 1, atau 2).
   */
  loadScenario(idx) {
    if (idx >= this.scenarios.length) {
      this.finishLevel();
      return;
    }

    this.currentScenarioIndex = idx;
    this.stepCounterText.setText(`Skenario ${idx + 1} dari ${this.scenarios.length}`);
    this.scenarioContainer.removeAll(true);

    const scenario = this.scenarios[idx];
    this.showScenarioTrigger(scenario);
  }

  /**
   * Menampilkan kartu pemicu skenario dan 2 pilihan jalur:
   * "Langsung bereaksi" vs "Jeda dengan STOP" (PRD Bagian 5.4).
   */
  showScenarioTrigger(scenario) {
    const cx = JEDA.CFG.W / 2;
    const cy = JEDA.CFG.H / 2 + 30;

    const cardW = 1050;
    const cardH = 580;

    // Panel kaca utama
    const bg = this.add.graphics();
    bg.fillStyle(0x16163A, 0.92);
    bg.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    bg.lineStyle(2, JEDA.CFG.COLOR.panelLine, 0.25);
    bg.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    this.scenarioContainer.add(bg);

    // Judul Skenario
    const title = this.add.text(cx, cy - cardH / 2 + 65, scenario.title, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '34px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    // Label Pemicu
    const badge = this.add.text(cx, cy - cardH / 2 + 125, 'SITUASI PEMICU', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '18px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.warn
    }).setOrigin(0.5).setResolution(2);

    // Teks Situasi Pemicu dari data.js
    const triggerText = this.add.text(cx, cy - 20, scenario.trigger, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '30px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.text,
      align: 'center',
      wordWrap: { width: cardW - 140 },
      lineSpacing: 10
    }).setOrigin(0.5).setResolution(2);

    // Pertanyaan pilihan jalur
    const promptText = this.add.text(cx, cy + 110, 'Apa yang akan kamu lakukan sekarang?', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '22px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted
    }).setOrigin(0.5).setResolution(2);

    // Dua Tombol Besar: Langsung Bereaksi vs Jeda dengan STOP
    const btnY = cy + 195;

    // 1. Jalur Reaksi Langsung
    const reactBtn = JEDA.UI.createButton(this, cx - 240, btnY, 400, 68, 'Langsung Bereaksi', () => {
      this.handleReactionPath(scenario);
    }, { radius: 34, textColor: JEDA.CFG.COLOR.hex.off });

    // 2. Jalur STOP
    const stopBtn = JEDA.UI.createButton(this, cx + 240, btnY, 400, 68, 'Jeda dengan STOP', () => {
      this.handleStopPath(scenario);
    }, { primary: true, radius: 34 });

    this.scenarioContainer.add([title, badge, triggerText, promptText, reactBtn, stopBtn]);
  }

  /**
   * JALUR 1: Langsung bereaksi (PRD Bagian 5.4)
   * Tampil konsekuensi, meter naik 15, lalu skenario berikutnya.
   */
  handleReactionPath(scenario) {
    this.scenarioContainer.removeAll(true);
    const cx = JEDA.CFG.W / 2;
    const cy = JEDA.CFG.H / 2 + 30;

    const cardW = 950;
    const cardH = 520;

    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a36, 0.95);
    bg.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    bg.lineStyle(2, JEDA.CFG.COLOR.off, 0.45);
    bg.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    this.scenarioContainer.add(bg);

    const title = this.add.text(cx, cy - cardH / 2 + 65, 'Reaksi Spontan Tanpa Jeda', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '32px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.off
    }).setOrigin(0.5).setResolution(2);

    // Teks konsekuensi dari data.js
    const consText = this.add.text(cx, cy - 25, scenario.reactionConsequence, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '26px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.text,
      align: 'center',
      wordWrap: { width: cardW - 140 },
      lineSpacing: 10
    }).setOrigin(0.5).setResolution(2);

    const note = this.add.text(cx, cy + 95, 'Emosi meningkat (+15). Reaksi impulsif memperkeruh suasana.', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '20px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted
    }).setOrigin(0.5).setResolution(2);

    // Meter naik 15 (JEDA.CFG.L3.meterReact = 15)
    this.animateMeterDelta(JEDA.CFG.L3.meterReact || 15);

    // Simpan hasil jalur reaksi (respons = 0)
    this.scenarioResults.push({
      choseStop: false,
      responseScore: 0,
      observedCorrect: false
    });

    const nextBtn = JEDA.UI.createButton(this, cx, cy + 180, 320, 64, 'Lanjutkan', () => {
      this.loadScenario(this.currentScenarioIndex + 1);
    }, { primary: true, radius: 32 });

    this.scenarioContainer.add([title, consText, note, nextBtn]);
  }

  /**
   * JALUR 2: Jeda dengan STOP (4 Langkah: S, T, O, P)
   */
  handleStopPath(scenario) {
    this.stopData = {
      scenario: scenario,
      observedCorrect: false,
      responseScore: 0
    };
    this.startStepS();
  }

  /**
   * Indikator 4 Langkah STOP di bagian atas kartu.
   */
  drawStepIndicator(cx, y, activeStep) {
    const steps = [
      { key: 'S', name: 'Stop' },
      { key: 'T', name: 'Take a breath' },
      { key: 'O', name: 'Observe' },
      { key: 'P', name: 'Proceed' }
    ];
    const spacing = 180;
    const startX = cx - ((steps.length - 1) * spacing) / 2;

    steps.forEach((st, idx) => {
      const sx = startX + idx * spacing;
      const isActive = (st.key === activeStep);

      const circle = this.add.graphics();
      circle.fillStyle(isActive ? JEDA.CFG.COLOR.calm : 0xFFFFFF, isActive ? 0.9 : 0.1);
      circle.fillCircle(sx, y, 22);
      circle.lineStyle(2, isActive ? 0xFFFFFF : JEDA.CFG.COLOR.panelLine, isActive ? 0.9 : 0.3);
      circle.strokeCircle(sx, y, 22);

      const letter = this.add.text(sx, y, st.key, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '20px',
        fontStyle: '800',
        color: isActive ? JEDA.CFG.COLOR.hex.bgTop : JEDA.CFG.COLOR.hex.text
      }).setOrigin(0.5).setResolution(2);

      const label = this.add.text(sx, y + 36, st.name, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '15px',
        fontStyle: '600',
        color: isActive ? JEDA.CFG.COLOR.hex.calm : JEDA.CFG.COLOR.hex.muted
      }).setOrigin(0.5).setResolution(2);

      this.scenarioContainer.add([circle, letter, label]);
    });
  }

  /**
   * LANGKAH 1: S (Stop) - Tekan tombol Stop, orb membeku (PRD Bagian 5.4).
   */
  startStepS() {
    this.scenarioContainer.removeAll(true);
    const cx = JEDA.CFG.W / 2;
    const cy = JEDA.CFG.H / 2 + 30;
    const cardW = 950;
    const cardH = 540;

    const bg = this.add.graphics();
    bg.fillStyle(0x16163A, 0.95);
    bg.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    bg.lineStyle(2, JEDA.CFG.COLOR.panelLine, 0.3);
    bg.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    this.scenarioContainer.add(bg);

    // Indikator STOP
    this.drawStepIndicator(cx, cy - cardH / 2 + 55, 'S');

    // Judul langkah
    const title = this.add.text(cx, cy - 80, 'Langkah S: Berhenti Sejenak', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '30px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    const desc = this.add.text(cx, cy - 35, 'Tahan diri dari dorongan untuk langsung mengetik atau membalas.', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '22px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted
    }).setOrigin(0.5).setResolution(2);

    // Orb yang berdenyut lembut
    const orb = JEDA.FX.createOrb(this, cx, cy + 60, 55, JEDA.CFG.COLOR.warn);
    const pulse = this.tweens.add({
      targets: orb,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 1000,
      yoyo: true,
      repeat: -1
    });

    // Tombol STOP
    const stopBtn = JEDA.UI.createButton(this, cx, cy + 180, 320, 64, 'Berhenti (STOP)', () => {
      // Orb membeku
      pulse.stop();
      orb.setScale(1.0);
      orb.core.setFillStyle(JEDA.CFG.COLOR.calm, 0.95);
      stopBtn.setEnabled(false);

      JEDA.UI.toast(this, 'Reaksi dibekukan. Kamu mengambil jeda.');
      this.time.delayedCall(700, () => {
        this.startStepT();
      });
    }, { primary: true, radius: 32 });

    this.scenarioContainer.add([title, desc, orb, stopBtn]);
  }

  /**
   * LANGKAH 2: T (Take a breath) - Satu siklus napas mini (PRD Bagian 5.4).
   */
  startStepT() {
    this.scenarioContainer.removeAll(true);
    const cx = JEDA.CFG.W / 2;
    const cy = JEDA.CFG.H / 2 + 30;
    const cardW = 950;
    const cardH = 540;

    const bg = this.add.graphics();
    bg.fillStyle(0x16163A, 0.95);
    bg.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    bg.lineStyle(2, JEDA.CFG.COLOR.panelLine, 0.3);
    bg.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    this.scenarioContainer.add(bg);

    this.drawStepIndicator(cx, cy - cardH / 2 + 55, 'T');

    const title = this.add.text(cx, cy - 80, 'Langkah T: Tarik Napas Bersama', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '30px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    const desc = this.add.text(cx, cy - 35, 'Tahan tombol, orb, atau tombol Spasi selama 4 detik.', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '22px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted
    }).setOrigin(0.5).setResolution(2);

    const orb = JEDA.FX.createOrb(this, cx, cy + 60, 55, JEDA.CFG.COLOR.calm);
    orb.setSize(150, 150);
    orb.setInteractive({
      hitArea: new Phaser.Geom.Circle(0, 0, 75),
      hitAreaCallback: Phaser.Geom.Circle.Contains,
      useHandCursor: true
    });

    const timerText = this.add.text(cx, cy + 60, '', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '28px',
      fontStyle: '800',
      color: '#FFFFFF'
    }).setOrigin(0.5).setResolution(2).setDepth(20);

    const breathBtn = JEDA.UI.createButton(this, cx, cy + 180, 480, 64, 'Tahan untuk Tarik Napas (4 detik)', null, {
      primary: true,
      textColor: '#FFFFFF',
      fontSize: 22,
      radius: 32
    });

    let isHolding = false;
    let holdStart = 0;
    let breathDone = false;
    let countTimer = null;

    const startHold = () => {
      if (breathDone || isHolding) return;
      isHolding = true;
      holdStart = Date.now();
      timerText.setText('0s');
      breathBtn.textObj.setText('Menarik napas... (tahan terus)');
      this.tweens.killTweensOf(orb);
      this.tweens.add({ targets: orb, scaleX: 1.55, scaleY: 1.55, duration: 4000, ease: 'Sine.easeInOut' });

      // Hitungan detik langsung terlihat di layar
      let sec = 0;
      if (countTimer) countTimer.remove(false);
      countTimer = this.time.addEvent({
        delay: 1000,
        repeat: 3,
        callback: () => {
          if (!isHolding || breathDone) return;
          sec++;
          timerText.setText(`${sec}s`);
          breathBtn.textObj.setText(`Menarik napas... ${sec} / 4 detik`);
          if (sec >= 4) {
            // Otomatis berhasil saat mencapai 4 detik
            endHold(true);
          }
        }
      });
    };

    const endHold = (isAutoSuccess = false) => {
      if (breathDone || !isHolding) return;
      isHolding = false;
      if (countTimer) countTimer.remove(false);
      const duration = Date.now() - holdStart;

      if (duration >= 3000 || isAutoSuccess) {
        breathDone = true;
        timerText.setText('✓');
        breathBtn.textObj.setText('Hembuskan napas perlahan...');
        this.tweens.killTweensOf(orb);
        this.tweens.add({
          targets: orb,
          scaleX: 1.0,
          scaleY: 1.0,
          duration: 3000,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            JEDA.UI.toast(this, 'Napas selesai. Pikiran lebih jernih.');
            this.time.delayedCall(600, () => {
              this.startStepO();
            });
          }
        });
      } else {
        const secElapsed = Math.round(duration / 1000);
        timerText.setText('');
        breathBtn.textObj.setText(`Baru ${secElapsed} detik. Tahan 4 detik, coba lagi`);
        this.tweens.killTweensOf(orb);
        this.tweens.add({ targets: orb, scaleX: 1.0, scaleY: 1.0, duration: 300 });
      }
    };

    // Bisa ditahan lewat tombol ATAU orb langsung
    breathBtn.on('pointerdown', startHold);
    breathBtn.on('pointerup', () => endHold(false));
    orb.on('pointerdown', startHold);
    orb.on('pointerup', () => endHold(false));
    this.input.on('pointerup', () => endHold(false));

    // Dukungan tombol Spasi keyboard
    const spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    spaceKey.on('down', startHold);
    spaceKey.on('up', () => endHold(false));

    this.scenarioContainer.add([title, desc, orb, timerText, breathBtn]);
  }

  /**
   * LANGKAH 3: O (Observe) - Pilih emosi yang dirasakan (PRD Bagian 5.4 & 8.2).
   */
  startStepO() {
    this.scenarioContainer.removeAll(true);
    const cx = JEDA.CFG.W / 2;
    const cy = JEDA.CFG.H / 2 + 30;
    const cardW = 950;
    const cardH = 540;
    const scenario = this.stopData.scenario;

    const bg = this.add.graphics();
    bg.fillStyle(0x16163A, 0.95);
    bg.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    bg.lineStyle(2, JEDA.CFG.COLOR.panelLine, 0.3);
    bg.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    this.scenarioContainer.add(bg);

    this.drawStepIndicator(cx, cy - cardH / 2 + 55, 'O');

    const title = this.add.text(cx, cy - 80, 'Langkah O: Amati Emosimu', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '30px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    const desc = this.add.text(cx, cy - 35, 'Kenali apa yang kamu rasakan tanpa menghakiminya:', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '22px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted
    }).setOrigin(0.5).setResolution(2);

    this.scenarioContainer.add([title, desc]);

    // 4 Pilihan Emosi dari data.js (2 kunci + 2 pengecoh)
    const emotionOptions = Phaser.Utils.Array.Shuffle([...scenario.emotions]);
    const spacing = 190;
    const startX = cx - ((emotionOptions.length - 1) * spacing) / 2;
    const pillY = cy + 60;

    emotionOptions.forEach((emo, idx) => {
      const px = startX + idx * spacing;
      const pill = JEDA.UI.createButton(this, px, pillY, 170, 56, emo, () => {
        // Cek kecocokan emosi dengan kunci skenario (Observe = 100 jika cocok)
        const isMatch = scenario.keys.includes(emo);
        this.stopData.observedCorrect = isMatch;

        pill.bg.clear();
        pill.bg.fillStyle(isMatch ? JEDA.CFG.COLOR.calm : 0xFFD27A, 0.4);
        pill.bg.fillRoundedRect(-85, -28, 170, 56, 28);
        pill.bg.lineStyle(2, 0xFFFFFF, 0.8);
        pill.bg.strokeRoundedRect(-85, -28, 170, 56, 28);

        JEDA.UI.toast(this, isMatch ? 'Emosi teramati dengan tepat.' : 'Emosi tercatat.');
        this.time.delayedCall(700, () => {
          this.startStepP();
        });
      }, { fontSize: 22, radius: 28 });

      this.scenarioContainer.add(pill);
    });
  }

  /**
   * LANGKAH 4: P (Proceed) - Pilih 1 dari 3 respons sadar (PRD Bagian 5.4 & 8.2).
   */
  startStepP() {
    this.scenarioContainer.removeAll(true);
    const cx = JEDA.CFG.W / 2;
    const cy = JEDA.CFG.H / 2 + 30;
    const cardW = 1080;
    const cardH = 580;
    const scenario = this.stopData.scenario;

    const bg = this.add.graphics();
    bg.fillStyle(0x16163A, 0.95);
    bg.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    bg.lineStyle(2, JEDA.CFG.COLOR.panelLine, 0.3);
    bg.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    this.scenarioContainer.add(bg);

    this.drawStepIndicator(cx, cy - cardH / 2 + 50, 'P');

    const title = this.add.text(cx, cy - cardH / 2 + 105, 'Langkah P: Pilih Tindakan dengan Sadar', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '28px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    this.scenarioContainer.add(title);

    // Ambil 3 respons dari data.js dan acak urutannya
    const responses = Phaser.Utils.Array.Shuffle([
      scenario.bestResponse,
      scenario.fairResponse,
      scenario.poorResponse
    ]);

    const startY = cy - 40;
    const itemH = 75;
    const spacingY = 95;

    responses.forEach((resp, idx) => {
      const ry = startY + idx * spacingY;
      const btn = JEDA.UI.createButton(this, cx, ry, cardW - 140, itemH, resp.text, () => {
        // Catat skor respons (100, 60, atau 0)
        this.stopData.responseScore = resp.score;

        // Meter turun 30 (JEDA.CFG.L3.meterStop = -30)
        this.animateMeterDelta(JEDA.CFG.L3.meterStop || -30);

        // Rekam hasil skenario lengkap
        this.scenarioResults.push({
          choseStop: true,
          responseScore: resp.score,
          observedCorrect: this.stopData.observedCorrect
        });

        // Umpan balik berdasarkan pilihan
        let fbText = 'Tindakan dipilih.';
        if (resp.score === 100) fbText = 'Respons bijak: Tetap tenang dan solutif (-30 Emosi).';
        else if (resp.score === 60) fbText = 'Respons cukup: Meredakan eskalasi (-30 Emosi).';
        else fbText = 'Pilihan tergesa-gesa: Jeda perlu diimbangi respons yang tepat (-30 Emosi).';

        JEDA.UI.toast(this, fbText);

        this.time.delayedCall(1200, () => {
          this.loadScenario(this.currentScenarioIndex + 1);
        });
      }, { fontSize: 20, radius: 20 });

      this.scenarioContainer.add(btn);
    });
  }

  /**
   * Menyelesaikan Level 3 dan menampilkan ringkasan skor.
   */
  finishLevel() {
    // Hitung skor menggunakan fungsi murni JEDA.Score.calcL3 (Bagian 6 PRD)
    const result = JEDA.Score.calcL3(this.scenarioResults);

    // Simpan progres jika lulus (skor >= 60)
    if (result.passed) {
      JEDA.State.saveLevelScore(3, result.score, result.stars);
      JEDA.State.data.fails.l3 = 0;
    } else {
      JEDA.State.data.fails.l3 = (JEDA.State.data.fails.l3 || 0) + 1;
    }
    JEDA.State.session.levelScores.l3 = result.score;
    JEDA.State.save();

    // Tawaran Mode Ramah jika gagal 3 kali berturut-turut (BR-07)
    if (!result.passed && JEDA.State.data.fails.l3 >= 3 && !JEDA.State.data.easy.l3) {
      this.time.delayedCall(600, () => {
        JEDA.UI.showFriendlyModeOffer(this, 'Level 3: Jeda S.T.O.P.', () => {
          JEDA.State.data.easy.l3 = true;
          JEDA.State.save();
          this.scene.restart();
        });
      });
      return;
    }

    this.showResultSummary(result);
  }

  /**
   * Menampilkan panel ringkasan hasil skor Level 3.
   */
  showResultSummary(result) {
    this.scenarioContainer.removeAll(true);
    const cx = JEDA.CFG.W / 2;
    const cy = JEDA.CFG.H / 2 + 20;

    const modal = this.add.container(cx, cy).setDepth(2000);
    const cardW = 950;
    const cardH = 620;

    const bg = this.add.graphics();
    bg.fillStyle(0x16163A, 0.95);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 32);
    bg.lineStyle(2, result.passed ? JEDA.CFG.COLOR.calm : JEDA.CFG.COLOR.warn, 0.5);
    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 32);
    modal.add(bg);

    const titleStr = result.passed ? 'Level 3 Selesai: Jeda S.T.O.P.' : 'Perlu Latihan Lagi';
    const title = this.add.text(0, -cardH / 2 + 65, titleStr, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '38px',
      fontStyle: '800',
      color: result.passed ? JEDA.CFG.COLOR.hex.calm : JEDA.CFG.COLOR.hex.warn
    }).setOrigin(0.5).setResolution(2);

    const starStr = '★'.repeat(result.stars) + '☆'.repeat(3 - result.stars);
    const stars = this.add.text(0, -cardH / 2 + 125, starStr, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '44px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.warn
    }).setOrigin(0.5).setResolution(2);

    // Tiga Komponen Skor Level 3: Jeda, Respons, Observe (PRD Bagian 6)
    const rowY = -cardH / 2 + 220;
    const compBoxW = 250;
    const compBoxH = 120;
    const comps = [
      { name: 'Jeda (40%)', val: `${result.jeda}%`, desc: 'Pilihan Mengambil Jeda' },
      { name: 'Respons (40%)', val: `${result.respons}%`, desc: 'Kualitas Pilihan Tindakan' },
      { name: 'Observe (20%)', val: `${result.observe}%`, desc: 'Ketepatan Mengamati Diri' }
    ];

    comps.forEach((c, idx) => {
      const bx = (idx - 1) * 280;
      const bgg = this.add.graphics();
      bgg.fillStyle(0xFFFFFF, 0.08);
      bgg.fillRoundedRect(bx - compBoxW / 2, rowY - compBoxH / 2, compBoxW, compBoxH, 16);
      bgg.lineStyle(1.5, JEDA.CFG.COLOR.panelLine, 0.25);
      bgg.strokeRoundedRect(bx - compBoxW / 2, rowY - compBoxH / 2, compBoxW, compBoxH, 16);

      const nameT = this.add.text(bx, rowY - 32, c.name, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '19px',
        fontStyle: '600',
        color: JEDA.CFG.COLOR.hex.muted
      }).setOrigin(0.5).setResolution(2);

      const valT = this.add.text(bx, rowY + 3, c.val, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '32px',
        fontStyle: '800',
        color: JEDA.CFG.COLOR.hex.text
      }).setOrigin(0.5).setResolution(2);

      const descT = this.add.text(bx, rowY + 36, c.desc, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '15px',
        fontStyle: '400',
        color: JEDA.CFG.COLOR.hex.muted
      }).setOrigin(0.5).setResolution(2);

      modal.add([bgg, nameT, valT, descT]);
    });

    const scoreText = this.add.text(0, rowY + 125, `Skor Akhir Level 3: ${result.score}`, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '32px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    modal.add([title, stars, scoreText]);

    const btnY = cardH / 2 - 80;
    if (result.passed) {
      const nextBtn = JEDA.UI.createButton(this, 170, btnY, 280, 60, 'Lihat Hasil Akhir', () => {
        JEDA.FX.transitionTo(this, 'ResultScene');
      }, { primary: true, radius: 30 });

      const repeatBtn = JEDA.UI.createButton(this, -170, btnY, 280, 60, 'Ulangi Level 3', () => {
        this.scene.restart();
      }, { radius: 30 });

      modal.add([nextBtn, repeatBtn]);
    } else {
      const repeatBtn = JEDA.UI.createButton(this, 150, btnY, 260, 60, 'Ulangi Level 3', () => {
        this.scene.restart();
      }, { primary: true, radius: 30 });

      const menuBtn = JEDA.UI.createButton(this, -150, btnY, 260, 60, 'Menu Utama', () => {
        JEDA.FX.transitionTo(this, 'CheckinScene');
      }, { radius: 30 });

      modal.add([repeatBtn, menuBtn]);
    }

    modal.setAlpha(0);
    this.tweens.add({ targets: modal, alpha: 1, duration: 300, ease: 'Sine.easeOut' });
  }
}

window.Level3Scene = Level3Scene;
