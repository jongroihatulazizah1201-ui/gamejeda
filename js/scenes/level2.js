/**
 * JEDA - Level2Scene (js/scenes/level2.js)
 * Layar 3: Awan Pikiran (Melabeli Pikiran)
 * Fitur Utama:
 * - 10 gelembung pikiran muncul bertahap (maks 4 di layar sekaligus)
 * - 4 keranjang label awan: Cemas, Rencana, Menilai Diri, Kenangan
 * - Seret dan lepas (drag & drop) dengan animasi awan putih saat benar
 * - Getaran dan petunjuk khusus saat salah memasukkan kategori
 * - Deteksi penumpukan 4 gelembung > 8 detik memicu Mini Napas
 * - BR-05: Pengawasan panik klik lewat guard.js (hanya mengurangi komponen Tenang)
 * - Perhitungan skor menggunakan fungsi murni JEDA.Score.calcL2
 */
class Level2Scene extends Phaser.Scene {
  constructor() {
    super({ key: 'Level2Scene' });
  }

  create() {
    const Layout = JEDA.Layout;
    const W = Layout.W;
    const H = Layout.H;
    const cx = Layout.cx();

    // State permainan
    this.totalThoughts = 10;
    this.maxOnScreen = JEDA.CFG.L2.maxOnScreen || 4;
    this.resolvedCount = 0;
    this.firstTryCorrect = 0;
    this.activeBubbles = [];
    this.isFinished = false;
    this.pileUpTimer = 0;
    this.miniBreathActive = false;

    // Siapkan antrean 10 pikiran teracak tanpa 3 kategori sama berturut-turut
    this.thoughtQueue = this.getShuffledThoughts(JEDA.DATA.thoughts || []);

    // 1. Latar Belakang & Vinyet
    JEDA.FX.createBackground(this);
    if (JEDA.Stage3D) {
      JEDA.Stage3D.setMode('l2');
      JEDA.Stage3D.setCalm(0.5);
      JEDA.Stage3D.setLanterns(1); // Level 1 lulus
    }
    this.currentCalm = 0.5;
    this.cameras.main.fadeIn(350);

    // 2. Header Simetris di Zona Header (0 - 120 px)
    this.createHeader();

    // 3. Empat Keranjang Awan di y = 900 (PRD 14.5: rowCenter([360, 360, 360, 360], 48))
    this.createBaskets(cx, 900);

    // 4. Mulai memunculkan gelembung pertama
    this.spawnInitialBubbles();

    // Spawner berkala agar gelembung terus muncul bertahap dan teratur (PRD 5.3)
    this.spawnTimer = this.time.addEvent({
      delay: 7500,
      loop: true,
      callback: () => {
        if (!this.isFinished && !this.miniBreathActive && this.activeBubbles.length < this.maxOnScreen && this.thoughtQueue.length > 0) {
          this.spawnNextBubble(0);
        }
      }
    });

    // 5. Input Safety - BR-05 (Anti Panik Klik)
    this.input.on('pointerdown', () => {
      if (JEDA.Guard && JEDA.Guard.recordPointerDown) {
        JEDA.Guard.recordPointerDown(this, () => {
          if (JEDA.Lumi) {
            JEDA.Lumi.addFlow(-20);
            JEDA.Lumi.say('panic');
          }
          JEDA.UI.showPanicOverlay(this);
        });
      }
    });

    // 6. Pasang listener tombol debug grid 'G'
    Layout.attachDebugKeyListener(this);

    // 7. Pengawas Idle (BR-06)
    if (JEDA.Guard && JEDA.Guard.startIdleMonitor) {
      JEDA.Guard.startIdleMonitor(this);
    }

    // 8. Inisialisasi Karakter Pendamping Lumi (PRD 14.2 Fase G-2)
    if (JEDA.Lumi) {
      JEDA.Lumi.init(this, {
        bubbleX: cx,
        bubbleY: 135,
        showMeter: false,
        resetFlow: true
      });
      this.time.delayedCall(700, () => {
        if (!this.isFinished) JEDA.Lumi.say('l2_intro');
      });
    }

    this.events.on('shutdown', () => {
      if (this.spawnTimer) this.spawnTimer.remove(false);
      if (JEDA.Lumi) JEDA.Lumi.destroy();
    });
  }

  /**
   * Mengacak urutan 10 pikiran tanpa 3 kategori berurutan sama (PRD Bagian 8.1).
   */
  getShuffledThoughts(source) {
    const list = source.map(item => ({ ...item, hasFailed: false }));
    for (let attempt = 0; attempt < 50; attempt++) {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      let valid = true;
      for (let i = 0; i < list.length - 2; i++) {
        if (list[i].category === list[i + 1].category && list[i + 1].category === list[i + 2].category) {
          valid = false;
          break;
        }
      }
      if (valid) return list;
    }
    return list;
  }

  /**
   * Membuat header navigasi dan counter progres di Zona Header (y: 0 - 120 px).
   */
  createHeader() {
    const Layout = JEDA.Layout;
    const headerY = 64;
    const btnW = 200;
    const btnH = 48;

    // Tombol Kembali (rata margin kiri 120 px)
    const leftX = Layout.M + btnW / 2;
    JEDA.UI.createButton(this, leftX, headerY, btnW, btnH, '← Menu', () => {
      if (JEDA.Stage3D) JEDA.Stage3D.setMode('menu');
      JEDA.FX.transitionTo(this, 'CheckinScene');
    }, { fontSize: 27, radius: 24 });

    // Panel Header Tengah Berlatar Gelap
    const centerW = 860;
    const centerH = 88;
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x12142E, 0.94);
    headerBg.fillRoundedRect(Layout.cx() - centerW / 2, headerY - centerH / 2, centerW, centerH, 28);
    headerBg.lineStyle(2, 0x3F486E, 0.7);
    headerBg.strokeRoundedRect(Layout.cx() - centerW / 2, headerY - centerH / 2, centerW, centerH, 28);

    // Judul & Subjudul (Prinsip 8: Hierarki teks 33 px & 27 px)
    this.add.text(Layout.cx(), headerY - 16, 'Level 2: Awan Pikiran', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '33px',
      fontStyle: '800',
      color: '#FFFFFF'
    }).setOrigin(0.5).setResolution(2);

    this.add.text(Layout.cx(), headerY + 18, 'Amati pikiran yang melayang, lalu seret ke keranjang yang sesuai', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '600',
      color: '#CBD5E1'
    }).setOrigin(0.5).setResolution(2);

    // Indikator Kemajuan di Kanan (rata margin kanan 1800 px)
    const rightX = (Layout.W - Layout.M) - btnW / 2;
    const counterBg = this.add.graphics();
    counterBg.fillStyle(0x181A3C, 0.95);
    counterBg.fillRoundedRect(rightX - btnW / 2, headerY - btnH / 2, btnW, btnH, 24);
    counterBg.lineStyle(2, 0x485278, 0.65);
    counterBg.strokeRoundedRect(rightX - btnW / 2, headerY - btnH / 2, btnW, btnH, 24);

    this.counterText = this.add.text(rightX, headerY, `Selesai: 0/10`, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.calm
    }).setOrigin(0.5).setResolution(2);
  }

  /**
   * Membuat 4 keranjang label kategori di bagian bawah layar (PRD 14.5):
   * Empat keranjang label sama lebar 360 dengan jarak 48 (rowCenter) di y 900.
   */
  createBaskets(cx, y) {
    const Layout = JEDA.Layout;
    this.baskets = [];
    const categories = [
      { name: 'Cemas', desc: 'Khawatir masa depan', color: 0xFF8FA3 },
      { name: 'Rencana', desc: 'Agenda & tindakan', color: 0x7FE0C3 },
      { name: 'Menilai Diri', desc: 'Kritik & perbandingan', color: 0xFFD27A },
      { name: 'Kenangan', desc: 'Memori masa lalu', color: 0xB9B5D6 }
    ];

    const basketW = 360;
    const basketH = 120;
    const basketGap = 48;
    const basketWidths = [basketW, basketW, basketW, basketW];
    const basketXs = Layout.rowCenter(basketWidths, basketGap);

    categories.forEach((cat, idx) => {
      const bx = basketXs[idx];
      const basketContainer = this.add.container(bx, y);

      // Gambar bentuk awan panel
      const bg = this.add.graphics();
      this.drawCloudShape(bg, basketW, basketH, cat.color, false);

      const title = this.add.text(0, -18, cat.name, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '33px',
        fontStyle: '800',
        color: JEDA.CFG.COLOR.hex.text
      }).setOrigin(0.5).setResolution(2);

      const desc = this.add.text(0, 18, cat.desc, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '27px',
        fontStyle: '600',
        color: JEDA.CFG.COLOR.hex.muted
      }).setOrigin(0.5).setResolution(2);

      // Teks petunjuk saat salah meletakkan pikiran
      const hintText = this.add.text(0, -basketH / 2 - 36, '', {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '27px',
        fontStyle: '600',
        color: JEDA.CFG.COLOR.hex.warn,
        align: 'center',
        wordWrap: { width: 340 }
      }).setOrigin(0.5).setResolution(2).setAlpha(0);

      basketContainer.add([bg, title, desc, hintText]);

      // Buat Drop Zone interaktif
      const zone = this.add.zone(bx, y, basketW, basketH).setRectangleDropZone(basketW, basketH);
      zone.category = cat.name;
      zone.bg = bg;
      zone.hintText = hintText;
      zone.basketW = basketW;
      zone.basketH = basketH;
      zone.color = cat.color;

      this.baskets.push(zone);
    });

    // Event interaksi drop zone
    this.input.on('dragenter', (pointer, gameObject, dropZone) => {
      if (dropZone && dropZone.bg) {
        this.drawCloudShape(dropZone.bg, dropZone.basketW, dropZone.basketH, dropZone.color, true);
      }
    });

    this.input.on('dragleave', (pointer, gameObject, dropZone) => {
      if (dropZone && dropZone.bg) {
        this.drawCloudShape(dropZone.bg, dropZone.basketW, dropZone.basketH, dropZone.color, false);
      }
    });

    this.input.on('drop', (pointer, gameObject, dropZone) => {
      if (dropZone && dropZone.bg) {
        this.drawCloudShape(dropZone.bg, dropZone.basketW, dropZone.basketH, dropZone.color, false);
      }
      this.handleBubbleDrop(gameObject, dropZone);
    });
  }

  /**
   * Menggambar bentuk awan lembut bercahaya untuk keranjang (Prinsip UI/UX).
   */
  drawCloudShape(graphics, w, h, accentColor, isHovered) {
    graphics.clear();
    const fillAlpha = isHovered ? 0.35 : 0.16;
    const strokeAlpha = isHovered ? 1.0 : 0.65;
    const strokeW = isHovered ? 3.0 : 2.0;

    // Lapisan dasar panel gelap frosted (100% terbaca)
    graphics.fillStyle(0x131534, 0.96);
    graphics.fillRoundedRect(-w / 2, -h / 2, w, h, 28);

    // Tint aksen kategori berpendar
    graphics.fillStyle(accentColor, fillAlpha);
    graphics.fillRoundedRect(-w / 2, -h / 2, w, h, 28);

    // Garis tepi berpendar
    graphics.lineStyle(strokeW, isHovered ? 0xFFFFFF : accentColor, strokeAlpha);
    graphics.strokeRoundedRect(-w / 2, -h / 2, w, h, 28);

    // Garis kilau atas
    graphics.lineStyle(1.5, 0xFFFFFF, isHovered ? 0.7 : 0.35);
    graphics.lineBetween(-w / 2 + 20, -h / 2 + 3, w / 2 - 20, -h / 2 + 3);
  }

  /**
   * Mengambil jalur Y yang optimal dan bebas dari gelembung lain.
   * PRD 14.5: Area gelembung y 200 sampai 760.
   * 4 Jalur Simetris: 240, 380, 520, 660 (jarak vertikal 140 px > tinggi gelembung 120 px).
   * Menjamin tidak ada gelembung yang bertumpuk atau menempel.
   */
  getBestLaneY(excludeBubble = null) {
    const lanes = [240, 380, 520, 660];

    // Evaluasi kepadatan tiap jalur
    const laneStats = lanes.map(laneY => {
      const bubblesInLane = this.activeBubbles.filter(b => 
        b !== excludeBubble && b.active && Math.abs(b.baseLaneY - laneY) < 50
      );

      // Cari jarak gelembung terdekat ke titik muncul (-160 px)
      let minDistance = 9999;
      bubblesInLane.forEach(b => {
        const dist = Math.abs(b.x - (-160));
        if (dist < minDistance) minDistance = dist;
      });

      return {
        laneY,
        count: bubblesInLane.length,
        minDistance
      };
    });

    // 1. Prioritaskan jalur yang benar-benar kosong (count === 0)
    const emptyLanes = laneStats.filter(s => s.count === 0);
    if (emptyLanes.length > 0) {
      return Phaser.Utils.Array.GetRandom(emptyLanes).laneY;
    }

    // 2. Jika seluruh jalur terisi, pilih jalur yang gelembungnya paling jauh (> 500 px dari titik muncul)
    laneStats.sort((a, b) => b.minDistance - a.minDistance);
    return laneStats[0].laneY;
  }

  /**
   * Memunculkan gelembung awal satu per satu dengan jeda yang aman (PRD 5.3).
   */
  spawnInitialBubbles() {
    // Gelembung pertama muncul segera
    this.spawnNextBubble(400);
    // Gelembung kedua muncul setelah gelembung pertama melayang cukup jauh (5 detik kemudian)
    this.spawnNextBubble(5000);
  }

  /**
   * Memunculkan satu gelembung pikiran dari kiri di jalur yang aman.
   */
  spawnNextBubble(delayMs = 0) {
    if (this.thoughtQueue.length === 0 || this.activeBubbles.length >= this.maxOnScreen || this.isFinished) return;

    this.time.delayedCall(delayMs, () => {
      if (this.thoughtQueue.length === 0 || this.activeBubbles.length >= this.maxOnScreen || this.isFinished) return;

      const thoughtData = this.thoughtQueue.shift();
      const bubble = this.createBubble(thoughtData);
      this.activeBubbles.push(bubble);
    });
  }

  /**
   * Membuat satu objek gelembung pikiran interaktif dengan jarak aman.
   */
  createBubble(thoughtData) {
    const W = JEDA.CFG.W;
    const laneY = this.getBestLaneY();
    const startX = -160;

    const container = this.add.container(startX, laneY).setDepth(10);
    const bubbleW = 340;
    const bubbleH = 128;

    // Bentuk gelembung kaca oval rounded ber-efek pantulan kaca & pendar kategori (Prinsip UI/UX)
    const bg = this.add.graphics();
    this.drawBubbleShape(bg, bubbleW, bubbleH, false, thoughtData.category);

    // Teks pikiran (kontras tinggi, tajam, ukuran proporsional min 27 px)
    const textObj = this.add.text(0, 0, thoughtData.text, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '700',
      color: '#FFFFFF',
      align: 'center',
      wordWrap: { width: bubbleW - 40 }
    }).setOrigin(0.5).setResolution(2);

    container.add([bg, textObj]);
    container.setSize(bubbleW, bubbleH);
    container.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-bubbleW / 2, -bubbleH / 2, bubbleW, bubbleH),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true
    });
    this.input.setDraggable(container);

    // Data gelembung
    container.thoughtData = thoughtData;
    container.baseLaneY = laneY;
    container.bg = bg;
    container.textObj = textObj;
    container.isBeingDragged = false;

    // Gerak melayang perlahan dari kiri ke kanan
    this.startDrifting(container, startX, W + 180);

    // Animasi naik-turun lembut (floating bobbing) agar tampak hidup seperti gelembung sungguhan
    container.bobTween = this.tweens.add({
      targets: [bg, textObj],
      y: '+=6',
      duration: Phaser.Math.Between(1800, 2400),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    container.pulseTween = this.tweens.add({
      targets: container,
      scaleX: 1.02,
      scaleY: 0.98,
      duration: Phaser.Math.Between(2200, 2800),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Event drag
    container.on('dragstart', () => {
      container.isBeingDragged = true;
      if (container.driftTween) container.driftTween.pause();
      if (container.bobTween) container.bobTween.pause();
      if (container.pulseTween) container.pulseTween.pause();
      container.setDepth(200);
      this.tweens.add({ targets: container, scaleX: 1.08, scaleY: 1.08, duration: 150 });
    });

    container.on('drag', (pointer, dragX, dragY) => {
      container.x = dragX;
      container.y = dragY;
    });

    container.on('dragend', (pointer, dragX, dragY, dropped) => {
      container.setDepth(10);
      this.tweens.add({ targets: container, scaleX: 1.0, scaleY: 1.0, duration: 150 });

      // Jika dilepas di luar keranjang (PRD: "lepas di luar keranjang, gelembung kembali melayang")
      if (!dropped) {
        container.isBeingDragged = false;
        if (container.bobTween) container.bobTween.resume();
        if (container.pulseTween) container.pulseTween.resume();

        // Cari jalur yang aman dari gelembung lain agar tidak bertumpukan saat kembali
        const safeLaneY = this.getBestLaneY(container);
        container.baseLaneY = safeLaneY;

        this.tweens.add({
          targets: container,
          y: safeLaneY,
          duration: 400,
          ease: 'Sine.easeOut',
          onComplete: () => {
            if (container.active) {
              this.startDrifting(container, container.x, W + 180);
            }
          }
        });
      }
    });

    return container;
  }

  /**
   * Menggambar bentuk gelembung kaca organik (iridescent glass bubble) dengan pantulan cahaya.
   */
  drawBubbleShape(graphics, w, h, isWhiteCloud = false, category = 'Cemas') {
    graphics.clear();
    const radius = 38;

    if (isWhiteCloud) {
      // Bentuk awan putih mekar lembut dan bergelombang
      graphics.fillStyle(0xFFFFFF, 0.96);
      graphics.fillCircle(0, -6, 52);
      graphics.fillCircle(-52, 6, 38);
      graphics.fillCircle(52, 6, 40);
      graphics.fillCircle(-24, -22, 34);
      graphics.fillCircle(24, -20, 36);
      graphics.fillRoundedRect(-w / 2 + 15, 6, w - 30, 36, 18);

      graphics.lineStyle(2, 0xE2E8F0, 0.85);
      graphics.strokeRoundedRect(-w / 2 + 15, 6, w - 30, 36, 18);
    } else {
      // Warna aura kategori (pastel berkelas)
      const categoryAuras = {
        'Cemas': 0xF4A261,        // Coral / Amber lembut
        'Rencana': 0x7FE0C3,      // Mint / Teal tenang
        'Menilai Diri': 0xC4B5FD, // Lilac / Lavender
        'Kenangan': 0x93C5FD      // Biru langit lembut
      };
      const auraColor = categoryAuras[category] || 0x7FE0C3;

      // 1. Lapisan dasar gelap frosted glass (100% terbaca, bebas tembus pandang)
      graphics.fillStyle(0x131536, 0.96);
      graphics.fillRoundedRect(-w / 2, -h / 2, w, h, radius);

      // 2. Kilau gradasi dalam gelembung kaca
      graphics.fillStyle(auraColor, 0.12);
      graphics.fillRoundedRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8, radius - 2);

      // 3. Garis tepi kaca berpendar (Dual Rim Stroke)
      graphics.lineStyle(2.5, auraColor, 0.75);
      graphics.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);

      graphics.lineStyle(1.2, 0xFFFFFF, 0.45);
      graphics.strokeRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, radius - 2);

      // 4. Kilau pantulan cahaya atas (Specular Highlight Khas Gelembung Kaca)
      graphics.fillStyle(0xFFFFFF, 0.75);
      graphics.fillRoundedRect(-w / 2 + 22, -h / 2 + 10, w * 0.44, 5, 2.5);

      graphics.fillStyle(0xFFFFFF, 0.9);
      graphics.fillCircle(-w / 2 + 32, -h / 2 + 24, 3.5);

      // 5. Pantulan bawah (Subtle Bottom Sheen)
      graphics.lineStyle(1.5, auraColor, 0.35);
      graphics.strokeRoundedRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12, radius - 4);
    }
  }

  /**
   * Menjalankan gerak melayang pelan gelembung dari posisi sekarang ke kanan.
   */
  startDrifting(container, fromX, toX) {
    const W = JEDA.CFG.W;
    const remainingDistance = Math.max(100, toX - fromX);

    // Kecepatan sedikit bervariasi per jalur (42-47 px/s) agar tampak alami dan tidak sejajar kaku
    const laneSpeedMap = { 240: 42, 380: 46, 520: 43, 660: 47 };
    const speed = laneSpeedMap[container.baseLaneY] || 45;
    const duration = (remainingDistance / speed) * 1000;

    if (container.driftTween) {
      container.driftTween.stop();
    }

    container.driftTween = this.tweens.add({
      targets: container,
      x: toX,
      duration: duration,
      ease: 'Linear',
      onComplete: () => {
        // Jika sampai di ujung kanan tanpa dikerjakan, putar kembali ke kiri di jalur yang aman
        if (container.active && !container.isBeingDragged) {
          const newLaneY = this.getBestLaneY(container);
          container.x = -160;
          container.y = newLaneY;
          container.baseLaneY = newLaneY;
          this.startDrifting(container, -160, W + 180);
        }
      }
    });
  }

  /**
   * Evaluasi saat gelembung dijatuhkan ke salah satu keranjang.
   */
  handleBubbleDrop(bubble, dropZone) {
    bubble.isBeingDragged = false;
    const thought = bubble.thoughtData;
    const isCorrect = (dropZone.category === thought.category);

    if (isCorrect) {
      // 1. Catat keberhasilan
      if (!thought.hasFailed) {
        this.firstTryCorrect++;
        if (JEDA.Lumi) JEDA.Lumi.addFlow(10);
      }
      if (JEDA.Lumi) JEDA.Lumi.say('l2_correct');
      this.resolvedCount++;
      this.counterText.setText(`Terselesaikan: ${this.resolvedCount}/10`);

      if (JEDA.Stage3D) {
        JEDA.Stage3D.pulse(0.5);
        this.currentCalm = Math.min(1.0, (this.currentCalm || 0.5) + 0.1);
        JEDA.Stage3D.setCalm(this.currentCalm);
        if (JEDA.Stage3D.spawnCloud) {
          JEDA.Stage3D.spawnCloud();
        }
      }

      // 2. Animasi BENAR: "gelembung berubah menjadi awan putih dan terangkat ke atas lalu hilang" (PRD 5.3)
      if (bubble.driftTween) bubble.driftTween.stop();
      if (bubble.bobTween) bubble.bobTween.stop();
      if (bubble.pulseTween) bubble.pulseTween.stop();
      bubble.disableInteractive();
      this.drawBubbleShape(bubble.bg, bubble.width, bubble.height, true, bubble.thoughtData && bubble.thoughtData.category);
      bubble.textObj.setColor('#131536');

      this.tweens.add({
        targets: bubble,
        y: bubble.y - 180,
        scaleX: 1.25,
        scaleY: 1.25,
        alpha: 0,
        duration: 700,
        ease: 'Sine.easeOut',
        onComplete: () => {
          this.removeActiveBubble(bubble);
          bubble.destroy();

          // Munculkan gelembung berikutnya jika di layar tersisa sedikit
          if (this.resolvedCount < this.totalThoughts) {
            if (this.activeBubbles.length < 2) {
              this.spawnNextBubble(1200);
            }
          } else {
            this.finishLevel();
          }
        }
      });
    } else {
      // 3. Animasi SALAH: "gelembung bergetar ringan, keranjang menampilkan petunjuk teks, gelembung kembali" (PRD 5.3)
      thought.hasFailed = true;
      if (JEDA.Lumi) {
        JEDA.Lumi.addFlow(-10);
        JEDA.Lumi.say('l2_wrong');
      }

      // Keranjang menampilkan petunjuk
      this.showBasketHint(dropZone, thought.hint);

      // Gelembung bergetar ringan
      this.tweens.add({
        targets: bubble,
        x: bubble.x - 14,
        duration: 50,
        yoyo: true,
        repeat: 4,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          // Kembalikan ke posisi melayang semula di jalur yang aman
          const safeLaneY = this.getBestLaneY(bubble);
          bubble.baseLaneY = safeLaneY;
          this.tweens.add({
            targets: bubble,
            y: safeLaneY,
            duration: 400,
            ease: 'Sine.easeOut',
            onComplete: () => {
              if (bubble.active) {
                this.startDrifting(bubble, bubble.x, JEDA.CFG.W + 180);
              }
            }
          });
        }
      });
    }
  }

  /**
   * Menampilkan petunjuk singkat di atas keranjang saat salah meletakkan pikiran.
   */
  showBasketHint(dropZone, hintText) {
    if (!dropZone || !dropZone.hintText) return;
    dropZone.hintText.setText(hintText);
    dropZone.hintText.setAlpha(1);

    this.tweens.killTweensOf(dropZone.hintText);
    this.tweens.add({
      targets: dropZone.hintText,
      alpha: 1,
      y: dropZone.y - dropZone.basketH / 2 - 45,
      duration: 200,
      onComplete: () => {
        this.time.delayedCall(3500, () => {
          this.tweens.add({
            targets: dropZone.hintText,
            alpha: 0,
            duration: 300
          });
        });
      }
    });
  }

  /**
   * Menghapus referensi gelembung dari daftar aktif.
   */
  removeActiveBubble(bubble) {
    const idx = this.activeBubbles.indexOf(bubble);
    if (idx !== -1) {
      this.activeBubbles.splice(idx, 1);
    }
  }

  /**
   * Loop pengawasan: mendeteksi penumpukan 4 gelembung > 8 detik & memisahkan gelembung agar tidak menempel.
   */
  update(time, delta) {
    if (this.isFinished || this.miniBreathActive) return;

    // Jaga jarak antar gelembung agar tidak pernah saling menempel atau menutupi tulisan
    this.preventBubbleOverlap();

    if (this.activeBubbles.length >= 4) {
      this.pileUpTimer += delta;
      if (this.pileUpTimer >= (JEDA.CFG.L2.pileUpMs || 8000)) {
        this.pileUpTimer = 0;
        this.triggerMiniBreath();
      }
    } else {
      this.pileUpTimer = 0;
    }
  }

  /**
   * Mencegah tumpang tindih gelembung (anti-overlap & separation).
   * Jika ada dua gelembung yang berada di jalur yang sama dan terlalu berdekatan,
   * secara otomatis salah satunya dipindahkan ke jalur kosong lain.
   */
  preventBubbleOverlap() {
    const bubbles = this.activeBubbles.filter(b => b && b.active && !b.isBeingDragged);
    const minSafeX = 330; // Lebar gelembung 300 + margin aman 30 px

    for (let i = 0; i < bubbles.length; i++) {
      for (let j = i + 1; j < bubbles.length; j++) {
        const a = bubbles[i];
        const b = bubbles[j];

        const dx = Math.abs(a.x - b.x);
        const dy = Math.abs(a.y - b.y);

        // Jika berada di jalur yang sama (dy < 60) dan jarak horizontal berdekatan (< 330 px)
        if (dy < 60 && dx < minSafeX) {
          // Pindahkan gelembung yang di belakang ke jalur kosong lain
          const target = (a.x < b.x) ? a : b;
          const other = (target === a) ? b : a;
          const newLaneY = this.getBestLaneY(target);

          if (Math.abs(newLaneY - target.baseLaneY) > 50) {
            target.baseLaneY = newLaneY;
            this.tweens.add({
              targets: target,
              y: newLaneY,
              duration: 450,
              ease: 'Sine.easeInOut'
            });
          } else {
            // Beri dorongan jarak horizontal lembut jika jalur lain sedang penuh
            const push = (minSafeX - dx) * 0.05;
            target.x = Math.max(-160, target.x - push);
            other.x += push;
          }
        }
      }
    }
  }

  /**
   * Memicu siklus napas mini saat pikiran menumpuk:
   * "Jika 4 gelembung menumpuk lebih dari 8 detik, muncul ajakan 'Tarik napas sebentar'
   * dengan satu siklus napas mini (pemain menahan 4 detik lalu melepas)." (PRD 5.3)
   */
  triggerMiniBreath() {
    this.miniBreathActive = true;
    const W = JEDA.CFG.W;
    const H = JEDA.CFG.H;
    const cx = W / 2;
    const cy = H / 2;

    // Hentikan sementara gerak melayang semua gelembung
    this.activeBubbles.forEach(b => {
      if (b.driftTween) b.driftTween.pause();
    });

    const overlay = this.add.container(0, 0).setDepth(1500);

    const backdrop = this.add.rectangle(cx, cy, W, H, 0x090918, 0.85).setInteractive();
    overlay.add(backdrop);

    const title = this.add.text(cx, cy - 230, 'Pikiran Mulai Menumpuk', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '44px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.warn
    }).setOrigin(0.5).setResolution(2);

    const sub = this.add.text(cx, cy - 180, 'Tarik napas sebentar. Tahan tombol selama 4 detik, lalu hembuskan.', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '33px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    // Orb mini napas
    const orb = JEDA.FX.createOrb(this, cx, cy + 20, 75, JEDA.CFG.COLOR.calm);
    overlay.add([title, sub, orb]);

    // Instruksi tombol
    const hint = this.add.text(cx, cy + 180, 'Tekan & tahan di sini untuk menarik napas...', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.calm
    }).setOrigin(0.5).setResolution(2);
    overlay.add(hint);

    let miniHolding = false;
    let miniHoldStart = 0;
    let breathDone = false;

    backdrop.on('pointerdown', () => {
      if (breathDone) return;
      miniHolding = true;
      miniHoldStart = Date.now();
      hint.setText('Tarik napas perlahan... (Tahan 4 detik)');
      this.tweens.add({ targets: orb, scaleX: 1.6, scaleY: 1.6, duration: 4000, ease: 'Sine.easeInOut' });
    });

    backdrop.on('pointerup', () => {
      if (breathDone || !miniHolding) return;
      miniHolding = false;
      const duration = Date.now() - miniHoldStart;

      if (duration >= 3000) {
        breathDone = true;
        hint.setText('Hembuskan napas perlahan... Pikiran kembali tenang.');
        this.tweens.add({
          targets: orb,
          scaleX: 1.0,
          scaleY: 1.0,
          duration: 3000,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            this.time.delayedCall(800, () => {
              this.tweens.add({
                targets: overlay,
                alpha: 0,
                duration: 400,
                onComplete: () => {
                  overlay.destroy();
                  this.miniBreathActive = false;
                  // Lanjutkan kembali gelembung yang dijeda
                  this.activeBubbles.forEach(b => {
                    if (b.driftTween) b.driftTween.resume();
                  });
                }
              });
            });
          }
        });
      } else {
        hint.setText('Tahan sedikit lebih lama (minimal 4 detik). Coba lagi...');
        this.tweens.add({ targets: orb, scaleX: 1.0, scaleY: 1.0, duration: 300 });
      }
    });
  }

  /**
   * Menyelesaikan Level 2 dan menampilkan ringkasan skor.
   */
  finishLevel() {
    if (this.isFinished) return;
    this.isFinished = true;

    // Kalkulasi skor dengan fungsi murni JEDA.Score.calcL2
    // Catatan keputusan: Panik klik hanya mengurangi komponen Tenang, tidak memblokir kelulusan
    const panicHits = (JEDA.State.session && JEDA.State.session.panicHits) || 0;
    const result = JEDA.Score.calcL2(this.firstTryCorrect, panicHits, 10);

    // Simpan progres jika lulus (skor >= 60)
    if (result.passed) {
      if (JEDA.Lumi) JEDA.Lumi.say('level_pass');
      JEDA.State.saveLevelScore(2, result.score, result.stars);
      JEDA.State.data.fails.l2 = 0;
      if (JEDA.Stage3D) {
        JEDA.Stage3D.setLanterns(2); // Lentera pulau 2 menyala
        if (JEDA.Stage3D.celebratePass) {
          JEDA.Stage3D.celebratePass();
        }
      }
    } else {
      if (JEDA.Lumi) JEDA.Lumi.say('result_low');
      JEDA.State.data.fails.l2 = (JEDA.State.data.fails.l2 || 0) + 1;
    }
    JEDA.State.session.levelScores.l2 = result.score;
    JEDA.State.session.l2FirstTry = this.firstTryCorrect;
    JEDA.State.session.l2Accuracy = (this.firstTryCorrect / 10) * 100;
    JEDA.State.session.l2Passed = result.passed;
    JEDA.State.save();

    // Tawaran Mode Ramah jika gagal 3 kali berturut-turut (BR-07)
    if (!result.passed && JEDA.State.data.fails.l2 >= 3 && !JEDA.State.data.easy.l2) {
      this.time.delayedCall(600, () => {
        JEDA.UI.showFriendlyModeOffer(this, 'Level 2: Awan Pikiran', () => {
          JEDA.State.data.easy.l2 = true;
          JEDA.State.save();
          this.scene.restart();
        });
      });
      return;
    }

    this.time.delayedCall(600, () => {
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

    const modal = this.add.container(cx, cy).setDepth(2000);
    const cardW = 920;
    const cardH = 620;

    const bg = this.add.graphics();
    bg.fillStyle(0x16163A, 0.95);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 32);
    bg.lineStyle(2, result.passed ? JEDA.CFG.COLOR.calm : JEDA.CFG.COLOR.warn, 0.5);
    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 32);
    modal.add(bg);

    const titleStr = result.passed ? 'Level 2 Selesai: Awan Pikiran' : 'Perlu Latihan Lagi';
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

    // Tiga Komponen Skor
    const rowY = -cardH / 2 + 220;
    const compBoxW = 240;
    const compBoxH = 120;
    const comps = [
      { name: 'Akurasi', val: `${result.akurasi}%`, desc: `${this.firstTryCorrect}/10 Tepat Awal` },
      { name: 'Tenang', val: `${result.tenang}%`, desc: `${panicHits} Panik Klik` },
      { name: 'Selesai', val: `${result.selesai}%`, desc: '10/10 Terselesaikan' }
    ];

    comps.forEach((c, idx) => {
      const bx = (idx - 1) * 270;
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

    const scoreText = this.add.text(0, rowY + 125, `Skor Akhir Level 2: ${result.score}`, {
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
      // Kiri: Aksi sekunder (Ulangi Level 2)
      const repeatBtn = JEDA.UI.createButton(this, -(btnW / 2 + btnGap / 2), btnY, btnW, btnH, 'Ulangi Level 2', () => {
        if (JEDA.Stage3D) {
          JEDA.Stage3D.setMode('l2');
          JEDA.Stage3D.setLanterns(1);
        }
        this.scene.restart();
      }, { radius: 44, fontSize: 33 });

      // Kanan: Aksi utama (Lanjut ke Level 3)
      const nextBtn = JEDA.UI.createButton(this, (btnW / 2 + btnGap / 2), btnY, btnW, btnH, 'Lanjut ke Level 3', () => {
        if (JEDA.Stage3D) JEDA.Stage3D.setMode('l3');
        JEDA.FX.transitionTo(this, 'Level3Scene');
      }, { primary: true, radius: 44, fontSize: 33 });

      modal.add([repeatBtn, nextBtn]);
    } else {
      // Kiri: Menu Utama
      const menuBtn = JEDA.UI.createButton(this, -(btnW / 2 + btnGap / 2), btnY, btnW, btnH, 'Menu Utama', () => {
        if (JEDA.Stage3D) JEDA.Stage3D.setMode('menu');
        JEDA.FX.transitionTo(this, 'CheckinScene');
      }, { radius: 44, fontSize: 33 });

      // Kanan: Ulangi Level 2
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
}

window.Level2Scene = Level2Scene;
