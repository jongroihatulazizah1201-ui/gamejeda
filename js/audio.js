/**
 * JEDA - Procedural Mindfulness Audio Engine (js/audio.js)
 * Sintesis Audio & Musik Relaksasi Prosedural (Web Audio API Murni)
 * 
 * Fitur:
 * 1. Zen Ambient Soundscape: Frekuensi penyembuhan 432 Hz dengan binaural detuning 6 Hz (Theta Wave).
 * 2. Tibetan Singing Bowl / Lonceng Meditasi: Multi-partisi harmonik dengan resonansi alami.
 * 3. Panduan Napas Harmonik: Nada mengembang perlahan saat menarik napas, dan mereda saat menghembus.
 * 4. SFX Zen: Ketukan kayu lembut (woodblock), lonceng kesadaran S.T.O.P., dan akord kemenangan pentatonik.
 * 
 * 100% Prosedural Tanpa File Eksternal (0 KB download), bebas latensi, offline-ready.
 */

window.JEDA = window.JEDA || {};

JEDA.Audio = (function () {
  let ctx = null;
  let masterGain = null;
  let bgmGain = null;
  let sfxGain = null;

  // Nodes untuk Ambient BGM Drone
  let bgmOscs = [];
  let bgmFilter = null;
  let bgmLfo = null;
  let isBgmRunning = false;

  // Status suara aktif (default mengikuti state tersimpan)
  function isEnabled() {
    return Boolean(
      window.JEDA &&
      JEDA.State &&
      JEDA.State.data &&
      JEDA.State.data.settings &&
      JEDA.State.data.settings.sound
    );
  }

  function setEnabledState(val) {
    if (window.JEDA && JEDA.State && JEDA.State.data && JEDA.State.data.settings) {
      JEDA.State.data.settings.sound = Boolean(val);
      JEDA.State.save();
    }
  }

  /**
   * Menginisialisasi AudioContext secara aman setelah interaksi pengguna.
   */
  function getContext() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();

      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(1.0, ctx.currentTime);
      masterGain.connect(ctx.destination);

      bgmGain = ctx.createGain();
      bgmGain.gain.setValueAtTime(0.35, ctx.currentTime);
      bgmGain.connect(masterGain);

      sfxGain = ctx.createGain();
      sfxGain.gain.setValueAtTime(0.45, ctx.currentTime);
      sfxGain.connect(masterGain);
    }

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    return ctx;
  }

  /**
   * Menyalakan / mematikan suara secara global.
   */
  function toggle(forceState) {
    const target = (typeof forceState === 'boolean') ? forceState : !isEnabled();
    setEnabledState(target);

    if (target) {
      getContext();
      startBGM();
      playChime('bowl');
    } else {
      stopBGM();
    }

    return target;
  }

  /**
   * Memulai Musik Meditatif Ambient (Binaural Beats 432 Hz + Theta Wave 6 Hz).
   * Menghasilkan lapisan suara menenangkan yang sangat hangat dan halus.
   */
  function startBGM() {
    if (!isEnabled()) return;
    const ac = getContext();
    if (!ac) return;

    if (isBgmRunning) return;
    isBgmRunning = true;

    // Bersihkan osilator lama jika ada
    stopBGM(false);
    isBgmRunning = true;

    const now = ac.currentTime;

    // Filter hangat (Warm Lowpass)
    bgmFilter = ac.createBiquadFilter();
    bgmFilter.type = 'lowpass';
    bgmFilter.frequency.setValueAtTime(320, now);
    bgmFilter.Q.setValueAtTime(1.2, now);
    bgmFilter.connect(bgmGain);

    // LFO lambat (0.08 Hz) untuk membuat pad bernapas secara alami
    try {
      bgmLfo = ac.createOscillator();
      const lfoGain = ac.createGain();
      bgmLfo.frequency.setValueAtTime(0.08, now); // 12.5 detik per siklus napas kosmik
      lfoGain.gain.setValueAtTime(60, now);
      bgmLfo.connect(lfoGain);
      lfoGain.connect(bgmFilter.frequency);
      bgmLfo.start();
    } catch (e) {}

    // Harmoni 432 Hz:
    // 108 Hz (Sub-bass grounding)
    // 216 Hz (Oktaf tengah hangat)
    // 222 Hz (Binaural detune +6 Hz -> Theta wave relaksasi otak)
    // 432 Hz (Penyembuhan Verdi tuning lembut)
    const tones = [
      { freq: 108, gain: 0.22, type: 'sine' },
      { freq: 216, gain: 0.18, type: 'sine' },
      { freq: 222, gain: 0.15, type: 'sine' }, // +6 Hz Theta
      { freq: 432, gain: 0.08, type: 'triangle' }
    ];

    bgmOscs = tones.map(t => {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = t.type;
      osc.frequency.setValueAtTime(t.freq, now);

      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(t.gain, now + 3.0); // Fade in lembut 3 detik

      osc.connect(g);
      g.connect(bgmFilter);
      osc.start();
      return { osc, gain: g };
    });
  }

  /**
   * Menghentikan musik ambient dengan fade-out halus.
   */
  function stopBGM(fade = true) {
    if (!ctx || bgmOscs.length === 0) {
      isBgmRunning = false;
      return;
    }

    const now = ctx.currentTime;
    const fadeTime = fade ? 1.5 : 0.05;

    bgmOscs.forEach(({ osc, gain }) => {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
        gain.gain.exponentialRampToValueAtTime(0.00001, now + fadeTime);
        setTimeout(() => {
          try { osc.stop(); osc.disconnect(); } catch (e) {}
        }, fadeTime * 1000 + 100);
      } catch (e) {}
    });

    if (bgmLfo) {
      try { bgmLfo.stop(now + fadeTime); } catch (e) {}
      bgmLfo = null;
    }

    bgmOscs = [];
    isBgmRunning = false;
  }

  /**
   * Membunyikan Mangkuk Tibet (Tibetan Singing Bowl) atau Lonceng Meditasi.
   */
  function playBowl(freq = 216, duration = 3.5) {
    if (!isEnabled()) return;
    const ac = getContext();
    if (!ac) return;

    const now = ac.currentTime;

    // Partisi harmonik mangkuk perunggu: Fundamental, ~2.76x, ~5.4x
    const partials = [
      { f: freq, g: 0.35, decay: duration },
      { f: freq * 2.76, g: 0.15, decay: duration * 0.75 },
      { f: freq * 5.40, g: 0.06, decay: duration * 0.50 }
    ];

    partials.forEach(p => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(p.f, now);

      // Sentuhan getaran alami (vibrato sangat halus)
      const vibrato = ac.createOscillator();
      const vibGain = ac.createGain();
      vibrato.frequency.setValueAtTime(3.2, now);
      vibGain.gain.setValueAtTime(1.2, now);
      vibrato.connect(vibGain);
      vibGain.connect(osc.frequency);
      vibrato.start();

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(p.g, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.00001, now + p.decay);

      osc.connect(gain);
      gain.connect(sfxGain);

      osc.start(now);
      osc.stop(now + p.decay);
      vibrato.stop(now + p.decay);
    });
  }

  /**
   * Efek Suara Panduan Tarik Napas (Inhale Harmonic Wave).
   */
  function playInhale(duration = 4.0) {
    if (!isEnabled()) return;
    const ac = getContext();
    if (!ac) return;

    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = 'sine';
    // Nada naik perlahan dan tenang dari 144 Hz ke 216 Hz
    osc.frequency.setValueAtTime(144, now);
    osc.frequency.exponentialRampToValueAtTime(216, now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + duration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(sfxGain);

    osc.start(now);
    osc.stop(now + duration + 0.1);
  }

  /**
   * Efek Suara Panduan Hembus Napas (Exhale Harmonic Release).
   */
  function playExhale(duration = 6.0) {
    if (!isEnabled()) return;
    const ac = getContext();
    if (!ac) return;

    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = 'sine';
    // Nada turun perlahan dari 216 Hz ke 108 Hz (melepaskan ketegangan)
    osc.frequency.setValueAtTime(216, now);
    osc.frequency.exponentialRampToValueAtTime(108, now + duration);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.00001, now + duration);

    osc.connect(gain);
    gain.connect(sfxGain);

    osc.start(now);
    osc.stop(now + duration + 0.1);
  }

  /**
   * SFX Ketukan Kayu Lembut (Zen Woodblock Click) untuk tombol / interaksi.
   */
  function playTap() {
    if (!isEnabled()) return;
    const ac = getContext();
    if (!ac) return;

    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.06);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    osc.connect(gain);
    gain.connect(sfxGain);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  /**
   * SFX Tembakan Astronot (Level 2 Beam of Clarity).
   */
  function playShoot() {
    if (!isEnabled()) return;
    const ac = getContext();
    if (!ac) return;

    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gain);
    gain.connect(sfxGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  /**
   * SFX Monster Pikiran Terdefusi (Level 2 Peace Dissolve).
   */
  function playDefuse() {
    if (!isEnabled()) return;
    const ac = getContext();
    if (!ac) return;

    const now = ac.currentTime;
    const freqs = [540, 720, 1080];
    freqs.forEach((f, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.04);

      gain.gain.setValueAtTime(0.0001, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.09, now + i * 0.04 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.7);

      osc.connect(gain);
      gain.connect(sfxGain);

      osc.start(now + i * 0.04);
      osc.stop(now + 0.75);
    });
  }

  /**
   * SFX Lonceng Sadar S.T.O.P. (Level 3 Temple Gong).
   */
  function playStopBell() {
    playBowl(162, 4.0); // Nada dalam yang tenang
  }

  /**
   * SFX Akord Kemenangan Pentatonik saat menyelesaikan level.
   */
  function playSuccess() {
    if (!isEnabled()) return;
    const ac = getContext();
    if (!ac) return;

    const now = ac.currentTime;
    // Akord Pentatonik G Mayor (Tenang & Damai): G4, B4, D5, G5
    const chord = [392, 493.88, 587.33, 783.99];

    chord.forEach((freq, idx) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();

      const startTime = now + idx * 0.12;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.12, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.00001, startTime + 2.4);

      osc.connect(gain);
      gain.connect(sfxGain);

      osc.start(startTime);
      osc.stop(startTime + 2.5);
    });
  }

  /**
   * Shortcut pemanggil berbagai jenis lonceng / efek.
   */
  function playChime(type = 'bowl') {
    switch (type) {
      case 'bowl':
        playBowl(216, 3.5);
        break;
      case 'inhale':
        playInhale(4.0);
        break;
      case 'exhale':
        playExhale(6.0);
        break;
      case 'tap':
        playTap();
        break;
      case 'shoot':
        playShoot();
        break;
      case 'defuse':
        playDefuse();
        break;
      case 'stop':
        playStopBell();
        break;
      case 'success':
        playSuccess();
        break;
      default:
        playBowl(216, 2.5);
    }
  }

  // Interaksi pertama di window untuk membuka permission AudioContext
  if (typeof window !== 'undefined') {
    const handleFirstInteraction = () => {
      if (isEnabled()) {
        getContext();
        startBGM();
      }
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
    window.addEventListener('pointerdown', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
  }

  return {
    init: getContext,
    isEnabled,
    toggle,
    startBGM,
    stopBGM,
    playBowl,
    playInhale,
    playExhale,
    playTap,
    playShoot,
    playDefuse,
    playStopBell,
    playSuccess,
    playChime
  };
})();
