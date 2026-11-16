/**
 * JEDA - Peaceful Mindfulness Audio Engine (js/audio.js)
 * Musik Relaksasi Menenangkan: Kalimba, Kotak Musik Zen (Music Box), & Wind Chime
 * 
 * Filosofi Suara:
 * - Menghilangkan dengung berat (sub-bass) dan frekuensi disonan yang menegangkan.
 * - Menggunakan Tangga Nada Pentatonik Mayor (F Major Pentatonic) yang hangat, ramah, dan menentramkan jiwa.
 * - Karakter instrumen: Kalimba kayu manis, celesta lembut, dan petikan harpa penenang napas.
 * 
 * 100% Prosedural Web Audio API - Bebas hak cipta, tanpa download (0 KB), ringan & offline-ready.
 */

window.JEDA = window.JEDA || {};

JEDA.Audio = (function () {
  let ctx = null;
  let masterGain = null;
  let bgmGain = null;
  let sfxGain = null;

  // State BGM Melodik
  let isBgmRunning = false;
  let bgmTimer = null;
  let padOscs = [];
  let padFilter = null;

  // Tangga Nada F Major Pentatonic / Lydian (Selalu harmonis, hangat, ceria & menenangkan)
  // Tidak ada nada disonan atau minor yang suram
  const PEACE_NOTES = [
    { name: 'F3', freq: 174.61 },
    { name: 'A3', freq: 220.00 },
    { name: 'C4', freq: 261.63 },
    { name: 'D4', freq: 293.66 },
    { name: 'E4', freq: 329.63 },
    { name: 'F4', freq: 349.23 },
    { name: 'G4', freq: 392.00 },
    { name: 'A4', freq: 440.00 },
    { name: 'C5', freq: 523.25 },
    { name: 'D5', freq: 587.33 },
    { name: 'E5', freq: 659.25 }
  ];

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
   * Inisialisasi AudioContext dengan aman
   */
  function getContext() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();

      // Master bus
      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.85, ctx.currentTime);
      masterGain.connect(ctx.destination);

      // Jalur BGM (Musik Latar Kalimba / Pad)
      bgmGain = ctx.createGain();
      bgmGain.gain.setValueAtTime(0.40, ctx.currentTime);
      bgmGain.connect(masterGain);

      // Jalur SFX (Efek Suara Interaktif)
      sfxGain = ctx.createGain();
      sfxGain.gain.setValueAtTime(0.50, ctx.currentTime);
      sfxGain.connect(masterGain);
    }

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    return ctx;
  }

  /**
   * Toggle On/Off Suara
   */
  function toggle(forceState) {
    const target = (typeof forceState === 'boolean') ? forceState : !isEnabled();
    setEnabledState(target);

    if (target) {
      getContext();
      startBGM();
      playKalimbaNote(440.0, 0.25); // Nada sambutan A4 yang manis
    } else {
      stopBGM();
    }

    return target;
  }

  /**
   * Sintesis Nada Kalimba / Kotak Musik Kayu (Warm Thumb Piano)
   * Menggunakan kombinasi gelombang sine murni dengan overton manis berdecay lembut.
   */
  function playKalimbaNote(freq, volume = 0.22, duration = 1.8) {
    const ac = getContext();
    if (!ac) return;

    const now = ac.currentTime;

    // Filter kayu hangat (Warm low-pass filter)
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(freq * 3.5, 2600), now);
    filter.connect(bgmGain);

    // 1. Nada Fundamental (Body Kayu)
    const osc1 = ac.createOscillator();
    const g1 = ac.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);

    g1.gain.setValueAtTime(0.0001, now);
    g1.gain.exponentialRampToValueAtTime(volume, now + 0.008); // Serangan petikan lembut
    g1.gain.exponentialRampToValueAtTime(0.00001, now + duration);

    osc1.connect(g1);
    g1.connect(filter);
    osc1.start(now);
    osc1.stop(now + duration + 0.05);

    // 2. Harmonik Lonceng Lembut (Tine Chime)
    const osc2 = ac.createOscillator();
    const g2 = ac.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.0, now); // Satu oktaf di atasnya

    g2.gain.setValueAtTime(0.0001, now);
    g2.gain.exponentialRampToValueAtTime(volume * 0.35, now + 0.005);
    g2.gain.exponentialRampToValueAtTime(0.00001, now + duration * 0.6);

    osc2.connect(g2);
    g2.connect(filter);
    osc2.start(now);
    osc2.stop(now + duration * 0.65);
  }

  /**
   * Memulai Musik Latar Generatif Damai (Peaceful Kalimba & Warm Sunbeam Pad)
   * Memainkan pola petikan kalimba acak yang santai di tangga nada mayor setiap 2.5–4.5 detik.
   */
  function startBGM() {
    if (!isEnabled()) return;
    const ac = getContext();
    if (!ac) return;

    if (isBgmRunning) return;
    isBgmRunning = true;

    stopBGM(false);
    isBgmRunning = true;

    const now = ac.currentTime;

    // 1. Warm Sunbeam Pad (Akord Fmaj9 yang sangat hangat, damai, dan terang)
    // Nada: F3 (174.6 Hz), C4 (261.6 Hz), E4 (329.6 Hz), A4 (440 Hz)
    const padTones = [174.61, 261.63, 329.63, 440.00];

    padFilter = ac.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.setValueAtTime(450, now); // Sangat lembut, tanpa dengung tajam
    padFilter.connect(bgmGain);

    padOscs = padTones.map((f, i) => {
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);

      g.gain.setValueAtTime(0.0001, now);
      // Volume pad sangat pelan seperti selimut suara di latar belakang
      g.gain.exponentialRampToValueAtTime(0.045, now + 3.0);

      osc.connect(g);
      g.connect(padFilter);
      osc.start(now);
      return { osc, gain: g };
    });

    // 2. Loop Petikan Kalimba Santai (Seperti angin meniup genta angin bambu di siang hari)
    let step = 0;
    const melodyPattern = [
      [349.23, 440.00],         // F4, A4
      [523.25],                 // C5
      [392.00, 587.33],         // G4, D5
      [440.00],                 // A4
      [329.63, 523.25],         // E4, C5
      [349.23],                 // F4
      [261.63, 440.00]          // C4, A4
    ];

    function scheduleNextPluck() {
      if (!isBgmRunning) return;

      const chord = melodyPattern[step % melodyPattern.length];
      chord.forEach((noteFreq, idx) => {
        setTimeout(() => {
          if (isBgmRunning && isEnabled()) {
            playKalimbaNote(noteFreq, 0.16, 2.2);
          }
        }, idx * 180);
      });

      step++;
      // Interval jeda alami antara 2.8 hingga 4.2 detik
      const nextDelay = 2800 + Math.random() * 1400;
      bgmTimer = setTimeout(scheduleNextPluck, nextDelay);
    }

    // Mulai petikan pertama setelah 1 detik
    bgmTimer = setTimeout(scheduleNextPluck, 1000);
  }

  /**
   * Menghentikan Musik Latar dengan Fade-out Lembut
   */
  function stopBGM(fade = true) {
    if (bgmTimer) {
      clearTimeout(bgmTimer);
      bgmTimer = null;
    }

    if (!ctx || padOscs.length === 0) {
      isBgmRunning = false;
      return;
    }

    const now = ctx.currentTime;
    const fadeDuration = fade ? 1.2 : 0.04;

    padOscs.forEach(({ osc, gain }) => {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
        gain.gain.exponentialRampToValueAtTime(0.00001, now + fadeDuration);
        setTimeout(() => {
          try { osc.stop(); osc.disconnect(); } catch (e) {}
        }, fadeDuration * 1000 + 50);
      } catch (e) {}
    });

    padOscs = [];
    isBgmRunning = false;
  }

  /**
   * PANDUAN TARIK NAPAS LEVEL 1 (Inhale Chime)
   * Tiga nada lembut menaik perlahan yang memberi kesan mengembang dan melegakan dada (C4 -> E4 -> G4).
   */
  function playInhale(duration = 4.0) {
    if (!isEnabled()) return;
    const notes = [261.63, 329.63, 392.00]; // C4, E4, G4
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        if (isEnabled()) {
          playKalimbaNote(freq, 0.18, 2.0);
        }
      }, idx * 1000);
    });
  }

  /**
   * PANDUAN HEMBUS NAPAS LEVEL 1 (Exhale Chime)
   * Tiga nada lembut menurun perlahan yang memberi rasa pelepasan dan ketenangan (G4 -> E4 -> C4).
   */
  function playExhale(duration = 6.0) {
    if (!isEnabled()) return;
    const notes = [392.00, 329.63, 261.63]; // G4, E4, C4
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        if (isEnabled()) {
          playKalimbaNote(freq, 0.16, 2.4);
        }
      }, idx * 1400);
    });
  }

  /**
   * KLIK TOMBOL: Suara Tetes Air Menenangkan (Water Drop / Soft Bubble Pop)
   * Sangat memuaskan, organik, dan sama sekali tidak mengejutkan telinga.
   */
  function playTap() {
    if (!isEnabled()) return;
    const ac = getContext();
    if (!ac) return;

    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.type = 'sine';
    // Nada pitch drop khas tetesan air di danau tenang (600 Hz -> 350 Hz)
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.07);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.09);

    osc.connect(gain);
    gain.connect(sfxGain);

    osc.start(now);
    osc.stop(now + 0.10);
  }

  /**
   * LEVEL 2: Tembakan Astronot (Gentle Starlight Chime)
   * Bintang berkilau lembut dan ceria, bukan laser seram!
   */
  function playShoot() {
    if (!isEnabled()) return;
    playKalimbaNote(659.25, 0.15, 0.8); // E5 yang ceria
  }

  /**
   * LEVEL 2: Monster Pikiran Terurai Menjadi Awan (Soft Cloud Dissolve)
   * Dua nada harpa manis yang menandakan pikiran sudah tenang (F5 & A5).
   */
  function playDefuse() {
    if (!isEnabled()) return;
    playKalimbaNote(698.46, 0.15, 1.4); // F5
    setTimeout(() => {
      if (isEnabled()) playKalimbaNote(880.00, 0.12, 1.8); // A5
    }, 120);
  }

  /**
   * LEVEL 3: Jeda S.T.O.P. (Peaceful Wind Chime)
   * Lonceng angin kristal yang jernih dan menenangkan.
   */
  function playStopBell() {
    if (!isEnabled()) return;
    playKalimbaNote(523.25, 0.22, 2.5); // C5 jernih
    setTimeout(() => {
      if (isEnabled()) playKalimbaNote(659.25, 0.18, 2.2); // E5
    }, 150);
  }

  /**
   * KELULUSAN LEVEL (Sweet Joy Triad)
   * Arpeggio 3 nada mayor yang manis dan mengapresiasi pemain.
   */
  function playSuccess() {
    if (!isEnabled()) return;
    const notes = [349.23, 440.00, 523.25, 698.46]; // F4, A4, C5, F5
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        if (isEnabled()) {
          playKalimbaNote(freq, 0.18, 2.0);
        }
      }, idx * 160);
    });
  }

  /**
   * Mangkuk Meditasi Lembut (Soft Meditation Bell)
   */
  function playBowl(freq = 440, duration = 2.5) {
    if (!isEnabled()) return;
    playKalimbaNote(freq, 0.22, duration);
  }

  function playChime(type = 'bowl') {
    switch (type) {
      case 'inhale':
        playInhale();
        break;
      case 'exhale':
        playExhale();
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
        playBowl(440, 2.0);
    }
  }

  // Listener untuk membuka permission AudioContext pada interaksi pertama
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
