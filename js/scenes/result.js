/**
 * JEDA - ResultScene (js/scenes/result.js)
 * Layar 5: Hasil Akhir dan Refleksi Sesi Mindfulness
 * 
 * Sepenuhnya patuh pada PRD Bagian 14.3 sampai 14.5:
 * - Skor akhir di tengah, tiga bintang (rowCenter)
 * - Tiga kartu skor level sama lebar menggunakan rowCenter
 * - Lima slot lencana (rowCenter)
 * - Perbandingan check-in awal vs akhir (BR-10)
 * - Tombol Main Lagi dan Menu Utama sama lebar 280, tinggi 88, aksi utama di kanan (Prinsip 6)
 */
class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' });
  }

  create() {
    const Layout = JEDA.Layout;
    const cx = Layout.cx();

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

    // 4. Header di Zona Header (y: 0 - 100 px)
    this.createHeader(cx);

    // 5. Panel Ringkasan Skor Akhir & Bintang (y = 175)
    this.createFinalScoreCard(cx, 175);

    // 6. Kartu Rincian 3 Level (Horizontal, y = 320)
    this.createLevelBreakdownCards(cx, 320);

    // 7. Perbandingan Check-in Awal vs Akhir (BR-10, y = 465)
    this.createCheckinComparison(cx, 465);

    // 8. Lima Slot Lencana (PRD 14.5: rowCenter, y = 600)
    this.createBadgeSlots(cx, 600);

    // 9. Pemilih Tema Visual Tiga Kartu Pratinjau (PRD 15.3, y = 745)
    this.createThemeSelector(cx, 745);

    // 10. Pengingat Istirahat jika runsToday >= 3 (BR-11, y = 865)
    if (JEDA.State.data.runs.count >= (JEDA.CFG.RUNS_PER_DAY_NOTE || 3)) {
      this.createRestReminder(cx, 865);
    }

    // 11. Tombol Navigasi Bawah di Zona Aksi (y = 960)
    this.createActionButtons(cx, 960);

    // 12. Pasang listener tombol debug grid 'G'
    Layout.attachDebugKeyListener(this);
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
   * Membuat header layar hasil di Zona Header.
   */
  createHeader(cx) {
    this.add.text(cx, 44, 'Hasil Latihan JEDA', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '44px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    this.add.text(cx, 80, 'Refleksi dan Evaluasi Sesi Mindfulness', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted
    }).setOrigin(0.5).setResolution(2);
  }

  /**
   * Panel skor akhir terbobot dan animasi bintang (PRD 14.5: rowCenter).
   */
  createFinalScoreCard(cx, y) {
    const Layout = JEDA.Layout;
    const cardW = Layout.panelSize.M; // 960 px
    const cardH = 140;

    const bg = this.add.graphics();
    bg.fillStyle(0x16163A, 0.95);
    bg.fillRoundedRect(cx - cardW / 2, y - cardH / 2, cardW, cardH, 24);
    bg.lineStyle(2, this.finalResult.passed ? JEDA.CFG.COLOR.calm : JEDA.CFG.COLOR.warn, 0.5);
    bg.strokeRoundedRect(cx - cardW / 2, y - cardH / 2, cardW, cardH, 24);

    this.add.text(cx, y - 36, `Skor Akhir: ${this.finalResult.score}`, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '44px',
      fontStyle: '800',
      color: '#FFFFFF'
    }).setOrigin(0.5).setResolution(2);

    const weightFormula = '(Bobot: 25% Napas + 30% Awan Pikiran + 45% Jeda S.T.O.P.)';
    this.add.text(cx, y - 2, weightFormula, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted
    }).setOrigin(0.5).setResolution(2);

    // Tiga Bintang (PRD 14.5: rowCenter([44, 44, 44], 24))
    const starWidths = [44, 44, 44];
    const starXs = Layout.rowCenter(starWidths, 24);
    const starTotal = this.finalResult.stars;

    for (let i = 0; i < 3; i++) {
      const isGold = (i < starTotal);
      const starChar = isGold ? '★' : '☆';
      const color = isGold ? JEDA.CFG.COLOR.hex.warn : JEDA.CFG.COLOR.hex.muted;

      const star = this.add.text(starXs[i], y + 36, starChar, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '40px',
        fontStyle: '800',
        color: color
      }).setOrigin(0.5).setResolution(2).setScale(0);

      this.tweens.add({
        targets: star,
        scaleX: 1.0,
        scaleY: 1.0,
        delay: 350 + i * 200,
        duration: 350,
        ease: 'Back.easeOut'
      });
    }
  }

  /**
   * Tiga kartu rincian skor level sama lebar (PRD 14.5: rowCenter).
   */
  createLevelBreakdownCards(cx, y) {
    const Layout = JEDA.Layout;
    const cardW = 320;
    const cardH = 116;
    const cardGap = 24;
    const cardWidths = [cardW, cardW, cardW];
    const cardXs = Layout.rowCenter(cardWidths, cardGap);

    const levelDetails = [
      { name: 'Level 1: Napas', score: this.l1Score, easy: JEDA.State.data.easy.l1 },
      { name: 'Level 2: Awan Pikiran', score: this.l2Score, easy: JEDA.State.data.easy.l2 },
      { name: 'Level 3: Jeda S.T.O.P.', score: this.l3Score, easy: JEDA.State.data.easy.l3 }
    ];

    levelDetails.forEach((lvl, idx) => {
      const bx = cardXs[idx];
      const bg = this.add.graphics();
      bg.fillStyle(0x1A1D40, 0.95);
      bg.fillRoundedRect(bx - cardW / 2, y - cardH / 2, cardW, cardH, 20);
      bg.lineStyle(1.5, 0x485278, 0.7);
      bg.strokeRoundedRect(bx - cardW / 2, y - cardH / 2, cardW, cardH, 20);

      const title = this.add.text(bx, y - 30, lvl.name, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '27px',
        fontStyle: '800',
        color: JEDA.CFG.COLOR.hex.text
      }).setOrigin(0.5).setResolution(2);

      const scoreT = this.add.text(bx, y + 2, `${lvl.score} Poin`, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '33px',
        fontStyle: '800',
        color: JEDA.CFG.COLOR.hex.calm
      }).setOrigin(0.5).setResolution(2);

      const starsCount = JEDA.Score.calcStars(lvl.score);
      const starStr = '★'.repeat(starsCount) + '☆'.repeat(3 - starsCount);
      const starT = this.add.text(bx, y + 34, starStr, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '27px',
        fontStyle: '600',
        color: JEDA.CFG.COLOR.hex.warn
      }).setOrigin(0.5).setResolution(2);

      if (lvl.easy) {
        this.add.text(bx + cardW / 2 - 16, y - cardH / 2 + 16, 'Mode Ramah', {
          fontFamily: JEDA.CFG.FONT.family,
          fontSize: '27px',
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
    const Layout = JEDA.Layout;
    const cardW = Layout.panelSize.M; // 960 px
    const cardH = 140;

    const bg = this.add.graphics();
    bg.fillStyle(0x16163A, 0.95);
    bg.fillRoundedRect(cx - cardW / 2, y - cardH / 2, cardW, cardH, 24);
    bg.lineStyle(2, JEDA.CFG.COLOR.panelLine, 0.3);
    bg.strokeRoundedRect(cx - cardW / 2, y - cardH / 2, cardW, cardH, 24);

    const startScore = JEDA.State.session.checkinStart || 3;
    const startLabel = JEDA.State.session.checkinLabel || 'Netral';

    const info = `Check-in Awal: ${startScore}/5 (${startLabel})`;
    this.add.text(cx, y - 44, info, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted
    }).setOrigin(0.5).setResolution(2);

    const question = 'Bagaimana perasaanmu sekarang setelah latihan?';
    this.add.text(cx, y - 14, question, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    // 5 Tombol Bulat Skor Akhir menggunakan rowCenter (PRD 14.5)
    const btnSize = 52;
    const btnWidths = [btnSize, btnSize, btnSize, btnSize, btnSize];
    const btnXs = Layout.rowCenter(btnWidths, 28);
    const btnY = y + 22;
    this.endScoreButtons = [];

    // Teks refleksi (BR-10)
    this.reflectionText = this.add.text(cx, y + 54, 'Pilih perasaanmu sekarang untuk melihat refleksi.', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted,
      align: 'center'
    }).setOrigin(0.5).setResolution(2);

    for (let val = 1; val <= 5; val++) {
      const bx = btnXs[val - 1];
      const btn = this.createCircularEndButton(bx, btnY, val, (selectedVal) => {
        this.evaluateReflection(startScore, selectedVal);
      });
      this.endScoreButtons.push(btn);
    }
  }

  createCircularEndButton(x, y, value, onSelect) {
    const container = this.add.container(x, y);
    const radius = 24;

    const bg = this.add.graphics();
    const drawBg = (selected) => {
      bg.clear();
      bg.fillStyle(selected ? 0x7FE0C3 : 0x1E2148, 0.96);
      bg.fillCircle(0, 0, radius);
      bg.lineStyle(2, selected ? 0xFFFFFF : 0x485278, selected ? 0.95 : 0.65);
      bg.strokeCircle(0, 0, radius);
    };
    drawBg(false);

    const numText = this.add.text(0, 0, String(value), {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '800',
      color: '#FFFFFF'
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
        b.numText.setColor(b.val === value ? '#12142E' : '#FFFFFF');
      });
      onSelect(value);
    });

    container.val = value;
    container.drawBg = drawBg;
    container.numText = numText;
    return container;
  }

  evaluateReflection(startScore, endScore) {
    let message = '';
    let color = JEDA.CFG.COLOR.hex.text;

    if (endScore < startScore) {
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
   * Lima Slot Lencana (PRD 14.2 G4 & 14.5: rowCenter).
   * Menggunakan komponen baku JEDA.UI.badgeSlot.
   */
  createBadgeSlots(cx, y) {
    const Layout = JEDA.Layout;
    const badgeResult = (window.JEDA && JEDA.Score && JEDA.Score.badges)
      ? JEDA.Score.badges()
      : { badges: [], earned: [], newlyUnlocked: [] };

    const badges = badgeResult.badges || [];
    const earned = badgeResult.earned || [];

    // Label judul bagian lencana
    this.add.text(cx, y - 50, 'Lencana Sikap Positif', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    const slotW = 304;
    const slotH = 76;
    const slotWidths = [slotW, slotW, slotW, slotW, slotW];
    const slotXs = Layout.rowCenter(slotWidths, 24);

    badges.forEach((b, idx) => {
      const bx = slotXs[idx];
      const isUnlocked = earned.includes(b.id) || earned.includes(b.name);
      JEDA.UI.badgeSlot(this, bx, y, b, isUnlocked, { width: slotW, height: slotH });
    });

    // Umpan balik toast jika ada lencana baru yang berhasil diraih di run ini
    if (badgeResult.newlyUnlocked && badgeResult.newlyUnlocked.length > 0) {
      const firstNew = badges.find(b => b.id === badgeResult.newlyUnlocked[0]);
      if (firstNew) {
        this.time.delayedCall(700, () => {
          JEDA.UI.toast(this, `Lencana Diraih: ${firstNew.name} ${firstNew.icon}`);
        });
      }
    }
  }

  /**
   * Pemilih Tiga Tema Visual JEDA di Layar Hasil (PRD Bagian 15.3 & BR-16).
   * Menampilkan tiga kartu pratinjau tema (Embun, Fajar, Aurora) dengan gembok untuk yang belum terbuka.
   */
  createThemeSelector(cx, y) {
    const totalStars = (window.JEDA && JEDA.State && JEDA.State.getTotalStars)
      ? JEDA.State.getTotalStars()
      : 0;

    this.add.text(cx, y - 52, `Tema Visual Sesi Berikutnya (Koleksi: ${totalStars}/9 ★)`, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    JEDA.UI.themeCards(this, cx, y + 22, {
      cardW: 304,
      cardH: 136,
      gap: 24
    });
  }

  /**
   * Menampilkan Pengingat Istirahat jika runsToday >= 3 (BR-11).
   */
  createRestReminder(cx, y) {
    const cardW = 960;
    const cardH = 44;

    const bg = this.add.graphics();
    bg.fillStyle(0x2B4C7E, 0.4);
    bg.fillRoundedRect(cx - cardW / 2, y - cardH / 2, cardW, cardH, 16);
    bg.lineStyle(1.5, JEDA.CFG.COLOR.warn, 0.5);
    bg.strokeRoundedRect(cx - cardW / 2, y - cardH / 2, cardW, cardH, 16);

    const msg = `☕ Pengingat Istirahat (BR-11): Kamu telah menyelesaikan 3+ sesi latihan hari ini. Luangkan waktu untuk istirahat sejenak.`;
    this.add.text(cx, y, msg, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.warn
    }).setOrigin(0.5).setResolution(2);
  }

  /**
   * Tombol navigasi aksi akhir di Zona Aksi (PRD 14.3 Prinsip 6 & 14.5).
   * Tombol Main lagi dan Menu sama lebar 320, tinggi 80, aksi utama di kanan.
   */
  createActionButtons(cx, y) {
    const Layout = JEDA.Layout;
    const btnW = 320;
    const btnH = 80;
    const btnGap = 32;
    const btnWidths = [btnW, btnW];
    const btnXs = Layout.rowCenter(btnWidths, btnGap);

    // Kiri: Aksi Sekunder (Menu Utama)
    JEDA.UI.createButton(this, btnXs[0], y, btnW, btnH, 'Menu Utama', () => {
      if (JEDA.Stage3D) JEDA.Stage3D.setMode('menu');
      JEDA.FX.transitionTo(this, 'CheckinScene');
    }, { radius: 40, fontSize: 33 });

    // Kanan: Aksi Utama (Main Lagi)
    JEDA.UI.createButton(this, btnXs[1], y, btnW, btnH, 'Main Lagi', () => {
      JEDA.State.session = {
        checkinStart: 0,
        checkinLabel: '',
        levelScores: { l1: 0, l2: 0, l3: 0 },
        distractHits: 0,
        panicHits: 0
      };
      if (JEDA.Stage3D) JEDA.Stage3D.setMode('menu');
      JEDA.FX.transitionTo(this, 'CheckinScene');
    }, { primary: true, radius: 40, fontSize: 33 });
  }
}

window.ResultScene = ResultScene;
