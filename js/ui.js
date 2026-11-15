/**
 * JEDA - UI Components Helper (js/ui.js)
 * Helper pembuatan komponen UI berdesain panel kaca (glassmorphism),
 * tombol interaktif, toast notifikasi, modal peduli (BR-09), dan modal pengaturan (BR-12 & BR-13).
 */
window.JEDA = window.JEDA || {};

JEDA.UI = {
  /**
   * Menggambar panel kaca rounded rectangle (PRD Bagian 14.3 Prinsip 5).
   * Standar ukuran: S: 720, M: 960, L: 1200, sudut: 32, padding: 48.
   */
  createPanel(scene, x, y, w, h, radius = 32, fillAlpha = 0.94, strokeAlpha = 0.40, fillColor = 0x141638) {
    const graphics = scene.add.graphics();
    graphics.fillStyle(fillColor, fillAlpha);
    graphics.fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);

    graphics.lineStyle(2, 0x3F486E, strokeAlpha);
    graphics.strokeRoundedRect(x - w / 2, y - h / 2, w, h, radius);
    return graphics;
  },

  /**
   * Komponen Panel Baku JEDA.UI (PRD Bagian 14.3 Prinsip 5).
   * Otomatis terpusat di sumbu tengah (Layout.cx()) dan mengikuti ukuran S/M/L.
   */
  panel(scene, options = {}) {
    const size = options.size || 'M';
    let w = options.w;
    if (!w) {
      if (typeof size === 'number') w = size;
      else if (window.JEDA && JEDA.Layout && JEDA.Layout.panelSize[size]) w = JEDA.Layout.panelSize[size];
      else w = 960;
    }
    const h = options.h || 520;
    const x = options.x !== undefined ? options.x : (window.JEDA && JEDA.Layout ? JEDA.Layout.cx() : JEDA.CFG.W / 2);
    const y = options.y !== undefined ? options.y : (window.JEDA && JEDA.Layout ? JEDA.Layout.cy() : JEDA.CFG.H / 2);
    const radius = options.radius || 32;
    const fillAlpha = options.fillAlpha !== undefined ? options.fillAlpha : 0.95;
    const strokeAlpha = options.strokeAlpha !== undefined ? options.strokeAlpha : 0.40;
    const fillColor = options.fillColor || 0x141638;
    const strokeColor = options.strokeColor || 0x3F486E;

    return this.createPanel(scene, x, y, w, h, radius, fillAlpha, strokeAlpha, fillColor);
  },

  /**
   * Menjamin tekstur logo resmi JEDA (Zen Pause Emblem) telah dibuat di memori tekstur Phaser.
   * Dibuat secara prosedural pada kanvas 128x128 Retina untuk ketajaman subpixel sempurna.
   * Logo terdiri atas:
   * 1. Aura pendaran luar Zen (soft teal glow)
   * 2. Piringan dasar emblem (slate-teal gradient)
   * 3. Ring beraksen elegan (mindful breath circle)
   * 4. Dua kapsul jeda vertikal bersudut membulat (simbol jeda zen)
   * @param {Phaser.Scene} scene
   * @returns {string} Key tekstur: 'logo_jeda'
   */
  ensureLogoTexture(scene) {
    if (scene.textures && scene.textures.exists('logo_jeda')) {
      return 'logo_jeda';
    }

    const size = 128;
    const canvas = scene.textures.createCanvas('logo_jeda', size, size);
    const ctx = canvas.context;
    const cx = size / 2;
    const cy = size / 2;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Pendaran Luar Zen (Glow Halus)
    const glowGrad = ctx.createRadialGradient(cx, cy, 34, cx, cy, 62);
    glowGrad.addColorStop(0, 'rgba(127, 224, 195, 0.32)');
    glowGrad.addColorStop(0.65, 'rgba(127, 224, 195, 0.08)');
    glowGrad.addColorStop(1, 'rgba(127, 224, 195, 0.0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 62, 0, Math.PI * 2);
    ctx.fill();

    // 2. Piringan Emblem Zen (Gradasi Slate Teal Elegan)
    const baseGrad = ctx.createLinearGradient(cx - 48, cy - 48, cx + 48, cy + 48);
    baseGrad.addColorStop(0, '#1c3e47');
    baseGrad.addColorStop(0.5, '#132832');
    baseGrad.addColorStop(1, '#0c1a22');
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 48, 0, Math.PI * 2);
    ctx.fill();

    // 3. Lingkaran Ring Luar (Aura Napas JEDA)
    ctx.strokeStyle = '#7FE0C3';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 48, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Dua Batang Jeda Bersudut Bulat Penuh (Simbol Jeda / Zen Pause Capsules)
    const barW = 12;
    const barH = 42;
    const barRadius = 6;
    const barGap = 12;

    const barGrad = ctx.createLinearGradient(0, cy - barH / 2, 0, cy + barH / 2);
    barGrad.addColorStop(0, '#A7F3D0'); // Aksen cerah lembut di pucuk
    barGrad.addColorStop(1, '#7FE0C3'); // Warna utama brand
    ctx.fillStyle = barGrad;

    const drawPill = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      ctx.fill();
    };

    // Batang Kiri
    const leftX = cx - (barGap / 2) - barW;
    const barY = cy - (barH / 2);
    drawPill(leftX, barY, barW, barH, barRadius);

    // Batang Kanan
    const rightX = cx + (barGap / 2);
    drawPill(rightX, barY, barW, barH, barRadius);

    canvas.refresh();
    return 'logo_jeda';
  },

  /**
   * Membuat lencana identitas resmi JEDA (Logo + Tipografi) berstandar profesional.
   * Menggantikan teks darurat/bintang dengan logo mark vektor Zen Pause yang presisi.
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {object} options - { width: 200, height: 50, radius: 25 }
   * @returns {Phaser.GameObjects.Container}
   */
  brandBadge(scene, x, y, options = {}) {
    this.ensureLogoTexture(scene);
    const w = options.width || 216;
    const h = options.height || 48;
    const radius = options.radius || 24;
    const container = scene.add.container(x, y);

    // 1. Kapsul Latar Belakang Kaca Frosted Simetris
    const bg = scene.add.graphics();
    bg.fillStyle(0x141838, 0.94);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    bg.lineStyle(1.5, 0x3F486E, 0.65);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);

    // 2. Logo Mark Zen Pause (Retina crisp 128x128 di skala ke 30x30)
    const iconSize = 30;
    const logoImg = scene.add.image(0, 0, 'logo_jeda');
    logoImg.setDisplaySize(iconSize, iconSize);

    // 3. Tipografi "JEDA" Modern Berjarak Rapi
    const brandText = scene.add.text(0, 0, 'JEDA', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '800',
      color: '#FFFFFF'
    }).setOrigin(0, 0.5).setResolution(2);

    // 4. Penataan Posisi Simetris Optik di Tengah Kapsul
    const gap = 10;
    const totalContentW = iconSize + gap + brandText.width;
    const startX = -totalContentW / 2;

    logoImg.setPosition(startX + iconSize / 2, 0);
    brandText.setPosition(startX + iconSize + gap, 0);

    container.add([bg, logoImg, brandText]);
    return container;
  },

  /**
   * Membuat tombol baku JEDA.UI (PRD Bagian 14.3 Prinsip 6, 7, 10, 12).
   * - Standar tinggi: 88 px, lebar minimal 280 px, bentuk kapsul (radius 44)
   * - Aksi utama (primary: true): background calm 0x7FE0C3, teks gelap #16163A
   * - Aksi sekunder (primary: false): kaca gelap bergaris, teks putih #FFFFFF
   * - Respons cepat (<100ms): hover 1.04, tekan 0.97
   */
  createButton(scene, x, y, w = 280, h = 88, label, onClick, options = {}) {
    const container = scene.add.container(x, y);
    const radius = options.radius || (h >= 80 ? h / 2 : 24);
    const isPrimary = options.primary || false;
    const isDisabled = options.disabled || false;
    const fontSize = options.fontSize || 33;

    // Background panel tombol solid-frosted
    const bg = scene.add.graphics();
    const updateBg = (fillAlpha, strokeAlpha, fillColor, strokeColor) => {
      bg.clear();
      bg.fillStyle(fillColor, fillAlpha);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
      bg.lineStyle(2, strokeColor, strokeAlpha);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
    };

    // Prinsip 10: Bebas tembus pandang (fillAlpha 0.95 solid-frosted bahkan saat disabled)
    const normalFillAlpha = isPrimary ? 1.0 : 0.95;
    const normalStrokeAlpha = isPrimary ? 0.90 : 0.65;
    const normalColor = isPrimary ? 0x7FE0C3 : 0x181A3C;
    const normalStrokeColor = isPrimary ? 0xA2F5DD : 0x485278;

    const disabledColor = 0x181B38;
    const disabledStrokeColor = 0x383D62;

    if (isDisabled) {
      updateBg(0.96, 0.45, disabledColor, disabledStrokeColor);
    } else {
      updateBg(normalFillAlpha, normalStrokeAlpha, normalColor, normalStrokeColor);
    }

    const defaultTextColor = isPrimary ? '#16163A' : '#FFFFFF';
    const textColor = options.textColor || (isDisabled ? '#64748B' : defaultTextColor);
    const textObj = scene.add.text(0, 0, label, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: fontSize + 'px',
      fontStyle: '800',
      color: textColor,
      align: 'center'
    }).setOrigin(0.5).setResolution(2);

    container.add([bg, textObj]);
    container.setSize(w, h);
    container.bg = bg;
    container.textObj = textObj;
    container.w = w;
    container.h = h;
    container.isPrimary = isPrimary;

    // Interaktivitas
    container.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: !isDisabled
    });

    if (isDisabled) {
      container.input.enabled = false;
    }

    container.on('pointerover', () => {
      if (!container.input || !container.input.enabled) return;
      scene.tweens.add({
        targets: container,
        scaleX: 1.04,
        scaleY: 1.04,
        y: y - 2,
        duration: 100,
        ease: 'Sine.easeOut'
      });
      const hoverColor = isPrimary ? 0x98F1D7 : 0x242854;
      const hoverStroke = isPrimary ? 0xCAFAEE : 0x7FE0C3;
      updateBg(1.0, 1.0, hoverColor, hoverStroke);
    });

    container.on('pointerout', () => {
      if (!container.input || !container.input.enabled) return;
      scene.tweens.add({
        targets: container,
        scaleX: 1.0,
        scaleY: 1.0,
        y: y,
        duration: 100,
        ease: 'Sine.easeOut'
      });
      updateBg(normalFillAlpha, normalStrokeAlpha, normalColor, normalStrokeColor);
    });

    container.on('pointerdown', () => {
      if (!container.input || !container.input.enabled) return;
      container.setScale(0.97);
    });

    container.on('pointerup', () => {
      if (!container.input || !container.input.enabled) return;
      container.setScale(1.04);
      if (typeof onClick === 'function') {
        onClick();
      }
    });

    container.setEnabled = (enabled) => {
      if (enabled) {
        updateBg(normalFillAlpha, normalStrokeAlpha, normalColor, normalStrokeColor);
        textObj.setColor(defaultTextColor);
        container.input.enabled = true;
      } else {
        updateBg(0.96, 0.45, disabledColor, disabledStrokeColor);
        textObj.setColor('#64748B');
        container.input.enabled = false;
      }
    };

    return container;
  },

  button(scene, x, y, w, h, label, onClick, options) {
    return this.createButton(scene, x, y, w, h, label, onClick, options);
  },

  /**
   * Komponen Chip Pilihan (PRD Bagian 14.3 Prinsip 9).
   */
  chip(scene, x, y, w, h, label, isSelected, onClick, options = {}) {
    const container = scene.add.container(x, y);
    const radius = options.radius || (h / 2);
    const bg = scene.add.graphics();
    const isSensitive = options.sensitive || false;

    const updateBg = (selected, hover = false) => {
      bg.clear();
      if (selected) {
        const selColor = isSensitive ? 0xFF8FA3 : 0x7FE0C3;
        const selStroke = isSensitive ? 0xFFCAD4 : 0xA2F5DD;
        bg.fillStyle(selColor, 1.0);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
        bg.lineStyle(2, selStroke, 1.0);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
      } else if (hover) {
        bg.fillStyle(0x242854, 0.96);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
        bg.lineStyle(2, 0x7FE0C3, 0.85);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
      } else {
        bg.fillStyle(0x181A3C, 0.94);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
        bg.lineStyle(2, 0x485278, 0.65);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
      }
    };

    updateBg(isSelected);

    const textColor = isSelected ? '#16163A' : '#FFFFFF';
    const textObj = scene.add.text(0, 0, label, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: (options.fontSize || 27) + 'px',
      fontStyle: '700',
      color: textColor,
      align: 'center'
    }).setOrigin(0.5).setResolution(2);

    container.add([bg, textObj]);
    container.setSize(w, h);
    container.bg = bg;
    container.textObj = textObj;
    container.isSelected = isSelected;

    container.setSelected = (sel) => {
      container.isSelected = sel;
      updateBg(sel);
      textObj.setColor(sel ? '#16163A' : '#FFFFFF');
    };

    container.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true
    });

    container.on('pointerover', () => {
      if (!container.isSelected) updateBg(false, true);
    });

    container.on('pointerout', () => {
      updateBg(container.isSelected, false);
    });

    container.on('pointerup', () => {
      if (typeof onClick === 'function') onClick();
    });

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

    const titleL = scene.add.text(boxLeftX, boxY - 32, 'Telepon Siaga (24 Jam)', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted
    }).setOrigin(0.5).setResolution(2);

    const contactL = scene.add.text(boxLeftX, boxY + 16, '119 ext. 8', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '44px',
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

    const titleR = scene.add.text(boxRightX, boxY - 32, 'Konseling Online Kemenkes', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted
    }).setOrigin(0.5).setResolution(2);

    const contactR = scene.add.text(boxRightX, boxY + 16, 'healing119.id', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '44px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.calm
    }).setOrigin(0.5).setResolution(2);

    modalContainer.add([bgR, titleR, contactR]);

    // 6. Catatan disclaimer
    const disclaimerText = 'Layanan di atas disediakan tenaga profesional independen.\nJEDA adalah media latihan kesadaran, bukan pengganti perawatan medis atau konseling darurat.';
    const noteText = scene.add.text(cx, cy + 145, disclaimerText, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted,
      align: 'center',
      lineSpacing: 6
    }).setOrigin(0.5).setResolution(2);
    modalContainer.add(noteText);

    // 7. Dua tombol opsi per BR-09 (Prinsip UI/UX: sama lebar, jarak 32, terpusat)
    const btnWidths = [420, 420];
    const btnXs = (window.JEDA && JEDA.Layout) ? JEDA.Layout.rowCenter(btnWidths, 32) : [cx - 226, cx + 226];
    const btnY = cy + 245;

    // Tombol Sekunder di Kiri: Latihan napas ringan
    const btn1 = this.createButton(scene, btnXs[0], btnY, 420, 88, 'Latihan Napas Ringan', () => {
      modalContainer.destroy();
      if (typeof onLightBreath === 'function') onLightBreath();
    }, { radius: 44, fontSize: 33 });

    // Tombol Utama di Kanan: Aku sudah lebih baik, lanjutkan
    const btn2 = this.createButton(scene, btnXs[1], btnY, 420, 88, 'Aku sudah lebih baik, lanjutkan', () => {
      modalContainer.destroy();
      if (typeof onContinue === 'function') onContinue();
    }, { radius: 44, primary: true, fontSize: 33 });

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
   * Komponen Pemilih Tiga Tema Visual JEDA (PRD Bagian 15.3 & BR-16).
   * Menampilkan tiga kartu pratinjau tema (Embun, Fajar, Aurora) dengan:
   * - Swatch pita palet langit 3 warna (top, mid, bottom)
   * - Nama tema & suasana (mood)
   * - Status aktif, tombol gunakan, atau gembok 🔒 bila terkunci
   * - Transisi silang 1,2 detik memanggil JEDA.Theme.apply
   * 
   * @param {Phaser.Scene} scene
   * @param {number} cx
   * @param {number} cy
   * @param {Object} options - { cardW, cardH, gap, container, onSelect }
   * @returns {Phaser.GameObjects.Container}
   */
  themeCards(scene, cx, cy, options = {}) {
    const Layout = window.JEDA && JEDA.Layout;
    const cardW = options.cardW || 248;
    const cardH = options.cardH || 140;
    const gap = options.gap || 20;
    const parentContainer = options.container;

    const rootContainer = scene.add.container(0, 0);
    if (parentContainer) parentContainer.add(rootContainer);

    const cardWidths = [cardW, cardW, cardW];
    const cardXs = Layout ? Layout.rowCenter(cardWidths, gap) : [cx - cardW - gap, cx, cx + cardW + gap];

    const themeKeys = ['embun', 'fajar', 'aurora'];
    const themes = (window.JEDA && JEDA.THEMES) || {};

    let cardsList = [];

    const render = () => {
      cardsList.forEach(c => c.destroy());
      cardsList = [];

      const currentThemeId = (window.JEDA && JEDA.Theme && JEDA.Theme.getCurrent)
        ? JEDA.Theme.getCurrent().id
        : ((window.JEDA && JEDA.State && JEDA.State.data && JEDA.State.data.skin) || 'embun');

      const totalStars = (window.JEDA && JEDA.State && JEDA.State.getTotalStars)
        ? JEDA.State.getTotalStars()
        : 0;

      themeKeys.forEach((key, idx) => {
        const theme = themes[key];
        if (!theme) return;

        const bx = cardXs[idx];
        const isUnlocked = totalStars >= theme.reqStars;
        const isActive = (currentThemeId === theme.id);

        const card = scene.add.container(bx, cy);

        // 1. Latar Belakang Kartu (Panel kaca gelap alpha >= 0.35 untuk kontras >= 4.5:1)
        const bg = scene.add.graphics();
        const drawCardBg = (hover = false) => {
          bg.clear();
          if (isUnlocked) {
            if (isActive) {
              bg.fillStyle(0x181D42, 0.96);
              bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);
              bg.lineStyle(2.5, theme.btnAccent.fromHex, 0.95);
              bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);
            } else if (hover) {
              bg.fillStyle(0x1E2452, 0.96);
              bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);
              bg.lineStyle(2.0, 0x5C699A, 0.9);
              bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);
            } else {
              bg.fillStyle(0x131738, 0.94);
              bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);
              bg.lineStyle(1.5, 0x384166, 0.65);
              bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);
            }
          } else {
            bg.fillStyle(0x101228, 0.60);
            bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);
            bg.lineStyle(1.5, 0x2A2E4C, 0.55);
            bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 20);
          }
        };
        drawCardBg(false);
        card.add(bg);

        // 2. Swatch Pita Palet Tiga Warna Langit (Atas, Tengah, Bawah)
        const swatchW = cardW - 32;
        const pillGap = 6;
        const singlePillW = Math.floor((swatchW - pillGap * 2) / 3);
        const swatchH = 14;
        const swatchY = -cardH / 2 + 20;

        const swatchG = scene.add.graphics();
        const skyColors = [theme.sky.topHex, theme.sky.midHex, theme.sky.bottomHex];
        const pillStartX = -swatchW / 2 + singlePillW / 2;

        for (let s = 0; s < 3; s++) {
          const px = pillStartX + s * (singlePillW + pillGap);
          swatchG.fillStyle(skyColors[s], isUnlocked ? 1.0 : 0.4);
          swatchG.fillRoundedRect(px - singlePillW / 2, swatchY - swatchH / 2, singlePillW, swatchH, 7);
          swatchG.lineStyle(1, 0xFFFFFF, isUnlocked ? 0.25 : 0.1);
          swatchG.strokeRoundedRect(px - singlePillW / 2, swatchY - swatchH / 2, singlePillW, swatchH, 7);
        }
        card.add(swatchG);

        // 3. Nama Tema & Suasana (PRD 14.3: minimal 27px)
        const nameText = scene.add.text(0, -cardH / 2 + 48, theme.name, {
          fontFamily: JEDA.CFG.FONT.family,
          fontSize: '27px',
          fontStyle: '800',
          color: isUnlocked ? '#FFFFFF' : '#757D99'
        }).setOrigin(0.5).setResolution(2);

        const moodText = scene.add.text(0, -cardH / 2 + 76, theme.mood, {
          fontFamily: JEDA.CFG.FONT.family,
          fontSize: '27px',
          fontStyle: '600',
          color: isUnlocked ? JEDA.CFG.COLOR.hex.muted : '#555C75'
        }).setOrigin(0.5).setResolution(2);
        card.add([nameText, moodText]);

        // 4. Status Pill di Bawah Kartu
        const pillY = -cardH / 2 + 110;
        const pillW = Math.min(cardW - 44, 150);
        const pillH = 30;
        const pillG = scene.add.graphics();

        if (isUnlocked) {
          if (isActive) {
            pillG.fillStyle(theme.btnAccent.fromHex, 0.20);
            pillG.fillRoundedRect(-pillW / 2, pillY - pillH / 2, pillW, pillH, 15);
            pillG.lineStyle(1.5, theme.btnAccent.fromHex, 0.9);
            pillG.strokeRoundedRect(-pillW / 2, pillY - pillH / 2, pillW, pillH, 15);

            const activeLabel = scene.add.text(0, pillY, '✓ Aktif', {
              fontFamily: JEDA.CFG.FONT.family,
              fontSize: '27px',
              fontStyle: '800',
              color: theme.btnAccent.from
            }).setOrigin(0.5).setResolution(2);
            card.add([pillG, activeLabel]);
          } else {
            pillG.fillStyle(0x222752, 0.92);
            pillG.fillRoundedRect(-pillW / 2, pillY - pillH / 2, pillW, pillH, 15);
            pillG.lineStyle(1.2, 0x485280, 0.7);
            pillG.strokeRoundedRect(-pillW / 2, pillY - pillH / 2, pillW, pillH, 15);

            const useLabel = scene.add.text(0, pillY, 'Gunakan', {
              fontFamily: JEDA.CFG.FONT.family,
              fontSize: '27px',
              fontStyle: '700',
              color: '#FFFFFF'
            }).setOrigin(0.5).setResolution(2);
            card.add([pillG, useLabel]);
          }
        } else {
          // Terkunci
          pillG.fillStyle(0x161830, 0.8);
          pillG.fillRoundedRect(-pillW / 2, pillY - pillH / 2, pillW, pillH, 15);
          pillG.lineStyle(1.2, 0x363C5C, 0.5);
          pillG.strokeRoundedRect(-pillW / 2, pillY - pillH / 2, pillW, pillH, 15);

          const lockLabel = scene.add.text(0, pillY, `🔒 ${theme.reqStars} ★`, {
            fontFamily: JEDA.CFG.FONT.family,
            fontSize: '27px',
            fontStyle: '700',
            color: JEDA.CFG.COLOR.hex.warn
          }).setOrigin(0.5).setResolution(2);
          card.add([pillG, lockLabel]);
        }

        // 5. Interaksi Klik & Hover
        card.setSize(cardW, cardH);
        card.setInteractive({
          hitArea: new Phaser.Geom.Rectangle(-cardW / 2, -cardH / 2, cardW, cardH),
          hitAreaCallback: Phaser.Geom.Rectangle.Contains,
          useHandCursor: true
        });

        card.on('pointerover', () => {
          drawCardBg(true);
          scene.tweens.add({ targets: card, scaleX: 1.025, scaleY: 1.025, duration: 100 });
        });

        card.on('pointerout', () => {
          drawCardBg(false);
          scene.tweens.add({ targets: card, scaleX: 1.0, scaleY: 1.0, duration: 100 });
        });

        card.on('pointerup', () => {
          if (isUnlocked) {
            if (currentThemeId !== theme.id) {
              const success = JEDA.Theme.apply(theme.id, 1200);
              if (success) {
                JEDA.UI.toast(scene, `Tema visual diubah ke ${theme.name} ✨`);
                render();
                if (typeof options.onSelect === 'function') options.onSelect(theme.id);
              }
            }
          } else {
            JEDA.UI.toast(scene, `Kumpulkan ${theme.reqStars} bintang untuk membuka tema ${theme.name}. (Saat ini: ${totalStars}★)`);
          }
        });

        rootContainer.add(card);
        cardsList.push(card);
      });
    };

    render();
    return rootContainer;
  },

  /**
   * Menampilkan Modal Pengaturan:
   * - Pilihan Tema Visual (Embun, Fajar, Aurora - PRD 15.3 & BR-16)
   * - Kurangi Gerakan (BR-12)
   * - Hapus Data Saya (BR-13)
   */
  showSettingsModal(scene, onDataReset) {
    const Layout = window.JEDA && JEDA.Layout;
    const W = Layout ? Layout.W : JEDA.CFG.W;
    const H = Layout ? Layout.H : JEDA.CFG.H;
    const container = scene.add.container(0, 0).setDepth(2000);

    const backdrop = scene.add.rectangle(W / 2, H / 2, W, H, 0x050510, 0.75)
      .setInteractive();
    container.add(backdrop);

    const cardW = 860;
    const cardH = 700;
    const cx = W / 2;
    const cy = H / 2;

    const bg = scene.add.graphics();
    bg.fillStyle(0x16163A, 0.96);
    bg.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 28);
    bg.lineStyle(2, JEDA.CFG.COLOR.panelLine, 0.3);
    bg.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 28);
    container.add(bg);

    // 1. Judul & Subjudul
    const title = scene.add.text(cx, cy - cardH / 2 + 50, 'Pengaturan JEDA', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '44px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.text
    }).setOrigin(0.5).setResolution(2);

    const subtitle = scene.add.text(cx, cy - cardH / 2 + 90, 'Kustomisasi Visual & Aksesibilitas', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.muted
    }).setOrigin(0.5).setResolution(2);
    container.add([title, subtitle]);

    // 2. Bagian Pilihan Tema Visual (PRD 15.3 / BR-16)
    const totalStars = (JEDA.State && JEDA.State.getTotalStars) ? JEDA.State.getTotalStars() : 0;
    const themeLabel = scene.add.text(cx, cy - 180, `Tema Visual Mindfulness (Koleksi: ${totalStars}/9 ★)`, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '800',
      color: '#FFFFFF'
    }).setOrigin(0.5).setResolution(2);
    container.add(themeLabel);

    this.themeCards(scene, cx, cy - 88, {
      cardW: 254,
      cardH: 140,
      gap: 18,
      container: container
    });

    // 3. Opsi Kurangi Gerakan (BR-12)
    const isReduceMotion = JEDA.State.data.settings.reduceMotion;
    const motionBtnText = isReduceMotion ? 'Kurangi Gerakan: [AKTIF]' : 'Kurangi Gerakan: [NONAKTIF]';
    const motionBtn = this.createButton(scene, cx, cy + 42, 560, 68, motionBtnText, () => {
      JEDA.State.data.settings.reduceMotion = !JEDA.State.data.settings.reduceMotion;
      JEDA.State.save();
      if (JEDA.Stage3D && JEDA.Stage3D.setReduceMotion) {
        JEDA.Stage3D.setReduceMotion(JEDA.State.data.settings.reduceMotion);
      }
      motionBtn.textObj.setText(JEDA.State.data.settings.reduceMotion ? 'Kurangi Gerakan: [AKTIF]' : 'Kurangi Gerakan: [NONAKTIF]');
      JEDA.UI.toast(scene, 'Pengaturan animasi diperbarui.');
    }, { fontSize: 33, radius: 34 });
    container.add(motionBtn);

    // 4. Opsi Hapus Data Saya (BR-13)
    const deleteBtn = this.createButton(scene, cx, cy + 128, 560, 68, 'Hapus Data Saya', () => {
      JEDA.State.resetData();
      JEDA.UI.toast(scene, 'Seluruh data lokal berhasil dihapus.');
      container.destroy();
      if (typeof onDataReset === 'function') onDataReset();
    }, { textColor: '#FF8FA3', fontSize: 33, radius: 34 });
    container.add(deleteBtn);

    // 5. Tombol Tutup
    const closeBtn = this.createButton(scene, cx, cy + 224, 280, 68, 'Tutup', () => {
      container.destroy();
    }, { fontSize: 33, radius: 34 });
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
      fontSize: '44px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.calm
    }).setOrigin(0.5).setResolution(2);

    const desc = scene.add.text(0, -20, `Kamu sudah berlatih beberapa kali di ${levelName}.\nIngin mencoba dengan Mode Ramah (ritme lebih santai)?`, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '600',
      color: JEDA.CFG.COLOR.hex.text,
      align: 'center',
      lineSpacing: 8
    }).setOrigin(0.5).setResolution(2);

    const btnW = 320;
    const btnH = 88;
    const btnGap = 32;
    // Prinsip 6: Aksi utama di kanan, aksi sekunder di kiri, sama lebar
    const declineBtn = this.createButton(scene, -(btnW / 2 + btnGap / 2), 100, btnW, btnH, 'Tetap Mode Normal', () => {
      modal.destroy();
      if (typeof onDecline === 'function') onDecline();
    }, { radius: 44, fontSize: 33 });

    const acceptBtn = this.createButton(scene, (btnW / 2 + btnGap / 2), 100, btnW, btnH, 'Gunakan Mode Ramah', () => {
      modal.destroy();
      if (typeof onAccept === 'function') onAccept();
    }, { primary: true, radius: 44, fontSize: 33 });

    modal.add([bg, title, desc, declineBtn, acceptBtn]);
  },

  /**
   * Gelembung Ucapan Lumi (PRD Bagian 14.1 & 14.2 G1).
   * - Menampilkan pesan hangat Lumi di bawah orb (PRD 14.5: y = 760 di L1)
   * - Kotak kaca rounded ber-aksen toska (calm) dengan ekor penunjuk ke atas
   * - Maksimal 2 baris, font 27 px, lebar responsif proporsional
   */
  speechBubble(scene, x, y, text) {
    const container = scene.add.container(x, y).setDepth(1500);

    const textObj = scene.add.text(0, 3, text, {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '700',
      color: '#FFFFFF',
      align: 'center',
      wordWrap: { width: 560 },
      lineSpacing: 6
    }).setOrigin(0.5).setResolution(2);

    const padX = 48;
    const padY = 24;
    const w = Math.max(360, Math.min(760, textObj.width + padX * 2));
    const h = textObj.height + padY * 2;
    const radius = 24;

    const bg = scene.add.graphics();
    // 1. Latar belakang kaca gelap solid (0x121538 alpha 0.96)
    bg.fillStyle(0x121538, 0.96);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);

    // 2. Ekor segitiga runcing menunjuk ke arah orb di atas (-h / 2)
    bg.fillTriangle(-12, -h / 2, 12, -h / 2, 0, -h / 2 - 14);

    // 3. Garis tepi pendar toska tenang (0x7FE0C3)
    bg.lineStyle(2, 0x7FE0C3, 0.85);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
    bg.lineBetween(-12, -h / 2, 0, -h / 2 - 14);
    bg.lineBetween(0, -h / 2 - 14, 12, -h / 2);

    // 4. Ikon pendar kecil Lumi di samping kiri teks
    const glowDot = scene.add.circle(-w / 2 + 28, 0, 8, 0x7FE0C3, 0.9);

    container.add([bg, glowDot, textObj]);
    container.textObj = textObj;
    container.bg = bg;
    container.bubbleW = w;
    container.bubbleH = h;

    return container;
  },

  /**
   * Slot Lencana Positif (PRD Bagian 14.2 G4 & 14.5).
   * Menampilkan slot lencana berukuran seragam.
   * - Terbuka: Berwarna cerah dengan pendar toska tenang, nama jelas, dan aksen terbuka.
   * - Belum Terbuka: Siluet abu bergaris putus tanpa pesan negatif.
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {Object} badge - { id, name, desc, icon }
   * @param {boolean} isUnlocked
   * @param {Object} options - { width: 304, height: 88 }
   * @returns {Phaser.GameObjects.Container}
   */
  badgeSlot(scene, x, y, badge, isUnlocked, options = {}) {
    const w = options.width || 304;
    const h = options.height || 88;
    const radius = 24;

    const container = scene.add.container(x, y).setDepth(options.depth || 50);
    const bg = scene.add.graphics();

    if (isUnlocked) {
      // 1. Lencana Terbuka: Latar solid beraksen toska menyala
      bg.fillStyle(0x181A3C, 0.96);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);

      bg.lineStyle(2, 0x7FE0C3, 0.9);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);

      // Kilau sudut lembut
      bg.fillStyle(0x7FE0C3, 0.12);
      bg.fillCircle(-w / 2 + 36, 0, 26);

      const icon = scene.add.text(-w / 2 + 36, 0, badge.icon || '✦', {
        fontSize: '28px'
      }).setOrigin(0.5);

      const name = scene.add.text(-w / 2 + 76, -14, badge.name, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '27px',
        fontStyle: '800',
        color: '#FFFFFF',
        wordWrap: { width: w - 90 }
      }).setOrigin(0, 0.5).setResolution(2);

      const status = scene.add.text(-w / 2 + 76, 18, 'Terbuka ✓', {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '27px',
        fontStyle: '700',
        color: JEDA.CFG.COLOR.hex.calm
      }).setOrigin(0, 0.5).setResolution(2);

      container.add([bg, icon, name, status]);
    } else {
      // 2. Lencana Belum Terbuka: Siluet abu bergaris putus tanpa pesan negatif (PRD 14.2 G4)
      bg.fillStyle(0x111326, 0.55);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);

      // Garis putus-putus presisi
      const dash = 6;
      const gap = 5;
      bg.lineStyle(1.5, 0x485278, 0.65);

      const drawDashedSegment = (x1, y1, x2, y2) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        const steps = Math.floor(len / (dash + gap));
        const ux = dx / len;
        const uy = dy / len;
        for (let i = 0; i < steps; i++) {
          const sx = x1 + (i * (dash + gap)) * ux;
          const sy = y1 + (i * (dash + gap)) * uy;
          const ex = sx + dash * ux;
          const ey = sy + dash * uy;
          bg.lineBetween(sx, sy, ex, ey);
        }
      };

      // 4 sisi bergaris putus
      drawDashedSegment(-w / 2 + radius, -h / 2, w / 2 - radius, -h / 2);
      drawDashedSegment(w / 2, -h / 2 + radius, w / 2, h / 2 - radius);
      drawDashedSegment(w / 2 - radius, h / 2, -w / 2 + radius, h / 2);
      drawDashedSegment(-w / 2, h / 2 - radius, -w / 2, -h / 2 + radius);

      // Ikon siluet redup
      const icon = scene.add.text(-w / 2 + 36, 0, badge.icon || '✦', {
        fontSize: '28px'
      }).setOrigin(0.5).setAlpha(0.24);

      const name = scene.add.text(-w / 2 + 76, -14, badge.name, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '27px',
        fontStyle: '700',
        color: '#64748B',
        wordWrap: { width: w - 90 }
      }).setOrigin(0, 0.5).setResolution(2);

      // Pesan status netral dan ramah (tanpa penghakiman / pesan negatif)
      const status = scene.add.text(-w / 2 + 76, 18, 'Belum Terbuka', {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '27px',
        fontStyle: '600',
        color: '#475569'
      }).setOrigin(0, 0.5).setResolution(2);

      container.add([bg, icon, name, status]);
    }

    container.setSize(w, h);
    container.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true
    });

    // Umpan balik hover mikro (150 ms)
    container.on('pointerover', () => {
      scene.tweens.add({
        targets: container,
        scaleX: 1.04,
        scaleY: 1.04,
        duration: 120,
        ease: 'Sine.easeOut'
      });
    });

    container.on('pointerout', () => {
      scene.tweens.add({
        targets: container,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 120,
        ease: 'Sine.easeOut'
      });
    });

    // Menampilkan toast syarat lencana saat diklik
    container.on('pointerup', () => {
      const statusNote = isUnlocked ? '✓ Lencana ini telah kamu raih!' : '○ Syarat:';
      JEDA.UI.toast(scene, `${badge.name}: ${badge.desc} (${statusNote})`);
    });

    return container;
  },

  /**
   * Kartu Petunjuk Bermain (Pop-up Onboarding - PRD Bagian 15.2 & BR-15).
   * - Menampilkan panduan onboarding di tengah layar (Panel M: 960 px, radius 32)
   * - Redup di belakangnya dengan alpha 0.55
   * - Mendukung maksimal 3 langkah (<= 14 kata per langkah) atau multi-halaman pembuka (3 halaman)
   * - Animasi pendek yang memperagakan mekanik (orb bernapas, bidikan astronot, urutan STOP, lentera)
   * - Ikon tombol digambar dengan kapsul
   * - Tombol 'Lewati' di kiri dan 'Mulai' di kanan berukuran seragam 88 px (Prinsip 6 & 7 Bagian 14.3)
   * - Bisa dilewati dengan tombol Esc
   * @param {Phaser.Scene} scene
   * @param {object} options - { title, subtitle, type, steps, pages, keys, onDone }
   * @returns {Phaser.GameObjects.Container}
   */
  helpCard(scene, options = {}) {
    const Layout = window.JEDA && JEDA.Layout;
    const W = Layout ? Layout.W : JEDA.CFG.W;
    const H = Layout ? Layout.H : JEDA.CFG.H;
    const cx = Layout ? Layout.cx() : W / 2;
    const cy = Layout ? Layout.cy() : H / 2;

    const modalContainer = scene.add.container(0, 0).setDepth(3500);

    // 1. Backdrop Redup alpha 0.55 (PRD 15.2: "redup di belakangnya alpha 0,55")
    const backdrop = scene.add.rectangle(cx, cy, W, H, 0x050510, 0.55)
      .setInteractive();
    modalContainer.add(backdrop);

    // 2. Panel M Kaca Gelap di Tengah (960 x 608 px, radius 32, kelipatan 8)
    const cardW = (Layout && Layout.panelSize && Layout.panelSize.M) ? Layout.panelSize.M : 960;
    const cardH = 608;

    const panelBg = scene.add.graphics();
    panelBg.fillStyle(0x141638, 0.96);
    panelBg.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    panelBg.lineStyle(2, 0x3F486E, 0.65);
    panelBg.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 32);
    modalContainer.add(panelBg);

    // Variabel state modal
    let isClosed = false;
    let currentPageIndex = 0;
    const isMultiPage = Array.isArray(options.pages) && options.pages.length > 0;
    const totalPages = isMultiPage ? options.pages.length : 1;

    const animTweens = [];
    const animTimers = [];

    // Fungsi penutupan bersih modal
    const closeCard = () => {
      if (isClosed) return;
      isClosed = true;

      // Hapus listener keyboard Esc
      if (scene.input && scene.input.keyboard) {
        scene.input.keyboard.off('keydown-ESC', escHandler);
        scene.input.keyboard.off('keydown-ESCAPE', escHandler);
      }

      // Hentikan semua tween dan timer animasi internal
      animTweens.forEach(tw => {
        if (tw && tw.remove) tw.remove();
      });
      animTimers.forEach(tm => {
        if (tm && tm.remove) tm.remove(false);
      });

      // Animasi keluar lembut
      scene.tweens.add({
        targets: modalContainer,
        alpha: 0,
        scaleX: 0.96,
        scaleY: 0.96,
        duration: 180,
        ease: 'Sine.easeIn',
        onComplete: () => {
          modalContainer.destroy();
          if (typeof options.onDone === 'function') {
            options.onDone();
          }
        }
      });
    };

    // Handler Esc
    const escHandler = (event) => {
      if (event && event.stopPropagation) event.stopPropagation();
      closeCard();
    };

    if (scene.input && scene.input.keyboard) {
      scene.input.keyboard.on('keydown-ESC', escHandler);
      scene.input.keyboard.on('keydown-ESCAPE', escHandler);
    }

    // 3. Header Panel: Kapsul Kategori, Judul, & Subjudul
    const headerContainer = scene.add.container(cx, cy - cardH / 2 + 58);

    // Kapsul Kategori "PETUNJUK BERMAIN"
    const catBadgeW = 240;
    const catBadgeH = 36;
    const catBg = scene.add.graphics();
    catBg.fillStyle(0x1A2048, 0.95);
    catBg.fillRoundedRect(-catBadgeW / 2, -catBadgeH / 2, catBadgeW, catBadgeH, 18);
    catBg.lineStyle(1.5, 0x7FE0C3, 0.55);
    catBg.strokeRoundedRect(-catBadgeW / 2, -catBadgeH / 2, catBadgeW, catBadgeH, 18);

    const catText = scene.add.text(0, 0, 'PETUNJUK BERMAIN', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '27px',
      fontStyle: '800',
      color: JEDA.CFG.COLOR.hex.calm
    }).setOrigin(0.5).setResolution(2);
    headerContainer.add([catBg, catText]);

    // Judul Utama (Hierarki teks 44 px)
    const titleText = scene.add.text(0, 44, options.title || 'Petunjuk Bermain', {
      fontFamily: JEDA.CFG.FONT.family,
      fontSize: '44px',
      fontStyle: '800',
      color: '#FFFFFF'
    }).setOrigin(0.5).setResolution(2);
    headerContainer.add(titleText);

    // Subjudul / Catatan K1 jika ada (Hierarki teks 27 px)
    if (options.subtitle) {
      const subtitleText = scene.add.text(0, 84, options.subtitle, {
        fontFamily: JEDA.CFG.FONT.family,
        fontSize: '27px',
        fontStyle: '600',
        color: '#A7F3D0'
      }).setOrigin(0.5).setResolution(2);
      headerContainer.add(subtitleText);
    }
    modalContainer.add(headerContainer);

    // 4. Kolom Kiri: Kotak Peragaan Animasi Mekanik (264 x 264 px, radius 24)
    const colLeftX = cx - 296;
    const colLeftY = cy + 18;
    const previewBoxW = 264;
    const previewBoxH = 264;

    const previewContainer = scene.add.container(colLeftX, colLeftY);
    const previewBg = scene.add.graphics();
    previewBg.fillStyle(0x161A3E, 0.96);
    previewBg.fillRoundedRect(-previewBoxW / 2, -previewBoxH / 2, previewBoxW, previewBoxH, 24);
    previewBg.lineStyle(1.5, 0x384166, 0.65);
    previewBg.strokeRoundedRect(-previewBoxW / 2, -previewBoxH / 2, previewBoxW, previewBoxH, 24);
    previewContainer.add(previewBg);
    modalContainer.add(previewContainer);

    // Pembuat animasi mekanisme sesuai jenis petunjuk (type)
    const renderMicroAnimation = (animType) => {
      // Bersihkan elemen animasi sebelumnya
      const oldItems = previewContainer.list.filter(item => item !== previewBg);
      oldItems.forEach(item => item.destroy());
      animTweens.forEach(tw => { if (tw && tw.remove) tw.remove(); });
      animTweens.length = 0;
      animTimers.forEach(tm => { if (tm && tm.remove) tm.remove(false); });
      animTimers.length = 0;

      if (animType === 'l1') {
        // --- Animasi Level 1: Orb Bernapas Membesar & Mengecil + Kapsul Spasi ---
        const orbGlow = scene.add.circle(0, -32, 48, 0x7FE0C3, 0.22);
        const orbInner = scene.add.circle(0, -32, 34, 0x7FE0C3, 0.45);
        const orbCore = scene.add.circle(0, -32, 18, 0x7FE0C3, 0.95);

        // Kapsul Tombol [Spasi / Klik]
        const keyW = 196;
        const keyH = 42;
        const keyBg = scene.add.graphics();
        const drawKeyBg = (active) => {
          keyBg.clear();
          keyBg.fillStyle(active ? 0x1E364A : 0x12142E, 0.95);
          keyBg.fillRoundedRect(-keyW / 2, 54 - keyH / 2, keyW, keyH, 21);
          keyBg.lineStyle(2, active ? 0x7FE0C3 : 0x3F486E, active ? 0.95 : 0.65);
          keyBg.strokeRoundedRect(-keyW / 2, 54 - keyH / 2, keyW, keyH, 21);
        };
        drawKeyBg(false);

        const keyLabel = scene.add.text(0, 54, 'Tahan Spasi', {
          fontFamily: JEDA.CFG.FONT.family,
          fontSize: '27px',
          fontStyle: '800',
          color: '#FFFFFF'
        }).setOrigin(0.5).setResolution(2);

        const statusNote = scene.add.text(0, 102, 'Tarik Napas', {
          fontFamily: JEDA.CFG.FONT.family,
          fontSize: '27px',
          fontStyle: '700',
          color: JEDA.CFG.COLOR.hex.calm
        }).setOrigin(0.5).setResolution(2);

        previewContainer.add([orbGlow, orbInner, orbCore, keyBg, keyLabel, statusNote]);

        // Tween napas siklus peraga
        const breathTween = scene.tweens.add({
          targets: [orbGlow, orbInner, orbCore],
          scaleX: 1.45,
          scaleY: 1.45,
          duration: 2200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          onYoyo: () => {
            drawKeyBg(false);
            keyLabel.setText('Lepas Spasi');
            keyLabel.setColor('#CBD5E1');
            statusNote.setText('Hembuskan');
            statusNote.setColor('#94A3B8');
          },
          onRepeat: () => {
            drawKeyBg(true);
            keyLabel.setText('Tahan Spasi');
            keyLabel.setColor('#FFFFFF');
            statusNote.setText('Tarik Napas');
            statusNote.setColor(JEDA.CFG.COLOR.hex.calm);
          }
        });
        drawKeyBg(true);
        animTweens.push(breathTween);

      } else if (animType === 'l2') {
        // --- Animasi Level 2: Pikiran Mengapung & Ditembak Menjadi Awan Lembut ---
        const thoughtCloud = scene.add.container(0, -42);
        const cloudBg = scene.add.graphics();
        const drawCloud = (isClear) => {
          cloudBg.clear();
          if (isClear) {
            cloudBg.fillStyle(0x7FE0C3, 0.45);
            cloudBg.fillCircle(-24, 0, 24);
            cloudBg.fillCircle(24, 0, 24);
            cloudBg.fillCircle(0, -10, 28);
            cloudBg.lineStyle(2, 0xA7F3D0, 0.85);
            cloudBg.strokeCircle(0, -10, 28);
          } else {
            cloudBg.fillStyle(0x3B2856, 0.95);
            cloudBg.fillRoundedRect(-76, -26, 152, 52, 26);
            cloudBg.lineStyle(2, 0x8154B8, 0.75);
            cloudBg.strokeRoundedRect(-76, -26, 152, 52, 26);
          }
        };
        drawCloud(false);

        const cloudText = scene.add.text(0, 0, 'Pikiran', {
          fontFamily: JEDA.CFG.FONT.family,
          fontSize: '27px',
          fontStyle: '700',
          color: '#E2E8F0'
        }).setOrigin(0.5).setResolution(2);
        thoughtCloud.add([cloudBg, cloudText]);

        // Empat Kapsul Tombol Astronot [1] [2] [3] [4]
        const astroCapsules = [];
        const btnXs = [-72, -24, 24, 72];
        for (let i = 0; i < 4; i++) {
          const capG = scene.add.graphics();
          capG.fillStyle(i === 0 ? 0x1E3B46 : 0x141838, 0.95);
          capG.fillRoundedRect(btnXs[i] - 18, 54 - 18, 36, 36, 12);
          capG.lineStyle(1.5, i === 0 ? 0x7FE0C3 : 0x3F486E, 0.8);
          capG.strokeRoundedRect(btnXs[i] - 18, 54 - 18, 36, 36, 12);

          const capT = scene.add.text(btnXs[i], 54, `${i + 1}`, {
            fontFamily: JEDA.CFG.FONT.family,
            fontSize: '27px',
            fontStyle: '800',
            color: i === 0 ? '#7FE0C3' : '#94A3B8'
          }).setOrigin(0.5).setResolution(2);
          astroCapsules.push(capG, capT);
        }

        const infoNote = scene.add.text(0, 102, 'Pilih Astronot → Tembak', {
          fontFamily: JEDA.CFG.FONT.family,
          fontSize: '27px',
          fontStyle: '600',
          color: '#A7F3D0'
        }).setOrigin(0.5).setResolution(2);

        previewContainer.add([thoughtCloud, ...astroCapsules, infoNote]);

        // Efek tembak napas berkala
        const beamG = scene.add.graphics();
        previewContainer.add(beamG);

        const shootLoop = scene.time.addEvent({
          delay: 2400,
          loop: true,
          callback: () => {
            // Gambar sinar berkilau
            beamG.clear();
            beamG.lineStyle(3, 0x7FE0C3, 0.9);
            beamG.lineBetween(0, 36, 0, -20);

            scene.tweens.add({
              targets: thoughtCloud,
              scaleX: 1.15,
              scaleY: 1.15,
              duration: 200,
              yoyo: true,
              onComplete: () => {
                beamG.clear();
                drawCloud(true);
                cloudText.setText('Awan Damai');
                cloudText.setColor('#16163A');
                infoNote.setText('Menjadi Awan ✨');

                scene.time.delayedCall(1100, () => {
                  drawCloud(false);
                  cloudText.setText('Pikiran');
                  cloudText.setColor('#E2E8F0');
                  infoNote.setText('Pilih Astronot → Tembak');
                });
              }
            });
          }
        });
        animTimers.push(shootLoop);

      } else if (animType === 'l3') {
        // --- Animasi Level 3: Empat Kapsul S.T.O.P. Menyala Berurutan ---
        const stopLetters = ['S', 'T', 'O', 'P'];
        const stopTitles = ['Stop', 'Tarik Napas', 'Observe', 'Proceed'];
        const beads = [];
        const beadRadius = 24;
        const beadXs = [-84, -28, 28, 84];

        stopLetters.forEach((letter, idx) => {
          const bg = scene.add.graphics();
          const drawBead = (active) => {
            bg.clear();
            bg.fillStyle(active ? 0x1E3B46 : 0x141838, 0.95);
            bg.fillCircle(beadXs[idx], -18, beadRadius);
            bg.lineStyle(2, active ? 0x7FE0C3 : 0x3F486E, active ? 0.95 : 0.65);
            bg.strokeCircle(beadXs[idx], -18, beadRadius);
          };
          drawBead(false);

          const txt = scene.add.text(beadXs[idx], -18, letter, {
            fontFamily: JEDA.CFG.FONT.family,
            fontSize: '27px',
            fontStyle: '800',
            color: '#94A3B8'
          }).setOrigin(0.5).setResolution(2);

          beads.push({ bg, txt, draw: drawBead });
          previewContainer.add([bg, txt]);
        });

        const stepDesc = scene.add.text(0, 48, 'S: Berhenti Sejenak', {
          fontFamily: JEDA.CFG.FONT.family,
          fontSize: '27px',
          fontStyle: '800',
          color: '#FFFFFF'
        }).setOrigin(0.5).setResolution(2);

        const subNote = scene.add.text(0, 96, 'Metode Jeda Sadar', {
          fontFamily: JEDA.CFG.FONT.family,
          fontSize: '27px',
          fontStyle: '600',
          color: JEDA.CFG.COLOR.hex.calm
        }).setOrigin(0.5).setResolution(2);

        previewContainer.add([stepDesc, subNote]);

        let stepIndex = 0;
        const cycleTimer = scene.time.addEvent({
          delay: 850,
          loop: true,
          callback: () => {
            beads.forEach((b, idx) => {
              const isActive = idx === stepIndex;
              b.draw(isActive);
              b.txt.setColor(isActive ? '#7FE0C3' : '#64748B');
            });
            stepDesc.setText(`${stopLetters[stepIndex]}: ${stopTitles[stepIndex]}`);
            stepIndex = (stepIndex + 1) % 4;
          }
        });
        animTimers.push(cycleTimer);

      } else {
        // --- Animasi Default / Pembuka (Lentera Zen Pendar Damai) ---
        const lanternGlow = scene.add.circle(0, -28, 48, 0x7FE0C3, 0.25);
        const lanternBase = scene.add.graphics();
        lanternBase.fillStyle(0x1F2A48, 0.95);
        lanternBase.fillRoundedRect(-32, -8, 64, 42, 14);
        lanternBase.lineStyle(2, 0x7FE0C3, 0.85);
        lanternBase.strokeRoundedRect(-32, -8, 64, 42, 14);

        const flame = scene.add.circle(0, -32, 18, 0x7FE0C3, 0.95);

        const animTw = scene.tweens.add({
          targets: [lanternGlow, flame],
          scaleX: 1.25,
          scaleY: 1.25,
          alpha: 0.75,
          duration: 1600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
        animTweens.push(animTw);

        const caption = scene.add.text(0, 62, 'Penjaga Lentera', {
          fontFamily: JEDA.CFG.FONT.family,
          fontSize: '27px',
          fontStyle: '800',
          color: '#FFFFFF'
        }).setOrigin(0.5).setResolution(2);

        const subCaption = scene.add.text(0, 102, 'Latihan Berhenti Sejenak', {
          fontFamily: JEDA.CFG.FONT.family,
          fontSize: '27px',
          fontStyle: '600',
          color: JEDA.CFG.COLOR.hex.calm
        }).setOrigin(0.5).setResolution(2);

        previewContainer.add([lanternGlow, lanternBase, flame, caption, subCaption]);
      }
    };

    // Jalankan peragaan awal
    renderMicroAnimation(options.type || (isMultiPage ? 'intro' : 'l1'));

    // 5. Kolom Kanan: Langkah / Konten Teks
    const colRightX = cx + 152;
    const contentRightContainer = scene.add.container(colRightX, cy + 18);
    modalContainer.add(contentRightContainer);

    // Kapsul Tombol Bawah (Mulai di Kanan, Lewati di Kiri)
    const btnY = cy + cardH / 2 - 68;
    const btnW = 280;
    const btnH = 88;
    const btnRadius = 44; // Kapsul sesuai Prinsip 6

    const btnLeft = this.createButton(scene, cx - 156, btnY, btnW, btnH, 'Lewati', () => {
      closeCard();
    }, { primary: false, radius: btnRadius, fontSize: 33 });

    let btnRight = null;

    // Render Konten Kolom Kanan
    const renderRightColumn = () => {
      // Bersihkan isi kanan
      contentRightContainer.removeAll(true);

      if (btnRight) {
        btnRight.destroy();
        btnRight = null;
      }

      if (isMultiPage) {
        // --- Mode Multi-Halaman (Pembuka 3 Halaman) ---
        const curPage = options.pages[currentPageIndex] || {};

        // Judul Halaman
        const pageTitle = scene.add.text(0, -84, curPage.pageTitle || `Langkah ${currentPageIndex + 1}`, {
          fontFamily: JEDA.CFG.FONT.family,
          fontSize: '33px',
          fontStyle: '800',
          color: '#FFFFFF',
          align: 'center'
        }).setOrigin(0.5).setResolution(2);

        // Teks Halaman (Persis PRD 15.2, dijamin <= 14 kata atau teks resmi)
        const pageText = scene.add.text(0, -10, curPage.text || '', {
          fontFamily: JEDA.CFG.FONT.family,
          fontSize: '27px',
          fontStyle: '600',
          color: '#CBD5E1',
          align: 'center',
          wordWrap: { width: 510 },
          lineSpacing: 8
        }).setOrigin(0.5).setResolution(2);

        // Kapsul Aksen Kategori Halaman
        const badgeLabel = curPage.badge || (currentPageIndex === 0 ? 'Fokus Utama' : (currentPageIndex === 1 ? '3 Level Tersedia' : 'Ruang Bebas Tekanan'));
        const badgeW = 260;
        const badgeH = 40;
        const bBg = scene.add.graphics();
        bBg.fillStyle(0x1A224A, 0.92);
        bBg.fillRoundedRect(-badgeW / 2, 60 - badgeH / 2, badgeW, badgeH, 20);
        bBg.lineStyle(1.5, 0x485888, 0.7);
        bBg.strokeRoundedRect(-badgeW / 2, 60 - badgeH / 2, badgeW, badgeH, 20);

        const bText = scene.add.text(0, 60, badgeLabel, {
          fontFamily: JEDA.CFG.FONT.family,
          fontSize: '27px',
          fontStyle: '700',
          color: JEDA.CFG.COLOR.hex.calm
        }).setOrigin(0.5).setResolution(2);

        // Titik Indikator Pagination (3 halaman)
        const dotContainer = scene.add.container(0, 114);
        const dotSpacing = 24;
        const startDotX = -((totalPages - 1) * dotSpacing) / 2;
        for (let i = 0; i < totalPages; i++) {
          const dx = startDotX + i * dotSpacing;
          const isActive = i === currentPageIndex;
          const dot = scene.add.circle(dx, 0, isActive ? 7 : 5, isActive ? 0x7FE0C3 : 0x3F486E, isActive ? 1.0 : 0.6);
          dotContainer.add(dot);
        }

        contentRightContainer.add([pageTitle, pageText, bBg, bText, dotContainer]);

        // Tombol Kanan: 'Lanjut →' jika masih ada halaman, 'Mulai' jika halaman terakhir
        const isLastPage = currentPageIndex === totalPages - 1;
        const rightLabel = isLastPage ? 'Mulai' : 'Lanjut →';

        btnRight = this.createButton(scene, cx + 156, btnY, btnW, btnH, rightLabel, () => {
          if (isLastPage) {
            closeCard();
          } else {
            currentPageIndex++;
            renderRightColumn();
          }
        }, { primary: true, radius: btnRadius, fontSize: 33 });
        modalContainer.add(btnRight);

      } else {
        // --- Mode 3 Langkah (Level 1, 2, 3) ---
        const steps = options.steps || [];
        const stepCount = Math.min(steps.length, 3);
        const rowYs = stepCount === 2 ? [-44, 52] : [-76, 8, 92];

        for (let i = 0; i < stepCount; i++) {
          const st = steps[i];
          const ry = rowYs[i];
          const rowContainer = scene.add.container(0, ry);

          // 1. Badge Angka Langkah (Bulat 38 px)
          const badgeX = -236;
          const numBg = scene.add.graphics();
          numBg.fillStyle(0x1B234A, 0.95);
          numBg.fillCircle(badgeX, 0, 19);
          numBg.lineStyle(2, 0x7FE0C3, 0.85);
          numBg.strokeCircle(badgeX, 0, 19);

          const numTxt = scene.add.text(badgeX, 0, `${st.num || (i + 1)}`, {
            fontFamily: JEDA.CFG.FONT.family,
            fontSize: '27px',
            fontStyle: '800',
            color: '#FFFFFF'
          }).setOrigin(0.5).setResolution(2);

          // 2. Teks Langkah (Maks 14 kata, persis tabel 15.2, font 27 px)
          const textX = -198;
          const stTxt = scene.add.text(textX, 0, st.text, {
            fontFamily: JEDA.CFG.FONT.family,
            fontSize: '27px',
            fontStyle: '600',
            color: '#F1F5F9',
            wordWrap: { width: 446 },
            lineSpacing: 4
          }).setOrigin(0, 0.5).setResolution(2);

          rowContainer.add([numBg, numTxt, stTxt]);
          contentRightContainer.add(rowContainer);
        }

        // Tombol Kanan: 'Mulai'
        btnRight = this.createButton(scene, cx + 156, btnY, btnW, btnH, 'Mulai', () => {
          closeCard();
        }, { primary: true, radius: btnRadius, fontSize: 33 });
        modalContainer.add(btnRight);
      }
    };

    renderRightColumn();
    modalContainer.add(btnLeft);

    // Animasi kemunculan lembut modal
    modalContainer.setAlpha(0);
    modalContainer.setScale(0.96);
    scene.tweens.add({
      targets: modalContainer,
      alpha: 1,
      scaleX: 1.0,
      scaleY: 1.0,
      duration: 220,
      ease: 'Sine.easeOut'
    });

    return modalContainer;
  }
};
