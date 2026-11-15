/**
 * JEDA - CheckinScene (js/scenes/checkin.js)
 * Layar 1: Check-in Awal, Pemilihan Skor Perasaan (1-5), Label Emosi,
 * Akses Level (BR-01), Modal Peduli (BR-09), Pengaturan (BR-12, BR-13),
 * dan Mode Debug (?debug=1, tombol G, U, R).
 * 
 * Sepenuhnya patuh pada PRD Bagian 14.3 sampai 14.5:
 * - Menggunakan JEDA.Layout untuk semua posisi (grid 12 kolom, sumbu tengah cx, rowCenter)
 * - Komponen baku JEDA.UI (panel, button, chip)
 * - Tiga zona vertikal: Header (0-120), Konten (120-900), Aksi (900-1080)
 * - Hukum Hick untuk 7 emosi (4 baris atas, 3 baris bawah, keduanya rata tengah)
 * - Kartu level selebar colSpan(4) tepat rata batas kolom 1 sampai 12
 */
class CheckinScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CheckinScene' });
  }

  create() {
    const Layout = JEDA.Layout;
    const cx = Layout.cx();

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

    // 3. Header Simetris di Zona Header (0 - 120 px)
    this.createHeaderButtons();

    // 4. Panel Utama Check-in di Zona Konten (120 - 900 px)
    this.createCenterPanel(cx);

    // 5. Tiga Kartu Level di Zona Aksi (900 - 1080 px)
    this.createLevelCards();

    // 6. Pasang listener tombol debug 'G' untuk menampilkan grid
    Layout.attachDebugKeyListener(this);

    // 7. Mode Debug jika aktif (?debug=1)
    if (JEDA.State.isDebug()) {
      this.setupDebugMode();
    }

    // 8. Dukungan Keyboard (Prinsip 15: Enter menekan aksi utama)
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-ENTER', () => {
        if (this.startButton && this.startButton.alpha > 0.8) {
          this.handleStartClick();
        }
      });
    }

    // 9. Notifikasi pemulihan data rusak jika terjadi (BR-14)
    if (JEDA.State.recoveredFromCorrupt) {
      JEDA.State.recoveredFromCorrupt = false;
      this.time.delayedCall(500, () => {
        JEDA.UI.toast(this, 'Data diatur ulang ke kondisi awal.');
      });
    }
  }

  /**
   * Membuat header simetris di Zona Header (y: 0 - 120 px).
   * Kiri: Identitas brand resmi JEDA profesional sejajar margin 120 px.
   * Kanan: Tombol Pengaturan sejajar margin kanan (W - 120 px).
   */
  createHeaderButtons() {
    const Layout = JEDA.Layout;
    const headerY = 64; // Pusat zona header (kelipatan 8)
    const btnW = 200;
    const btnH = 50;

    // Badge Kiri Atas: Identitas Brand JEDA Profesional (rata margin kiri 120)
    const leftX = Layout.M + btnW / 2;
    JEDA.UI.brandBadge(this, leftX, headerY, { width: btnW, height: btnH, radius: 25 });

    // Tombol Pengaturan Kanan Atas (rata margin kanan 1800)
    const rightX = (Layout.W - Layout.M) - btnW / 2;
    JEDA.UI.createButton(this, rightX, headerY, btnW, btnH, 'Pengaturan ⚙', () => {
      JEDA.UI.showSettingsModal(this, () => {
        this.renderLevelCards();
      });
    }, { fontSize: 22, radius: 25 });
  }

  /**
   * Membuat panel tengah dan elemen pengiring sesuai PRD 14.5:
   * Logo JEDA (y 160), subjudul, panel M berisi pertanyaan, 5 tombol bulat 96 px,
   * label emosi baris 4 lalu 3, dan tombol Mulai di bawah panel.
   */
  createCenterPanel(cx) {
    const Layout = JEDA.Layout;

    // 1. Logo JEDA (y = 150)
    this.add.text(cx, 150, 'JEDA', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '54px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    // 2. Subjudul & Disclaimer (y = 192, 216)
    this.add.text(cx, 192, 'Latihan berhenti sejenak', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '22px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted
    }).setOrigin(0.5).setResolution(2);

    this.add.text(cx, 216, 'JEDA adalah latihan, bukan pengganti bantuan profesional.', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '16px',
      fontStyle: '400',
      color: JEDA.CFG.COLOR.hex.muted
    }).setOrigin(0.5).setResolution(2);

    // 3. Panel M Baku (Lebar 960 px, tinggi 376 px, radius 32 px, padding 48 px, pusat di y = 422)
    const panelW = Layout.panelSize.M; // 960
    const panelH = 376;
    const panelY = 422; // Pusat panel (top: 234, bottom: 610)
    JEDA.UI.panel(this, {
      size: 'M',
      w: panelW,
      h: panelH,
      x: cx,
      y: panelY,
      radius: 32,
      fillAlpha: 0.98,
      fillColor: 0x121432,
      strokeAlpha: 0.50,
      strokeColor: 0x4B5580
    });

    // 4. Pertanyaan dalam panel (y = 268)
    this.add.text(cx, 268, 'Bagaimana perasaanmu sekarang?', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '26px',
      fontStyle: '700',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    // 5. Lima Tombol Bulat Skor (PRD 14.5: rowCenter)
    const scoreSize = 68;
    const scoreGap = 28;
    const scoreWidths = [scoreSize, scoreSize, scoreSize, scoreSize, scoreSize];
    const scoreXs = Layout.rowCenter(scoreWidths, scoreGap);
    const scoreY = 332;

    const scores = [
      { val: 1, label: 'Sangat Tertekan' },
      { val: 2, label: '' },
      { val: 3, label: 'Netral' },
      { val: 4, label: '' },
      { val: 5, label: 'Sangat Tenang' }
    ];

    scores.forEach((item, idx) => {
      const btn = this.createCircularScoreButton(scoreXs[idx], scoreY, item.val, item.label, scoreSize);
      this.scoreButtons.push(btn);
    });

    // 6. Label Emosi (PRD 14.3 Prinsip 9: Hukum Hick, maks 4 per baris)
    // Baris 1: 4 emosi (Tenang, Lelah, Cemas, Kewalahan)
    const emotionsRow1 = ['Tenang', 'Lelah', 'Cemas', 'Kewalahan'];
    const row1Widths = [190, 190, 190, 190];
    const row1Xs = Layout.rowCenter(row1Widths, 20);
    const emoY1 = 450;

    emotionsRow1.forEach((label, idx) => {
      const chip = JEDA.UI.chip(this, row1Xs[idx], emoY1, row1Widths[idx], 46, label, false, () => {
        this.selectLabel(label);
      }, { fontSize: 19 });
      chip.labelName = label;
      this.labelButtons.push(chip);
    });

    // Baris 2: 3 emosi (Sedih, Panik, Aku merasa tidak aman)
    const emotionsRow2 = [
      { name: 'Sedih', w: 180, sensitive: false },
      { name: 'Panik', w: 180, sensitive: true },
      { name: 'Aku merasa tidak aman', w: 310, sensitive: true }
    ];
    const row2Widths = emotionsRow2.map(e => e.w);
    const row2Xs = Layout.rowCenter(row2Widths, 20);
    const emoY2 = 508;

    emotionsRow2.forEach((item, idx) => {
      const chip = JEDA.UI.chip(this, row2Xs[idx], emoY2, item.w, 46, item.name, false, () => {
        this.selectLabel(item.name);
      }, { fontSize: 19, sensitive: item.sensitive });
      chip.labelName = item.name;
      this.labelButtons.push(chip);
    });

    // 7. Tombol Mulai (PRD 14.5: 48 px di bawah panel M)
    // Panel bottom = 422 + 376/2 = 610. 610 + 48 = 658. Pusat tombol = 658 + 44 = 702.
    // Bebas tabrakan dengan pulau 3D di bawah (pulau di y: 780-880)
    this.startButton = JEDA.UI.createButton(this, cx, 702, 320, 88, 'Mulai', () => {
      this.handleStartClick();
    }, { primary: true, disabled: true, radius: 44, fontSize: 30 });
  }

  /**
   * Membuat tombol bulat 96 px untuk pilihan skor perasaan.
   */
  createCircularScoreButton(x, y, value, subLabel, size) {
    const container = this.add.container(x, y);
    const radius = size / 2;

    const bg = this.add.graphics();
    const drawBg = (selected, hover = false) => {
      bg.clear();
      if (selected) {
        bg.fillStyle(0x7FE0C3, 1.0);
        bg.fillCircle(0, 0, radius);
        bg.lineStyle(3, 0xFFFFFF, 1.0);
        bg.strokeCircle(0, 0, radius);
      } else {
        bg.fillStyle(hover ? 0x242854 : 0x1A1D40, 0.95);
        bg.fillCircle(0, 0, radius);
        bg.lineStyle(2, hover ? 0x7FE0C3 : 0x485278, hover ? 0.9 : 0.6);
        bg.strokeCircle(0, 0, radius);
      }
    };
    drawBg(false);

    const numText = this.add.text(0, 0, String(value), {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '32px',
      fontStyle: '800',
      color: '#FFFFFF'
    }).setOrigin(0.5).setResolution(2);

    container.add([bg, numText]);

    if (subLabel) {
      const sub = this.add.text(0, radius + 20, subLabel, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '15px',
        fontStyle: '600',
        color: JEDA.CFG.COLOR.hex.muted
      }).setOrigin(0.5).setResolution(2);
      container.add(sub);
    }

    container.setSize(size, size);
    container.setInteractive({
      hitArea: new Phaser.Geom.Circle(0, 0, radius),
      hitAreaCallback: Phaser.Geom.Circle.Contains,
      useHandCursor: true
    });

    container.on('pointerover', () => {
      if (this.selectedScore !== value) {
        drawBg(false, true);
        container.setScale(1.05);
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
      this.scoreButtons.forEach(b => {
        const isThis = (b.scoreVal === value);
        b.drawBg(isThis);
        b.numText.setColor(isThis ? '#16163A' : '#FFFFFF');
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
   * Mengatur pemilihan label emosi.
   */
  selectLabel(label) {
    this.selectedLabel = label;
    this.labelButtons.forEach(btn => {
      const isSelected = (btn.labelName === label);
      btn.setSelected(isSelected);
    });
    this.checkStartButtonStatus();
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
   * Menampilkan daftar tiga kartu level di Zona Aksi (900 - 1080 px).
   * PRD 14.5: Tiga kartu level sama lebar (colSpan(4)) di zona aksi.
   */
  createLevelCards() {
    this.cardsContainer = this.add.container(0, 0);
    this.renderLevelCards();
  }

  /**
   * Render atau refresh tampilan tiga kartu level (BR-01).
   */
  renderLevelCards() {
    this.cardsContainer.removeAll(true);
    const Layout = JEDA.Layout;

    // Zona aksi: y = 900..1080. Pusat kartu = 980 (tinggi 120 px)
    const cardY = 980;
    const cardW = Layout.colSpan(4); // 544 px
    const cardH = 120;
    const cardXs = Layout.rowCenter([cardW, cardW, cardW], Layout.G); // [392, 960, 1528]

    const levels = [
      { id: 1, name: 'Level 1: Napas', desc: 'Menyelaraskan ritme napas', key: 'l1', sceneKey: 'Level1Scene' },
      { id: 2, name: 'Level 2: Awan Pikiran', desc: 'Mengamati dan melabeli pikiran', key: 'l2', sceneKey: 'Level2Scene' },
      { id: 3, name: 'Level 3: Jeda S.T.O.P.', desc: 'Memilih respons dengan sadar', key: 'l3', sceneKey: 'Level3Scene' }
    ];

    levels.forEach((lvl, idx) => {
      const cardX = cardXs[idx];
      const isUnlocked = JEDA.State.isLevelUnlocked(lvl.id);
      const bestScore = JEDA.State.data.best[lvl.key] || 0;
      const stars = JEDA.State.data.stars[lvl.key] || 0;

      const card = this.add.container(cardX, cardY);

      // Background kartu solid-frosted
      const bg = this.add.graphics();
      bg.fillStyle(0x141638, isUnlocked ? 0.95 : 0.75);
      bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 24);
      bg.lineStyle(2, isUnlocked ? 0x7FE0C3 : 0x383D62, isUnlocked ? 0.6 : 0.35);
      bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 24);

      // Judul level
      const title = this.add.text(0, -28, lvl.name, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '24px',
        fontStyle: '800',
        color: isUnlocked ? '#FFFFFF' : JEDA.CFG.COLOR.hex.muted
      }).setOrigin(0.5).setResolution(2);

      // Deskripsi singkat
      const desc = this.add.text(0, 2, lvl.desc, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '17px',
        fontStyle: '600',
        color: JEDA.CFG.COLOR.hex.muted
      }).setOrigin(0.5).setResolution(2);

      card.add([bg, title, desc]);

      if (isUnlocked) {
        // Tampilkan bintang & skor terbaik
        const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        const starText = this.add.text(0, 32, `${starStr} (${bestScore})`, {
          fontFamily: JEDA.CFG.FONT.family,
          fontSize: '18px',
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
          this.tweens.add({ targets: card, y: cardY - 4, scale: 1.02, duration: 100, ease: 'Sine.easeOut' });
        });
        card.on('pointerout', () => {
          this.tweens.add({ targets: card, y: cardY, scale: 1.0, duration: 100, ease: 'Sine.easeOut' });
        });
        card.on('pointerup', () => {
          JEDA.FX.transitionTo(this, lvl.sceneKey);
        });
      } else {
        // Status terkunci (BR-01): tampilkan gembok dan alpha 0.4
        card.setAlpha(0.45);
        const lockG = this.add.graphics();
        JEDA.UI.drawLockIcon(lockG, 0, 30, 24, 0xFFFFFF, 0.75);
        card.add(lockG);

        card.setSize(cardW, cardH);
        card.setInteractive({
          hitArea: new Phaser.Geom.Rectangle(-cardW / 2, -cardH / 2, cardW, cardH),
          hitAreaCallback: Phaser.Geom.Rectangle.Contains,
          useHandCursor: true
        });

        card.on('pointerup', () => {
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
   * Tombol G: Toggle visual debug grid
   */
  setupDebugMode() {
    const Layout = JEDA.Layout;
    this.add.text(Layout.M, 130, '⚙ [DEBUG MODE] Tekan G: Grid | Tekan U: Buka Level | Tekan R: Reset', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '18px',
      fontStyle: '700',
      color: JEDA.CFG.COLOR.hex.calm
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
