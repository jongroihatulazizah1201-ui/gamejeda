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
  let sfxGain = null;

  // Audio Player untuk Musik Meditasi Asli (audio/meditation.mp3)
  let bgmAudio = null;
  const BGM_SRC = 'audio/meditation.mp3';

  function getBgmAudio() {
    if (!bgmAudio && typeof Audio !== 'undefined') {
      try {
        bgmAudio = new Audio(BGM_SRC);
        bgmAudio.loop = true;
        bgmAudio.volume = 0.50;
        bgmAudio.preload = 'auto';
      } catch (e) {
        console.warn('BGM Audio init warning:', e);
      }
    }
    return bgmAudio;
  }

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
   * Inisialisasi AudioContext untuk SFX interaktif
   */
  function getContext() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();

      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.85, ctx.currentTime);
      masterGain.connect(ctx.destination);

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
      playTap();
    } else {
      stopBGM();
    }

    return target;
  }

  /**
   * Memulai Musik Meditasi Asli (audio/meditation.mp3)
   */
  function startBGM() {
    if (!isEnabled()) return;
    const audio = getBgmAudio();
    if (!audio) return;

    audio.volume = 0.50;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Akan diputar otomatis setelah klik/interaksi pertama pengguna
      });
    }
  }

  /**
   * Menghentikan Musik Meditasi dengan fade-out lembut
   */
  function stopBGM(fade = true) {
    if (!bgmAudio) return;
    if (fade) {
      let vol = bgmAudio.volume;
      const step = vol / 10;
      const interval = setInterval(() => {
        if (!bgmAudio) { clearInterval(interval); return; }
        if (bgmAudio.volume > step) {
          bgmAudio.volume = Math.max(0, bgmAudio.volume - step);
        } else {
          bgmAudio.volume = 0;
          bgmAudio.pause();
          clearInterval(interval);
        }
      }, 40);
    } else {
      bgmAudio.pause();
    }
  }

  let breathTimeouts = [];

  function stopBreath() {
    breathTimeouts.forEach(t => clearTimeout(t));
    breathTimeouts = [];
  }

  /**
   * PANDUAN TARIK NAPAS LEVEL 1 (Inhale Chime)
   * Tiga nada lembut menaik perlahan yang memberi kesan mengembang dan melegakan dada (C4 -> E4 -> G4).
   */
  function playInhale(duration = 4.0) {
    if (!isEnabled()) return;
    stopBreath();
    const notes = [261.63, 329.63, 392.00]; // C4, E4, G4
    notes.forEach((freq, idx) => {
      const tid = setTimeout(() => {
        if (isEnabled()) {
          playKalimbaNote(freq, 0.18, 2.0);
        }
      }, idx * 1000);
      breathTimeouts.push(tid);
    });
  }

  /**
   * PANDUAN HEMBUS NAPAS LEVEL 1 (Exhale Chime)
   * Tiga nada lembut menurun perlahan yang memberi rasa pelepasan dan ketenangan (G4 -> E4 -> C4).
   */
  function playExhale(duration = 6.0) {
    if (!isEnabled()) return;
    stopBreath();
    const notes = [392.00, 329.63, 261.63]; // G4, E4, C4
    notes.forEach((freq, idx) => {
      const tid = setTimeout(() => {
        if (isEnabled()) {
          playKalimbaNote(freq, 0.16, 2.4);
        }
      }, idx * 1400);
      breathTimeouts.push(tid);
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
    stopBreath,
    playTap,
    playShoot,
    playDefuse,
    playStopBell,
    playSuccess,
    playChime
  };
})();
