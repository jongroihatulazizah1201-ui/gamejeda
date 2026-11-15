/**
 * JEDA - UI Components Helper (js/ui.js)
 * Helper pembuatan komponen UI berdesain panel kaca (glassmorphism),
 * tombol interaktif, toast notifikasi, modal peduli (BR-09), dan modal pengaturan (BR-12 & BR-13).
 */
window.JEDA = window.JEDA || {};

JEDA.UI = {
  /**
   * Menggambar panel kaca rounded rectangle.
   */
  createPanel(scene, x, y, w, h, radius = 24, fillAlpha = 0.08, strokeAlpha = 0.20, fillColor = JEDA.CFG.COLOR.panel) {
    const graphics = scene.add.graphics();
    graphics.fillStyle(fillColor, fillAlpha);
    graphics.fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);

    graphics.lineStyle(2, JEDA.CFG.COLOR.panelLine, strokeAlpha);
    graphics.strokeRoundedRect(x - w / 2, y - h / 2, w, h, radius);
    return graphics;
  },

  /**
   * Membuat tombol panel kaca interaktif dengan hover effect (PRD Bagian 4).
   */
  createButton(scene, x, y, w, h, label, onClick, options = {}) {
    const container = scene.add.container(x, y);
    const radius = options.radius || 24;
    const isPrimary = options.primary || false;
    const isDisabled = options.disabled || false;
    const fontSize = options.fontSize || JEDA.CFG.FONT.body;

    // Background panel tombol solid-frosted (Prinsip UI/UX: kontras tinggi, bebas tembus pandang)
    const bg = scene.add.graphics();
    const updateBg = (fillAlpha, strokeAlpha, fillColor, strokeColor) => {
      bg.clear();
      bg.fillStyle(fillColor, fillAlpha);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
      bg.lineStyle(2, strokeColor, strokeAlpha);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
    };

    const normalFillAlpha = 0.95;
    const normalStrokeAlpha = isPrimary ? 0.85 : 0.65;
    const normalColor = isPrimary ? 0x22554E : 0x181A3C;
    const normalStrokeColor = isPrimary ? 0x7FE0C3 : 0x485278;

    updateBg(normalFillAlpha, normalStrokeAlpha, normalColor, normalStrokeColor);

    // Teks tombol (selalu menggunakan warna kontras terang #FFFFFF secara default)
    const textColor = options.textColor || '#FFFFFF';
    const textObj = scene.add.text(0, 0, label, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: fontSize + 'px',
      fontStyle: '700',
      color: textColor,
      align: 'center'
    }).setOrigin(0.5).setResolution(2);

    container.add([bg, textObj]);
    container.setSize(w, h);
    container.bg = bg;
    container.textObj = textObj;

    // Status disabled
    if (isDisabled) {
      container.setAlpha(0.45);
      return container;
    }

    // Interaktivitas dengan area sentuh terpusat (-w/2, -h/2)
    container.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true
    });

    container.on('pointerover', () => {
      scene.tweens.add({
        targets: container,
        scaleX: 1.04,
        scaleY: 1.04,
        y: y - 3,
        duration: 150,
        ease: 'Sine.easeOut'
      });
      const hoverColor = isPrimary ? 0x2C6C63 : 0x242854;
      const hoverStroke = isPrimary ? 0x9BECD6 : 0x7FE0C3;
      updateBg(0.98, 1.0, hoverColor, hoverStroke);
    });

    container.on('pointerout', () => {
      scene.tweens.add({
        targets: container,
        scaleX: 1.0,
        scaleY: 1.0,
        y: y,
        duration: 150,
        ease: 'Sine.easeOut'
      });
      updateBg(normalFillAlpha, normalStrokeAlpha, normalColor, normalStrokeColor);
    });

    container.on('pointerdown', () => {
      container.setScale(0.97);
    });

    container.on('pointerup', () => {
      container.setScale(1.04);
      if (typeof onClick === 'function') {
        onClick();
      }
    });

    container.setEnabled = (enabled) => {
      if (enabled) {
        container.setAlpha(1.0);
        container.setInteractive({
          hitArea: new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
          hitAreaCallback: Phaser.Geom.Rectangle.Contains,
          useHandCursor: true
        });
      } else {
        container.setAlpha(0.4);
        container.disableInteractive();
      }
    };

    return container;
  },

  /**
   * Menggambar ikon gembok dengan Phaser Graphics (PRD Bagian 4).
   */
  drawLockIcon(graphics, x, y, size = 28, color = 0xFFFFFF, alpha = 0.8) {
    graphics.lineStyle(2.5, color, alpha);
    // Lengkungan atas gembok (shackle)
    graphics.beginPath();
    graphics.arc(x, y - size * 0.15, size * 0.35, Math.PI, 0, false);
    graphics.strokePath();

    // Badan gembok (body)
    graphics.fillStyle(color, alpha * 0.6);
    graphics.fillRoundedRect(x - size * 0.45, y - size * 0.15, size * 0.9, size * 0.75, 4);
    graphics.strokeRoundedRect(x - size * 0.45, y - size * 0.15, size * 0.9, size * 0.75, 4);
  },

  /**
   * Menampilkan pesan toast melayang di bagian atas layar (BR-01, BR-14).
   */
  toast(scene, message, duration = 3000) {
    const W = JEDA.CFG.W;
    const yTarget = 110;
    const container = scene.add.container(W / 2, yTarget - 20).setDepth(1000);

    const textObj = scene.add.text(0, 0, message, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: JEDA.CFG.FONT.body + 'px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.text,
      align: 'center'
    }).setOrigin(0.5).setResolution(2);

    const padX = 50;
    const padY = 24;
    const w = textObj.width + padX * 2;
    const h = textObj.height + padY * 2;

    const bg = scene.add.graphics();
    bg.fillStyle(0x16163A, 0.92);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
    bg.lineStyle(2, JEDA.CFG.COLOR.panelLine, 0.4);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 20);

    container.add([bg, textObj]);
    container.setAlpha(0);

    // Animasi muncul
    scene.tweens.add({
      targets: container,
      alpha: 1,
      y: yTarget,
      duration: 250,
      ease: 'Sine.easeOut',
      onComplete: () => {
        scene.time.delayedCall(duration, () => {
          scene.tweens.add({
            targets: container,
            alpha: 0,
            y: yTarget - 20,
            duration: 250,
            ease: 'Sine.easeIn',
            onComplete: () => container.destroy()
          });
        });
      }
    });
  },

  /**
   * Menampilkan Modal Peduli sesuai aturan bisnis BR-09:
   * Dibuka jika skor = 1 atau label = 'Panik' atau 'Aku merasa tidak aman'.
   */
  showCareModal(scene, onLightBreath, onContinue) {
    const W = JEDA.CFG.W;
    const H = JEDA.CFG.H;
    const modalContainer = scene.add.container(0, 0).setDepth(2000);

    // 1. Overlay redup latar belakang
    const backdrop = scene.add.rectangle(W / 2, H / 2, W, H, 0x070714, 0.82)
      .setInteractive(); // Blokir klik ke bawah
    modalContainer.add(backdrop);

    // 2. Kartu kaca utama modal peduli
    const cardW = 1050;
    const cardH = 680;
    const cx = W / 2;
    const cy = H / 2;

    const cardBg = scene.add.graphics();
    cardBg.fillStyle(0x1a1a38, 0.95);
    cardBg.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    cardBg.lineStyle(2, 0xFF8FA3, 0.45); // Aksen warna hangat lembut
    cardBg.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    modalContainer.add(cardBg);

    // 3. Ikon hati/tenang
    const badgeText = scene.add.text(cx, cy - cardH / 2 + 65, 'Ruang Aman untuk Dirimu', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: JEDA.CFG.FONT.subtitle + 'px',
      fontStyle: '800',
      color: '#FF8FA3'
    }).setOrigin(0.5).setResolution(2);
    modalContainer.add(badgeText);

    // 4. Pesan empati hangat
    const warmMessage = 'Terima kasih sudah jujur dengan perasaanmu.\nSaat beban terasa berat, kamu tidak harus memikulnya sendirian.\nBantuan selalu tersedia untukmu:';
    const messageText = scene.add.text(cx, cy - cardH / 2 + 155, warmMessage, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: JEDA.CFG.FONT.body + 'px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.text,
      align: 'center',
      lineSpacing: 10
    }).setOrigin(0.5).setResolution(2);
    modalContainer.add(messageText);

    // 5. Dua kontak bantuan berdampingan (119 ext. 8 dan healing119.id)
    const boxW = 440;
    const boxH = 135;
    const boxY = cy + 20;

    // Kotak Kiri: 119 ext. 8
    const boxLeftX = cx - 235;
    const bgL = scene.add.graphics();
    bgL.fillStyle(0x1A1D40, 0.95);
    bgL.fillRoundedRect(boxLeftX - boxW / 2, boxY - boxH / 2, boxW, boxH, 20);
    bgL.lineStyle(2, 0x7FE0C3, 0.5);
    bgL.strokeRoundedRect(boxLeftX - boxW / 2, boxY - boxH / 2, boxW, boxH, 20);

    const titleL = scene.add.text(boxLeftX, boxY - 30, 'Telepon Siaga (24 Jam)', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '22px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted
    }).setOrigin(0.5).setResolution(2);

    const contactL = scene.add.text(boxLeftX, boxY + 15, '119 ext. 8', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '38px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.calm
    }).setOrigin(0.5).setResolution(2);

    modalContainer.add([bgL, titleL, contactL]);

    // Kotak Kanan: healing119.id
    const boxRightX = cx + 235;
    const bgR = scene.add.graphics();
    bgR.fillStyle(0x1A1D40, 0.95);
    bgR.fillRoundedRect(boxRightX - boxW / 2, boxY - boxH / 2, boxW, boxH, 20);
    bgR.lineStyle(2, 0x7FE0C3, 0.5);
    bgR.strokeRoundedRect(boxRightX - boxW / 2, boxY - boxH / 2, boxW, boxH, 20);

    const titleR = scene.add.text(boxRightX, boxY - 30, 'Konseling Online Kemenkes', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '22px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted
    }).setOrigin(0.5).setResolution(2);

    const contactR = scene.add.text(boxRightX, boxY + 15, 'healing119.id', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '34px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.calm
    }).setOrigin(0.5).setResolution(2);

    modalContainer.add([bgR, titleR, contactR]);

    // 6. Catatan disclaimer
    const disclaimerText = 'Layanan di atas disediakan tenaga profesional independen.\nJEDA adalah media latihan kesadaran, bukan pengganti perawatan medis atau konseling darurat.';
    const noteText = scene.add.text(cx, cy + 145, disclaimerText, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '20px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted,
      align: 'center',
      lineSpacing: 6
    }).setOrigin(0.5).setResolution(2);
    modalContainer.add(noteText);

    // 7. Dua tombol opsi per BR-09:
    // Tombol 1: Latihan napas ringan (Level 1 mode ramah)
    const btn1 = this.createButton(scene, cx - 220, cy + 245, 380, 68, 'Latihan Napas Ringan', () => {
      modalContainer.destroy();
      if (typeof onLightBreath === 'function') onLightBreath();
    }, { radius: 34, primary: true });

    // Tombol 2: Aku sudah lebih baik, lanjutkan
    const btn2 = this.createButton(scene, cx + 220, cy + 245, 420, 68, 'Aku sudah lebih baik, lanjutkan', () => {
      modalContainer.destroy();
      if (typeof onContinue === 'function') onContinue();
    }, { radius: 34 });

    modalContainer.add([btn1, btn2]);

    // Animasi kemunculan lembut
    modalContainer.setAlpha(0);
    scene.tweens.add({
      targets: modalContainer,
      alpha: 1,
      duration: 250,
      ease: 'Sine.easeOut'
    });

    return modalContainer;
  },

  /**
   * Menampilkan Modal Pengaturan (Kurangi Gerakan BR-12, Hapus Data Saya BR-13).
   */
  showSettingsModal(scene, onDataReset) {
    const W = JEDA.CFG.W;
    const H = JEDA.CFG.H;
    const container = scene.add.container(0, 0).setDepth(2000);

    const backdrop = scene.add.rectangle(W / 2, H / 2, W, H, 0x050510, 0.75)
      .setInteractive();
    container.add(backdrop);

    const cardW = 750;
    const cardH = 500;
    const cx = W / 2;
    const cy = H / 2;

    const bg = scene.add.graphics();
    bg.fillStyle(0x16163A, 0.95);
    bg.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 28);
    bg.lineStyle(2, JEDA.CFG.COLOR.panelLine, 0.3);
    bg.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 28);
    container.add(bg);

    const title = scene.add.text(cx, cy - cardH / 2 + 60, 'Pengaturan JEDA', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: JEDA.CFG.FONT.subtitle + 'px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);
    container.add(title);

    // Opsi 1: Kurangi Gerakan (BR-12)
    const isReduceMotion = JEDA.State.data.settings.reduceMotion;
    const motionBtnText = isReduceMotion ? 'Kurangi Gerakan: [AKTIF]' : 'Kurangi Gerakan: [NONAKTIF]';
    const motionBtn = this.createButton(scene, cx, cy - 40, 520, 64, motionBtnText, () => {
      JEDA.State.data.settings.reduceMotion = !JEDA.State.data.settings.reduceMotion;
      JEDA.State.save();
      if (JEDA.Stage3D && JEDA.Stage3D.setReduceMotion) {
        JEDA.Stage3D.setReduceMotion(JEDA.State.data.settings.reduceMotion);
      }
      motionBtn.textObj.setText(JEDA.State.data.settings.reduceMotion ? 'Kurangi Gerakan: [AKTIF]' : 'Kurangi Gerakan: [NONAKTIF]');
      JEDA.UI.toast(scene, 'Pengaturan animasi diperbarui.');
    });
    container.add(motionBtn);

    // Opsi 2: Hapus Data Saya (BR-13)
    const deleteBtn = this.createButton(scene, cx, cy + 45, 520, 64, 'Hapus Data Saya', () => {
      JEDA.State.resetData();
      JEDA.UI.toast(scene, 'Seluruh data lokal berhasil dihapus.');
      container.destroy();
      if (typeof onDataReset === 'function') onDataReset();
    }, { textColor: '#FF8FA3' });
    container.add(deleteBtn);

    // Tombol Tutup
    const closeBtn = this.createButton(scene, cx, cy + 150, 240, 56, 'Tutup', () => {
      container.destroy();
    });
    container.add(closeBtn);

    return container;
  },

  /**
   * Menampilkan overlay peringatan saat pemain melakukan panik klik (BR-05).
   */
  showPanicOverlay(scene) {
    const W = JEDA.CFG.W;
    const H = JEDA.CFG.H;

    // Reaksi 3D Tabel 13.4: Suasana meredup, kamera mundur sedikit
    if (JEDA.Stage3D && JEDA.Stage3D.triggerPanic) {
      JEDA.Stage3D.triggerPanic();
    }

    const container = scene.add.container(W / 2, H / 2).setDepth(1500);

    const bg = scene.add.graphics();
    bg.fillStyle(0x16163A, 0.92);
    bg.fillRoundedRect(-400, -90, 800, 180, 24);
    bg.lineStyle(2, JEDA.CFG.COLOR.warn, 0.6);
    bg.strokeRoundedRect(-400, -90, 800, 180, 24);

    const text = scene.add.text(0, -15, 'Pelan-pelan. Tarik napas dulu.', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: JEDA.CFG.FONT.subtitle + 'px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.warn,
      align: 'center'
    }).setOrigin(0.5).setResolution(2);

    const sub = scene.add.text(0, 35, 'Input dijeda sejenak untuk membantumu kembali fokus.', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: JEDA.CFG.FONT.body + 'px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted,
      align: 'center'
    }).setOrigin(0.5).setResolution(2);

    container.add([bg, text, sub]);

    scene.time.delayedCall(3000, () => {
      scene.tweens.add({
        targets: container,
        alpha: 0,
        duration: 300,
        ease: 'Sine.easeIn',
        onComplete: () => container.destroy()
      });
    });
  },

  /**
   * Menampilkan tawaran Mode Ramah jika failCount >= 3 (BR-07).
   */
  showFriendlyModeOffer(scene, levelName, onAccept, onDecline) {
    const W = JEDA.CFG.W;
    const H = JEDA.CFG.H;
    const cx = W / 2;
    const cy = H / 2;

    const modal = scene.add.container(cx, cy).setDepth(2500);
    const cardW = 760;
    const cardH = 380;

    const bg = scene.add.graphics();
    bg.fillStyle(0x16163A, 0.96);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 28);
    bg.lineStyle(2, JEDA.CFG.COLOR.calm, 0.5);
    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 28);

    const title = scene.add.text(0, -cardH / 2 + 55, 'Tawaran Mode Ramah', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '32px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.calm
    }).setOrigin(0.5).setResolution(2);

    const desc = scene.add.text(0, -20, `Kamu sudah berlatih beberapa kali di ${levelName}.\nIngin mencoba dengan Mode Ramah (ritme lebih santai)?`, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '22px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.text,
      align: 'center',
      lineSpacing: 8
    }).setOrigin(0.5).setResolution(2);

    const acceptBtn = this.createButton(scene, -155, 100, 270, 58, 'Gunakan Mode Ramah', () => {
      modal.destroy();
      if (typeof onAccept === 'function') onAccept();
    }, { primary: true, radius: 29 });

    const declineBtn = this.createButton(scene, 155, 100, 270, 58, 'Tetap Mode Normal', () => {
      modal.destroy();
      if (typeof onDecline === 'function') onDecline();
    }, { radius: 29 });

    modal.add([bg, title, desc, acceptBtn, declineBtn]);
  }
};
