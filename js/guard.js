/**
 * JEDA - Guard & Input Safety (js/guard.js)
 * Mengelola pengawasan input:
 * - BR-05: Deteksi panik klik (> 5 klik dalam 3 detik).
 * - BR-06: Deteksi status idle (15s petunjuk lembut, 60s jeda otomatis).
 * - BR-08: Pengawasan visibilitas tab (buka PauseScene saat tab tidak aktif).
 */
window.JEDA = window.JEDA || {};

JEDA.Guard = {
  clickHistory: [],
  panicActive: false,
  idleTimer: null,
  hintTimer: null,
  visibilityListenerAttached: false,

  /**
   * Mencatat klik pointerdown dan memeriksa apakah terjadi panik klik (BR-05).
   * @param {Phaser.Scene} scene - Scene aktif
   * @param {Function} onPanic - Callback saat panik klik terdeteksi
   */
  recordPointerDown(scene, onPanic) {
    if (this.panicActive) return false;

    const now = Date.now();
    this.clickHistory.push(now);

    // Buang klik yang lebih lama dari spamWindowMs (3000 ms)
    const windowMs = JEDA.CFG.GUARD.spamWindowMs;
    this.clickHistory = this.clickHistory.filter(t => now - t <= windowMs);

    // Periksa batas spamActions (5 klik)
    if (this.clickHistory.length > JEDA.CFG.GUARD.spamActions) {
      this.triggerPanic(scene, onPanic);
      return false;
    }

    this.resetIdleTimer(scene);
    return true;
  },

  /**
   * Menangani kondisi panik klik: membekukan input selama 3 detik dan menampilkan pesan (BR-05).
   */
  triggerPanic(scene, onPanic) {
    this.panicActive = true;
    this.clickHistory = [];

    // Catat ke session
    if (JEDA.State && JEDA.State.session) {
      JEDA.State.session.panicHits = (JEDA.State.session.panicHits || 0) + 1;
    }

    // Tampilkan overlay atau toast peringatan
    if (typeof onPanic === 'function') {
      onPanic();
    } else if (JEDA.UI && JEDA.UI.showPanicOverlay) {
      JEDA.UI.showPanicOverlay(scene);
    }

    // Nonaktifkan input selama spamPauseMs (3000 ms)
    if (scene && scene.input) {
      scene.input.enabled = false;
    }

    setTimeout(() => {
      this.panicActive = false;
      if (scene && scene.input) {
        scene.input.enabled = true;
      }
    }, JEDA.CFG.GUARD.spamPauseMs);
  },

  /**
   * Memulai pengawasan idle pada scene aktif (BR-06).
   * 15 detik tanpa aksi: petunjuk lembut.
   * 60 detik tanpa aksi: buka Pause.
   */
  startIdleMonitor(scene, onHint, onPause) {
    this.stopIdleMonitor();

    const reset = () => this.resetIdleTimer(scene, onHint, onPause);
    if (scene && scene.input) {
      scene.input.on('pointerdown', reset);
      scene.input.keyboard?.on('keydown', reset);
    }

    this.resetIdleTimer(scene, onHint, onPause);
  },

  /**
   * Mengatur ulang timer idle.
   */
  resetIdleTimer(scene, onHint, onPause) {
    clearTimeout(this.hintTimer);
    clearTimeout(this.idleTimer);

    const hintMs = JEDA.CFG.GUARD.idleHintMs || 15000;
    const pauseMs = JEDA.CFG.GUARD.idlePauseMs || 60000;

    // 15 detik tanpa aksi (BR-06): petunjuk lembut
    this.hintTimer = setTimeout(() => {
      if (typeof onHint === 'function') {
        onHint();
      } else if (scene && JEDA.UI && JEDA.UI.toast) {
        JEDA.UI.toast(scene, 'Ambil waktumu. Tidak perlu terburu-buru.');
      }
    }, hintMs);

    // 60 detik tanpa aksi (BR-06): buka Pause
    this.idleTimer = setTimeout(() => {
      if (typeof onPause === 'function') {
        onPause();
      } else if (scene && scene.scene && scene.scene.key !== 'PauseScene') {
        scene.scene.launch('PauseScene', { returnTo: scene.scene.key });
        scene.scene.pause();
      }
    }, pauseMs);
  },

  /**
   * Menghentikan pengawasan idle.
   */
  stopIdleMonitor() {
    clearTimeout(this.hintTimer);
    clearTimeout(this.idleTimer);
  },

  /**
   * Memasang listener visibilitas tab untuk auto-pause (BR-08).
   * Saat pemain berpindah tab (hidden), buka PauseScene dan jeda level.
   */
  attachVisibilityListener(game) {
    if (this.visibilityListenerAttached) return;
    this.visibilityListenerAttached = true;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && game) {
        if (game.scene.isActive('PauseScene')) return;
        const scenes = game.scene.getScenes(true);
        for (const s of scenes) {
          if (s.scene.key.startsWith('Level') && !s.scene.isPaused()) {
            s.scene.launch('PauseScene', { returnTo: s.scene.key });
            s.scene.pause();
            break;
          }
        }
      }
    });
  }
};
