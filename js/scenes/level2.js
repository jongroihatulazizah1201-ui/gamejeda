/**
 * JEDA - Level2Scene (js/scenes/level2.js)
 * Misi Astronot (Menjinakkan Monster Pikiran dengan Pelabelan Sadar)
 * Sesuai PRD Bagian 15.4, 15.5, 15.6, dan 14.3 (Poin 1-11, BR-17, BR-18, BR-19, BR-20):
 * 
 * Mekanik:
 * - 4 Astronot kru Lumi (tombol 1 - 4 atau klik potret):
 *   1: Penenang (#6EC6FF, Cemas, ~)
 *   2: Navigator (#FFB86B, Rencana, →)
 *   3: Sahabat (#B69CFF, Menilai Diri, ♥)
 *   4: Arsiparis (#E6EEF7, Kenangan, ⏱)
 * - Tembak 180 derajat: sinar berawal dari moncong astronot terpilih menuju monster mana pun.
 * - Astronot berputar menghadap target (rotasi dibatasi maks 85 derajat kiri-kanan dari vertikal).
 * - Pengisian napas 0,5 detik hanya berjalan jika ada target yang disorot (reticle snap radius 100 px).
 * - Spasi memakai target terakhir yang disorot.
 * - 5 Slot monster tetap di layar: (480,360), (960,360), (1440,360), (720,600), (1200,600).
 * - Pemunculan serial: 1 per 1, jeda minimal 2,5 detik, hanya di slot kosong, slot berbeda dari sebelumnya, maks 4 monster.
 * - Plat label pikiran tetap 400x104 px di bawah badan monster (jarak 8 px), CanvasTexture 1024x256 tajam.
 * - BR-19: Mendukung monster personal Mode Jurnal, tombol "Tidak cocok" untuk mengeluarkan tanpa penalti/perhitungan skor.
 * - Mode Debug (tombol G): gambar 5 kotak slot, sumbu tengah x 960, garis tombol-ke-astronot (dx = 0), dan garis sudut bidik.
 */
class Level2Scene extends Phaser.Scene {
  constructor() {
    super({ key: 'Level2Scene' });
  }

  init(data) {
    // Pastikan level terbuka (Guard)
    if (window.JEDA && JEDA.Guard && JEDA.Guard.ensureLevelUnlocked) {
      if (!JEDA.Guard.ensureLevelUnlocked(this, 2)) return;
    }

    // Dek pikiran: Prioritaskan monster dari Mode Jurnal jika tersedia (PRD 15.6 / BR-19)
    if (data && Array.isArray(data.monsters) && data.monsters.length > 0) {
      this.deck = data.monsters.map(m => ({
        id: m.id || ('j_' + Math.random()),
        text: m.text,
        cat: m.cat,
        hint: m.hint || `Perhatikan apakah pikiran ini tentang ${m.cat}.`,
        isJournal: !!m.isJournal,
        matchedWord: m.matchedWord || ''
      }));
    } else if (JEDA.State && JEDA.State.session && Array.isArray(JEDA.State.session.journalMonsters) && JEDA.State.session.journalMonsters.length > 0) {
      this.deck = JEDA.State.session.journalMonsters;
    } else {
      // Ambil 10 pikiran dari dek 30 pikiran terkurasi (PRD 15.5)
      const prevIds = (JEDA.State && JEDA.State.session && JEDA.State.session.lastDeckIds) || [];
      this.deck = (JEDA.Score && JEDA.Score.drawDeck)
        ? JEDA.Score.drawDeck(prevIds)
        : this.getFallbackDeck();

      if (JEDA.State && JEDA.State.session) {
        JEDA.State.session.lastDeckIds = this.deck.map(t => t.id);
      }
    }

    // Metrik dan status Level 2
    this.totalThoughts = Math.min(10, this.deck.length);
    this.spawnedCount = 0;
    this.defeatedCount = 0;
    this.firstTryCorrect = 0;
    this.panicHits = (JEDA.State && JEDA.State.session && JEDA.State.session.panicHits) || 0;
    this.activeMonsters = []; // { id, thought, slotIndex, slotPos, hasFailed, is2D, container2D, dismissBtn }
    this.isFinished = false;
    this.isHelpOpen = false;

    // 5 Slot Tetap di Ruang Layar 1920x1080 (Poin 6)
    this.SLOTS = [
      { x: 480, y: 360 },
      { x: 960, y: 360 },
      { x: 1440, y: 360 },
      { x: 720, y: 600 },
      { x: 1200, y: 600 }
    ];
    this.lastSpawnedSlotIndex = -1;
    this.lastSpawnTime = 0;

    // Kontrol Astronot & Menembak (BR-17 & Poin 8)
    this.selectedAstronautIndex = 0; // 0..3 (Default: Penenang)
    this.isCharging = false;
    this.chargeTime = 0; // ms
    this.chargeThreshold = 500; // 0,5 detik napas
    this.currentTargetMonster = null;
    this.lastHighlightedMonster = null;
    this.isFiring = false;

    // Mode Debug (Poin 10)
    this.isDebugMode = false;
    this.debugGraphics = null;
    this.debugTexts = [];

    // Pemantau penumpukan & anti-spam (BR-05)
    this.stagnantAccumulationTime = 0;
    this.clickHistory = [];
  }

  create() {
    const Layout = JEDA.Layout;
    const cx = Layout.cx();

    // 1. Inisialisasi Panggung 3D Mode L2 (Poin 3: Sembunyikan orb Lumi dan pulau lentera)
    if (window.JEDA && JEDA.Stage3D && JEDA.Stage3D.isActive()) {
      JEDA.Stage3D.setMode('l2');
      JEDA.Stage3D.setCalm(0.5);
      JEDA.Stage3D.setLanterns(1);
      if (JEDA.Stage3D.l2 && JEDA.Stage3D.l2.clear) {
        JEDA.Stage3D.l2.clear();
      }
    }

    // Latar belakang lembut & transisi kamera
    JEDA.FX.createBackground(this);
    this.cameras.main.resetFX();
    this.cameras.main.fadeIn(350);

    // 2. Definisi 4 Astronot (Poin 4: Penenang, Navigator, Sahabat, Arsiparis)
    this.astronautConfigs = [
      { index: 0, key: '1', name: 'Penenang', cat: 'Cemas', color: 0x6EC6FF, colorHex: '#6EC6FF', icon: '~', sx: 393 },
      { index: 1, key: '2', name: 'Navigator', cat: 'Rencana', color: 0xFFB86B, colorHex: '#FFB86B', icon: '→', sx: 771 },
      { index: 2, key: '3', name: 'Sahabat', cat: 'Menilai Diri', color: 0xB69CFF, colorHex: '#B69CFF', icon: '♥', sx: 1149 },
      { index: 3, key: '4', name: 'Arsiparis', cat: 'Kenangan', color: 0xE6EEF7, colorHex: '#E6EEF7', icon: '⏱', sx: 1527 }
    ];

    // 3. Header Simetris di Zona Header y: 0 - 120 (Poin 1)
    this.createHeader();

    // 4. Gelembung Lumi Pendamping (Poin 2: Pusat x 960, y 190, maks lebar 1000, tinggi dinamis)
    if (JEDA.Lumi) {
      JEDA.Lumi.init(this, {
        bubbleX: 960,
        bubbleY: 190,
        showMeter: false,
        resetFlow: true
      });
      this.time.delayedCall(600, () => {
        if (!this.isFinished) JEDA.Lumi.say('l2_intro');
      });
    }

    // 5. Bilah 4 Potret Astronot di Zona Aksi (Poin 5: 330x96, pusat y 980, centers 393, 771, 1149, 1527)
    this.createAstronautBar(cx, 980);

    // 6. Kursor Bidik & Cincin Napas (Reticle & Charge Ring)
    this.createReticle();

    // 7. Kontrol Masukan Keyboard & Pointer
    this.setupInputControls();

    // 8. Munculkan Monster Pertama Serial
    this.time.delayedCall(450, () => {
      if (!this.isHelpOpen && !this.isFinished && this.activeMonsters.length === 0) {
        this.spawnMonster();
      }
    });

    // 9. Timer Pemunculan Serial Monster (Poin 6: Jeda minimal 2,5 detik, maks 4 di layar)
    this.spawnTimer = this.time.addEvent({
      delay: 2700,
      loop: true,
      callback: () => {
        if (!this.isFinished && !this.isHelpOpen && this.activeMonsters.length < 4 && this.spawnedCount < this.totalThoughts) {
          const now = Date.now();
          if (now - this.lastSpawnTime >= 2500) {
            this.spawnMonster();
          }
        }
      }
    });

    // 10. Tampilkan Kartu Petunjuk saat pertama kali dibuka (PRD 15.2 / BR-15)
    if (JEDA.State && JEDA.State.hasSeen && !JEDA.State.hasSeen('l2')) {
      this.time.delayedCall(300, () => {
        this.showHelpModal();
      });
    }

    // Pembersihan event saat shutdown
    this.events.on('shutdown', () => {
      if (this.spawnTimer) this.spawnTimer.remove(false);
      if (window.JEDA && JEDA.Stage3D && JEDA.Stage3D.l2 && JEDA.Stage3D.l2.clear) {
        JEDA.Stage3D.l2.clear();
      }
      if (JEDA.Lumi) JEDA.Lumi.destroy();
      if (this.debugTexts) {
        this.debugTexts.forEach(t => t.destroy());
      }
    });
  }

  /**
   * Menyesuaikan ukuran font secara otomatis agar teks tidak pernah keluar dari tombol (Poin 5).
   */
  fitText(textObj, maxWidth, baseSize) {
    let size = baseSize;
    textObj.setFontSize(`${size}px`);
    while (textObj.width > maxWidth && size > 16) {
      size -= 1;
      textObj.setFontSize(`${size}px`);
    }
  }

  /**
   * Membuat header simetris di Zona Header (y: 0 - 120 px) sesuai Poin 1:
   * - Tombol Menu kiri di x = 120
   * - Judul satu baris 'Level 2: Misi Astronot' tepat di tengah (x = 960)
   * - Lebar panel judul DIUKUR dari teks (lebar teks + 96) dan tidak memotong teks
   * - Subjudul panjang dihapus dari header
   * - Penghitung 'Dijinakkan 0 / 10' dan tombol ? di kanan (margin 120 px)
   */
  createHeader() {
    const Layout = JEDA.Layout;
    const headerY = 60; // Pusat vertikal y 0..120
    const btnW = 140;
    const btnH = 48;

    // 1. Tombol Menu kiri (x 120)
    JEDA.UI.createButton(this, 120, headerY, btnW, btnH, '← Menu', () => {
      if (JEDA.Stage3D) JEDA.Stage3D.setMode('menu');
      JEDA.FX.transitionTo(this, 'CheckinScene');
    }, { fontSize: 27, radius: 24 });

    // 2. Judul satu baris di tengah x = 960
    const titleText = this.add.text(960, headerY, 'Level 2: Misi Astronot', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '33px',
      fontStyle: '800',
      color: '#FFFFFF'
    }).setOrigin(0.5).setResolution(2);

    // Lebar panel diukur dari teks (lebar teks + 96 px)
    const panelW = titleText.width + 96;
    const panelH = 56;
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x12142E, 0.94);
    headerBg.fillRoundedRect(960 - panelW / 2, headerY - panelH / 2, panelW, panelH, 24);
    headerBg.lineStyle(2, 0x3F486E, 0.75);
    headerBg.strokeRoundedRect(960 - panelW / 2, headerY - panelH / 2, panelW, panelH, 24);
    headerBg.setDepth(5);
    titleText.setDepth(6);

    // 3. Kanan: Tombol Bantuan (?) dan Penghitung Progres (margin 120)
    const helpBtnSize = 48;
    const helpBtnX = (Layout.W - Layout.M) - helpBtnSize / 2; // 1800 - 24 = 1776
    this.helpButton = JEDA.UI.createButton(this, helpBtnX, headerY, helpBtnSize, helpBtnSize, '?', () => {
      this.showHelpModal();
    }, { fontSize: 27, radius: 24, depth: 100 });
    this.helpButton.setDepth(100);

    const counterW = 288; // Kelipatan 8 (36 * 8, ruang lega dari lengkungan)
    const counterX = helpBtnX - helpBtnSize / 2 - 16 - counterW / 2; // 1752 - 16 - 144 = 1592

    this.progressBox = JEDA.UI.textBox(this, counterX, headerY, {
      text: `Dijinakkan 0 / ${this.totalThoughts}`,
      fontSize: 24,
      fontWeight: '800',
      padX: 24,
      padY: 10,
      minW: counterW,
      minH: btnH,
      variant: 'chip'
    }).setDepth(6);
    this.progressText = this.progressBox.textObj;
  }

  /**
   * Membuat bilah 4 potret astronot di Zona Aksi sesuai Poin 4 dan 5:
   * - 330x96 px, pusat y = 980
   * - Pusat x astronot = pusat x tombol potret: [393, 771, 1149, 1527]
   * - Isi: ikon di kiri, dua baris teks (nama 30 px, kategori 24 px)
   * - fitText agar teks tidak pernah keluar tombol
   * - Hanya tombol terpilih yang bergaris tebal
   */
  createAstronautBar(cx, y = 980) {
    const Layout = JEDA.Layout;
    const cardW = 330;
    const cardH = 96;
    const cardGap = 48;
    const widths = [cardW, cardW, cardW, cardW];
    const xs = Layout.rowCenter(widths, cardGap); // [393, 771, 1149, 1527]

    this.astronautCards = [];

    this.astronautConfigs.forEach((cfg, idx) => {
      const cardX = xs[idx];
      const container = this.add.container(cardX, y).setDepth(20);

      const bg = this.add.graphics();
      container.add(bg);

      // Angka tombol shortcut [1..4]
      const keyBadge = this.add.text(-cardW / 2 + 18, -cardH / 2 + 18, `[${cfg.key}]`, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '20px',
        fontStyle: '800',
        color: cfg.colorHex
      }).setOrigin(0, 0.5).setResolution(2);

      // Ikon di kiri
      const iconText = this.add.text(-cardW / 2 + 32, 10, cfg.icon, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '36px',
        fontStyle: '800',
        color: cfg.colorHex
      }).setOrigin(0.5, 0.5).setResolution(2);

      // Dua baris teks: Nama 30 px, Kategori 24 px dengan fitText
      const maxTextW = cardW - 88;
      const nameText = this.add.text(-cardW / 2 + 68, -14, cfg.name, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '30px',
        fontStyle: '800',
        color: '#FFFFFF'
      }).setOrigin(0, 0.5).setResolution(2);
      this.fitText(nameText, maxTextW, 30);

      const catText = this.add.text(-cardW / 2 + 68, 18, cfg.cat, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '24px',
        fontStyle: '700',
        color: cfg.colorHex
      }).setOrigin(0, 0.5).setResolution(2);
      this.fitText(catText, maxTextW, 24);

      container.add([keyBadge, iconText, nameText, catText]);

      container.setSize(cardW, cardH);
      container.setInteractive({ useHandCursor: true });
      container.on('pointerdown', () => {
        this.selectAstronaut(idx);
      });

      this.astronautCards.push({
        container: container,
        bg: bg,
        cfg: cfg,
        idx: idx,
        cardW: cardW,
        cardH: cardH
      });
    });

    this.updateAstronautBarVisuals();
  }

  /**
   * Memperbarui visual kartu astronot saat pemilihan berubah (Poin 5: hanya yang terpilih bergaris tebal).
   */
  updateAstronautBarVisuals() {
    this.astronautCards.forEach(item => {
      const isSelected = (item.idx === this.selectedAstronautIndex);
      const bg = item.bg;
      const cardW = item.cardW;
      const cardH = item.cardH;
      bg.clear();

      if (isSelected) {
        // Efek aktif: border tebal 4 px menyala
        bg.fillStyle(0x1B1E48, 0.96);
        bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);

        bg.lineStyle(4, item.cfg.color, 1.0);
        bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);

        // Pendar lembut
        bg.lineStyle(1.5, 0xFFFFFF, 0.5);
        bg.strokeRoundedRect(-cardW / 2 - 2, -cardH / 2 - 2, cardW + 4, cardH + 4, 22);

        item.container.setScale(1.03);
      } else {
        // Status santai: garis tipis 1.5 px
        bg.fillStyle(0x101332, 0.88);
        bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);

        bg.lineStyle(1.5, 0x364064, 0.5);
        bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);

        item.container.setScale(1.0);
      }
    });

    // Sinkronkan ke panggung 3D (skala 1.1 dan cincin cahaya di kaki, Poin 4)
    if (window.JEDA && JEDA.Stage3D && JEDA.Stage3D.l2 && JEDA.Stage3D.l2.selectAstronaut) {
      JEDA.Stage3D.l2.selectAstronaut(this.selectedAstronautIndex);
    }
  }

  /**
   * Berpindah memilih astronot aktif (0..3).
   */
  selectAstronaut(index) {
    if (index < 0 || index >= this.astronautConfigs.length) return;
    this.selectedAstronautIndex = index;
    this.updateAstronautBarVisuals();

    // Umpan balik audio lembut
    if (window.JEDA && JEDA.FX && JEDA.FX.playChime) {
      JEDA.FX.playChime(440 + index * 80, 0.08);
    }
  }

  /**
   * Membuat kursor bidik (reticle) dan cincin pengisian napas 0,5 detik.
   */
  createReticle() {
    this.reticleContainer = this.add.container(-100, -100).setDepth(2500);
    this.reticleGraphics = this.add.graphics();
    this.reticleContainer.add(this.reticleGraphics);

    this.reticleLabel = this.add.text(0, 52, '', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '22px',
      fontStyle: '800',
      color: '#FFFFFF',
      backgroundColor: 'rgba(15, 18, 44, 0.85)',
      padding: { x: 10, y: 4 }
    }).setOrigin(0.5).setResolution(2);
    this.reticleContainer.add(this.reticleLabel);

    this.reticleContainer.setVisible(false);
  }

  /**
   * Mengatur kontrol masukan keyboard dan pointer (mouse / touch).
   */
  setupInputControls() {
    // 1. Tombol angka 1, 2, 3, 4 untuk ganti astronot
    const keys = ['ONE', 'TWO', 'THREE', 'FOUR'];
    keys.forEach((k, idx) => {
      this.input.keyboard.on(`keydown-${k}`, () => {
        if (!this.isHelpOpen && !this.isFinished) {
          this.selectAstronaut(idx);
        }
      });
    });

    // Numpad 1..4
    ['NUMPAD_ONE', 'NUMPAD_TWO', 'NUMPAD_THREE', 'NUMPAD_FOUR'].forEach((k, idx) => {
      this.input.keyboard.on(`keydown-${k}`, () => {
        if (!this.isHelpOpen && !this.isFinished) {
          this.selectAstronaut(idx);
        }
      });
    });

    // 2. Tombol Spasi untuk mengisi napas & menembak (Poin 8: memakai target terakhir yang disorot)
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.spaceKey.on('down', () => {
      if (!this.isHelpOpen && !this.isFinished && !this.isCharging) {
        this.startChargeWithSpace();
      }
    });
    this.spaceKey.on('up', () => {
      if (this.isCharging) {
        this.releaseCharge();
      }
    });

    // 3. Pointer Down / Up / Move (Poin 8 & 9)
    this.input.on('pointerdown', (pointer) => {
      if (this.isHelpOpen || this.isFinished) return;

      this.recordUserAction();

      // Hindari menembak jika mengklik tombol astronot atau header
      if (pointer.y > 880 || pointer.y < 120) return;

      this.startCharge(pointer);
    });

    this.input.on('pointerup', () => {
      if (this.isCharging) {
        this.releaseCharge();
      }
    });

    this.input.on('pointermove', (pointer) => {
      this.lastPointerX = pointer.x;
      this.lastPointerY = pointer.y;

      // Snapping kursor bidik ke monster terdekat dalam radius 100 px (Poin 8)
      this.updateReticleHover(pointer);
    });

    // 4. Tombol Esc untuk petunjuk
    this.input.keyboard.on('keydown-ESC', () => {
      if (!this.isHelpOpen) {
        this.showHelpModal();
      }
    });

    // 5. Mode Debug (Poin 10: tombol G hanya jika ?debug=1)
    const isDebug = window.JEDA && JEDA.State && JEDA.State.isDebug && JEDA.State.isDebug();
    if (isDebug && this.input && this.input.keyboard) {
      this.input.keyboard.on('keydown-G', () => {
        this.toggleDebugOverlay();
      });
    }
  }

  /**
   * Menyorot dan menempelkan kursor bidik ke monster terdekat dalam radius 100 px (Poin 8).
   */
  updateReticleHover(pointer) {
    if (this.isCharging) return; // Jika sedang charging, posisi reticle terkunci pada target

    let nearest = null;
    let minD = 100; // Radius snap 100 px (Poin 8)

    // Cek picking 3D terlebih dahulu (Poin 9: radius 100 px atau plat label)
    if (window.JEDA && JEDA.Stage3D && JEDA.Stage3D.l2 && JEDA.Stage3D.l2.pick) {
      const pickedId = JEDA.Stage3D.l2.pick(pointer);
      if (pickedId) {
        const found = this.activeMonsters.find(m => m.id === pickedId);
        if (found) {
          nearest = found;
          minD = 0;
        }
      }
    }

    if (!nearest) {
      this.activeMonsters.forEach(m => {
        const pos = this.getMonsterPos(m);
        if (pos) {
          const d = Math.hypot(pointer.x - pos.x, pointer.y - pos.y);
          if (d <= minD) {
            minD = d;
            nearest = m;
          }
        }
      });
    }

    if (nearest) {
      this.currentTargetMonster = nearest;
      this.lastHighlightedMonster = nearest;
      const spos = this.getMonsterPos(nearest);
      if (spos) {
        this.reticleContainer.setPosition(spos.x, spos.y);
        this.reticleContainer.setVisible(true);

        // Arahkan astronot berputar menghadap sasaran (Poin 8)
        if (window.JEDA && JEDA.Stage3D && JEDA.Stage3D.l2 && JEDA.Stage3D.l2.aim) {
          JEDA.Stage3D.l2.aim(this.selectedAstronautIndex, spos.x, spos.y);
        }
      }
    } else {
      this.currentTargetMonster = null;
      this.reticleContainer.setVisible(false);
    }
  }

  /**
   * Mengambil posisi layar monster { x, y }.
   */
  getMonsterPos(monster) {
    if (!monster) return null;
    if (monster.slotPos) return monster.slotPos;
    if (monster.is2D && monster.container2D) {
      return { x: monster.container2D.x, y: monster.container2D.y };
    }
    if (window.JEDA && JEDA.Stage3D && JEDA.Stage3D.l2 && JEDA.Stage3D.l2.getMonsterScreenPos) {
      return JEDA.Stage3D.l2.getMonsterScreenPos(monster.id);
    }
    return null;
  }

  /**
   * Mencatat aksi pengguna untuk perlindungan panik klik (BR-05).
   */
  recordUserAction() {
    const now = Date.now();
    this.clickHistory.push(now);
    this.clickHistory = this.clickHistory.filter(t => now - t <= 3000);

    if (this.clickHistory.length > 5) {
      this.panicHits++;
      this.clickHistory = [];

      if (JEDA.State && JEDA.State.session) {
        JEDA.State.session.panicHits = (JEDA.State.session.panicHits || 0) + 1;
      }
      if (window.JEDA && JEDA.Stage3D && JEDA.Stage3D.panicDim) {
        JEDA.Stage3D.panicDim();
      }
      if (JEDA.Lumi) {
        JEDA.Lumi.addFlow(-20);
        JEDA.Lumi.say('panic');
      }
      JEDA.UI.showPanicOverlay(this);
    }
  }

  /**
   * Menemukan sasaran monster dari pointer atau picking (Poin 8 & 9).
   */
  resolveTargetMonster(pointerOrPos) {
    if (this.activeMonsters.length === 0) return null;

    // 1. Cek picking via Stage3D (Poin 9)
    if (window.JEDA && JEDA.Stage3D && JEDA.Stage3D.l2 && JEDA.Stage3D.l2.pick) {
      const pickedId = JEDA.Stage3D.l2.pick(pointerOrPos);
      if (pickedId) {
        const found = this.activeMonsters.find(m => m.id === pickedId);
        if (found) return found;
      }
    }

    // 2. Cek jarak radius 120 px ke badan monster atau 220x60 px ke plat label
    const px = pointerOrPos ? pointerOrPos.x : (this.lastPointerX || 960);
    const py = pointerOrPos ? pointerOrPos.y : (this.lastPointerY || 500);

    let closest = null;
    let minDist = 120;

    this.activeMonsters.forEach(m => {
      const spos = this.getMonsterPos(m);
      if (spos) {
        const bodyDist = Math.hypot(px - spos.x, py - (spos.y - 48));
        const centerDist = Math.hypot(px - spos.x, py - spos.y);
        const inLabelBox = (Math.abs(px - spos.x) <= 220 && Math.abs(py - (spos.y + 60)) <= 60);
        if (bodyDist <= minDist || inLabelBox || centerDist <= minDist) {
          closest = m;
        }
      }
    });

    return closest;
  }

  /**
   * Memulai pengisian napas membidik sasaran.
   * Poin 8: Pengisian napas 0,5 detik HANYA berjalan bila ada target.
   */
  startCharge(pointer) {
    const target = this.resolveTargetMonster(pointer) || this.currentTargetMonster;
    if (!target) return; // Tidak ada target: jangan mulai pengisian

    this.currentTargetMonster = target;
    this.lastHighlightedMonster = target;
    this.isCharging = true;
    this.chargeTime = 0;

    const spos = this.getMonsterPos(target);
    if (spos) {
      this.reticleContainer.setPosition(spos.x, spos.y);
      this.reticleContainer.setVisible(true);

      if (window.JEDA && JEDA.Stage3D && JEDA.Stage3D.l2 && JEDA.Stage3D.l2.aim) {
        JEDA.Stage3D.l2.aim(this.selectedAstronautIndex, spos.x, spos.y);
      }
    }
  }

  /**
   * Memulai pengisian napas saat tombol Spasi ditekan (Poin 8: Spasi memakai target terakhir yang disorot).
   */
  startChargeWithSpace() {
    let target = this.currentTargetMonster;

    // Gunakan target terakhir yang disorot jika masih aktif
    if (!target && this.lastHighlightedMonster && this.activeMonsters.some(m => m.id === this.lastHighlightedMonster.id)) {
      target = this.lastHighlightedMonster;
    }

    // Fallback ke monster terdekat jika belum ada yang disorot
    if (!target && this.activeMonsters.length > 0) {
      target = this.activeMonsters[0];
    }

    if (!target) return; // Tidak ada monster yang aktif

    this.currentTargetMonster = target;
    this.lastHighlightedMonster = target;
    this.isCharging = true;
    this.chargeTime = 0;

    const spos = this.getMonsterPos(target);
    if (spos) {
      this.reticleContainer.setPosition(spos.x, spos.y);
      this.reticleContainer.setVisible(true);

      if (window.JEDA && JEDA.Stage3D && JEDA.Stage3D.l2 && JEDA.Stage3D.l2.aim) {
        JEDA.Stage3D.l2.aim(this.selectedAstronautIndex, spos.x, spos.y);
      }
    }
  }

  /**
   * Melepas pengisian napas (menembak target jika ada, baik tahan napas maupun klik/tap langsung).
   */
  releaseCharge() {
    if (!this.isCharging) return;
    const target = this.currentTargetMonster;
    this.isCharging = false;
    this.reticleContainer.setVisible(false);

    // Tembak jika ada target yang dibidik: mendukung tahan napas 0,5s maupun klik/tap langsung
    if (target) {
      this.fireShot(this.selectedAstronautIndex, target);
    } else {
      this.reticleLabel.setText('');
    }

    this.currentTargetMonster = null;
  }

  /**
   * Meluncurkan tembakan 180 derajat dari moncong astronot ke monster sasaran (BR-17 & Poin 8).
   */
  fireShot(astronautIndex, monster) {
    if (this.isFiring) return;
    this.isFiring = true;

    const astCfg = this.astronautConfigs[astronautIndex];
    const has3D = (window.JEDA && JEDA.Stage3D && JEDA.Stage3D.isActive() && JEDA.Stage3D.l2 && JEDA.Stage3D.l2.fire);

    if (has3D && !monster.is2D) {
      JEDA.Stage3D.l2.fire(astronautIndex, monster.id, (result) => {
        this.handleShotResult(result, monster, astCfg);
      });
    } else {
      this.fire2DBeam(astronautIndex, monster, (result) => {
        this.handleShotResult(result, monster, astCfg);
      });
    }
  }

  /**
   * Menangani dampak tembakan (Benar = Awan melayang, Salah = Pantul & Petunjuk tanpa hukuman).
   */
  handleShotResult(result, monster, astCfg) {
    this.isFiring = false;

    if (result && result.correct) {
      // === TEMBAKAN BENAR (Poin 11 e) ===
      if (window.JEDA && JEDA.Audio) JEDA.Audio.playDefuse();
      if (!monster.hasFailed) {
        this.firstTryCorrect++;
      }
      this.defeatedCount++;

      // Hapus tombol 'Tidak cocok' jika ada
      if (monster.dismissBtn) {
        monster.dismissBtn.destroy();
        monster.dismissBtn = null;
      }

      // Hapus dari daftar aktif
      this.activeMonsters = this.activeMonsters.filter(m => m.id !== monster.id);
      if (this.currentTargetMonster && this.currentTargetMonster.id === monster.id) {
        this.currentTargetMonster = null;
      }
      if (this.lastHighlightedMonster && this.lastHighlightedMonster.id === monster.id) {
        this.lastHighlightedMonster = null;
      }

      if (monster.is2D && monster.container2D) {
        this.tweens.add({
          targets: monster.container2D,
          scaleX: 0.05,
          scaleY: 0.05,
          alpha: 0,
          duration: 380,
          ease: 'Sine.easeIn',
          onComplete: () => {
            monster.container2D.destroy();
          }
        });
      }

      // Suara & Ucapan Lumi
      if (window.JEDA && JEDA.FX && JEDA.FX.playChime) {
        JEDA.FX.playChime(660, 0.22);
      }
      if (JEDA.Lumi) {
        JEDA.Lumi.addFlow(15);
        JEDA.Lumi.say('l2_correct');
      }

      // Update Teks Progres Header (Poin 1: Dijinakkan X / Y)
      this.progressText.setText(`Dijinakkan ${this.defeatedCount} / ${this.totalThoughts}`);

      // Cek apakah level selesai
      if (this.defeatedCount >= this.totalThoughts) {
        this.time.delayedCall(700, () => {
          this.finishLevel();
        });
      }
    } else {
      // === TEMBAKAN SALAH (Memantul dan memberi petunjuk tanpa hukuman) ===
      monster.hasFailed = true;

      if (window.JEDA && JEDA.FX && JEDA.FX.playChime) {
        JEDA.FX.playChime(220, 0.15);
      }

      if (JEDA.Lumi) {
        JEDA.Lumi.say('l2_wrong');
      }

      // Tampilkan gelembung petunjuk khusus (termasuk penjelasan kata kunci jika jurnal, BR-19)
      this.showThoughtHintBubble(monster);
    }
  }

  /**
   * Menampilkan gelembung petunjuk satu kalimat saat tembakan salah (PRD 15.4, 15.5, BR-19).
   */
  showThoughtHintBubble(monster) {
    const pos = this.getMonsterPos(monster) || { x: 960, y: 360 };
    const sx = pos.x;
    const sy = pos.y - 80;

    // BR-19: Tembakan salah pada monster jurnal menampilkan penjelasan kata kunci transparan
    let hintText = monster.thought.hint;
    if (monster.thought.isJournal && monster.thought.matchedWord) {
      hintText = `Aku mengira ini ${monster.thought.cat} karena kata '${monster.thought.matchedWord}'.`;
    }
    if (!hintText) {
      hintText = 'Perhatikan apakah pikiran ini tentang kecemasan, rencana, evaluasi diri, atau kenangan.';
    }

    const container = JEDA.UI.textBox(this, sx, sy, {
      text: hintText,
      icon: '💡',
      fontSize: 24,
      fontWeight: '700',
      padX: 24,
      padY: 16,
      maxW: 680,
      variant: 'notif',
      strokeColor: 0xFFA07A
    }).setDepth(3000);

    container.setAlpha(0);
    this.tweens.add({
      targets: container,
      alpha: 1,
      y: sy - 12,
      duration: 220,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.time.delayedCall(3200, () => {
          if (container && container.scene) {
            this.tweens.add({
              targets: container,
              alpha: 0,
              duration: 350,
              onComplete: () => container.destroy()
            });
          }
        });
      }
    });
  }

  /**
   * Memunculkan satu monster pikiran secara serial sesuai Poin 6:
   * - 1 per 1, jeda minimal 2,5 detik
   * - Hanya di slot kosong
   * - Tidak di slot yang sama dengan spawn sebelumnya
   * - Maksimal 4 monster sekaligus
   */
  spawnMonster() {
    if (this.isFinished || this.isHelpOpen) return;
    if (this.spawnedCount >= this.totalThoughts) return;
    if (this.activeMonsters.length >= 4) return;

    // Cari slot kosong
    const occupiedSlots = this.activeMonsters.map(m => m.slotIndex);
    let availableSlots = [0, 1, 2, 3, 4].filter(idx => !occupiedSlots.includes(idx));
    if (availableSlots.length === 0) return;

    // Hindari slot yang sama dengan pemunculan sebelumnya jika ada slot lain yang kosong
    if (availableSlots.length > 1 && this.lastSpawnedSlotIndex !== -1) {
      availableSlots = availableSlots.filter(idx => idx !== this.lastSpawnedSlotIndex);
    }

    const slotIndex = availableSlots[Math.floor(Math.random() * availableSlots.length)];
    this.lastSpawnedSlotIndex = slotIndex;
    const slotPos = this.SLOTS[slotIndex];

    const thought = this.deck[this.spawnedCount++];
    this.lastSpawnTime = Date.now();

    const has3D = (window.JEDA && JEDA.Stage3D && JEDA.Stage3D.isActive() && JEDA.Stage3D.l2 && JEDA.Stage3D.l2.spawn);

    let monsterItem = null;

    if (has3D) {
      const monsterId = JEDA.Stage3D.l2.spawn(thought, slotIndex, slotPos);
      monsterItem = {
        id: monsterId,
        thought: thought,
        slotIndex: slotIndex,
        slotPos: slotPos,
        hasFailed: false,
        is2D: false
      };
    } else {
      monsterItem = this.spawn2DMonster(thought, slotIndex, slotPos);
    }

    // Pasang tombol 'Tidak cocok' untuk monster dari jurnal (BR-19)
    if (thought.isJournal) {
      this.attachJournalDismissButton(monsterItem, slotPos);
    }

    this.activeMonsters.push(monsterItem);
  }

  /**
   * Memasang tombol '✕ Tidak cocok' pada monster dari jurnal (BR-19).
   */
  attachJournalDismissButton(monsterItem, slotPos) {
    const btnW = 140;
    const btnH = 32;
    const btn = JEDA.UI.createButton(
      this,
      slotPos.x,
      slotPos.y + 118,
      btnW,
      btnH,
      '✕ Tidak cocok',
      () => {
        this.dismissJournalMonster(monsterItem);
      },
      { fontSize: 18, radius: 16 }
    );
    btn.setDepth(2100);
    monsterItem.dismissBtn = btn;
  }

  /**
   * Mengeluarkan monster jurnal tanpa penalti dan tidak dihitung di rumus skor (BR-19).
   */
  dismissJournalMonster(monsterItem) {
    if (this.isFinished) return;
    if (monsterItem.dismissBtn) {
      monsterItem.dismissBtn.destroy();
      monsterItem.dismissBtn = null;
    }

    this.activeMonsters = this.activeMonsters.filter(m => m.id !== monsterItem.id);

    if (monsterItem.is2D && monsterItem.container2D) {
      this.tweens.add({
        targets: monsterItem.container2D,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: 300,
        onComplete: () => monsterItem.container2D.destroy()
      });
    } else if (window.JEDA && JEDA.Stage3D && JEDA.Stage3D.l2 && JEDA.Stage3D.l2.dismiss) {
      JEDA.Stage3D.l2.dismiss(monsterItem.id);
    }

    // Aturan BR-19: Dikeluarkan tanpa penalti & kurangi totalThoughts agar tidak membebani skor
    this.totalThoughts = Math.max(1, this.totalThoughts - 1);

    if (window.JEDA && JEDA.FX && JEDA.FX.playChime) {
      JEDA.FX.playChime(520, 0.12);
    }
    if (JEDA.Lumi) {
      JEDA.Lumi.say('Pikiran dilewati tanpa pengaruh ke skor.');
    }

    this.progressText.setText(`Dijinakkan ${this.defeatedCount} / ${this.totalThoughts}`);

    if (this.defeatedCount >= this.totalThoughts) {
      this.time.delayedCall(700, () => {
        this.finishLevel();
      });
    }
  }

  /**
   * Fallback 2D di Phaser: Monster muncul DI slot tetap dengan plat 400x104 px (Poin 6 & 7).
   */
  spawn2DMonster(thought, slotIndex, slotPos) {
    const monsterId = 'm2d_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const container = this.add.container(slotPos.x, slotPos.y - 48).setDepth(15);

    // 1. Badan monster bulat berduri
    const bodyG = this.add.graphics();
    bodyG.fillStyle(0x4A4268, 0.95);
    bodyG.fillCircle(0, 0, 42);

    bodyG.fillStyle(0x383056, 1.0);
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const x1 = Math.cos(ang) * 40;
      const y1 = Math.sin(ang) * 40;
      const x2 = Math.cos(ang) * 58;
      const y2 = Math.sin(ang) * 58;
      bodyG.lineStyle(6, 0x383056, 1.0);
      bodyG.lineBetween(x1, y1, x2, y2);
    }

    // Mata bulat
    bodyG.fillStyle(0xFFFFFF, 1.0);
    bodyG.fillCircle(-14, -8, 8);
    bodyG.fillCircle(14, -8, 8);
    bodyG.fillStyle(0x15182C, 1.0);
    bodyG.fillCircle(-14, -8, 4);
    bodyG.fillCircle(14, -8, 4);
    container.add(bodyG);

    // 2. Plat Teks Pikiran (Poin 7: 400x104 px tepat di bawah badan, jarak 8 px)
    const labelCenterY = 108; // 48 + 8 + 52 = 108
    const labelBox = JEDA.UI.textBox(this, 0, labelCenterY, {
      text: thought.text,
      fontSize: 28,
      fontWeight: '700',
      minW: 400,
      maxW: 400,
      minH: 104,
      padX: 20,
      padY: 12,
      variant: 'chip',
      strokeColor: 0x7FE0C3,
      bgColor: 0x121434,
      radius: 20
    });

    container.add(labelBox);

    // Animasi kemunculan membesar 0,5 detik (Poin 6)
    container.setScale(0.01);
    this.tweens.add({
      targets: container,
      scaleX: 1.0,
      scaleY: 1.0,
      duration: 500,
      ease: 'Sine.easeOut'
    });

    return {
      id: monsterId,
      thought: thought,
      slotIndex: slotIndex,
      slotPos: slotPos,
      baseY: slotPos.y - 48,
      hasFailed: false,
      is2D: true,
      container2D: container,
      phase: Math.random() * Math.PI * 2
    };
  }

  /**
   * Fallback 2D: Meluncurkan tembakan laser 2D dari moncong astronot ke target.
   */
  fire2DBeam(astronautIndex, monster, onResult) {
    const card = this.astronautCards[astronautIndex];
    const startX = card ? card.container.x : 960;
    const startY = 855; // Pusat astronot

    const spos = this.getMonsterPos(monster) || { x: 960, y: 360 };
    const targetX = spos.x;
    const targetY = spos.y;

    const beamLine = this.add.graphics().setDepth(2000);
    const astCfg = this.astronautConfigs[astronautIndex];

    if (window.JEDA && JEDA.Audio) {
      JEDA.Audio.playShoot();
    }

    const tweenObj = { t: 0 };
    this.tweens.add({
      targets: tweenObj,
      t: 1.0,
      duration: 350,
      ease: 'Linear',
      onUpdate: () => {
        beamLine.clear();
        beamLine.lineStyle(4, astCfg.color, 0.95);
        const curX = startX + (targetX - startX) * tweenObj.t;
        const curY = startY + (targetY - startY) * tweenObj.t;
        beamLine.lineBetween(startX, startY, curX, curY);
      },
      onComplete: () => {
        beamLine.destroy();
        const isCorrect = (astCfg.cat === monster.thought.cat);
        if (typeof onResult === 'function') {
          onResult({ correct: isCorrect });
        }
      }
    });
  }

  /**
   * Mengaktifkan/menonaktifkan overlay mode debug (Poin 10).
   */
  toggleDebugOverlay() {
    this.isDebugMode = !this.isDebugMode;
    if (!this.debugGraphics) {
      this.debugGraphics = this.add.graphics().setDepth(4000);
    }
    if (!this.isDebugMode) {
      this.debugGraphics.clear();
      if (this.debugTexts) {
        this.debugTexts.forEach(t => t.destroy());
        this.debugTexts = [];
      }
    }
  }

  /**
   * Menggambar overlay debug pada tombol G (Poin 10):
   * - Kotak 5 slot (400 x 240)
   * - Garis tengah x = 960
   * - Garis vertikal dari pusat tiap tombol (y = 980) ke astronotnya (y = 855) (dx = 0 px)
   * - Garis sudut bidik dari moncong ke target
   */
  renderDebugOverlay() {
    if (!this.isDebugMode || !this.debugGraphics) return;
    const g = this.debugGraphics;
    g.clear();

    if (this.debugTexts) {
      this.debugTexts.forEach(t => t.destroy());
    }
    this.debugTexts = [];

    // 1. Gambar kotak 5 slot (400 x 240)
    this.SLOTS.forEach((slot, idx) => {
      const boxW = 400;
      const boxH = 240;
      const left = slot.x - boxW / 2;
      const top = slot.y - boxH / 2;

      g.lineStyle(2, 0xFFFF00, 0.85);
      g.strokeRect(left, top, boxW, boxH);

      const label = this.add.text(left + 8, top + 8, `Slot ${idx}: (${slot.x}, ${slot.y}) [400x240]`, {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#FFFF00',
        backgroundColor: '#000000'
      }).setDepth(4001);
      this.debugTexts.push(label);
    });

    // 2. Garis tengah x 960
    g.lineStyle(2, 0x00FFFF, 0.75);
    g.lineBetween(960, 0, 960, 1080);
    const centerT = this.add.text(964, 130, 'Sumbu Tengah x = 960', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#00FFFF',
      backgroundColor: '#000000'
    }).setDepth(4001);
    this.debugTexts.push(centerT);

    // 3. Garis vertikal dari tiap tombol ke astronotnya (dx = 0 px)
    const astXs = [393, 771, 1149, 1527];
    astXs.forEach((ax, idx) => {
      g.lineStyle(3, 0x00FF88, 0.9);
      g.lineBetween(ax, 980, ax, 855);

      g.fillStyle(0x00FF88, 1.0);
      g.fillCircle(ax, 980, 5);
      g.fillCircle(ax, 855, 5);

      const dxT = this.add.text(ax + 8, 915, `dx = 0 px\nx=${ax}`, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#00FF88',
        backgroundColor: '#000000'
      }).setDepth(4001);
      this.debugTexts.push(dxT);
    });

    // 4. Garis sudut bidik
    const curAstX = astXs[this.selectedAstronautIndex];
    const curAstY = 855;
    let targetX = this.lastPointerX || 960;
    let targetY = this.lastPointerY || 360;

    if (this.currentTargetMonster) {
      const spos = this.getMonsterPos(this.currentTargetMonster);
      if (spos) {
        targetX = spos.x;
        targetY = spos.y;
      }
    }

    const dx = targetX - curAstX;
    const dy = targetY - curAstY;
    let angleRad = Math.atan2(dx, -dy);
    const maxRad = 85 * (Math.PI / 180);
    angleRad = Math.max(-maxRad, Math.min(maxRad, angleRad));
    const angleDeg = Math.round(angleRad * (180 / Math.PI));

    g.lineStyle(2, 0xFF4488, 0.9);
    g.lineBetween(curAstX, curAstY, targetX, targetY);

    const aimT = this.add.text(curAstX, curAstY - 45, `Sudut: ${angleDeg}° (maks ±85°)`, {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#FF4488',
      backgroundColor: '#000000'
    }).setOrigin(0.5, 0.5).setDepth(4001);
    this.debugTexts.push(aimT);
  }

  /**
   * Siklus render loop per frame.
   */
  update(time, delta) {
    // 1. Cincin pengisian napas reticle
    if (this.isCharging && this.currentTargetMonster) {
      this.chargeTime += delta;
      const progress = Math.min(1.0, this.chargeTime / this.chargeThreshold);

      const targetPos = this.getMonsterPos(this.currentTargetMonster);
      if (targetPos) {
        this.reticleContainer.setPosition(targetPos.x, targetPos.y);
      }

      this.reticleGraphics.clear();
      const currentAst = this.astronautConfigs[this.selectedAstronautIndex];
      const ringRadius = 46;

      this.reticleGraphics.lineStyle(2, 0x506085, 0.4);
      this.reticleGraphics.strokeCircle(0, 0, ringRadius);

      const startAngle = Phaser.Math.DegToRad(-90);
      const sweepAngle = Phaser.Math.DegToRad(progress * 360);
      const endAngle = startAngle + sweepAngle;

      this.reticleGraphics.lineStyle(4, currentAst.color, 0.95);
      this.reticleGraphics.beginPath();
      this.reticleGraphics.arc(0, 0, ringRadius, startAngle, endAngle, false);
      this.reticleGraphics.strokePath();

      if (progress >= 1.0) {
        this.reticleGraphics.lineStyle(2, 0xFFFFFF, 0.85);
        this.reticleGraphics.strokeCircle(0, 0, ringRadius + 3);
        this.reticleLabel.setText('LEPAS UNTUK TEMBAK!');
        this.reticleLabel.setColor('#7FE0C3');
      } else {
        this.reticleLabel.setText('Tahan napas...');
        this.reticleLabel.setColor('#FFFFFF');
      }
    }

    // 2. Pembaruan Monster 2D (goyang kecil naik-turun 12 px, miring 4 derajat, tanpa gerakan horizontal, Poin 6)
    this.activeMonsters.forEach(m => {
      if (m.is2D && m.container2D) {
        const bob = Math.sin(time * 0.003 + m.phase) * 12;
        m.container2D.y = m.baseY + bob;
        m.container2D.rotation = Math.sin(time * 0.003 + m.phase) * 0.0698; // 4 derajat
      }
    });

    // 3. Deteksi Penumpukan 4 Monster > 8 Detik
    if (this.activeMonsters.length >= 4 && !this.isFinished) {
      this.stagnantAccumulationTime += delta;
      if (this.stagnantAccumulationTime > 8000) {
        if (JEDA.Lumi) {
          JEDA.Lumi.say('Pikiran mulai menumpuk. Ambil satu siklus napas sejenak.');
        }
        this.stagnantAccumulationTime = 0;
      }
    } else {
      this.stagnantAccumulationTime = 0;
    }

    // 4. Jaring pengaman: jika layar kosong dan belum selesai, segera munculkan monster
    if (!this.isFinished && !this.isHelpOpen && this.activeMonsters.length === 0 && this.spawnedCount < this.totalThoughts) {
      const now = Date.now();
      if (now - this.lastSpawnTime >= 1000) {
        this.spawnMonster();
      }
    }

    // 5. Update overlay debug jika aktif
    if (this.isDebugMode) {
      this.renderDebugOverlay();
    }
  }

  /**
   * Menyelesaikan Level 2 dan menampilkan ringkasan skor (Rumus skor TIDAK BERUBAH).
   */
  finishLevel() {
    if (this.isFinished) return;
    this.isFinished = true;

    const panicHits = (JEDA.State.session && JEDA.State.session.panicHits) || this.panicHits || 0;
    const result = JEDA.Score.calcL2(this.firstTryCorrect, panicHits, this.totalThoughts);

    if (result.passed) {
      if (JEDA.Lumi) JEDA.Lumi.say('level_pass');
      JEDA.State.saveLevelScore(2, result.score, result.stars);
      JEDA.State.data.fails.l2 = 0;
      if (JEDA.Stage3D) {
        JEDA.Stage3D.setLanterns(2);
        if (JEDA.Stage3D.celebratePass) {
          JEDA.Stage3D.celebratePass();
        }
      }
    } else {
      if (JEDA.Lumi) JEDA.Lumi.say('result_low');
      JEDA.State.data.fails.l2 = (JEDA.State.data.fails.l2 || 0) + 1;
    }

    if (JEDA.State && JEDA.State.session) {
      JEDA.State.session.levelScores.l2 = result.score;
      JEDA.State.session.l2FirstTry = this.firstTryCorrect;
      JEDA.State.session.l2Accuracy = result.akurasi;
      JEDA.State.session.l2Passed = result.passed;
      JEDA.State.save();
    }

    this.time.delayedCall(700, () => {
      this.showResultSummary(result, panicHits);
    });
  }

  /**
   * Menampilkan panel ringkasan hasil skor Level 2.
   */
  showResultSummary(result, panicHits) {
    const Layout = JEDA.Layout;
    const cx = Layout.cx();
    const cy = Layout.cy();

    const modal = this.add.container(cx, cy).setDepth(3500);
    const cardW = 960; // Panel M (PRD 14.3)
    const cardH = 624; // Skala 8 px (78 * 8)

    const bg = this.add.graphics();
    // 100% Solid Base
    bg.fillStyle(0x0E1026, 1.0);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 32);
    bg.fillStyle(0x141638, 0.96);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 32);
    bg.lineStyle(2, 0x3F486E, 0.65);
    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 32);
    modal.add(bg);

    const titleText = result.passed ? 'Level 2 Selesai!' : 'Latihan Selesai';
    const title = this.add.text(0, -cardH / 2 + 56, titleText, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '44px',
      fontStyle: '800',
      color: result.passed ? JEDA.CFG.COLOR.hex.calm : '#FFFFFF'
    }).setOrigin(0.5).setResolution(2);

    const starStr = '★'.repeat(result.stars) + '☆'.repeat(3 - result.stars);
    const stars = this.add.text(0, -cardH / 2 + 116, starStr, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '48px',
      color: '#FFD27A'
    }).setOrigin(0.5).setResolution(2);

    const metrics = [
      { name: 'Akurasi (70%)', val: `${result.akurasi}%`, desc: `${this.firstTryCorrect} / ${this.totalThoughts} tepat pertama` },
      { name: 'Tenang (20%)', val: `${result.tenang}%`, desc: panicHits > 0 ? `${panicHits}x tembak cepat` : 'Sangat tenang' },
      { name: 'Selesai (10%)', val: `${result.selesai}%`, desc: `${this.defeatedCount} / ${this.totalThoughts} dijinakkan` }
    ];

    const mCardW = 256; // Kelipatan 8 (32 * 8)
    const mCardH = 152; // Kelipatan 8 (19 * 8)
    const mGap = 24; // Kelipatan 8 (3 * 8)
    const mXs = JEDA.Layout.rowCenter([mCardW, mCardW, mCardW], mGap);
    const rowY = -12;

    metrics.forEach((m, idx) => {
      const mx = mXs[idx] - cx;
      const bgg = this.add.graphics();
      bgg.fillStyle(0x1B1E48, 0.90);
      bgg.fillRoundedRect(mx - mCardW / 2, rowY - mCardH / 2, mCardW, mCardH, 20);
      bgg.lineStyle(1.5, 0x3A4468, 0.6);
      bgg.strokeRoundedRect(mx - mCardW / 2, rowY - mCardH / 2, mCardW, mCardH, 20);

      const nameT = this.add.text(mx, rowY - 42, m.name, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '22px',
        fontStyle: '700',
        color: '#CBD5E1'
      }).setOrigin(0.5).setResolution(2);

      const valT = this.add.text(mx, rowY, m.val, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '36px',
        fontStyle: '800',
        color: JEDA.CFG.COLOR.hex.calm
      }).setOrigin(0.5).setResolution(2);

      const descT = this.add.text(mx, rowY + 44, m.desc, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '18px',
        color: '#94A3B8'
      }).setOrigin(0.5).setResolution(2);

      modal.add([bgg, nameT, valT, descT]);
    });

    const scoreText = this.add.text(0, rowY + 125, `Skor Akhir Level 2: ${result.score}`, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '33px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    modal.add([title, stars, scoreText]);

    const btnY = cardH / 2 - 76;
    const btnW = 288; // Kelipatan 8 (36 * 8)
    const btnH = 88; // Kelipatan 8 (11 * 8)
    const btnGap = 32; // Kelipatan 8 (4 * 8)

    const canProceed = result.passed || (window.JEDA && JEDA.State && JEDA.State.isLevelUnlocked && JEDA.State.isLevelUnlocked(3));

    if (canProceed) {
      const repeatBtn = JEDA.UI.createButton(this, -(btnW / 2 + btnGap / 2), btnY, btnW, btnH, 'Ulangi Level 2', () => {
        if (JEDA.Stage3D) {
          JEDA.Stage3D.setMode('l2');
          JEDA.Stage3D.setLanterns(1);
        }
        this.scene.restart();
      }, { radius: 44, fontSize: 33 });

      const nextBtn = JEDA.UI.createButton(this, (btnW / 2 + btnGap / 2), btnY, btnW, btnH, 'Lanjut ke Level 3', () => {
        if (JEDA.Stage3D) JEDA.Stage3D.setMode('l3');
        JEDA.FX.transitionTo(this, 'Level3Scene');
      }, { primary: true, radius: 44, fontSize: 33 });

      modal.add([repeatBtn, nextBtn]);
    } else {
      const noticeText = this.add.text(0, rowY + 168, 'Batas kelulusan membuka Level 3: 60 Poin.\nAyo ulangi sekali lagi untuk membuka Level 3!', {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '22px',
        fontStyle: '700',
        color: '#FFA07A',
        align: 'center'
      }).setOrigin(0.5).setResolution(2);
      modal.add(noticeText);

      const menuBtn = JEDA.UI.createButton(this, -(btnW / 2 + btnGap / 2), btnY, btnW, btnH, 'Menu Utama', () => {
        if (JEDA.Stage3D) JEDA.Stage3D.setMode('menu');
        JEDA.FX.transitionTo(this, 'CheckinScene');
      }, { radius: 44, fontSize: 33 });

      const repeatBtn = JEDA.UI.createButton(this, (btnW / 2 + btnGap / 2), btnY, btnW, btnH, 'Ulangi Level 2', () => {
        if (JEDA.Stage3D) {
          JEDA.Stage3D.setMode('l2');
          JEDA.Stage3D.setLanterns(1);
        }
        this.scene.restart();
      }, { primary: true, radius: 44, fontSize: 33 });

      modal.add([menuBtn, repeatBtn]);
    }

    modal.setAlpha(0);
    this.tweens.add({ targets: modal, alpha: 1, duration: 300, ease: 'Sine.easeOut' });
  }

  /**
   * Menampilkan modal kartu petunjuk Level 2 (PRD Bagian 15.2 / BR-15).
   */
  showHelpModal() {
    this.isHelpOpen = true;
    if (this.spawnTimer) this.spawnTimer.paused = true;

    JEDA.UI.helpCard(this, {
      type: 'l2',
      title: 'Petunjuk Level 2: Misi Astronot',
      steps: [
        { num: 1, text: 'Pilih astronot dengan tombol 1 sampai 4 atau klik potretnya.', key: 'Tombol 1 - 4' },
        { num: 2, text: 'Arahkan ke monster pikiran, tahan untuk mengisi napas, lepas untuk menembak.', key: 'Tahan & Lepas' },
        { num: 3, text: 'Astronot yang tepat mengubah monster menjadi awan.', key: 'Ubah ke Awan' }
      ],
      keys: ['1', '2', '3', '4', 'Spasi / Tahan & Lepas'],
      onDone: () => {
        this.isHelpOpen = false;
        if (this.spawnTimer) this.spawnTimer.paused = false;
        if (JEDA.State && JEDA.State.markSeen) {
          JEDA.State.markSeen('l2');
        }
        if (this.activeMonsters.length === 0 && this.spawnedCount < this.totalThoughts && !this.isFinished) {
          this.spawnMonster();
        }
      }
    });
  }

  /**
   * Fallback dek 10 pikiran terkurasi.
   */
  getFallbackDeck() {
    return [
      { id: 'fb_1', text: 'Bagaimana kalau uang bulananku tidak cukup?', cat: 'Cemas', hint: 'Khawatir tentang hari esok adalah ciri pikiran cemas.' },
      { id: 'fb_2', text: 'Setelah lulus nanti aku takut menganggur.', cat: 'Cemas', hint: 'Kekhawatiran masa depan ditangani oleh Penenang.' },
      { id: 'fb_3', text: 'Jangan-jangan temanku diam-diam kesal padaku.', cat: 'Cemas', hint: 'Menduga hal buruk tanpa bukti adalah bentuk kecemasan.' },
      { id: 'fb_4', text: 'Setelah kelas aku mau ke perpustakaan.', cat: 'Rencana', hint: 'Menyusun agenda belajar adalah tugas Navigator.' },
      { id: 'fb_5', text: 'Akhir pekan ini aku rapikan catatan kuliah.', cat: 'Rencana', hint: 'Rencana kegiatan ke depan ditangani Navigator.' },
      { id: 'fb_6', text: 'Besok aku tanya dosen soal revisi.', cat: 'Rencana', hint: 'Tindakan yang akan dilakukan masuk kategori rencana.' },
      { id: 'fb_7', text: 'Aku selalu lambat dibanding teman-temanku.', cat: 'Menilai Diri', hint: 'Membandingkan diri secara negatif perlu dirangkul Sahabat.' },
      { id: 'fb_8', text: 'Aku nggak cocok di jurusan ini.', cat: 'Menilai Diri', hint: 'Kritik tajam terhadap diri sendiri ditangani Sahabat.' },
      { id: 'fb_9', text: 'Kemarin aku diam saja saat kerja kelompok.', cat: 'Kenangan', hint: 'Mengingat peristiwa kemarin ditangani Arsiparis.' },
      { id: 'fb_10', text: 'Tadi pagi temanku cuek saat kusapa.', cat: 'Kenangan', hint: 'Memori yang baru saja berlalu masuk kategori kenangan.' }
    ];
  }
}

window.Level2Scene = Level2Scene;