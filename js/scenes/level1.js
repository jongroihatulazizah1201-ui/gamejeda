/**
 * JEDA - Level1Scene (js/scenes/level1.js)
 * Layar 2: Latihan Napas (Napas Berkesadaran)
 * Fitur Utama:
 * - Orb 3 lapis dengan blend mode ADD
 * - Input tahan mouse atau tombol Spasi
 * - 6 siklus napas dengan indikator ketepatan (hijau, kuning, merah muda)
 * - BR-03: Notifikasi palsu yang mengurangi Ketahanan & membuat orb berkedip off
 * - BR-04: Tahan > 8s berhenti otomatis, tahan < 1s siklus diulang
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
    const W = JEDA.CFG.W;
    const H = JEDA.CFG.H;
    const cx = W / 2;
    const cy = H / 2;

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

    // 1. Latar Belakang & Vinyet
    JEDA.FX.createBackground(this);
    if (JEDA.Stage3D) {
      JEDA.Stage3D.setMode('l1');
      JEDA.Stage3D.setSync('good');
      JEDA.Stage3D.setBreath(0.2);
    }
    this.cameras.main.fadeIn(350);

    // 2. Tombol Navigasi Kiri Atas (Kembali ke Menu)
    this.createHeader(W);

    // 3. Panel Petunjuk & Status di atas Orb (Prinsip UI/UX: Kontras tinggi, terbaca jelas)
    const headerPill = this.add.graphics();
    headerPill.fillStyle(0x12142E, 0.92);
    headerPill.fillRoundedRect(cx - 450, cy - 288, 900, 104, 26);
    headerPill.lineStyle(2, 0x3F486E, 0.7);
    headerPill.strokeRoundedRect(cx - 450, cy - 288, 900, 104, 26);

    this.instructionText = this.add.text(cx, cy - 255, 'Tahan untuk menarik napas, lepas untuk menghembuskan.', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '26px',
      fontStyle: '700',
      color: '#FFFFFF'
    }).setOrigin(0.5).setResolution(2);

    // Teks Status Umpan Balik Cepat ("Tarik napas...", "Pas", dll)
    this.feedbackText = this.add.text(cx, cy - 208, 'Mulai dengan menekan dan menahan...', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '22px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.calm
    }).setOrigin(0.5).setResolution(2);

    // 4. Orb Tiga Lapis dengan Blend Mode ADD (Pusat di W/2, H/2)
    this.createGlowingOrb(cx, cy);

    // 5. Enam Titik Indikator Siklus di bawah Orb berlatar kapsul gelap
    const indPill = this.add.graphics();
    indPill.fillStyle(0x12142E, 0.92);
    indPill.fillRoundedRect(cx - 180, cy + 215, 360, 52, 26);
    indPill.lineStyle(2, 0x3F486E, 0.7);
    indPill.strokeRoundedRect(cx - 180, cy + 215, 360, 52, 26);

    this.createCycleIndicators(cx, cy + 241);

    // 6. Setup Sistem Input (Mouse & Tombol Spasi)
    this.setupInputListeners();

    // 7. Penjadwalan Notifikasi Palsu (BR-03)
    this.scheduleDistractions(W);

    // 8. Pengawas Idle (BR-06)
    if (JEDA.Guard && JEDA.Guard.startIdleMonitor) {
      JEDA.Guard.startIdleMonitor(this);
    }
  }

  /**
   * Membuat header navigasi dan indikator mode.
   */
  createHeader(W) {
    const backBtn = JEDA.UI.createButton(this, 140, 65, 180, 50, '← Menu', () => {
      if (JEDA.Stage3D) JEDA.Stage3D.setMode('menu');
      JEDA.FX.transitionTo(this, 'CheckinScene');
    }, { fontSize: 20, radius: 25 });

    const modeTitle = this.easyMode ? 'Level 1: Napas (Mode Ramah)' : 'Level 1: Napas';
    this.titleText = this.add.text(W / 2, 65, modeTitle, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '30px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);
  }

  /**
   * Membuat Orb 3 Lapis (inti, cincin dalam, cincin luar) dengan blend mode ADD.
   */
  createGlowingOrb(cx, cy) {
    this.orbContainer = this.add.container(cx, cy);
    const baseR = 85;

    // Cincin Luar (alpha 0.15)
    this.outerRing = this.add.circle(0, 0, baseR * 1.85, JEDA.CFG.COLOR.calm, 0.15)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Cincin Dalam (alpha 0.35)
    this.innerRing = this.add.circle(0, 0, baseR * 1.35, JEDA.CFG.COLOR.calm, 0.35)
      .setBlendMode(Phaser.BlendModes.ADD);

    // Inti Orb (alpha 0.85)
    this.coreCircle = this.add.circle(0, 0, baseR * 0.85, JEDA.CFG.COLOR.calm, 0.85)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.orbContainer.add([this.outerRing, this.innerRing, this.coreCircle]);

    // Jika Stage3D aktif, sembunyikan visual orb 2D (orb 3D Three.js tampil di belakang pada posisi yang sama)
    if (JEDA.CFG.USE_3D && JEDA.Stage3D && JEDA.Stage3D.isActive()) {
      this.orbContainer.setAlpha(0);
    }

    // Animasi idle berdenyut pelan saat menunggu input
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
   * Membuat 6 titik lingkaran indikator siklus di bawah orb.
   */
  createCycleIndicators(cx, y) {
    this.indicators = [];
    const spacing = 48;
    const startX = cx - ((this.totalCycles - 1) * spacing) / 2;

    for (let i = 0; i < this.totalCycles; i++) {
      const ix = startX + i * spacing;
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
      // Abaikan bila mengklik kartu notifikasi atau elemen UI lain
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

    // Pastikan jika pointer dilepas di luar jendela atau canvas, tahanan tetap dilepas
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
    if (this.isFinished || this.isHolding) return;

    // Jika sedang dalam fase pelepasan siklus sebelumnya, evaluasi durasi lepas siklus lalu
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

    // Hentikan denyut idle dan bersihkan animasi orb sebelumnya
    if (this.idlePulse) this.idlePulse.pause();
    this.tweens.killTweensOf(this.orbContainer);

    // Update teks status
    this.feedbackText.setText(`Siklus ${this.currentCycle}/6: Tarik napas...`);
    this.feedbackText.setColor(JEDA.CFG.COLOR.hex.text);

    // Update indikator siklus aktif
    const ind = this.indicators[this.currentCycle - 1];
    if (ind) this.drawIndicatorDot(ind.g, ind.x, ind.y, 'active');

    // Animasi orb mengembang selama ditahan (menuju skala 1.75)
    this.orbContainer.setScale(1.0);
    this.holdTween = this.tweens.add({
      targets: this.orbContainer,
      scaleX: 1.75,
      scaleY: 1.75,
      duration: this.inMs,
      ease: 'Sine.easeInOut'
    });

    // BR-04: Tahan > 8 s dihentikan otomatis (menggunakan delayedCall agar tersinkronisasi saat jeda/pause)
    if (this.maxHoldTimer) this.maxHoldTimer.remove(false);
    this.maxHoldTimer = this.time.delayedCall(this.holdMaxMs, () => {
      if (this.isHolding) {
        JEDA.UI.toast(this, 'Pelepasan otomatis (batas 8 detik). Hembuskan napasmu.');
        this.handleActionEnd(true);
      }
    });
  }

  /**
   * Pemain melepas tahanan (hembuskan napas).
   */
  handleActionEnd(isForced = false) {
    if (!this.isHolding || this.isFinished) return;
    if (this.maxHoldTimer) this.maxHoldTimer.remove(false);
    this.isHolding = false;

    const holdDuration = Date.now() - this.holdStartTime;

    // BR-04: Tahan < 1 s tidak dihitung dan siklus diulang
    if (holdDuration < this.holdMinMs && !isForced) {
      this.state = 'WAITING_HOLD';
      this.feedbackText.setText('Tahan sedikit lebih lama (minimal 1 detik). Mari ulangi.');
      this.feedbackText.setColor(JEDA.CFG.COLOR.hex.warn);

      if (JEDA.Stage3D) {
        JEDA.Stage3D.setSync('warn');
        JEDA.Stage3D.setBreath(0.1);
      }

      // Kembalikan orb ke ukuran normal
      this.tweens.killTweensOf(this.orbContainer);
      this.tweens.add({
        targets: this.orbContainer,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 400,
        ease: 'Sine.easeOut',
        onComplete: () => {
          if (this.idlePulse && !this.isHolding) this.idlePulse.resume();
        }
      });
      return;
    }

    // Tahanan valid, masuki fase RELEASING
    this.state = 'RELEASING';
    this.currentHoldDuration = holdDuration;
    this.releaseStartTime = Date.now();

    this.feedbackText.setText(`Siklus ${this.currentCycle}/6: Hembuskan napas perlahan...`);
    this.feedbackText.setColor(JEDA.CFG.COLOR.hex.muted);

    // Animasi orb mengecil kembali ke skala 1.0 selama outMs
    this.tweens.killTweensOf(this.orbContainer);
    this.releaseTween = this.tweens.add({
      targets: this.orbContainer,
      scaleX: 1.0,
      scaleY: 1.0,
      duration: this.outMs,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        // Jika pemain tidak kunjung menahan untuk siklus berikutnya dalam durasi wajar
        if (this.currentCycle === this.totalCycles && this.state === 'RELEASING') {
          // Siklus terakhir otomatis difinalisasi saat hembusan selesai
          const releaseDuration = Date.now() - this.releaseStartTime;
          this.finalizePreviousCycle(releaseDuration);
        } else {
          this.feedbackText.setText('Siap untuk tarikan napas berikutnya...');
        }
      }
    });
  }

  /**
   * Finalisasi data satu siklus (lama tahan & lama lepas).
   */
  finalizePreviousCycle(releaseDuration) {
    if (this.currentCycle > this.totalCycles) return;

    const cycleData = {
      holdMs: this.currentHoldDuration,
      releaseMs: releaseDuration,
      targetIn: this.inMs,
      targetOut: this.outMs,
      tolFull: this.tolFull,
      tolHalf: this.tolHalf
    };

    this.completedCycles.push(cycleData);

    // Evaluasi skor siklus ini untuk umpan balik
    const sIn = JEDA.Score.evalMeasure(cycleData.holdMs, cycleData.targetIn, cycleData.tolFull, cycleData.tolHalf);
    const sOut = JEDA.Score.evalMeasure(cycleData.releaseMs, cycleData.targetOut, cycleData.tolFull, cycleData.tolHalf);
    const cycleScore = (sIn + sOut) / 2;

    // Perbarui titik indikator
    const ind = this.indicators[this.currentCycle - 1];
    let dotColor = JEDA.CFG.COLOR.off;
    let feedbackWord = 'Kembali ke napas';
    let wordColor = JEDA.CFG.COLOR.hex.off;

    if (cycleScore >= 0.75) {
      dotColor = JEDA.CFG.COLOR.calm;
      feedbackWord = 'Pas';
      wordColor = JEDA.CFG.COLOR.hex.calm;
      if (JEDA.Stage3D) {
        JEDA.Stage3D.setSync('good');
        JEDA.Stage3D.pulse(0.6);
        if (JEDA.Stage3D.triggerBreathRing) {
          JEDA.Stage3D.triggerBreathRing();
        }
      }
    } else if (cycleScore >= 0.5) {
      dotColor = JEDA.CFG.COLOR.warn;
      feedbackWord = 'Sedikit meleset';
      wordColor = JEDA.CFG.COLOR.hex.warn;
      if (JEDA.Stage3D) {
        JEDA.Stage3D.setSync('warn');
        JEDA.Stage3D.pulse(0.4);
      }
    } else {
      if (JEDA.Stage3D) {
        JEDA.Stage3D.setSync('off');
        JEDA.Stage3D.pulse(0.3);
      }
    }

    if (ind) this.drawIndicatorDot(ind.g, ind.x, ind.y, 'filled', dotColor);

    this.feedbackText.setText(feedbackWord);
    this.feedbackText.setColor(wordColor);

    this.currentCycle++;

    // Jika seluruh siklus selesai
    if (this.completedCycles.length >= this.totalCycles) {
      this.finishLevel();
    }
  }

  /**
   * Menjadwalkan kemunculan notifikasi palsu (BR-03).
   */
  scheduleDistractions(W) {
    const distractMessages = [
      'Grup Kelas: PING!',
      'Diskon 50% hari ini!',
      'Kamu punya 12 pesan baru',
      'Info Terkini: Jangan lupa tugas!'
    ];

    // Munculkan notifikasi palsu di detik ke-6, ke-18, ke-30, ke-44
    const times = [6000, 18000, 30000, 44000];

    times.forEach((ms, idx) => {
      this.time.delayedCall(ms, () => {
        if (!this.isFinished) {
          this.spawnDistractionCard(W, distractMessages[idx % distractMessages.length]);
        }
      });
    });
  }

  /**
   * Memunculkan satu kartu notifikasi palsu dari tepi kanan (BR-03).
   */
  spawnDistractionCard(W, message) {
    const cardW = 380;
    const cardH = 80;
    const startX = W + 220;
    const targetX = W - 220;
    const targetY = 190;

    const container = this.add.container(startX, targetY).setDepth(500);

    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a3a, 0.92);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);
    bg.lineStyle(2, JEDA.CFG.COLOR.warn, 0.5);
    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);

    const icon = this.add.text(-cardW / 2 + 25, 0, '🔔', { fontSize: '26px' }).setOrigin(0, 0.5);
    const text = this.add.text(-cardW / 2 + 65, 0, message, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '20px',
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

    // Efek jika diklik (BR-03)
    container.on('pointerdown', (pointer) => {
      pointer.event.stopPropagation();
      this.handleDistractionClicked(container);
    });

    // Animasi masuk dari kanan
    this.tweens.add({
      targets: container,
      x: targetX,
      duration: 400,
      ease: 'Sine.easeOut',
      onComplete: () => {
        // Bertahan selama distractLife (5 detik)
        this.time.delayedCall(JEDA.CFG.L1.distractLife || 5000, () => {
          if (container.active) {
            this.tweens.add({
              targets: container,
              x: startX,
              alpha: 0,
              duration: 350,
              ease: 'Sine.easeIn',
              onComplete: () => container.destroy()
            });
          }
        });
      }
    });
  }

  /**
   * Menangani pemain mengklik notifikasi palsu (BR-03).
   */
  handleDistractionClicked(container) {
    container.destroy();
    this.distractHits++;

    // 1. Tampilkan toast peringatan BR-03
    JEDA.UI.toast(this, 'Perhatianmu tadi pergi. Kembali ke napas.');

    // 2. Orb berkedip warna 'off' (#FF8FA3) dan meredup 0,5 detik (Tabel 13.4)
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

  /**
   * Membuat orb berkedip warna 'off' (#FF8FA3) saat terjadi distraksi (BR-03).
   */
  flashOrbOff() {
    const offColor = JEDA.CFG.COLOR.off;
    const calmColor = JEDA.CFG.COLOR.calm;

    this.outerRing.setFillStyle(offColor, 0.35);
    this.innerRing.setFillStyle(offColor, 0.6);
    this.coreCircle.setFillStyle(offColor, 0.95);

    this.time.delayedCall(500, () => {
      if (this.outerRing && this.innerRing && this.coreCircle) {
        this.outerRing.setFillStyle(calmColor, 0.15);
        this.innerRing.setFillStyle(calmColor, 0.35);
        this.coreCircle.setFillStyle(calmColor, 0.85);
      }
    });
  }

  /**
   * Menyelesaikan Level 1 dan menampilkan ringkasan skor.
   */
  finishLevel() {
    if (this.isFinished) return;
    this.isFinished = true;

    if (JEDA.Stage3D) {
      JEDA.Stage3D.setBreath(0.35);
      JEDA.Stage3D.pulse(0.7);
    }

    // Kalkulasi skor menggunakan fungsi murni JEDA.Score.calcL1
    const result = JEDA.Score.calcL1(this.completedCycles, this.distractHits);

    // Simpan progres jika lulus
    if (result.passed) {
      JEDA.State.saveLevelScore(1, result.score, result.stars);
      JEDA.State.data.fails.l1 = 0;
      if (JEDA.Stage3D) {
        JEDA.Stage3D.setLanterns(1); // Lentera pulau 1 menyala
        if (JEDA.Stage3D.celebratePass) {
          JEDA.Stage3D.celebratePass();
        }
      }
    } else {
      JEDA.State.data.fails.l1 = (JEDA.State.data.fails.l1 || 0) + 1;
    }
    JEDA.State.session.levelScores.l1 = result.score;
    JEDA.State.save();

    // Tawaran Mode Ramah jika gagal 3 kali berturut-turut (BR-07)
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

    // Tampilkan panel ringkasan
    this.time.delayedCall(800, () => {
      this.showResultSummary(result);
    });
  }

  /**
   * Menampilkan panel kaca ringkasan hasil skor Level 1.
   */
  showResultSummary(result) {
    const W = JEDA.CFG.W;
    const H = JEDA.CFG.H;
    const cx = W / 2;
    const cy = H / 2;

    const modal = this.add.container(cx, cy).setDepth(2000);

    const cardW = 900;
    const cardH = 620;

    const bg = this.add.graphics();
    bg.fillStyle(0x16163A, 0.95);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 32);
    bg.lineStyle(2, result.passed ? JEDA.CFG.COLOR.calm : JEDA.CFG.COLOR.warn, 0.5);
    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 32);
    modal.add(bg);

    // Judul
    const titleStr = result.passed ? 'Latihan Napas Selesai' : 'Perlu Latihan Lagi';
    const title = this.add.text(0, -cardH / 2 + 65, titleStr, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '40px',
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

    // Komponen Skor
    const rowY = -cardH / 2 + 220;
    const compBoxW = 230;
    const compBoxH = 120;
    const comps = [
      { name: 'Sinkron', val: `${result.sinkron}%`, desc: 'Kesesuaian Ritme' },
      { name: 'Ketahanan', val: `${result.ketahanan}%`, desc: `${this.distractHits} Distraksi` },
      { name: 'Konsisten', val: `${result.konsisten}%`, desc: 'Rangkaian Terbaik' }
    ];

    comps.forEach((c, idx) => {
      const bx = (idx - 1) * 260;
      const bgg = this.add.graphics();
      bgg.fillStyle(0x1A1D40, 0.95);
      bgg.fillRoundedRect(bx - compBoxW / 2, rowY - compBoxH / 2, compBoxW, compBoxH, 16);
      bgg.lineStyle(1.5, 0x485278, 0.7);
      bgg.strokeRoundedRect(bx - compBoxW / 2, rowY - compBoxH / 2, compBoxW, compBoxH, 16);

      const nameT = this.add.text(bx, rowY - 32, c.name, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '20px',
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

    // Total Skor
    const scoreText = this.add.text(0, rowY + 125, `Skor Akhir Level 1: ${result.score}`, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '32px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    modal.add([title, stars, scoreText]);

    // Tombol Tindakan
    const btnY = cardH / 2 - 80;
    if (result.passed) {
      const nextBtn = JEDA.UI.createButton(this, 170, btnY, 280, 60, 'Lanjut ke Level 2', () => {
        if (JEDA.Stage3D) JEDA.Stage3D.setMode('l2');
        JEDA.FX.transitionTo(this, 'Level2Scene');
      }, { primary: true, radius: 30 });

      const repeatBtn = JEDA.UI.createButton(this, -170, btnY, 280, 60, 'Ulangi Latihan', () => {
        if (JEDA.Stage3D) {
          JEDA.Stage3D.setMode('l1');
          JEDA.Stage3D.setSync('good');
        }
        this.scene.restart();
      }, { radius: 30 });

      modal.add([nextBtn, repeatBtn]);
    } else {
      const repeatBtn = JEDA.UI.createButton(this, 150, btnY, 260, 60, 'Ulangi Latihan', () => {
        if (JEDA.Stage3D) {
          JEDA.Stage3D.setMode('l1');
          JEDA.Stage3D.setSync('good');
        }
        this.scene.restart();
      }, { primary: true, radius: 30 });

      const menuBtn = JEDA.UI.createButton(this, -150, btnY, 260, 60, 'Menu Utama', () => {
        if (JEDA.Stage3D) JEDA.Stage3D.setMode('menu');
        JEDA.FX.transitionTo(this, 'CheckinScene');
      }, { radius: 30 });

      modal.add([repeatBtn, menuBtn]);
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
      // Tarik napas: skala 3D membesar mengikuti durasi hold relatif terhadap target inMs
      const elapsed = Date.now() - this.holdStartTime;
      const t = Math.min(1.0, elapsed / this.inMs);
      JEDA.Stage3D.setBreath(t);
    } else if (this.state === 'RELEASING' && this.releaseStartTime > 0) {
      // Hembuskan napas: skala 3D mengecil kembali mengikuti durasi outMs
      const elapsed = Date.now() - this.releaseStartTime;
      const t = Math.max(0.0, 1.0 - (elapsed / this.outMs));
      JEDA.Stage3D.setBreath(t);
    } else if (this.state === 'WAITING_HOLD') {
      // Denyut napas santai (idle)
      const idleT = 0.18 + Math.sin(time * 0.0025) * 0.07;
      JEDA.Stage3D.setBreath(idleT);
    }
  }
}

window.Level1Scene = Level1Scene;
