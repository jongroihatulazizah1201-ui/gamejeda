/**
 * JEDA - ResultScene (js/scenes/result.js)
 * Layar 5: Hasil Akhir dan Refleksi Sesi Mindfulness
 * Fitur Utama:
 * - Skor tiap level dan skor akhir terbobot (0.25 L1 + 0.30 L2 + 0.45 L3)
 * - Animasi bintang bertahap (stagger animation)
 * - Penanda Mode Ramah pada skor (BR-07)
 * - Perbandingan Check-in Awal vs Akhir (BR-10): jika akhir < awal,
 *   tampilkan "Perasaan bisa naik turun. Mengamatinya sudah bagian dari latihan."
 * - Pengingat istirahat bila runsToday >= 3 (BR-11)
 * - Tombol Main Lagi dan Menu Utama
 */
class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' });
  }

  create() {
    const W = JEDA.CFG.W;
    const H = JEDA.CFG.H;
    const cx = W / 2;

    // 1. Catat jumlah run hari ini (BR-11)
    this.updateDailyRuns();

    // 2. Ambil skor tiap level dari sesi atau skor terbaik
    this.l1Score = JEDA.State.session.levelScores.l1 || JEDA.State.data.best.l1 || 0;
    this.l2Score = JEDA.State.session.levelScores.l2 || JEDA.State.data.best.l2 || 0;
    this.l3Score = JEDA.State.session.levelScores.l3 || JEDA.State.data.best.l3 || 0;

    // Kalkulasi skor akhir terbobot (PRD Bagian 6)
    this.finalResult = JEDA.Score.calcFinal(this.l1Score, this.l2Score, this.l3Score);

    // 3. Latar Belakang & Vinyet
    JEDA.FX.createBackground(this);
    if (JEDA.Stage3D) {
      JEDA.Stage3D.setMode('result');
      let passedCount = 0;
      if ((JEDA.State.data.stars.l1 || 0) > 0 || (JEDA.State.data.best.l1 || 0) >= JEDA.CFG.PASS) passedCount++;
      if ((JEDA.State.data.stars.l2 || 0) > 0 || (JEDA.State.data.best.l2 || 0) >= JEDA.CFG.PASS) passedCount++;
      if ((JEDA.State.data.stars.l3 || 0) > 0 || (JEDA.State.data.best.l3 || 0) >= JEDA.CFG.PASS) passedCount++;
      JEDA.Stage3D.setLanterns(passedCount);
    }
    this.cameras.main.fadeIn(350);

    // 4. Header
    this.createHeader(cx);

    // 5. Panel Ringkasan Skor Akhir & Bintang
    this.createFinalScoreCard(cx, 260);

    // 6. Kartu Rincian 3 Level (Horizontal)
    this.createLevelBreakdownCards(cx, 460);

    // 7. Perbandingan Check-in Awal vs Akhir (BR-10)
    this.createCheckinComparison(cx, 670);

    // 8. Pengingat Istirahat jika runsToday >= 3 (BR-11)
    if (JEDA.State.data.runs.count >= (JEDA.CFG.RUNS_PER_DAY_NOTE || 3)) {
      this.createRestReminder(cx, 850);
    }

    // 9. Tombol Navigasi Bawah (Main Lagi & Menu)
    this.createActionButtons(cx, H - 90);
  }

  /**
   * Mengelola penghitungan run harian untuk BR-11.
   */
  updateDailyRuns() {
    const today = new Date().toISOString().split('T')[0];
    if (JEDA.State.data.runs && JEDA.State.data.runs.date === today) {
      JEDA.State.data.runs.count = (JEDA.State.data.runs.count || 0) + 1;
    } else {
      JEDA.State.data.runs = { date: today, count: 1 };
    }
    JEDA.State.save();
  }

  /**
   * Membuat header layar hasil.
   */
  createHeader(cx) {
    this.add.text(cx, 65, 'Hasil Latihan JEDA', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '38px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    this.add.text(cx, 105, 'Refleksi dan Evaluasi Sesi Mindfulness', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '20px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted
    }).setOrigin(0.5).setResolution(2);
  }

  /**
   * Panel skor akhir terbobot dan animasi bintang.
   */
  createFinalScoreCard(cx, y) {
    const cardW = 900;
    const cardH = 210;

    const bg = this.add.graphics();
    bg.fillStyle(0x16163A, 0.95);
    bg.fillRoundedRect(cx - cardW / 2, y - cardH / 2, cardW, cardH, 28);
    bg.lineStyle(2, this.finalResult.passed ? JEDA.CFG.COLOR.calm : JEDA.CFG.COLOR.warn, 0.5);
    bg.strokeRoundedRect(cx - cardW / 2, y - cardH / 2, cardW, cardH, 28);

    const title = this.add.text(cx, y - 60, `Skor Akhir: ${this.finalResult.score}`, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '44px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    const weightFormula = '(Bobot: 25% Napas + 30% Awan Pikiran + 45% Jeda S.T.O.P.)';
    this.add.text(cx, y - 15, weightFormula, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '18px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted
    }).setOrigin(0.5).setResolution(2);

    // Animasi Bintang (muncul satu per satu sesuai PRD Bagian 5.5)
    const starTotal = this.finalResult.stars;
    const starContainer = this.add.container(cx, y + 40);

    for (let i = 0; i < 3; i++) {
      const isGold = (i < starTotal);
      const starChar = isGold ? '★' : '☆';
      const color = isGold ? JEDA.CFG.COLOR.hex.warn : JEDA.CFG.COLOR.hex.muted;

      const star = this.add.text((i - 1) * 55, 0, starChar, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '48px',
        fontStyle: '800',
        color: color
      }).setOrigin(0.5).setResolution(2).setScale(0);

      starContainer.add(star);

      // Muncul satu per satu
      this.tweens.add({
        targets: star,
        scaleX: 1.0,
        scaleY: 1.0,
        delay: 400 + i * 250,
        duration: 350,
        ease: 'Back.easeOut'
      });
    }
  }

  /**
   * Tiga kartu rincian skor level (Horizontal).
   */
  createLevelBreakdownCards(cx, y) {
    const cardW = 280;
    const cardH = 135;
    const spacing = 310;

    const levelDetails = [
      { name: 'Level 1: Napas', score: this.l1Score, easy: JEDA.State.data.easy.l1 },
      { name: 'Level 2: Awan Pikiran', score: this.l2Score, easy: JEDA.State.data.easy.l2 },
      { name: 'Level 3: Jeda S.T.O.P.', score: this.l3Score, easy: JEDA.State.data.easy.l3 }
    ];

    levelDetails.forEach((lvl, idx) => {
      const bx = cx + (idx - 1) * spacing;
      const bg = this.add.graphics();
      bg.fillStyle(0xFFFFFF, 0.08);
      bg.fillRoundedRect(bx - cardW / 2, y - cardH / 2, cardW, cardH, 20);
      bg.lineStyle(1.5, JEDA.CFG.COLOR.panelLine, 0.25);
      bg.strokeRoundedRect(bx - cardW / 2, y - cardH / 2, cardW, cardH, 20);

      const title = this.add.text(bx, y - 36, lvl.name, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '20px',
        fontStyle: '800',
        color: JEDA.CFG.COLOR.hex.text
      }).setOrigin(0.5).setResolution(2);

      const scoreT = this.add.text(bx, y + 2, `${lvl.score} Poin`, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '28px',
        fontStyle: '800',
        color: JEDA.CFG.COLOR.hex.calm
      }).setOrigin(0.5).setResolution(2);

      // Bintang level
      const starsCount = JEDA.Score.calcStars(lvl.score);
      const starStr = '★'.repeat(starsCount) + '☆'.repeat(3 - starsCount);
      const starT = this.add.text(bx, y + 36, starStr, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '18px',
        fontStyle: '600',
        color: JEDA.CFG.COLOR.hex.warn
      }).setOrigin(0.5).setResolution(2);

      // Penanda Mode Ramah (BR-07)
      if (lvl.easy) {
        const badge = this.add.text(bx + cardW / 2 - 20, y - cardH / 2 + 15, 'Mode Ramah', {
          fontFamily: JEDA.CFG.FONT.family,
          fontSize: '13px',
          fontStyle: '600',
          color: JEDA.CFG.COLOR.hex.calm
        }).setOrigin(1, 0.5).setResolution(2);
      }
    });
  }

  /**
   * Perbandingan Check-in Awal vs Akhir (PRD 5.5 & BR-10).
   */
  createCheckinComparison(cx, y) {
    const cardW = 900;
    const cardH = 220;

    const bg = this.add.graphics();
    bg.fillStyle(0x16163A, 0.95);
    bg.fillRoundedRect(cx - cardW / 2, y - cardH / 2, cardW, cardH, 28);
    bg.lineStyle(2, JEDA.CFG.COLOR.panelLine, 0.3);
    bg.strokeRoundedRect(cx - cardW / 2, y - cardH / 2, cardW, cardH, 28);

    const startScore = JEDA.State.session.checkinStart || 3;
    const startLabel = JEDA.State.session.checkinLabel || 'Netral';

    const info = `Check-in Awal: ${startScore}/5 (${startLabel})`;
    this.add.text(cx, y - 65, info, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '20px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted
    }).setOrigin(0.5).setResolution(2);

    const question = 'Bagaimana perasaanmu sekarang setelah latihan?';
    this.add.text(cx, y - 28, question, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '22px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    // 5 Tombol Bulat untuk skor akhir (1 sampai 5)
    const btnY = y + 25;
    const spacing = 110;
    this.endScoreButtons = [];

    // Teks refleksi (BR-10)
    this.reflectionText = this.add.text(cx, y + 80, 'Pilih perasaanmu sekarang untuk melihat refleksi.', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '18px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted,
      align: 'center'
    }).setOrigin(0.5).setResolution(2);

    for (let val = 1; val <= 5; val++) {
      const bx = cx + (val - 3) * spacing;
      const btn = this.createCircularEndButton(bx, btnY, val, (selectedVal) => {
        this.evaluateReflection(startScore, selectedVal);
      });
      this.endScoreButtons.push(btn);
    }
  }

  /**
   * Membuat tombol bulat untuk check-in akhir.
   */
  createCircularEndButton(x, y, value, onSelect) {
    const container = this.add.container(x, y);
    const radius = 24;

    const bg = this.add.graphics();
    const drawBg = (selected) => {
      bg.clear();
      bg.fillStyle(selected ? JEDA.CFG.COLOR.calm : JEDA.CFG.COLOR.panel, selected ? 0.9 : 0.08);
      bg.fillCircle(0, 0, radius);
      bg.lineStyle(2, selected ? 0xFFFFFF : JEDA.CFG.COLOR.panelLine, selected ? 0.9 : 0.25);
      bg.strokeCircle(0, 0, radius);
    };
    drawBg(false);

    const numText = this.add.text(0, 0, String(value), {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '22px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    container.add([bg, numText]);
    container.setSize(radius * 2, radius * 2);
    container.setInteractive({
      hitArea: new Phaser.Geom.Circle(0, 0, radius),
      hitAreaCallback: Phaser.Geom.Circle.Contains,
      useHandCursor: true
    });

    container.on('pointerup', () => {
      this.endScoreButtons.forEach(b => {
        b.drawBg(b.val === value);
        b.numText.setColor(b.val === value ? JEDA.CFG.COLOR.hex.bgTop : JEDA.CFG.COLOR.hex.text);
      });
      onSelect(value);
    });

    container.val = value;
    container.drawBg = drawBg;
    container.numText = numText;
    return container;
  }

  /**
   * Evaluasi refleksi perbandingan check-in awal vs akhir (BR-10).
   * KETENTUAN KHUSUS BR-10:
   * "Check-in akhir < awal: 'Perasaan bisa naik turun. Mengamatinya sudah bagian dari latihan.' Tidak ada klaim berhasil"
   */
  evaluateReflection(startScore, endScore) {
    let message = '';
    let color = JEDA.CFG.COLOR.hex.text;

    if (endScore < startScore) {
      // Wajib sesuai teks persis BR-10 tanpa klaim berhasil
      message = 'Perasaan bisa naik turun. Mengamatinya sudah bagian dari latihan.';
      color = JEDA.CFG.COLOR.hex.warn;
    } else if (endScore > startScore) {
      message = 'Perasaanmu terasa lebih tenang dan ringan. Sadari ruang damai yang baru saja kamu ciptakan.';
      color = JEDA.CFG.COLOR.hex.calm;
    } else {
      message = 'Menerima perasaan apa adanya tanpa syarat adalah inti dari latihan berkesadaran.';
      color = JEDA.CFG.COLOR.hex.text;
    }

    this.reflectionText.setText(message);
    this.reflectionText.setColor(color);
    this.tweens.add({
      targets: this.reflectionText,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 150,
      yoyo: true
    });
  }

  /**
   * Menampilkan Pengingat Istirahat jika runsToday >= 3 (BR-11).
   */
  createRestReminder(cx, y) {
    const cardW = 900;
    const cardH = 50;

    const bg = this.add.graphics();
    bg.fillStyle(0x2B4C7E, 0.4);
    bg.fillRoundedRect(cx - cardW / 2, y - cardH / 2, cardW, cardH, 16);
    bg.lineStyle(1.5, JEDA.CFG.COLOR.warn, 0.5);
    bg.strokeRoundedRect(cx - cardW / 2, y - cardH / 2, cardW, cardH, 16);

    const icon = '☕';
    const msg = `${icon} Pengingat Istirahat (BR-11): Kamu telah menyelesaikan 3+ sesi latihan hari ini. Luangkan waktu untuk mengistirahatkan mata dan pikiran sejenak.`;
    this.add.text(cx, y, msg, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '18px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.warn
    }).setOrigin(0.5).setResolution(2);
  }

  /**
   * Tombol navigasi aksi akhir (Main Lagi & Menu Utama).
   */
  createActionButtons(cx, y) {
    // Tombol Main Lagi
    JEDA.UI.createButton(this, cx - 170, y, 280, 60, 'Main Lagi', () => {
      // Reset state sementara sesi berjalan
      JEDA.State.session = {
        checkinStart: 0,
        checkinLabel: '',
        levelScores: { l1: 0, l2: 0, l3: 0 },
        distractHits: 0,
        panicHits: 0
      };
      if (JEDA.Stage3D) JEDA.Stage3D.setMode('menu');
      JEDA.FX.transitionTo(this, 'CheckinScene');
    }, { primary: true, radius: 30 });

    // Tombol Menu Utama
    JEDA.UI.createButton(this, cx + 170, y, 280, 60, 'Menu Utama', () => {
      if (JEDA.Stage3D) JEDA.Stage3D.setMode('menu');
      JEDA.FX.transitionTo(this, 'CheckinScene');
    }, { radius: 30 });
  }
}

window.ResultScene = ResultScene;
