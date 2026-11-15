/**
 * JEDA - CheckinScene (js/scenes/checkin.js)
 * Layar 1: Check-in Awal, Pemilihan Skor Perasaan (1-5), Label Emosi,
 * Akses Level (BR-01), Modal Peduli (BR-09), Pengaturan (BR-12, BR-13),
 * dan Mode Debug (?debug=1).
 */
class CheckinScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CheckinScene' });
  }

  create() {
    const W = JEDA.CFG.W;
    const H = JEDA.CFG.H;
    const cx = W / 2;

    this.selectedScore = null;
    this.selectedLabel = null;
    this.scoreButtons = [];
    this.labelButtons = [];

    // 1. Tampilkan latar belakang terpadu
    JEDA.FX.createBackground(this);
    if (JEDA.Stage3D) {
      JEDA.Stage3D.setMode('menu');
      JEDA.Stage3D.setSync('good');
      let passedCount = 0;
      if ((JEDA.State.data.stars.l1 || 0) > 0 || (JEDA.State.data.best.l1 || 0) >= JEDA.CFG.PASS) passedCount++;
      if ((JEDA.State.data.stars.l2 || 0) > 0 || (JEDA.State.data.best.l2 || 0) >= JEDA.CFG.PASS) passedCount++;
      if ((JEDA.State.data.stars.l3 || 0) > 0 || (JEDA.State.data.best.l3 || 0) >= JEDA.CFG.PASS) passedCount++;
      JEDA.Stage3D.setLanterns(passedCount);
    }

    // 2. Transisi masuk kamera
    this.cameras.main.fadeIn(350);

    // 3. Tombol Pengaturan di pojok kanan atas
    this.createSettingsButton();

    // 4. Panel Utama Check-in
    this.createCenterPanel(cx);

    // 5. Tiga Kartu Level di bawah
    this.createLevelCards(cx);

    // 6. Mode Debug jika aktif (?debug=1)
    if (JEDA.State.isDebug()) {
      this.setupDebugMode();
    }

    // 7. Notifikasi pemulihan data rusak jika terjadi (BR-14)
    if (JEDA.State.recoveredFromCorrupt) {
      JEDA.State.recoveredFromCorrupt = false;
      this.time.delayedCall(500, () => {
        JEDA.UI.toast(this, 'Data diatur ulang ke kondisi awal.');
      });
    }
  }

  /**
   * Membuat tombol pengaturan di pojok kanan atas.
   */
  createSettingsButton() {
    const W = JEDA.CFG.W;
    const btn = JEDA.UI.createButton(this, W - 150, 65, 200, 50, 'Pengaturan ⚙', () => {
      JEDA.UI.showSettingsModal(this, () => {
        // Callback saat data dihapus: render ulang kartu level
        this.renderLevelCards();
      });
    }, { fontSize: 22, radius: 25 });
  }

  /**
   * Membuat panel tengah: Judul, Pertanyaan Skor 1-5, Pilihan Emosi, dan Tombol Mulai.
   */
  createCenterPanel(cx) {
    const panelW = 1140;
    const panelH = 590;
    const panelY = 445;

    // Panel kaca tengah berlatar gelap solid-frosted glass agar teks dan tombol selalu terbaca jelas (Prinsip UI/UX)
    const is3D = !!(JEDA.CFG && JEDA.CFG.USE_3D && JEDA.Stage3D && JEDA.Stage3D.isActive && JEDA.Stage3D.isActive());
    const fillColor = is3D ? 0x12142E : JEDA.CFG.COLOR.panel;
    const fillAlpha = is3D ? 0.96 : 0.12;
    JEDA.UI.createPanel(this, cx, panelY, panelW, panelH, 32, fillAlpha, 0.45, fillColor);

    // Judul & Subjudul
    this.add.text(cx, panelY - 240, 'JEDA', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '54px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    this.add.text(cx, panelY - 195, 'Latihan berhenti sejenak', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '24px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted
    }).setOrigin(0.5).setResolution(2);

    this.add.text(cx, panelY - 160, 'JEDA adalah latihan, bukan pengganti bantuan profesional.', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '18px',
      fontStyle: '400',
      color: JEDA.CFG.COLOR.hex.muted
    }).setOrigin(0.5).setResolution(2);

    // Pertanyaan: Bagaimana perasaanmu sekarang?
    this.add.text(cx, panelY - 105, 'Bagaimana perasaanmu sekarang?', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '28px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    // 5 Tombol Bulat Berlabel 1 s.d. 5
    const scoreY = panelY - 35;
    const spacing = 150;
    const scores = [
      { val: 1, label: 'Sangat Tertekan' },
      { val: 2, label: '' },
      { val: 3, label: 'Netral' },
      { val: 4, label: '' },
      { val: 5, label: 'Sangat Tenang' }
    ];

    scores.forEach((item, idx) => {
      const bx = cx + (idx - 2) * spacing;
      const btn = this.createCircularScoreButton(bx, scoreY, item.val, item.label);
      this.scoreButtons.push(btn);
    });

    // Pilihan Label Emosi (7 label)
    const emotionsRow1 = ['Tenang', 'Lelah', 'Cemas', 'Kewalahan'];
    const emotionsRow2 = ['Sedih', 'Panik', 'Aku merasa tidak aman'];

    const emoY1 = panelY + 65;
    const emoY2 = panelY + 125;

    this.createEmotionPills(emotionsRow1, cx, emoY1, 190);
    this.createEmotionPills(emotionsRow2, cx, emoY2, 240);

    // Tombol Mulai
    this.startButton = JEDA.UI.createButton(this, cx, panelY + 215, 320, 64, 'Mulai', () => {
      this.handleStartClick();
    }, { primary: true, disabled: true, radius: 32 });
  }

  /**
   * Membuat tombol bulat untuk pilihan skor 1-5.
   */
  createCircularScoreButton(x, y, value, subLabel) {
    const container = this.add.container(x, y);
    const radius = 30;

    const bg = this.add.graphics();
    const drawBg = (selected, hover = false) => {
      bg.clear();
      if (selected) {
        bg.fillStyle(JEDA.CFG.COLOR.calm, 1.0);
        bg.fillCircle(0, 0, radius);
        bg.lineStyle(3, 0xFFFFFF, 1.0);
        bg.strokeCircle(0, 0, radius);
      } else {
        bg.fillStyle(hover ? 0x2A2E5C : 0x1E2148, 0.96);
        bg.fillCircle(0, 0, radius);
        bg.lineStyle(2, hover ? 0x7FE0C3 : 0x485278, hover ? 0.8 : 0.6);
        bg.strokeCircle(0, 0, radius);
      }
    };
    drawBg(false);

    const numText = this.add.text(0, 0, String(value), {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '28px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    container.add([bg, numText]);

    if (subLabel) {
      const sub = this.add.text(0, radius + 16, subLabel, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '16px',
        fontStyle: '600',
        color: JEDA.CFG.COLOR.hex.muted
      }).setOrigin(0.5).setResolution(2);
      container.add(sub);
    }

    container.setSize(radius * 2, radius * 2);
    container.setInteractive({
      hitArea: new Phaser.Geom.Circle(0, 0, radius),
      hitAreaCallback: Phaser.Geom.Circle.Contains,
      useHandCursor: true
    });

    container.on('pointerover', () => {
      if (this.selectedScore !== value) {
        drawBg(false, true);
        container.setScale(1.06);
      }
    });

    container.on('pointerout', () => {
      if (this.selectedScore !== value) {
        drawBg(false, false);
        container.setScale(1.0);
      }
    });

    container.on('pointerup', () => {
      this.selectedScore = value;
      numText.setColor(JEDA.CFG.COLOR.hex.bgTop);

      this.scoreButtons.forEach(b => {
        const isThis = (b.scoreVal === value);
        b.drawBg(isThis);
        b.numText.setColor(isThis ? JEDA.CFG.COLOR.hex.bgTop : JEDA.CFG.COLOR.hex.text);
        b.setScale(isThis ? 1.08 : 1.0);
      });

      this.checkStartButtonStatus();
    });

    container.scoreVal = value;
    container.drawBg = drawBg;
    container.numText = numText;
    return container;
  }

  /**
   * Membuat tombol pill untuk kategori label emosi.
   */
  createEmotionPills(labels, cx, y, itemW) {
    const total = labels.length;
    const startX = cx - ((total - 1) * (itemW + 16)) / 2;

    labels.forEach((label, idx) => {
      const px = startX + idx * (itemW + 16);
      const isSensitive = (label === 'Panik' || label === 'Aku merasa tidak aman');
      const pill = JEDA.UI.createButton(this, px, y, itemW, 46, label, () => {
        this.selectedLabel = label;
        this.labelButtons.forEach(b => {
          const isThis = (b.labelName === label);
          b.setAlpha(1.0);
          b.bg.clear();
          if (isThis) {
            b.bg.fillStyle(isSensitive ? 0xFF8FA3 : JEDA.CFG.COLOR.calm, 1.0);
            b.bg.fillRoundedRect(-b.w / 2, -b.h / 2, b.w, b.h, 23);
            b.bg.lineStyle(2, 0xFFFFFF, 1.0);
            b.bg.strokeRoundedRect(-b.w / 2, -b.h / 2, b.w, b.h, 23);
            b.textObj.setColor('#12142E');
          } else {
            b.bg.fillStyle(0x1E2148, 0.96);
            b.bg.fillRoundedRect(-b.w / 2, -b.h / 2, b.w, b.h, 23);
            b.bg.lineStyle(2, 0x3F486E, 0.7);
            b.bg.strokeRoundedRect(-b.w / 2, -b.h / 2, b.w, b.h, 23);
            b.textObj.setColor('#E2E8F0');
          }
        });
        this.checkStartButtonStatus();
      }, { fontSize: 20, radius: 23 });

      pill.w = itemW;
      pill.h = 46;
      pill.labelName = label;
      this.labelButtons.push(pill);
    });
  }

  /**
   * Mengaktifkan tombol Mulai bila skor dan label sudah dipilih.
   */
  checkStartButtonStatus() {
    if (this.selectedScore !== null && this.selectedLabel !== null) {
      this.startButton.setEnabled(true);
    }
  }

  /**
   * Menangani klik tombol Mulai: cek kondisi modal peduli (BR-09) atau langsung ke Level 1.
   */
  handleStartClick() {
    if (this.selectedScore === null || this.selectedLabel === null) return;

    // Simpan ke session
    JEDA.State.setCheckin(this.selectedScore, this.selectedLabel);

    // Aturan Bisnis BR-09:
    // Skor 1, label 'Panik', atau 'Aku merasa tidak aman' memunculkan modal peduli
    const needsCare = (
      this.selectedScore === 1 ||
      this.selectedLabel === 'Panik' ||
      this.selectedLabel === 'Aku merasa tidak aman'
    );

    if (needsCare) {
      JEDA.UI.showCareModal(
        this,
        // Opsi 1: Latihan napas ringan (Level 1 mode ramah, consentHeavy = true)
        () => {
          JEDA.State.data.consentHeavy = true;
          JEDA.State.data.easy.l1 = true;
          JEDA.State.save();
          JEDA.FX.transitionTo(this, 'Level1Scene', { easyMode: true });
        },
        // Opsi 2: Aku sudah lebih baik, lanjutkan (consentHeavy = false)
        () => {
          JEDA.State.data.consentHeavy = false;
          JEDA.State.save();
          JEDA.FX.transitionTo(this, 'Level1Scene', { easyMode: false });
        }
      );
    } else {
      JEDA.FX.transitionTo(this, 'Level1Scene');
    }
  }

  /**
   * Menampilkan daftar tiga kartu level di bagian bawah layar.
   */
  createLevelCards(cx) {
    this.cardsContainer = this.add.container(0, 0);
    this.renderLevelCards();
  }

  /**
   * Render atau refresh tampilan tiga kartu level (BR-01).
   */
  renderLevelCards() {
    this.cardsContainer.removeAll(true);
    const is3D = !!(JEDA.CFG && JEDA.CFG.USE_3D && JEDA.Stage3D && JEDA.Stage3D.isActive && JEDA.Stage3D.isActive());
    const cx = JEDA.CFG.W / 2;
    const cardY = 890;
    const cardW = 340;
    const cardH = 150;
    const spacing = 370;

    const levels = [
      { id: 1, name: 'Level 1: Napas', desc: 'Menyelaraskan ritme napas', key: 'l1', sceneKey: 'Level1Scene' },
      { id: 2, name: 'Level 2: Awan Pikiran', desc: 'Mengamati dan melabeli pikiran', key: 'l2', sceneKey: 'Level2Scene' },
      { id: 3, name: 'Level 3: Jeda S.T.O.P.', desc: 'Memilih respons dengan sadar', key: 'l3', sceneKey: 'Level3Scene' }
    ];

    levels.forEach((lvl, idx) => {
      const cardX = cx + (idx - 1) * spacing;
      const isUnlocked = JEDA.State.isLevelUnlocked(lvl.id);
      const bestScore = JEDA.State.data.best[lvl.key] || 0;
      const stars = JEDA.State.data.stars[lvl.key] || 0;

      const card = this.add.container(cardX, cardY);

      // Background kartu
      const bg = this.add.graphics();
      const cardColor = is3D ? 0x141638 : JEDA.CFG.COLOR.panel;
      const cardFill = is3D ? (isUnlocked ? 0.96 : 0.85) : (isUnlocked ? 0.12 : 0.05);
      bg.fillStyle(cardColor, cardFill);
      bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 24);
      bg.lineStyle(2, isUnlocked ? 0x7FE0C3 : 0x383D62, isUnlocked ? 0.55 : 0.35);
      bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 24);

      // Judul level
      const title = this.add.text(0, -38, lvl.name, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '24px',
        fontStyle: '800',
        color: isUnlocked ? JEDA.CFG.COLOR.hex.text : JEDA.CFG.COLOR.hex.muted
      }).setOrigin(0.5).setResolution(2);

      // Deskripsi singkat
      const desc = this.add.text(0, -5, lvl.desc, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '18px',
        fontStyle: '600',
        color: JEDA.CFG.COLOR.hex.muted
      }).setOrigin(0.5).setResolution(2);

      card.add([bg, title, desc]);

      if (isUnlocked) {
        // Tampilkan bintang & skor terbaik
        const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        const starText = this.add.text(0, 35, `${starStr} (${bestScore})`, {
          fontFamily: JEDA.CFG.FONT.family,
          fontSize: '20px',
          fontStyle: '800',
          color: stars > 0 ? JEDA.CFG.COLOR.hex.warn : JEDA.CFG.COLOR.hex.muted
        }).setOrigin(0.5).setResolution(2);
        card.add(starText);

        card.setSize(cardW, cardH);
        card.setInteractive({
          hitArea: new Phaser.Geom.Rectangle(-cardW / 2, -cardH / 2, cardW, cardH),
          hitAreaCallback: Phaser.Geom.Rectangle.Contains,
          useHandCursor: true
        });

        card.on('pointerover', () => {
          this.tweens.add({ targets: card, y: cardY - 4, scale: 1.03, duration: 150, ease: 'Sine.easeOut' });
        });
        card.on('pointerout', () => {
          this.tweens.add({ targets: card, y: cardY, scale: 1.0, duration: 150, ease: 'Sine.easeOut' });
        });
        card.on('pointerup', () => {
          JEDA.FX.transitionTo(this, lvl.sceneKey);
        });
      } else {
        // Status terkunci (BR-01): tampilkan gembok dan alpha 0.4
        card.setAlpha(0.45);
        const lockG = this.add.graphics();
        JEDA.UI.drawLockIcon(lockG, 0, 35, 26, 0xFFFFFF, 0.7);
        card.add(lockG);

        card.setSize(cardW, cardH);
        card.setInteractive({
          hitArea: new Phaser.Geom.Rectangle(-cardW / 2, -cardH / 2, cardW, cardH),
          hitAreaCallback: Phaser.Geom.Rectangle.Contains,
          useHandCursor: true
        });

        card.on('pointerup', () => {
          // Toast penguncian level sesuai BR-01
          const prevLvlName = (lvl.id === 2) ? 'Level 1' : 'Level 2';
          JEDA.UI.toast(this, `Selesaikan ${prevLvlName} dulu`);
        });
      }

      this.cardsContainer.add(card);
    });
  }

  /**
   * Setup fitur pengujian Mode Debug (?debug=1):
   * Tombol U: Buka semua level
   * Tombol R: Reset data
   */
  setupDebugMode() {
    const debugText = this.add.text(40, 45, '⚙ [DEBUG MODE]\nTekan U: Buka Semua Level | Tekan R: Reset Data', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '20px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.calm,
      lineSpacing: 4
    }).setResolution(2);

    this.input.keyboard.on('keydown-U', () => {
      JEDA.State.unlockAll();
      this.renderLevelCards();
      JEDA.UI.toast(this, 'Mode Debug: Semua level berhasil dibuka.');
    });

    this.input.keyboard.on('keydown-R', () => {
      JEDA.State.resetData();
      this.renderLevelCards();
      JEDA.UI.toast(this, 'Mode Debug: Data berhasil direset.');
    });
  }
}

window.CheckinScene = CheckinScene;
