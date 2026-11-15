/**
 * JEDA - Level2Scene (js/scenes/level2.js)
 * Misi Astronot (Menjinakkan Monster Pikiran dengan Pelabelan Sadar)
 * Sesuai PRD Bagian 15.4, 15.5, dan 14.3:
 * 
 * Mekanik:
 * - 4 Astronot kru Lumi (tombol 1 - 4 atau klik potret):
 *   1: Penenang (#6EC6FF, Cemas, ~)
 *   2: Navigator (#FFB86B, Rencana, →)
 *   3: Sahabat (#B69CFF, Menilai Diri, ♥)
 *   4: Arsiparis (#E6EEF7, Kenangan, ⏱)
 * - Tahan klik atau Spasi 0,5 detik (pengisian napas) lalu lepas untuk menembak (BR-17).
 * - Tembakan benar: monster menyusut menjadi awan putih + 20 partikel, Lumi l2_correct, Flow Meter naik.
 * - Tembakan salah: sinar memantul, monster bergetar, Lumi l2_wrong + petunjuk kalimat, tanpa hukuman (BR-18).
 * - Penumpukan 4 monster > 8 detik memicu siklus napas mini.
 * - Rumus skor tetap: 0.7 Akurasi + 0.2 Tenang + 0.1 Selesai.
 * - 3D via Stage3D.l2 (Three.js r128 tanpa CapsuleGeometry) dengan fallback 2D di Phaser.
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

    // Dek pikiran: Prioritaskan monster dari Mode Jurnal jika tersedia (PRD 15.6)
    if (data && Array.isArray(data.monsters) && data.monsters.length > 0) {
      this.deck = data.monsters.map(m => ({
        id: m.id || ('j_' + Math.random()),
        text: m.text,
        cat: m.cat,
        hint: m.hint || 'Perhatikan apakah ini tentang kekhawatiran, rencana, penilaian, atau ingatan.'
      }));
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
    this.activeMonsters = []; // { id, thought, hasFailed, is2D, sprite2D }
    this.isFinished = false;
    this.isHelpOpen = false;

    // Kontrol Astronot & Menembak (BR-17)
    this.selectedAstronautIndex = 0; // 0..3 (Default: Penenang)
    this.isCharging = false;
    this.chargeTime = 0; // ms
    this.chargeThreshold = 500; // 0,5 detik napas
    this.currentTargetMonster = null;
    this.isFiring = false; // BR-17: Satu tembakan aktif pada satu waktu

    // Pemantau penumpukan & anti-spam (BR-05)
    this.stagnantAccumulationTime = 0;
    this.clickHistory = [];
  }

  create() {
    const Layout = JEDA.Layout;
    const W = Layout.W;
    const H = Layout.H;
    const cx = Layout.cx();

    // 1. Inisialisasi Panggung 3D Mode L2
    if (window.JEDA && JEDA.Stage3D && JEDA.Stage3D.isActive()) {
      JEDA.Stage3D.setMode('l2');
      JEDA.Stage3D.setCalm(0.5);
      JEDA.Stage3D.setLanterns(1); // Lentera pulau 1 menyala
      if (JEDA.Stage3D.l2 && JEDA.Stage3D.l2.clear) {
        JEDA.Stage3D.l2.clear();
      }
    }

    // Latar belakang lembut & transisi kamera
    JEDA.FX.createBackground(this);
    this.cameras.main.fadeIn(350);

    // 2. Definisi 4 Astronot (PRD Bagian 15.4)
    this.astronautConfigs = [
      { index: 0, key: '1', name: 'Penenang', cat: 'Cemas', color: 0x6EC6FF, colorHex: '#6EC6FF', icon: '~' },
      { index: 1, key: '2', name: 'Navigator', cat: 'Rencana', color: 0xFFB86B, colorHex: '#FFB86B', icon: '→' },
      { index: 2, key: '3', name: 'Sahabat', cat: 'Menilai Diri', color: 0xB69CFF, colorHex: '#B69CFF', icon: '♥' },
      { index: 3, key: '4', name: 'Arsiparis', cat: 'Kenangan', color: 0xE6EEF7, colorHex: '#E6EEF7', icon: '⏱' }
    ];

    // 3. Header Simetris di Zona Header (0 - 120 px)
    this.createHeader();

    // 4. Panel Karakter Lumi Pendamping (PRD 14.2)
    if (JEDA.Lumi) {
      JEDA.Lumi.init(this, {
        bubbleX: cx,
        bubbleY: 135,
        showMeter: false,
        resetFlow: true
      });
      this.time.delayedCall(600, () => {
        if (!this.isFinished) JEDA.Lumi.say('l2_intro');
      });
    }

    // 5. Bilah 4 Potret Astronot di Zona Aksi (y = 940 px)
    this.createAstronautBar(cx, 940);

    // 6. Kursor Bidik & Cincin Napas (Reticle & Charge Ring)
    this.createReticle();

    // 7. Kontrol Masukan Keyboard & Pointer
    this.setupInputControls();

    // 8. Munculkan Monster Pertama Segera
    this.time.delayedCall(450, () => {
      this.spawnMonster();
    });

    // 9. Timer Pemunculan Berkala Monster (~3,2 detik sekali, maks 4 di layar)
    this.spawnTimer = this.time.addEvent({
      delay: 3200,
      loop: true,
      callback: () => {
        if (!this.isFinished && !this.isHelpOpen && this.activeMonsters.length < 4 && this.spawnedCount < this.totalThoughts) {
          this.spawnMonster();
        }
      }
    });

    // 10. Tampilkan Kartu Petunjuk saat pertama kali dibuka (PRD 15.2)
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
    });
  }

  /**
   * Membuat header navigasi, judul, counter progres, dan tombol bantuan.
   */
  createHeader() {
    const Layout = JEDA.Layout;
    const headerY = 64;
    const btnW = 200;
    const btnH = 48;

    // Tombol Menu / Kembali di kiri (rata margin 120 px)
    const leftX = Layout.M + btnW / 2;
    JEDA.UI.createButton(this, leftX, headerY, btnW, btnH, '← Menu', () => {
      if (JEDA.Stage3D) JEDA.Stage3D.setMode('menu');
      JEDA.FX.transitionTo(this, 'CheckinScene');
    }, { fontSize: 27, radius: 24 });

    // Panel Header Tengah Berlatar Kaca Gelap
    const centerW = 860;
    const centerH = 88;
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x12142E, 0.94);
    headerBg.fillRoundedRect(Layout.cx() - centerW / 2, headerY - centerH / 2, centerW, centerH, 28);
    headerBg.lineStyle(2, 0x3F486E, 0.7);
    headerBg.strokeRoundedRect(Layout.cx() - centerW / 2, headerY - centerH / 2, centerW, centerH, 28);

    // Judul & Subjudul (Hierarki teks PRD 14.3)
    this.add.text(Layout.cx(), headerY - 16, 'Level 2: Misi Astronot', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '33px',
      fontStyle: '800',
      color: '#FFFFFF'
    }).setOrigin(0.5).setResolution(2);

    this.add.text(Layout.cx(), headerY + 18, 'Pilih astronot (1-4) & tahan napas 0,5 detik untuk menjinakkan pikiran', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '600',
      color: '#CBD5E1'
    }).setOrigin(0.5).setResolution(2);

    // Tombol Bantuan (?) di kanan (rata margin kanan 1800 px)
    const helpBtnSize = 48;
    const helpBtnX = (Layout.W - Layout.M) - helpBtnSize / 2;
    this.helpButton = JEDA.UI.createButton(this, helpBtnX, headerY, helpBtnSize, helpBtnSize, '?', () => {
      this.showHelpModal();
    }, { fontSize: 27, radius: 24 });

    // Counter Progres (Jumlah Dijinakkan)
    const counterW = 200;
    const counterX = helpBtnX - helpBtnSize / 2 - 16 - counterW / 2;
    const counterBg = this.add.graphics();
    counterBg.fillStyle(0x181A3C, 0.95);
    counterBg.fillRoundedRect(counterX - counterW / 2, headerY - btnH / 2, counterW, btnH, 24);
    counterBg.lineStyle(2, 0x485278, 0.65);
    counterBg.strokeRoundedRect(counterX - counterW / 2, headerY - btnH / 2, counterW, btnH, 24);

    this.progressText = this.add.text(counterX, headerY, `Dijinakkan: 0 / ${this.totalThoughts}`, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '700',
      color: JEDA.CFG.COLOR.hex.calm
    }).setOrigin(0.5).setResolution(2);
  }

  /**
   * Membuat bilah 4 potret astronot di Zona Aksi (PRD 15.4: rowCenter, 240x96, jarak 48).
   */
  createAstronautBar(cx, y) {
    const Layout = JEDA.Layout;
    const cardW = 240;
    const cardH = 96;
    const cardGap = 48;
    const widths = [cardW, cardW, cardW, cardW];
    const xs = Layout.rowCenter(widths, cardGap);

    this.astronautCards = [];

    this.astronautConfigs.forEach((cfg, idx) => {
      const cardX = xs[idx];
      const container = this.add.container(cardX, y).setDepth(20);

      // Latar kartu kaca gelap
      const bg = this.add.graphics();
      container.add(bg);

      // Angka tombol shortcut [1..4]
      const keyBadge = this.add.text(-cardW / 2 + 22, -cardH / 2 + 18, `[${cfg.key}]`, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '22px',
        fontStyle: '800',
        color: cfg.colorHex
      }).setOrigin(0, 0.5).setResolution(2);

      // Ikon astronot
      const iconText = this.add.text(-cardW / 2 + 24, 8, cfg.icon, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '32px',
        fontStyle: '800',
        color: cfg.colorHex
      }).setOrigin(0, 0.5).setResolution(2);

      // Nama Astronot
      const nameText = this.add.text(12, -14, cfg.name, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '27px',
        fontStyle: '800',
        color: '#FFFFFF'
      }).setOrigin(0, 0.5).setResolution(2);

      // Kategori Pikiran yang Ditangani
      const catText = this.add.text(12, 18, cfg.cat, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '22px',
        fontStyle: '700',
        color: cfg.colorHex
      }).setOrigin(0, 0.5).setResolution(2);

      container.add([keyBadge, iconText, nameText, catText]);

      // Zona Interaktif Klik
      container.setSize(cardW, cardH);
      container.setInteractive({ useHandCursor: true });
      container.on('pointerdown', () => {
        this.selectAstronaut(idx);
      });

      this.astronautCards.push({
        container: container,
        bg: bg,
        cfg: cfg,
        idx: idx
      });
    });

    this.updateAstronautBarVisuals();
  }

  /**
   * Memperbarui visual kartu astronot saat pemilihan berubah.
   */
  updateAstronautBarVisuals() {
    const cardW = 240;
    const cardH = 96;

    this.astronautCards.forEach(item => {
      const isSelected = (item.idx === this.selectedAstronautIndex);
      const bg = item.bg;
      bg.clear();

      if (isSelected) {
        // Efek aktif: border tebal menyala & latar lebih terang
        bg.fillStyle(0x1B1E48, 0.96);
        bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);

        bg.lineStyle(4, item.cfg.color, 1.0);
        bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);

        // Pendar lembut di sekitar kartu aktif
        bg.lineStyle(1.5, 0xFFFFFF, 0.5);
        bg.strokeRoundedRect(-cardW / 2 - 2, -cardH / 2 - 2, cardW + 4, cardH + 4, 22);

        item.container.setScale(1.04);
      } else {
        // Status santai
        bg.fillStyle(0x101332, 0.88);
        bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);

        bg.lineStyle(2, 0x364064, 0.65);
        bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);

        item.container.setScale(1.0);
      }
    });

    // Sinkronkan sorotan ke panggung 3D jika aktif
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

    // Label status pengisian napas
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

    // 2. Tombol Spasi untuk mengisi napas & menembak
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.spaceKey.on('down', () => {
      if (!this.isHelpOpen && !this.isFinished && !this.isCharging) {
        this.startChargeWithAutoTarget();
      }
    });
    this.spaceKey.on('up', () => {
      if (this.isCharging) {
        this.releaseCharge();
      }
    });

    // 3. Pointer Down / Up / Move (Mouse & Sentuhan)
    this.input.on('pointerdown', (pointer) => {
      if (this.isHelpOpen || this.isFinished) return;

      // Cek anti-spam klik BR-05
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
    });

    // Tombol Esc untuk jeda atau buka bantuan
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.isHelpOpen) {
        // Biarkan helpCard menangani penutupannya sendiri
      } else {
        this.showHelpModal();
      }
    });
  }

  /**
   * Mencatat aksi pengguna untuk perlindungan panik klik (BR-05).
   */
  recordUserAction() {
    const now = Date.now();
    this.clickHistory.push(now);
    // Hapus riwayat di luar 3 detik
    this.clickHistory = this.clickHistory.filter(t => now - t <= 3000);

    if (this.clickHistory.length > 5) {
      // Pelanggaran BR-05: >5 klik/tembakan dalam 3 detik
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
   * Menemukan monster pikiran yang ditunjuk pointer atau monster terdekat.
   */
  resolveTargetMonster(pointerOrPos) {
    if (this.activeMonsters.length === 0) return null;

    // 1. Coba deteksi langsung via Stage3D Raycaster (Three.js)
    if (window.JEDA && JEDA.Stage3D && JEDA.Stage3D.l2 && JEDA.Stage3D.l2.pick) {
      const px = pointerOrPos ? (pointerOrPos.event ? pointerOrPos.event.clientX : pointerOrPos.x) : (this.lastPointerX || 960);
      const py = pointerOrPos ? (pointerOrPos.event ? pointerOrPos.event.clientY : pointerOrPos.y) : (this.lastPointerY || 500);

      const pickedId = JEDA.Stage3D.l2.pick(px, py);
      if (pickedId) {
        const found = this.activeMonsters.find(m => m.id === pickedId);
        if (found) return found;
      }
    }

    // 2. Fallback jarak 2D ke posisi proyeksi monster terdekat
    const targetX = pointerOrPos ? pointerOrPos.x : (this.lastPointerX || 960);
    const targetY = pointerOrPos ? pointerOrPos.y : (this.lastPointerY || 500);

    let closest = null;
    let minDist = 320; // Radius pencarian terdekat

    this.activeMonsters.forEach(m => {
      let screenPos = null;
      if (m.is2D && m.container2D) {
        screenPos = { x: m.container2D.x, y: m.container2D.y };
      } else if (window.JEDA && JEDA.Stage3D && JEDA.Stage3D.l2 && JEDA.Stage3D.l2.getMonsterScreenPos) {
        screenPos = JEDA.Stage3D.l2.getMonsterScreenPos(m.id);
      }

      if (screenPos) {
        const dist = Math.hypot(targetX - screenPos.x, targetY - screenPos.y);
        if (dist < minDist) {
          minDist = dist;
          closest = m;
        }
      }
    });

    return closest || this.activeMonsters[0];
  }

  /**
   * Memulai pengisian napas membidik sasaran.
   */
  startCharge(pointer) {
    const target = this.resolveTargetMonster(pointer);
    if (!target) return;

    this.currentTargetMonster = target;
    this.isCharging = true;
    this.chargeTime = 0;
    this.reticleContainer.setVisible(true);
  }

  /**
   * Memulai pengisian napas dengan sasaran otomatis saat tombol Spasi ditekan.
   */
  startChargeWithAutoTarget() {
    const target = this.resolveTargetMonster({ x: this.lastPointerX || 960, y: this.lastPointerY || 500 });
    if (!target) return;

    this.currentTargetMonster = target;
    this.isCharging = true;
    this.chargeTime = 0;
    this.reticleContainer.setVisible(true);
  }

  /**
   * Melepas pengisian napas (tembak jika >= 0,5 detik, batal jika kurang).
   */
  releaseCharge() {
    if (!this.isCharging) return;
    this.isCharging = false;
    this.reticleContainer.setVisible(false);

    if (this.chargeTime >= this.chargeThreshold) {
      // Tembakan sukses terisi napas
      if (this.currentTargetMonster) {
        this.fireShot(this.selectedAstronautIndex, this.currentTargetMonster);
      }
    } else {
      // Batal lembut (napas belum cukup penuh, tanpa pinalti)
      this.reticleLabel.setText('');
    }

    this.currentTargetMonster = null;
  }

  /**
   * Meluncurkan tembakan dari astronot ke monster (BR-17).
   */
  fireShot(astronautIndex, monster) {
    if (this.isFiring) return; // BR-17: Satu tembakan aktif pada satu waktu
    this.isFiring = true;

    const astCfg = this.astronautConfigs[astronautIndex];

    // Cek apakah 3D aktif
    const has3D = (window.JEDA && JEDA.Stage3D && JEDA.Stage3D.isActive() && JEDA.Stage3D.l2 && JEDA.Stage3D.l2.fire);

    if (has3D && !monster.is2D) {
      JEDA.Stage3D.l2.fire(astronautIndex, monster.id, (result) => {
        this.handleShotResult(result, monster, astCfg);
      });
    } else {
      // Fallback 2D di Phaser
      this.fire2DBeam(astronautIndex, monster, (result) => {
        this.handleShotResult(result, monster, astCfg);
      });
    }
  }

  /**
   * Menangani dampak tembakan (Benar = Awan melayang, Salah = Pantul & Petunjuk).
   */
  handleShotResult(result, monster, astCfg) {
    this.isFiring = false;

    if (result && result.correct) {
      // === TEMBAKAN BENAR (PRD 15.4 Poin 2) ===
      if (!monster.hasFailed) {
        this.firstTryCorrect++;
      }
      this.defeatedCount++;

      // Hapus dari daftar aktif
      this.activeMonsters = this.activeMonsters.filter(m => m.id !== monster.id);

      if (monster.is2D && monster.container2D) {
        // Animasi 2D monster menyusut & meletus jadi awan
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

      // Update Teks Progres Header
      this.progressText.setText(`Dijinakkan: ${this.defeatedCount} / ${this.totalThoughts}`);

      // Cek apakah level selesai
      if (this.defeatedCount >= this.totalThoughts) {
        this.time.delayedCall(700, () => {
          this.finishLevel();
        });
      }
    } else {
      // === TEMBAKAN SALAH (PRD 15.4 Poin 3) ===
      monster.hasFailed = true;

      // Suara pantulan lembut
      if (window.JEDA && JEDA.FX && JEDA.FX.playChime) {
        JEDA.FX.playChime(220, 0.15);
      }

      if (JEDA.Lumi) {
        JEDA.Lumi.say('l2_wrong');
      }

      // Tampilkan gelembung petunjuk khusus dari thought.hint (PRD 15.5)
      this.showThoughtHintBubble(monster);
    }
  }

  /**
   * Menampilkan gelembung petunjuk satu kalimat saat tembakan salah (PRD 15.4 & 15.5).
   */
  showThoughtHintBubble(monster) {
    let sx = 960;
    let sy = 400;

    if (monster.is2D && monster.container2D) {
      sx = monster.container2D.x;
      sy = monster.container2D.y - 85;
    } else if (window.JEDA && JEDA.Stage3D && JEDA.Stage3D.l2 && JEDA.Stage3D.l2.getMonsterScreenPos) {
      const spos = JEDA.Stage3D.l2.getMonsterScreenPos(monster.id);
      if (spos) {
        sx = spos.x;
        sy = spos.y - 75;
      }
    }

    const hintText = monster.thought.hint || 'Coba rasakan apakah pikiran ini tentang masa depan, evaluasi diri, atau masa lalu.';

    const container = this.add.container(sx, sy).setDepth(3000);
    const bubbleBg = this.add.graphics();
    container.add(bubbleBg);

    const txt = this.add.text(0, 0, `💡 ${hintText}`, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '24px',
      fontStyle: '700',
      color: '#FFFFFF',
      align: 'center',
      wordWrap: { width: 560 }
    }).setOrigin(0.5).setResolution(2);
    container.add(txt);

    const bw = Math.min(620, Math.max(340, txt.width + 36));
    const bh = txt.height + 28;

    bubbleBg.fillStyle(0x141838, 0.95);
    bubbleBg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 18);
    bubbleBg.lineStyle(2, 0xFFA07A, 0.9);
    bubbleBg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 18);

    // Fade out otomatis setelah 3,5 detik
    container.setAlpha(0);
    this.tweens.add({
      targets: container,
      alpha: 1,
      y: sy - 12,
      duration: 220,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.time.delayedCall(3200, () => {
          this.tweens.add({
            targets: container,
            alpha: 0,
            duration: 350,
            onComplete: () => container.destroy()
          });
        });
      }
    });
  }

  /**
   * Memunculkan satu monster pikiran baru di arena.
   */
  spawnMonster() {
    if (this.spawnedCount >= this.totalThoughts) return;

    const thought = this.deck[this.spawnedCount++];
    const has3D = (window.JEDA && JEDA.Stage3D && JEDA.Stage3D.isActive() && JEDA.Stage3D.l2 && JEDA.Stage3D.l2.spawn);

    if (has3D) {
      const monsterId = JEDA.Stage3D.l2.spawn(thought);
      this.activeMonsters.push({
        id: monsterId,
        thought: thought,
        hasFailed: false,
        is2D: false
      });
    } else {
      // Fallback 2D di Phaser jika WebGL 3D tidak aktif
      this.spawn2DMonster(thought);
    }
  }

  /**
   * Fallback 2D: Membuat monster pikiran 2D melayang di Phaser.
   */
  spawn2DMonster(thought) {
    const W = JEDA.CFG.W;
    const startX = W + 120;
    const startY = 240 + Math.random() * 420;
    const monsterId = 'm2d_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    const container = this.add.container(startX, startY).setDepth(15);

    // Badan monster berduri
    const bodyG = this.add.graphics();
    bodyG.fillStyle(0x4A4268, 0.95);
    bodyG.fillCircle(0, 0, 42);
    // Duri
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
    // Dua mata
    bodyG.fillStyle(0xFFFFFF, 1.0);
    bodyG.fillCircle(-14, -8, 8);
    bodyG.fillCircle(14, -8, 8);
    bodyG.fillStyle(0x15182C, 1.0);
    bodyG.fillCircle(-14, -8, 4);
    bodyG.fillCircle(14, -8, 4);

    container.add(bodyG);

    // Label Teks Pikiran (Plat bersudut tumpul)
    const labelW = 420;
    const labelH = 72;
    const labelBg = this.add.graphics();
    labelBg.fillStyle(0x121434, 0.92);
    labelBg.fillRoundedRect(-labelW / 2, -100, labelW, labelH, 18);
    labelBg.lineStyle(2, 0x7FE0C3, 0.7);
    labelBg.strokeRoundedRect(-labelW / 2, -100, labelW, labelH, 18);

    const labelTxt = this.add.text(0, -64, thought.text, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '22px',
      fontStyle: '700',
      color: '#FFFFFF',
      align: 'center',
      wordWrap: { width: 390 }
    }).setOrigin(0.5).setResolution(2);

    container.add([labelBg, labelTxt]);

    const monsterItem = {
      id: monsterId,
      thought: thought,
      hasFailed: false,
      is2D: true,
      container2D: container,
      speed: 55 + Math.random() * 25,
      phase: Math.random() * Math.PI * 2
    };

    this.activeMonsters.push(monsterItem);
  }

  /**
   * Fallback 2D: Meluncurkan tembakan laser 2D di Phaser.
   */
  fire2DBeam(astronautIndex, monster, onResult) {
    const card = this.astronautCards[astronautIndex];
    const startX = card ? card.container.x : 960;
    const startY = card ? card.container.y - 48 : 900;

    let targetX = 960;
    let targetY = 500;
    if (monster.is2D && monster.container2D) {
      targetX = monster.container2D.x;
      targetY = monster.container2D.y;
    }

    const beamLine = this.add.graphics().setDepth(2000);
    const astCfg = this.astronautConfigs[astronautIndex];

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
   * Siklus render loop per frame (Reticle, Akumulasi, Animasi 2D).
   */
  update(time, delta) {
    const dt = delta / 1000;

    // 1. Pembaruan Cincin Pengisian Napas Reticle
    if (this.isCharging && this.currentTargetMonster) {
      this.chargeTime += delta;
      const progress = Math.min(1.0, this.chargeTime / this.chargeThreshold);

      // Hitung koordinat layar monster sasaran
      let targetPos = null;
      if (this.currentTargetMonster.is2D && this.currentTargetMonster.container2D) {
        targetPos = { x: this.currentTargetMonster.container2D.x, y: this.currentTargetMonster.container2D.y };
      } else if (window.JEDA && JEDA.Stage3D && JEDA.Stage3D.l2 && JEDA.Stage3D.l2.getMonsterScreenPos) {
        targetPos = JEDA.Stage3D.l2.getMonsterScreenPos(this.currentTargetMonster.id);
      }

      if (targetPos) {
        this.reticleContainer.setPosition(targetPos.x, targetPos.y);
      }

      // Gambar Cincin Napas
      this.reticleGraphics.clear();
      const currentAst = this.astronautConfigs[this.selectedAstronautIndex];
      const ringRadius = 46;

      // Lingkaran dasar redup
      this.reticleGraphics.lineStyle(2, 0x506085, 0.4);
      this.reticleGraphics.strokeCircle(0, 0, ringRadius);

      // Busur pengisian napas (0 s.d. 360 deg)
      const startAngle = Phaser.Math.DegToRad(-90);
      const sweepAngle = Phaser.Math.DegToRad(progress * 360);
      const endAngle = startAngle + sweepAngle;

      this.reticleGraphics.lineStyle(4, currentAst.color, 0.95);
      this.reticleGraphics.beginPath();
      this.reticleGraphics.arc(0, 0, ringRadius, startAngle, endAngle, false);
      this.reticleGraphics.strokePath();

      if (progress >= 1.0) {
        // Cincin penuh: Berkedip siap tembak
        this.reticleGraphics.lineStyle(2, 0xFFFFFF, 0.85);
        this.reticleGraphics.strokeCircle(0, 0, ringRadius + 3);
        this.reticleLabel.setText('LEPAS UNTUK TEMBAK!');
        this.reticleLabel.setColor('#7FE0C3');
      } else {
        this.reticleLabel.setText('Tahan napas...');
        this.reticleLabel.setColor('#FFFFFF');
      }
    }

    // 2. Pembaruan Monster 2D (jika mode 2D fallback aktif)
    this.activeMonsters.forEach(m => {
      if (m.is2D && m.container2D) {
        m.container2D.x -= m.speed * dt;
        m.container2D.y += Math.sin(time * 0.002 + m.phase) * 0.35;
        if (m.container2D.x < -140) {
          m.container2D.x = JEDA.CFG.W + 120;
        }
      }
    });

    // 3. Deteksi Penumpukan 4 Monster > 8 Detik (PRD 15.4 Poin 4: Ajakan Mini Napas)
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
  }

  /**
   * Menyelesaikan Level 2 dan menampilkan ringkasan hasil skor.
   */
  finishLevel() {
    if (this.isFinished) return;
    this.isFinished = true;

    // Kalkulasi skor dengan fungsi murni JEDA.Score.calcL2 (PRD 15.4: Rumus skor tidak berubah)
    const panicHits = (JEDA.State.session && JEDA.State.session.panicHits) || this.panicHits || 0;
    const result = JEDA.Score.calcL2(this.firstTryCorrect, panicHits, this.totalThoughts);

    // Simpan progres jika lulus (skor >= 60)
    if (result.passed) {
      if (JEDA.Lumi) JEDA.Lumi.say('level_pass');
      JEDA.State.saveLevelScore(2, result.score, result.stars);
      JEDA.State.data.fails.l2 = 0;
      if (JEDA.Stage3D) {
        JEDA.Stage3D.setLanterns(2); // Lentera pulau 2 menyala terang
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
    const W = JEDA.CFG.W;
    const H = JEDA.CFG.H;
    const cx = W / 2;
    const cy = H / 2;

    const modal = this.add.container(cx, cy).setDepth(3500);
    const cardW = 920;
    const cardH = 620;

    const bg = this.add.graphics();
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

    // Tiga Kartu Komponen Skor (Akurasi 70%, Tenang 20%, Selesai 10%)
    const metrics = [
      { name: 'Akurasi (70%)', val: `${result.akurasi}%`, desc: `${this.firstTryCorrect} / ${this.totalThoughts} tepat pertama` },
      { name: 'Tenang (20%)', val: `${result.tenang}%`, desc: panicHits > 0 ? `${panicHits}x tembak cepat` : 'Sangat tenang' },
      { name: 'Selesai (10%)', val: `${result.selesai}%`, desc: `${this.defeatedCount} / ${this.totalThoughts} dijinakkan` }
    ];

    const mCardW = 250;
    const mCardH = 150;
    const mGap = 28;
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

    // Tombol Tindakan Baku
    const btnY = cardH / 2 - 76;
    const btnW = 300;
    const btnH = 88;
    const btnGap = 32;

    if (result.passed) {
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
   * Menampilkan modal kartu petunjuk Level 2 (PRD Bagian 15.2).
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
      }
    });
  }

  /**
   * Mengambil fallback 10 pikiran jika drawDeck tidak tersedia.
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
