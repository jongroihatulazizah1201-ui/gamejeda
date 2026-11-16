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
    const Layout = JEDA.Layout;
    const cx = Layout.cx();

    // Ambil data dari data.js (Dilarang menulis teks skenario langsung di scene)
    this.scenarios = JEDA.DATA.scenarios || [];
    this.currentScenarioIndex = 0;
    this.scenarioResults = [];

    // Meter emosi awal = 70 (PRD Bagian 5.4 & 6)
    this.emotionMeter = JEDA.CFG.L3.meterStart || 70;

    // 1. Latar Belakang & Vinyet
    JEDA.FX.createBackground(this);
    if (JEDA.Stage3D) {
      JEDA.Stage3D.setMode('l3');
      JEDA.Stage3D.setLanterns(2); // Level 1 dan 2 sudah lulus
    }
    this.cameras.main.resetFX();
    this.cameras.main.fadeIn(350);

    // 2. Header di Zona Header (0 - 120 px)
    this.createHeader();

    // 3. Kontainer Utama Konten Skenario
    this.scenarioContainer = this.add.container(0, 0);

    // 4. Muat Skenario Pertama
    this.loadScenario(this.currentScenarioIndex);

    // 5. Pasang listener tombol debug grid 'G'
    Layout.attachDebugKeyListener(this);

    // 6. Pengawas Idle (BR-06)
    if (JEDA.Guard && JEDA.Guard.startIdleMonitor) {
      JEDA.Guard.startIdleMonitor(this);
    }

    // 7. Tampilkan kartu petunjuk otomatis saat pertama kali dibuka (PRD 15.2 & BR-15)
    this.isHelpOpen = false;
    if (!JEDA.State.hasSeen('l3')) {
      this.time.delayedCall(350, () => {
        this.showHelpModal();
      });
    }
  }

  /**
   * Membuat header navigasi dan status skenario di Zona Header (y: 0 - 120 px).
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

    // Tengah: Judul Level
    this.titleText = this.add.text(Layout.cx(), headerY, 'Level 3: Jeda S.T.O.P.', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '33px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    // Kanan: Tombol Bantuan (?) dan Kapsul status skenario (rata margin kanan 1800 px)
    const helpBtnSize = 48;
    const helpBtnX = (Layout.W - Layout.M) - helpBtnSize / 2; // 1800 - 24 = 1776
    this.helpButton = JEDA.UI.createButton(this, helpBtnX, headerY, helpBtnSize, helpBtnSize, '?', () => {
      this.showHelpModal();
    }, { fontSize: 27, radius: 24 });

    // Format dan posisikan kapsul sesuai skala 8 px dan lebar dinamis terukur dengan JEDA.UI.textBox
    this.updateScenarioCounter(0);
  }

  /**
   * Memperbarui teks dan dimensi kapsul status skenario menggunakan JEDA.UI.textBox.
   * Lebar diukur dari teks + padding skala 8 px, rata kanan dengan jarak 16 px dari tombol ?.
   */
  updateScenarioCounter(idx = 0) {
    const total = (this.scenarios && this.scenarios.length) || 3;
    const label = `Skenario ${idx + 1} dari ${total}`;

    const Layout = JEDA.Layout;
    const headerY = 64;
    const helpBtnSize = 48;
    const helpBtnX = (Layout.W - Layout.M) - helpBtnSize / 2; // 1776
    const helpLeftEdge = helpBtnX - helpBtnSize / 2; // 1752
    const gap = 16; // Skala 8 px
    const rightAnchor = helpLeftEdge - gap; // 1736

    if (this.scenarioCounterBox) {
      this.scenarioCounterBox.destroy();
    }

    this.scenarioCounterBox = JEDA.UI.textBox(this, 0, headerY, {
      text: label,
      fontSize: 24,
      fontWeight: '800',
      padX: 24,
      padY: 10,
      minH: 48,
      variant: 'chip'
    }).setDepth(10);

    const scW = this.scenarioCounterBox.panelW;
    const scX = rightAnchor - scW / 2;
    this.scenarioCounterBox.setPosition(scX, headerY);
  }

  /**
   * Menampilkan kartu petunjuk Level 3 (PRD 15.2 & BR-15).
   */
  showHelpModal() {
    this.isHelpOpen = true;
    JEDA.UI.helpCard(this, {
      type: 'l3',
      title: 'Petunjuk Level 3: Jeda S.T.O.P.',
      steps: [
        { num: 1, text: 'Pilih Langsung bereaksi atau Jeda dengan STOP.', key: 'Pilihan Reaksi' },
        { num: 2, text: 'STOP: Berhenti, Tarik napas, Observe emosimu, Proceed dengan respons terbaik.', key: 'Metode S.T.O.P.' }
      ],
      keys: ['S', 'T', 'O', 'P'],
      onDone: () => {
        this.isHelpOpen = false;
        JEDA.State.markSeen('l3');
      }
    });
  }

  /**
   * Membersihkan kontainer skenario dengan aman dan mereset referensi grafis.
   */
  clearScenarioContainer() {
    this.meterBar = null;
    this.meterLabel = null;
    this.meterContainer = null;
    if (this.scenarioContainer) {
      this.scenarioContainer.removeAll(true);
    }
  }

  /**
   * Membuat Meter Emosi Horizontal (mulai 70).
   * PRD 14.5: Meter emosi lebar 720 di bawah panel.
   */
  createEmotionMeter(cx, y) {
    this.meterContainer = this.add.container(cx, y);
    const meterW = 720;
    const meterH = 26;

    // Label meter
    this.meterLabel = this.add.text(0, -28, `Tingkat Emosi: ${this.emotionMeter}%`, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '700',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    // Track latar belakang
    const track = this.add.graphics();
    track.fillStyle(0x0e0e24, 0.85);
    track.fillRoundedRect(-meterW / 2, -meterH / 2, meterW, meterH, 13);
    track.lineStyle(2, JEDA.CFG.COLOR.panelLine, 0.35);
    track.strokeRoundedRect(-meterW / 2, -meterH / 2, meterW, meterH, 13);

    // Bar isi
    this.meterBar = this.add.graphics();
    this.meterW = meterW;
    this.meterH = meterH;
    this.renderMeterBar(this.emotionMeter);

    this.meterContainer.add([this.meterLabel, track, this.meterBar]);
    this.scenarioContainer.add(this.meterContainer);
  }

  /**
   * Render ulang bar isi meter emosi secara aman.
   */
  renderMeterBar(value) {
    if (!this.meterBar || !this.meterBar.scene || !this.meterBar.active) {
      return;
    }
    try {
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

      if (this.meterLabel && this.meterLabel.scene && this.meterLabel.active) {
        this.meterLabel.setText(`Tingkat Emosi: ${Math.round(clamped)}%`);
      }
    } catch (e) {
      // Safe fallback jika grafis dibersihkan selama loop tween
    }
  }

  /**
   * Mengubah nilai meter emosi dengan animasi tween halus jika meter terlihat.
   */
  animateMeterDelta(delta, onComplete) {
    const targetValue = Phaser.Math.Clamp(this.emotionMeter + delta, 0, 100);
    const startVal = this.emotionMeter;
    this.emotionMeter = targetValue; // Selalu perbarui nilai numerik segera

    // Jika meterBar tidak ada di layar (misalnya saat langkah S/T/O/P), langsung selesaikan
    if (!this.meterBar || !this.meterBar.scene || !this.meterBar.active) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

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
    this.updateScenarioCounter(idx);
    this.clearScenarioContainer();

    const scenario = this.scenarios[idx];
    this.showScenarioTrigger(scenario);
  }

  /**
   * Menampilkan kartu pemicu skenario dan 2 pilihan jalur:
   * "Langsung bereaksi" vs "Jeda dengan STOP" (PRD Bagian 5.4).
   */
  showScenarioTrigger(scenario) {
    const Layout = JEDA.Layout;
    const cx = Layout.cx();

    // 1. Panel L Utama (Lebar 1200 px, tinggi 320 px, pusat di y = 380)
    const cardW = Layout.panelSize.L; // 1200 px
    const cardH = 320;
    const cardY = 380;

    const bg = this.add.graphics();
    // 100% Solid Base
    bg.fillStyle(0x0E1026, 1.0);
    bg.fillRoundedRect(cx - cardW / 2, cardY - cardH / 2, cardW, cardH, 32);
    bg.fillStyle(0x16163A, 0.96);
    bg.fillRoundedRect(cx - cardW / 2, cardY - cardH / 2, cardW, cardH, 32);
    bg.lineStyle(2, JEDA.CFG.COLOR.panelLine, 0.35);
    bg.strokeRoundedRect(cx - cardW / 2, cardY - cardH / 2, cardW, cardH, 32);
    this.scenarioContainer.add(bg);

    // Judul & Badge Pemicu
    const title = this.add.text(cx, cardY - cardH / 2 + 48, scenario.title, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '33px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    const badge = this.add.text(cx, cardY - cardH / 2 + 96, '◄ SITUASI PEMICU ►', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.warn
    }).setOrigin(0.5).setResolution(2);

    // Teks Situasi Pemicu dari data.js
    const triggerText = this.add.text(cx, cardY + 28, scenario.trigger, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.text,
      align: 'center',
      wordWrap: { width: cardW - 140 },
      lineSpacing: 10
    }).setOrigin(0.5).setResolution(2);

    this.scenarioContainer.add([title, badge, triggerText]);

    // 2. Meter Emosi Horizontal Lebar 720 di Bawah Panel (y = 590)
    this.createEmotionMeter(cx, 590);

    // Pertanyaan pilihan jalur
    const promptText = this.add.text(cx, 672, 'Apa yang akan kamu lakukan sekarang?', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted
    }).setOrigin(0.5).setResolution(2);
    this.scenarioContainer.add(promptText);

    // 3. Dua Tombol Besar di y = 760 (sama lebar 420, jarak 48, rowCenter)
    const btnWidths = [420, 420];
    const btnXs = Layout.rowCenter(btnWidths, 48);
    const btnY = 760;

    let isTriggerHandled = false;

    // Kiri: Aksi Sekunder (Langsung Bereaksi)
    const reactBtn = JEDA.UI.createButton(this, btnXs[0], btnY, 420, 88, 'Langsung Bereaksi', () => {
      if (isTriggerHandled) return;
      isTriggerHandled = true;
      this.handleReactionPath(scenario);
    }, { radius: 44, textColor: '#FF8FA3', fontSize: 33 });

    // Kanan: Aksi Utama (Jeda dengan STOP)
    const stopBtn = JEDA.UI.createButton(this, btnXs[1], btnY, 420, 88, 'Jeda dengan STOP', () => {
      if (isTriggerHandled) return;
      isTriggerHandled = true;
      this.handleStopPath(scenario);
    }, { primary: true, radius: 44, fontSize: 33 });

    this.scenarioContainer.add([reactBtn, stopBtn]);
  }

  /**
   * JALUR 1: Langsung bereaksi (PRD Bagian 5.4)
   * Tampil konsekuensi, meter naik 15, lalu skenario berikutnya.
   */
  handleReactionPath(scenario) {
    this.clearScenarioContainer();
    const Layout = JEDA.Layout;
    const cx = Layout.cx();
    const cy = Layout.cy();

    const cardW = 960;
    const cardH = 520;

    const bg = this.add.graphics();
    // 100% Solid Base
    bg.fillStyle(0x0E1026, 1.0);
    bg.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    bg.fillStyle(0x1a1a36, 0.96);
    bg.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    bg.lineStyle(2, JEDA.CFG.COLOR.off, 0.45);
    bg.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    this.scenarioContainer.add(bg);

    const title = this.add.text(cx, cy - cardH / 2 + 65, 'Reaksi Spontan Tanpa Jeda', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '33px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.off
    }).setOrigin(0.5).setResolution(2);

    // Teks konsekuensi dari data.js
    const consText = this.add.text(cx, cy - 25, scenario.reactionConsequence, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.text,
      align: 'center',
      wordWrap: { width: cardW - 140 },
      lineSpacing: 10
    }).setOrigin(0.5).setResolution(2);

    const note = this.add.text(cx, cy + 95, 'Emosi meningkat (+15). Reaksi impulsif memperkeruh suasana.', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
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

    let isNextHandled = false;
    const nextBtn = JEDA.UI.createButton(this, cx, cy + 180, 320, 88, 'Lanjutkan', () => {
      if (isNextHandled) return;
      isNextHandled = true;
      this.loadScenario(this.currentScenarioIndex + 1);
    }, { primary: true, radius: 44, fontSize: 33 });

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
   * Indikator 4 Langkah STOP di y = 120 (PRD 14.5: rowCenter).
   */
  drawStepIndicator(cx, y, activeStep) {
    const Layout = JEDA.Layout;
    const steps = [
      { key: 'S', name: 'Stop' },
      { key: 'T', name: 'Take a breath' },
      { key: 'O', name: 'Observe' },
      { key: 'P', name: 'Proceed' }
    ];
    const stepWidths = [150, 150, 150, 150];
    const stepXs = Layout.rowCenter(stepWidths, 24);
    const indY = 120; // PRD 14.5: y = 120

    steps.forEach((st, idx) => {
      const sx = stepXs[idx];
      const isActive = (st.key === activeStep);

      const circle = this.add.graphics();
      circle.fillStyle(isActive ? JEDA.CFG.COLOR.calm : 0x181A3C, isActive ? 1.0 : 0.85);
      circle.fillCircle(sx, indY, 24);
      circle.lineStyle(2, isActive ? 0xFFFFFF : 0x485278, isActive ? 1.0 : 0.5);
      circle.strokeCircle(sx, indY, 24);

      const letter = this.add.text(sx, indY, st.key, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '27px',
        fontStyle: '800',
        color: isActive ? '#16163A' : '#FFFFFF'
      }).setOrigin(0.5).setResolution(2);

      const label = this.add.text(sx, indY + 38, st.name, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '20px',
        fontStyle: '700',
        color: isActive ? JEDA.CFG.COLOR.hex.calm : JEDA.CFG.COLOR.hex.muted
      }).setOrigin(0.5).setResolution(2);

      this.scenarioContainer.add([circle, letter, label]);
    });
  }

  /**
   * LANGKAH 1: S (Stop) - Tekan tombol Stop, orb membeku (PRD Bagian 5.4).
   */
  startStepS() {
    this.clearScenarioContainer();
    const cx = JEDA.CFG.W / 2;
    const cy = JEDA.CFG.H / 2 + 30;
    const cardW = 960; // Panel M (PRD 14.3)
    const cardH = 544; // Skala 8 px (68 * 8)

    const bg = this.add.graphics();
    // 100% Solid Base
    bg.fillStyle(0x0E1026, 1.0);
    bg.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    bg.fillStyle(0x16163A, 0.96);
    bg.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    bg.lineStyle(2, JEDA.CFG.COLOR.panelLine, 0.35);
    bg.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    this.scenarioContainer.add(bg);

    // Indikator STOP
    this.drawStepIndicator(cx, cy - cardH / 2 + 55, 'S');

    // Judul langkah
    const title = this.add.text(cx, cy - 80, 'Langkah S: Berhenti Sejenak', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '33px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    const desc = this.add.text(cx, cy - 35, 'Tahan diri dari dorongan untuk langsung mengetik atau membalas.', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
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
    let isHandled = false;
    const stopBtn = JEDA.UI.createButton(this, cx, cy + 180, 360, 88, 'Berhenti (STOP)', () => {
      if (isHandled) return;
      isHandled = true;

      // Orb membeku
      pulse.stop();
      orb.setScale(1.0);
      orb.core.setFillStyle(JEDA.CFG.COLOR.calm, 0.95);
      stopBtn.setEnabled(false);

      // Reaksi 3D Tabel 13.4: freeze(true) melambatkan semua gerak sekitar 90% selama 1 detik
      if (JEDA.Stage3D) {
        JEDA.Stage3D.freeze(true);
        this.time.delayedCall(1000, () => {
          if (JEDA.Stage3D) JEDA.Stage3D.freeze(false);
        });
      }

      if (window.JEDA && JEDA.Audio) JEDA.Audio.playStopBell();
      JEDA.UI.toast(this, 'Reaksi dibekukan. Kamu mengambil jeda.');
      this.time.delayedCall(700, () => {
        this.startStepT();
      });
    }, { primary: true, radius: 44, fontSize: 33 });

    this.scenarioContainer.add([title, desc, orb, stopBtn]);
  }

  /**
   * LANGKAH 2: T (Take a breath) - Satu siklus napas mini (PRD Bagian 5.4).
   */
  startStepT() {
    this.clearScenarioContainer();
    const cx = JEDA.CFG.W / 2;
    const cy = JEDA.CFG.H / 2 + 30;
    const cardW = 960; // Panel M (PRD 14.3)
    const cardH = 544; // Skala 8 px

    const bg = this.add.graphics();
    // 100% Solid Base
    bg.fillStyle(0x0E1026, 1.0);
    bg.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    bg.fillStyle(0x16163A, 0.96);
    bg.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    bg.lineStyle(2, JEDA.CFG.COLOR.panelLine, 0.35);
    bg.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    this.scenarioContainer.add(bg);

    this.drawStepIndicator(cx, cy - cardH / 2 + 55, 'T');

    const title = this.add.text(cx, cy - 80, 'Langkah T: Tarik Napas Bersama', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '33px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    const desc = this.add.text(cx, cy - 35, 'Tahan tombol, orb, atau tombol Spasi selama 4 detik.', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
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
      fontSize: '33px',
      fontStyle: '800',
      color: '#FFFFFF'
    }).setOrigin(0.5).setResolution(2).setDepth(20);

    const breathBtn = JEDA.UI.createButton(this, cx, cy + 180, 520, 88, 'Tahan untuk Tarik Napas (4 detik)', null, {
      primary: true,
      textColor: '#FFFFFF',
      fontSize: 27,
      radius: 44
    });

    let isHolding = false;
    let holdStart = 0;
    let breathDone = false;
    let countTimer = null;

    const cleanupStepT = () => {
      this.input.off('pointerup', onPointerUp);
      if (spaceKey) {
        spaceKey.off('down', startHold);
        spaceKey.off('up', onSpaceUp);
      }
      if (countTimer) countTimer.remove(false);
    };

    const onPointerUp = () => endHold(false);
    const onSpaceUp = () => endHold(false);

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
        cleanupStepT();
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
    breathBtn.on('pointerup', onPointerUp);
    orb.on('pointerdown', startHold);
    orb.on('pointerup', onPointerUp);
    this.input.on('pointerup', onPointerUp);

    // Dukungan tombol Spasi keyboard
    const spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    spaceKey.on('down', startHold);
    spaceKey.on('up', onSpaceUp);

    this.scenarioContainer.add([title, desc, orb, timerText, breathBtn]);
  }

  /**
   * LANGKAH 3: O (Observe) - Pilih emosi yang dirasakan (PRD Bagian 5.4 & 8.2).
   */
  startStepO() {
    this.clearScenarioContainer();
    const cx = JEDA.CFG.W / 2;
    const cy = JEDA.CFG.H / 2 + 30;
    const cardW = 960; // Panel M (PRD 14.3)
    const cardH = 544; // Skala 8 px
    const scenario = this.stopData.scenario;

    const bg = this.add.graphics();
    // 100% Solid Base
    bg.fillStyle(0x0E1026, 1.0);
    bg.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    bg.fillStyle(0x16163A, 0.96);
    bg.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    bg.lineStyle(2, JEDA.CFG.COLOR.panelLine, 0.35);
    bg.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    this.scenarioContainer.add(bg);

    this.drawStepIndicator(cx, cy - cardH / 2 + 55, 'O');

    const title = this.add.text(cx, cy - 80, 'Langkah O: Amati Emosimu', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '33px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    const desc = this.add.text(cx, cy - 35, 'Kenali apa yang kamu rasakan tanpa menghakiminya:', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted
    }).setOrigin(0.5).setResolution(2);

    this.scenarioContainer.add([title, desc]);

    // 4 Pilihan Emosi dari data.js (2 kunci + 2 pengecoh)
    const emotionOptions = Phaser.Utils.Array.Shuffle([...scenario.emotions]);
    const spacing = 200;
    const startX = cx - ((emotionOptions.length - 1) * spacing) / 2;
    const pillY = cy + 60;

    let isHandled = false;
    const pills = [];

    emotionOptions.forEach((emo, idx) => {
      const px = startX + idx * spacing;
      const pill = JEDA.UI.createButton(this, px, pillY, 192, 64, emo, () => {
        if (isHandled) return;
        isHandled = true;

        // Nonaktifkan klik berulang
        pills.forEach((p) => {
          if (p.disableInteractive) p.disableInteractive();
        });

        // Cek kecocokan emosi dengan kunci skenario (Observe = 100 jika cocok)
        const isMatch = scenario.keys.includes(emo);
        this.stopData.observedCorrect = isMatch;

        pill.bg.clear();
        pill.bg.fillStyle(isMatch ? JEDA.CFG.COLOR.calm : 0xFFD27A, 0.4);
        pill.bg.fillRoundedRect(-96, -32, 192, 64, 32);
        pill.bg.lineStyle(2, 0xFFFFFF, 0.8);
        pill.bg.strokeRoundedRect(-96, -32, 192, 64, 32);

        JEDA.UI.toast(this, isMatch ? 'Emosi teramati dengan tepat.' : 'Emosi tercatat.');
        this.time.delayedCall(700, () => {
          this.startStepP();
        });
      }, { fontSize: 27, radius: 32 });

      pills.push(pill);
      this.scenarioContainer.add(pill);
    });
  }

  /**
   * LANGKAH 4: P (Proceed) - Pilih 1 dari 3 respons sadar (PRD Bagian 5.4 & 8.2).
   */
  startStepP() {
    this.clearScenarioContainer();
    const cx = JEDA.CFG.W / 2;
    const cy = JEDA.CFG.H / 2 + 30;
    const cardW = 1200; // Panel L (PRD 14.3)
    const cardH = 584; // Skala 8 px
    const scenario = this.stopData.scenario;

    const bg = this.add.graphics();
    // 100% Solid Base
    bg.fillStyle(0x0E1026, 1.0);
    bg.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    bg.fillStyle(0x16163A, 0.96);
    bg.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    bg.lineStyle(2, JEDA.CFG.COLOR.panelLine, 0.35);
    bg.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    this.scenarioContainer.add(bg);

    this.drawStepIndicator(cx, cy - cardH / 2 + 50, 'P');

    const title = this.add.text(cx, cy - cardH / 2 + 105, 'Langkah P: Pilih Tindakan dengan Sadar', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '33px',
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
    const btnW = cardW - 128; // 1200 - 128 = 1072 px (Kelipatan 8, padding 64 px di kiri & kanan)
    const itemH = 88; // Kelipatan 8
    const spacingY = 104; // Kelipatan 8 (13 * 8)

    let isHandled = false;
    const buttons = [];

    responses.forEach((resp, idx) => {
      const ry = startY + idx * spacingY;
      const btn = JEDA.UI.createButton(this, cx, ry, btnW, itemH, resp.text, () => {
        if (isHandled) return;
        isHandled = true;

        // Beri highlight pada tombol yang dipilih & matikan interaksi tombol lainnya
        buttons.forEach((b) => {
          if (b.disableInteractive) b.disableInteractive();
        });

        const highlightColor = resp.score === 100 ? JEDA.CFG.COLOR.calm : (resp.score === 60 ? 0x6E85B7 : 0x884A5D);
        btn.bg.clear();
        btn.bg.fillStyle(0x0E1026, 1.0);
        btn.bg.fillRoundedRect(-btnW / 2, -itemH / 2, btnW, itemH, 24);
        btn.bg.fillStyle(highlightColor, 0.35);
        btn.bg.fillRoundedRect(-btnW / 2, -itemH / 2, btnW, itemH, 24);
        btn.bg.lineStyle(2, resp.score === 100 ? JEDA.CFG.COLOR.calm : (resp.score === 60 ? 0x93B5C6 : 0xFF8FA3), 0.9);
        btn.bg.strokeRoundedRect(-btnW / 2, -itemH / 2, btnW, itemH, 24);

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
      }, { fontSize: 24, radius: 24 });

      buttons.push(btn);
      this.scenarioContainer.add(btn);
    });
  }

  /**
   * Menyelesaikan Level 3 dan menampilkan ringkasan skor.
   */
  finishLevel() {
    // Hitung skor menggunakan fungsi murni JEDA.Score.calcL3 (Bagian 6 PRD)
    const result = JEDA.Score.calcL3(this.scenarioResults);

    const stopCount = this.scenarioResults.filter(r => r.choseStop).length;
    JEDA.State.session.l3StopCount = stopCount;
    JEDA.State.session.l3AllStop = (stopCount === (this.scenarios.length || 3));
    JEDA.State.session.l3Passed = result.passed;

    // Simpan progres jika lulus (skor >= 60)
    if (result.passed) {
      JEDA.State.saveLevelScore(3, result.score, result.stars);
      JEDA.State.data.fails.l3 = 0;
      if (JEDA.Stage3D) {
        JEDA.Stage3D.setLanterns(3); // Seluruh 3 lentera taman menyala!
        if (JEDA.Stage3D.celebratePass) {
          JEDA.Stage3D.celebratePass();
        }
      }
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
    this.clearScenarioContainer();
    const cx = JEDA.CFG.W / 2;
    const cy = JEDA.CFG.H / 2 + 20;

    const modal = this.add.container(cx, cy).setDepth(2000);
    const cardW = 960; // Panel M (PRD 14.3)
    const cardH = 624; // Skala 8 px (78 * 8)

    const bg = this.add.graphics();
    // 100% Solid Base
    bg.fillStyle(0x0E1026, 1.0);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 32);
    bg.fillStyle(0x16163A, 0.95);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 32);
    bg.lineStyle(2, result.passed ? JEDA.CFG.COLOR.calm : JEDA.CFG.COLOR.warn, 0.5);
    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 32);
    modal.add(bg);

    const titleStr = result.passed ? 'Level 3 Selesai: Jeda S.T.O.P.' : 'Perlu Latihan Lagi';
    const title = this.add.text(0, -cardH / 2 + 65, titleStr, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '44px',
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

      const valT = this.add.text(bx, rowY + 3, c.val, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '33px',
        fontStyle: '800',
        color: JEDA.CFG.COLOR.hex.text
      }).setOrigin(0.5).setResolution(2);

      const descT = this.add.text(bx, rowY + 36, c.desc, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '27px',
        fontStyle: '400',
        color: JEDA.CFG.COLOR.hex.muted
      }).setOrigin(0.5).setResolution(2);

      modal.add([bgg, nameT, valT, descT]);
    });

    const scoreText = this.add.text(0, rowY + 125, `Skor Akhir Level 3: ${result.score}`, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '33px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    modal.add([title, stars, scoreText]);

    // Tombol Tindakan Baku (Tinggi 88, sama lebar 300, aksi utama di kanan)
    const btnY = cardH / 2 - 76;
    const btnW = 300;
    const btnH = 88;
    const btnGap = 32;

    if (result.passed) {
      // Kiri: Aksi sekunder (Ulangi Level 3)
      const repeatBtn = JEDA.UI.createButton(this, -(btnW / 2 + btnGap / 2), btnY, btnW, btnH, 'Ulangi Level 3', () => {
        if (JEDA.Stage3D) {
          JEDA.Stage3D.setMode('l3');
          JEDA.Stage3D.setLanterns(2);
        }
        this.scene.restart();
      }, { radius: 44, fontSize: 33 });

      // Kanan: Aksi utama (Lihat Hasil Akhir)
      const nextBtn = JEDA.UI.createButton(this, (btnW / 2 + btnGap / 2), btnY, btnW, btnH, 'Lihat Hasil Akhir', () => {
        if (JEDA.Stage3D) JEDA.Stage3D.setMode('result');
        JEDA.FX.transitionTo(this, 'ResultScene');
      }, { primary: true, radius: 44, fontSize: 33 });

      modal.add([repeatBtn, nextBtn]);
    } else {
      // Kiri: Menu Utama
      const menuBtn = JEDA.UI.createButton(this, -(btnW / 2 + btnGap / 2), btnY, btnW, btnH, 'Menu Utama', () => {
        if (JEDA.Stage3D) JEDA.Stage3D.setMode('menu');
        JEDA.FX.transitionTo(this, 'CheckinScene');
      }, { radius: 44, fontSize: 33 });

      // Kanan: Ulangi Level 3
      const repeatBtn = JEDA.UI.createButton(this, (btnW / 2 + btnGap / 2), btnY, btnW, btnH, 'Ulangi Level 3', () => {
        if (JEDA.Stage3D) {
          JEDA.Stage3D.setMode('l3');
          JEDA.Stage3D.setLanterns(2);
        }
        this.scene.restart();
      }, { primary: true, radius: 44, fontSize: 33 });

      modal.add([menuBtn, repeatBtn]);
    }

    modal.setAlpha(0);
    this.tweens.add({ targets: modal, alpha: 1, duration: 300, ease: 'Sine.easeOut' });
  }
}

window.Level3Scene = Level3Scene;
