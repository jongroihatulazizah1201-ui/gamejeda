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

    // 2. Transisi masuk kamera (reset FX untuk menjamin tidak ada residu fade hitam)
    this.cameras.main.resetFX();
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
      if (JEDA.State.isStress()) {
        this.setupStressMode();
      }
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

    // 10. Kartu Pembuka saat game pertama kali dibuka (PRD 15.2 / BR-15)
    if (!JEDA.State.hasSeen('intro')) {
      this.time.delayedCall(400, () => {
        this.showIntroCard();
      });
    }

    // 11. Pembersihan elemen DOM saat berpindah scene
    this.events.on('shutdown', () => {
      if (this.activeTextarea) {
        this.activeTextarea.remove();
        this.activeTextarea = null;
      }
    });
  }

  /**
   * Menampilkan kartu petunjuk pembuka 3 halaman (PRD 15.2 & BR-15).
   */
  showIntroCard() {
    JEDA.UI.helpCard(this, {
      type: 'intro',
      title: 'Selamat Datang di JEDA',
      pages: [
        {
          pageTitle: 'Penjaga Lentera',
          text: 'Selamat datang di JEDA. Kamu penjaga lentera. Tugasmu berhenti sejenak sebelum bereaksi.',
          badge: 'Tugas Utama'
        },
        {
          pageTitle: 'Tiga Perjalanan Sadar',
          text: 'Ada tiga level: Napas, Misi Astronot, dan Jeda di Situasi Nyata. Level baru terbuka setelah level sebelumnya lulus.',
          badge: '3 Tingkatan'
        },
        {
          pageTitle: 'Ruang Aman Tanpa Tekanan',
          text: 'Tidak ada timer dan tidak ada hukuman. Skor hanya untuk melihat kemajuanmu.',
          badge: 'Tanpa Hukuman'
        }
      ],
      onDone: () => {
        JEDA.State.markSeen('intro');
      }
    });
  }

  /**
   * Membuat header simetris di Zona Header (y: 0 - 120 px).
   * Kiri: Identitas brand JEDA sejajar margin 120 px.
   * Kanan: Tombol Bantuan (?) dan Pengaturan sejajar margin kanan (W - 120 px).
   */
  createHeaderButtons() {
    const Layout = JEDA.Layout;
    const headerY = 64; // Pusat zona header (kelipatan 8)
    const btnW = 200;
    const btnH = 48;

    // Badge Kiri Atas: Identitas Game (rata margin kiri 120)
    const leftX = Layout.M + btnW / 2;
    const brandContainer = this.add.container(leftX, headerY);
    const bgL = this.add.graphics();
    bgL.fillStyle(0x181A3C, 0.95);
    bgL.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 24);
    bgL.lineStyle(2, 0x485278, 0.65);
    bgL.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 24);

    const brandText = this.add.text(0, 0, 'JEDA', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.calm
    }).setOrigin(0.5).setResolution(2);
    brandContainer.add([bgL, brandText]);

    // Kanan: Tombol Bantuan (?) dan Pengaturan (sejajar margin kanan 1800)
    const helpBtnSize = 48;
    const helpBtnX = (Layout.W - Layout.M) - helpBtnSize / 2; // 1800 - 24 = 1776
    JEDA.UI.createButton(this, helpBtnX, headerY, helpBtnSize, helpBtnSize, '?', () => {
      this.showIntroCard();
    }, { fontSize: 27, radius: 24 });

    const settingsW = 210;
    const settingsX = helpBtnX - helpBtnSize / 2 - 16 - settingsW / 2;
    JEDA.UI.createButton(this, settingsX, headerY, settingsW, btnH, 'Pengaturan ⚙', () => {
      JEDA.UI.showSettingsModal(this, () => {
        this.renderLevelCards();
      });
    }, { fontSize: 27, radius: 24 });
  }

  /**
   * Membuat panel tengah dan elemen pengiring sesuai PRD 14.5:
   * Logo JEDA (y 160), subjudul, panel M berisi pertanyaan, 5 tombol bulat 96 px,
   * label emosi baris 4 lalu 3, dan tombol Mulai di bawah panel.
   */
  createCenterPanel(cx) {
    const Layout = JEDA.Layout;

    // 1. Logo JEDA (y = 160 sesuai PRD 14.5)
    this.add.text(cx, 160, 'JEDA', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '66px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    // 2. Subjudul & Disclaimer (PRD 14.3 Prinsip 8: Ukuran minimum 27 px)
    this.add.text(cx, 224, 'Latihan berhenti sejenak', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '33px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted
    }).setOrigin(0.5).setResolution(2);

    this.add.text(cx, 264, 'JEDA adalah latihan, bukan pengganti bantuan profesional.', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '400',
      color: JEDA.CFG.COLOR.hex.muted
    }).setOrigin(0.5).setResolution(2);

    // 3. Panel M Baku (Lebar 960 px, tinggi 384 px, radius 32 px, padding 48 px, pusat di y = 480)
    const panelW = Layout.panelSize.M; // 960
    const panelH = 384;
    const panelY = 480; // Pusat panel (top: 288, bottom: 672)
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

    // 4. Pertanyaan dalam panel (y = 328)
    this.add.text(cx, 328, 'Bagaimana perasaanmu sekarang?', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '33px',
      fontStyle: '700',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    // 5. Lima Tombol Bulat 96 px dengan Jarak 32 (PRD 14.5: rowCenter)
    const scoreSize = 96;
    const scoreGap = 32;
    const scoreWidths = [scoreSize, scoreSize, scoreSize, scoreSize, scoreSize];
    const scoreXs = Layout.rowCenter(scoreWidths, scoreGap);
    const scoreY = 416;

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
    const row1Widths = [192, 192, 192, 192];
    const row1Xs = Layout.rowCenter(row1Widths, 24);
    const emoY1 = 544;

    emotionsRow1.forEach((label, idx) => {
      const chip = JEDA.UI.chip(this, row1Xs[idx], emoY1, row1Widths[idx], 48, label, false, () => {
        this.selectLabel(label);
      }, { fontSize: 27 });
      chip.labelName = label;
      this.labelButtons.push(chip);
    });

    // Baris 2: 3 emosi (Sedih, Panik, Aku merasa tidak aman)
    const emotionsRow2 = [
      { name: 'Sedih', w: 200, sensitive: false },
      { name: 'Panik', w: 200, sensitive: true },
      { name: 'Aku merasa tidak aman', w: 380, sensitive: true }
    ];
    const row2Widths = emotionsRow2.map(e => e.w);
    const row2Xs = Layout.rowCenter(row2Widths, 24);
    const emoY2 = 608;

    emotionsRow2.forEach((item, idx) => {
      const chip = JEDA.UI.chip(this, row2Xs[idx], emoY2, item.w, 48, item.name, false, () => {
        this.selectLabel(item.name);
      }, { fontSize: 27, sensitive: item.sensitive });
      chip.labelName = item.name;
      this.labelButtons.push(chip);
    });

    // 7. Tombol Mulai dan Mode Jurnal (opsional) (PRD 14.5 & 15.6)
    // Panel bottom = 480 + 384/2 = 672. 672 + 48 = 720. Pusat tombol = 720 + 44 = 764.
    const startW = 280;
    const journalW = 340;
    const btnGap = 24;
    const btnXs = Layout.rowCenter([startW, journalW], btnGap);

    this.startButton = JEDA.UI.createButton(this, btnXs[0], 764, startW, 88, 'Mulai', () => {
      this.handleStartClick();
    }, { primary: true, disabled: true, radius: 44, fontSize: 33 });

    this.journalButton = JEDA.UI.createButton(this, btnXs[1], 764, journalW, 88, 'Mode Jurnal (opsional)', () => {
      this.openJournalModal();
    }, { primary: false, radius: 44, fontSize: 27 });
  }

  /**
   * Menampilkan modal Mode Jurnal dengan kartu persetujuan dan input textarea HTML (PRD 15.6, BR-19, BR-20).
   */
  openJournalModal() {
    const Layout = JEDA.Layout;
    const cx = Layout.cx();
    const cy = Layout.cy();
    const W = Layout.W;
    const H = Layout.H;

    // Bersihkan textarea jika masih ada
    if (this.activeTextarea) {
      this.activeTextarea.remove();
      this.activeTextarea = null;
    }

    const modal = this.add.container(cx, cy).setDepth(3000);

    // Backdrop redup
    const backdrop = this.add.rectangle(0, 0, W, H, 0x070818, 0.85)
      .setInteractive();
    modal.add(backdrop);

    // Panel Kaca Modal (Panel M: Lebar 960 px, tinggi 680 px)
    const cardW = Layout.panelSize.M; // 960 px (PRD 14.3)
    const cardH = 680; // Kelipatan 8 (85 * 8)
    const cardBg = this.add.graphics();
    // 100% Solid Base
    cardBg.fillStyle(0x0E1026, 1.0);
    cardBg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 32);
    cardBg.fillStyle(0x131535, 0.96);
    cardBg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 32);
    cardBg.lineStyle(2, 0x7FE0C3, 0.65);
    cardBg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 32);
    modal.add(cardBg);

    // Judul Modal
    const titleT = this.add.text(0, -cardH / 2 + 54, 'Mode Jurnal (Misi Pribadi)', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '36px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.calm
    }).setOrigin(0.5).setResolution(2);

    // Kartu Persetujuan & Penjelasan Privasi (BR-19)
    const noticeText = 'Tulisanmu hanya diproses di perangkat ini, tidak dikirim ke mana pun,\ndan hilang saat sesi berakhir. Hindari menulis nama orang lain.';
    const noticeT = this.add.text(0, -cardH / 2 + 115, noticeText, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '22px',
      fontStyle: '600',
      color: '#CBD5E1',
      align: 'center',
      lineSpacing: 6
    }).setOrigin(0.5).setResolution(2);

    // Counter Kalimat Real-time
    const counterT = this.add.text(0, 160, 'Terdeteksi: 0 kalimat (minimal 3, maksimal 12 kalimat)', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '22px',
      fontStyle: '700',
      color: '#94A3B8'
    }).setOrigin(0.5).setResolution(2);

    // Tombol Batal & Buat Misi
    const btnW = 280;
    const btnH = 72;
    const btnGap = 32;
    const btnY = cardH / 2 - 64;

    const cleanupModal = () => {
      if (this.activeTextarea) {
        this.activeTextarea.remove();
        this.activeTextarea = null;
      }
      modal.destroy();
    };

    const cancelBtn = JEDA.UI.createButton(this, -(btnW / 2 + btnGap / 2), btnY, btnW, btnH, 'Batal', () => {
      cleanupModal();
    }, { radius: 36, fontSize: 27 });

    const submitBtn = JEDA.UI.createButton(this, (btnW / 2 + btnGap / 2), btnY, btnW, btnH, 'Buat Misi', () => {
      if (!this.activeTextarea) return;
      const text = this.activeTextarea.value.trim();

      // Cek krisis bahaya diri (BR-20)
      if (JEDA.Journal && JEDA.Journal.crisis(text)) {
        cleanupModal();
        JEDA.UI.showCareModal(
          this,
          () => {
            JEDA.State.data.consentHeavy = true;
            JEDA.State.data.easy.l1 = true;
            JEDA.State.save();
            JEDA.FX.transitionTo(this, 'Level1Scene', { easyMode: true });
          },
          () => {
            JEDA.State.data.consentHeavy = false;
            JEDA.State.save();
            JEDA.FX.transitionTo(this, 'Level1Scene', { easyMode: false });
          }
        );
        return;
      }

      // Validasi jumlah kalimat
      const sentences = (JEDA.Journal && JEDA.Journal.split) ? JEDA.Journal.split(text) : [];
      if (sentences.length < 3) {
        JEDA.UI.toast(this, 'Tulis minimal 3 kalimat lengkap (akhiri tanda titik, seru, atau tanya).');
        return;
      }

      // Bangun dek monster jurnal (BR-19)
      const res = JEDA.Journal.build(text);
      if (res.crisis) {
        cleanupModal();
        JEDA.UI.showCareModal(
          this,
          () => {
            JEDA.State.data.consentHeavy = true;
            JEDA.State.data.easy.l1 = true;
            JEDA.State.save();
            JEDA.FX.transitionTo(this, 'Level1Scene', { easyMode: true });
          },
          () => {
            JEDA.State.data.consentHeavy = false;
            JEDA.State.save();
            JEDA.FX.transitionTo(this, 'Level1Scene', { easyMode: false });
          }
        );
        return;
      }

      cleanupModal();
      JEDA.UI.toast(this, `Misi Astronot dibuat dengan ${res.monsters.length} monster pikiran.`);

      // Simpan ke state session
      if (JEDA.State && JEDA.State.session) {
        JEDA.State.session.journalMonsters = res.monsters;
      }

      // Buka Level 2 langsung dengan dek jurnal
      this.time.delayedCall(400, () => {
        JEDA.FX.transitionTo(this, 'Level2Scene', { monsters: res.monsters });
      });
    }, { primary: true, radius: 36, fontSize: 27 });

    modal.add([titleT, noticeT, counterT, cancelBtn, submitBtn]);

    // Pasang HTML textarea di atas kanvas
    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Ketik 3 sampai 12 kalimat tentang apa yang ada di pikiranmu saat ini...\n\nContoh:\n- Besok aku harus mulai mengerjakan laporan akhir.\n- Bagaimana kalau aku gagal dalam ujian nanti?\n- Dulu waktu semester satu nilaiku jelek sekali.';
    textarea.style.position = 'fixed';
    textarea.style.left = '50%';
    textarea.style.top = '48%';
    textarea.style.transform = 'translate(-50%, -50%)';
    textarea.style.width = 'min(864px, 80vw)';
    textarea.style.height = '230px';
    textarea.style.backgroundColor = '#0E102A';
    textarea.style.color = '#FFFFFF';
    textarea.style.fontFamily = "'Nunito', sans-serif";
    textarea.style.fontSize = '18px';
    textarea.style.lineHeight = '1.6';
    textarea.style.padding = '18px 22px';
    textarea.style.border = '2px solid #485278';
    textarea.style.borderRadius = '18px';
    textarea.style.outline = 'none';
    textarea.style.boxShadow = '0 8px 32px rgba(0,0,0,0.55)';
    textarea.style.zIndex = '9999';
    textarea.style.resize = 'none';

    textarea.addEventListener('input', () => {
      if (JEDA.Journal && JEDA.Journal.split) {
        const count = JEDA.Journal.split(textarea.value).length;
        counterT.setText(`Terdeteksi: ${count} kalimat (minimal 3, maksimal 12 kalimat)`);
        counterT.setColor(count >= 3 ? '#7FE0C3' : '#94A3B8');
      }
    });

    document.body.appendChild(textarea);
    textarea.focus();
    this.activeTextarea = textarea;

    // Listener Esc untuk menutup modal
    const escListener = (event) => {
      if (event.key === 'Escape') {
        window.removeEventListener('keydown', escListener);
        cleanupModal();
      }
    };
    window.addEventListener('keydown', escListener);
  }

  /**
   * Membuat tombol bulat 96 px untuk pilihan skor perasaan (PRD 14.5).
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
      fontSize: '33px',
      fontStyle: '800',
      color: '#FFFFFF'
    }).setOrigin(0.5).setResolution(2);

    container.add([bg, numText]);

    if (subLabel) {
      const sub = this.add.text(0, radius + 22, subLabel, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '27px',
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

    // Zona aksi: y = 900..1080. Pusat kartu = 980 (tinggi 128 px, skala 8px)
    const cardY = 980;
    const cardW = Layout.colSpan(4); // 544 px
    const cardH = 128;
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

      // Judul level (Prinsip 8: Hierarki teks 33 px)
      const title = this.add.text(0, -32, lvl.name, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '33px',
        fontStyle: '800',
        color: isUnlocked ? '#FFFFFF' : JEDA.CFG.COLOR.hex.muted
      }).setOrigin(0.5).setResolution(2);

      // Deskripsi singkat (Prinsip 8: Ukuran minimum 27 px)
      const desc = this.add.text(0, 4, lvl.desc, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '27px',
        fontStyle: '600',
        color: JEDA.CFG.COLOR.hex.muted
      }).setOrigin(0.5).setResolution(2);

      card.add([bg, title, desc]);

      if (isUnlocked) {
        // Tampilkan bintang & skor terbaik (Prinsip 8: Ukuran minimum 27 px)
        const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        const starText = this.add.text(0, 38, `${starStr} (${bestScore})`, {
          fontFamily: JEDA.CFG.FONT.family,
          fontSize: '27px',
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
      fontSize: '27px',
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

  /**
   * Menyiapkan pengujian stres visual (?debug=1&stress=1) untuk membuktikan simetri dan toleransi teks ekstrem.
   * Menampilkan seluruh komponen dengan teks terpanjang yang mungkin:
   * 1. Notifikasi (60 karakter)
   * 2. Toast umpan balik (90 karakter)
   * 3. Gelembung ucapan Lumi (120 karakter)
   * 4. Plat label pikiran (100 karakter)
   * 5. Kata sangat panjang tanpa spasi (unbroken string)
   */
  setupStressMode() {
    const Layout = JEDA.Layout;
    const cx = Layout.cx();
    const stressContainer = this.add.container(0, 0).setDepth(8000);

    // 1. Notifikasi dengan 60 karakter
    const notifBox = JEDA.UI.textBox(this, cx, 230, {
      text: 'Info Terkini: Jangan lupa tugas akhir yang harus dikumpul!',
      icon: '🔔',
      fontSize: 22,
      padX: 24,
      padY: 16,
      variant: 'notif'
    });

    // 2. Toast dengan 90 karakter
    const toastBox = JEDA.UI.textBox(this, cx, 330, {
      text: 'Umpan Balik: Latihan napas berhasil diselesaikan dengan ketenangan penuh dan fokus sadar.',
      fontSize: 24,
      padX: 24,
      padY: 16,
      maxW: 1080,
      variant: 'toast'
    });

    // 3. Gelembung ucapan Lumi dengan 120 karakter
    const lumiBox = JEDA.UI.textBox(this, cx, 470, {
      text: 'Lumi berbisik lembut: Kamu telah melangkah dengan berani hari ini. Setiap napas perlahan membawamu kembali ke ruang damai.',
      fontSize: 26,
      padX: 32,
      padY: 20,
      maxW: 1000,
      variant: 'bubble'
    });

    // 4. Label pikiran dengan 100 karakter
    const thoughtBox = JEDA.UI.textBox(this, cx - 320, 640, {
      text: 'Pikiran: Mengapa semua tugas terasa begitu menumpuk dan apakah aku mampu menyelesaikannya tepat waktu?',
      fontSize: 24,
      padX: 20,
      padY: 12,
      minW: 400,
      maxW: 560,
      variant: 'chip',
      strokeColor: 0x7FE0C3
    });

    // 5. Teks kata sangat panjang tanpa spasi (unbroken string)
    const unbrokenBox = JEDA.UI.textBox(this, cx + 320, 640, {
      text: 'KATA_EKSTREM: SUPERPANJANGTANPASPASIUNTUKMENGUJIAUTOFITDANKEMAMPUANTEXTBOXAGARTIDAKPERNAHMELUAP',
      fontSize: 24,
      padX: 24,
      padY: 16,
      minW: 400,
      maxW: 560,
      variant: 'notif'
    });

    stressContainer.add([notifBox, toastBox, lumiBox, thoughtBox, unbrokenBox]);

    console.log('=== [STRESS TEST METRICS] ===');
    const items = [
      { name: 'Notifikasi (60 char)', box: notifBox },
      { name: 'Toast (90 char)', box: toastBox },
      { name: 'Lumi Bubble (120 char)', box: lumiBox },
      { name: 'Thought Label (100 char)', box: thoughtBox },
      { name: 'Unbroken Word (81 char)', box: unbrokenBox }
    ];
    console.table(items.map(i => ({
      Component: i.name,
      PanelW: i.box.panelW,
      PanelH: i.box.panelH,
      TextW: i.box.measuredTextW,
      LeftPad: Math.round(i.box.leftPadding),
      RightPad: Math.round(i.box.rightPadding),
      Delta: `${i.box.paddingDelta}px`
    })));
  }
}

window.CheckinScene = CheckinScene;
