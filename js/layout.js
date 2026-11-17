/**
 * JEDA - Sistem Tata Letak Simetris (js/layout.js)
 * Sesuai PRD Bagian 14.4 & 14.5:
 * - Dimensi kanvas baku 1920x1080
 * - Grid 12 kolom (Margin 120, Gutter 24, Kolom 118)
 * - Tiga zona vertikal: Header (0-120), Konten (120-900), Aksi (900-1080)
 * - Kalkulasi simetri otomatis: rowCenter, stackCenter, colLeft, colSpan
 * - Visual Debug Grid overlay (tombol 'G' saat ?debug=1)
 */
window.JEDA = window.JEDA || {};

JEDA.Layout = {
  W: 1920,
  H: 1080,
  M: 120,    // Margin kiri dan kanan (px)
  G: 24,     // Jarak antar kolom / gutter (px)
  COL: 118,  // Lebar 1 kolom (px)

  /**
   * Sumbu tengah horizontal (x = 960).
   * Semua elemen utama wajib berpusat di sumbu ini.
   */
  cx() {
    return this.W / 2;
  },

  /**
   * Sumbu tengah vertikal (y = 540).
   */
  cy() {
    return this.H / 2;
  },

  /**
   * Posisi x tepi kiri kolom ke-c (c = 1..12).
   */
  colLeft(c) {
    return this.M + (c - 1) * (this.COL + this.G);
  },

  /**
   * Posisi x pusat kolom ke-c (c = 1..12).
   */
  colCenter(c) {
    return this.colLeft(c) + this.COL / 2;
  },

  /**
   * Menghitung lebar rentang n kolom (termasuk n-1 gutter di antaranya).
   * Jika dipanggil dengan satu parameter colSpan(n), c dianggap n.
   */
  colSpan(c, n) {
    const count = (n === undefined) ? c : n;
    return count * this.COL + Math.max(0, count - 1) * this.G;
  },

  /**
   * Menghitung array pusat x agar elemen-elemen dalam satu baris rata tengah
   * dan 100% simetris terhadap sumbu tengah (W/2).
   * @param {number[]} widths Array lebar masing-masing elemen dalam baris
   * @param {number} gap Jarak antar elemen (baku skala 8px: 16, 24, 32, 48)
   * @returns {number[]} Array koordinat pusat x untuk tiap elemen
   */
  rowCenter(widths, gap = 24) {
    if (!Array.isArray(widths) || widths.length === 0) return [];
    const totalItemsWidth = widths.reduce((sum, w) => sum + w, 0);
    const totalGapWidth = Math.max(0, widths.length - 1) * gap;
    const totalWidth = totalItemsWidth + totalGapWidth;
    let currentLeft = (this.W - totalWidth) / 2;
    const centers = [];
    for (let i = 0; i < widths.length; i++) {
      const w = widths[i];
      centers.push(currentLeft + w / 2);
      currentLeft += w + gap;
    }
    return centers;
  },

  /**
   * Menghitung array pusat y untuk tumpukan elemen vertikal agar seimbang.
   * @param {number[]} heights Array tinggi masing-masing elemen
   * @param {number} gap Jarak vertikal antar elemen
   * @param {number} centerY Titik pusat vertikal tumpukan
   * @returns {number[]} Array koordinat pusat y untuk tiap elemen
   */
  stackCenter(heights, gap = 24, centerY = this.H / 2) {
    if (!Array.isArray(heights) || heights.length === 0) return [];
    const totalItemsHeight = heights.reduce((sum, h) => sum + h, 0);
    const totalGapHeight = Math.max(0, heights.length - 1) * gap;
    const totalHeight = totalItemsHeight + totalGapHeight;
    let currentTop = centerY - totalHeight / 2;
    const centers = [];
    for (let i = 0; i < heights.length; i++) {
      const h = heights[i];
      centers.push(currentTop + h / 2);
      currentTop += h + gap;
    }
    return centers;
  },

  /**
   * Tiga zona vertikal baku (PRD Bagian 14.3 Prinsip 4):
   * - header:  y 0 sampai 120
   * - content: y 120 sampai 900
   * - action:  y 900 sampai 1080
   */
  zone: {
    header: [0, 120],
    content: [120, 900],
    action: [900, 1080]
  },

  /**
   * Ukuran baku panel kaca (PRD Bagian 14.3 Prinsip 5):
   * - S: 720 px
   * - M: 960 px
   * - L: 1200 px
   */
  panelSize: {
    S: 720,
    M: 960,
    L: 1200
  },

  /**
   * Standar dimensi tombol (PRD Bagian 14.3 Prinsip 6):
   * Tinggi 88 px, lebar minimum 280 px, bentuk kapsul, teks 33 px.
   */
  buttonSize: {
    height: 88,
    minWidth: 280,
    radius: 44,
    gap: 32
  },

  // ==========================================
  // Visual Debug Grid Overlay (?debug=1, tombol G)
  // ==========================================
  debugGridVisible: false,
  debugGraphics: null,
  debugLabels: [],

  /**
   * Mengaktifkan atau menonaktifkan tampilan grid pembantu.
   */
  toggleDebugGrid(scene) {
    this.debugGridVisible = !this.debugGridVisible;
    if (this.debugGridVisible) {
      this.renderDebugGrid(scene);
    } else {
      this.clearDebugGrid();
    }
  },

  /**
   * Membersihkan grafik debug grid jika ada.
   */
  clearDebugGrid() {
    if (this.debugGraphics) {
      this.debugGraphics.destroy();
      this.debugGraphics = null;
    }
    if (this.debugLabels && this.debugLabels.length > 0) {
      this.debugLabels.forEach(lbl => lbl.destroy());
      this.debugLabels = [];
    }
  },

  /**
   * Menggambar panduan visual 12 kolom, margin, garis tengah, dan 3 zona.
   */
  renderDebugGrid(scene) {
    this.clearDebugGrid();
    const g = scene.add.graphics().setDepth(99999);
    this.debugGraphics = g;
    this.debugLabels = [];

    // 1. Gambar 12 Kolom Grid
    for (let c = 1; c <= 12; c++) {
      const xLeft = this.colLeft(c);
      // Warna kolom transparan biru lembut
      g.fillStyle(0x38BDF8, 0.07);
      g.fillRect(xLeft, 0, this.COL, this.H);

      // Garis tepi kolom
      g.lineStyle(1, 0x38BDF8, 0.25);
      g.strokeRect(xLeft, 0, this.COL, this.H);

      // Label nomor kolom
      const colLabel = scene.add.text(xLeft + this.COL / 2, 140, `${c}`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '27px',
        color: '#38BDF8',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(99999);
      this.debugLabels.push(colLabel);
    }

    // 2. Garis Margin Kiri (x = 120) & Kanan (x = 1800)
    g.lineStyle(2, 0xEF4444, 0.85); // Merah tegas
    g.lineBetween(this.M, 0, this.M, this.H);
    g.lineBetween(this.W - this.M, 0, this.W - this.M, this.H);

    // 3. Sumbu Tengah Vertikal Utama (x = 960)
    g.lineStyle(3, 0x10B981, 0.95); // Hijau toska terang
    g.lineBetween(this.cx(), 0, this.cx(), this.H);

    // 4. Garis Pembatas 3 Zona Vertikal Horizontal
    g.lineStyle(2, 0xF59E0B, 0.85); // Oranye terang
    g.lineBetween(0, this.zone.header[1], this.W, this.zone.header[1]); // y = 120
    g.lineBetween(0, this.zone.content[1], this.W, this.zone.content[1]); // y = 900

    // Garis Tengah Horizontal (y = 540)
    g.lineStyle(1, 0x10B981, 0.4);
    g.lineBetween(0, this.cy(), this.W, this.cy());

    // Label penjelas zona
    const zoneLabels = [
      { text: '◄ ZONA HEADER (y: 0 - 120) ►', y: 24, color: '#F59E0B' },
      { text: '◄ ZONA KONTEN (y: 120 - 900) ►', y: 136, color: '#F59E0B' },
      { text: '◄ ZONA AKSI (y: 900 - 1080) ►', y: 912, color: '#F59E0B' },
      { text: '▲ SUMBU TENGAH x=960 ▲', y: 540, color: '#10B981' }
    ];

    zoneLabels.forEach(item => {
      const txt = scene.add.text(this.cx(), item.y, item.text, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '27px',
        color: item.color,
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(99999);
      this.debugLabels.push(txt);
    });

    // 5. Gambar Batas Panel (Kuning) & Area Isi (Hijau) untuk Setiap JEDA.UI.textBox (Poin 4)
    const inspectAndDrawTextBoxes = (obj) => {
      if (!obj) return;
      if (obj.panelW && obj.textObj && obj.visible !== false) {
        const mat = obj.getWorldTransformMatrix ? obj.getWorldTransformMatrix() : { tx: obj.x, ty: obj.y };
        const wx = mat.tx;
        const wy = mat.ty;
        const pw = obj.panelW;
        const ph = obj.panelH;

        // A. Kotak batas panel (Kuning neon - Bounding Box)
        g.lineStyle(2, 0xFACC15, 0.95);
        g.strokeRect(wx - pw / 2, wy - ph / 2, pw, ph);

        // B. Kotak area isi (Hijau neon - Content Area)
        const leftP = obj.leftPadding !== undefined ? obj.leftPadding : obj.padX;
        const rightP = obj.rightPadding !== undefined ? obj.rightPadding : obj.padX;
        const padY = obj.padY || 16;
        const contentW = pw - leftP - rightP;
        const contentH = ph - (padY * 2);
        const contentX = wx - pw / 2 + leftP;
        const contentY = wy - ph / 2 + padY;

        g.lineStyle(1.5, 0x34D399, 0.9);
        g.strokeRect(contentX, contentY, contentW, contentH);

        // C. Label pembuktian matematis simetri padding (selisih Δ)
        const delta = Math.abs(Math.round(leftP) - Math.round(rightP));
        const badgeTxt = scene.add.text(wx, wy - ph / 2 - 12, `[Panel: ${pw}x${ph} | L:${Math.round(leftP)} R:${Math.round(rightP)} | Δ:${delta}px]`, {
          fontFamily: 'monospace',
          fontSize: '13px',
          fontStyle: 'bold',
          color: delta <= 2 ? '#34D399' : '#EF4444',
          backgroundColor: '#050614'
        }).setOrigin(0.5, 1).setDepth(99999);
        this.debugLabels.push(badgeTxt);
      }

      if (obj.list && Array.isArray(obj.list)) {
        obj.list.forEach(inspectAndDrawTextBoxes);
      }
    };

    if (scene.children && scene.children.list) {
      scene.children.list.forEach(inspectAndDrawTextBoxes);
    }
  },

  /**
   * Memasang listener keyboard untuk tombol 'G' HANYA saat mode debug aktif (?debug=1).
   */
  attachDebugKeyListener(scene) {
    const isDebug = window.JEDA && JEDA.State && JEDA.State.isDebug && JEDA.State.isDebug();
    if (!isDebug) {
      this.clearDebugGrid();
      this.debugGridVisible = false;
      return;
    }

    if (scene.input && scene.input.keyboard) {
      scene.input.keyboard.on('keydown-G', () => {
        this.toggleDebugGrid(scene);
      });
    }

    // Pastikan jika scene berpindah atau ditutup, objek visual debug lama dibersihkan
    scene.events.once('shutdown', () => {
      this.clearDebugGrid();
    });

    // Jika debug grid sedang dalam kondisi aktif saat scene baru dibuat, gambar ulang
    if (this.debugGridVisible) {
      this.renderDebugGrid(scene);
    }
  }
};
