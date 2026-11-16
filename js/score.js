/**
 * JEDA - Penghitung Skor (js/score.js)
 * Kumpulan fungsi murni (tanpa Phaser dan tanpa DOM) untuk kalkulasi skor permainan:
 * - Level 1: Napas (Sinkron, Ketahanan, Konsisten)
 * - Level 2: Awan Pikiran (Akurasi, Tenang, Selesai)
 * - Level 3: Jeda S.T.O.P. (Jeda, Respons, Observe)
 * - Skor Akhir Terbobot & Konversi Bintang
 * Sesuai rumus resmi Bagian 6 PRD.
 */
window.JEDA = window.JEDA || {};

JEDA.Score = {
  /**
   * Menilai satu ukuran durasi (tahan atau lepas).
   * Nilai: 1 jika selisih <= tolFull, 0.5 jika selisih <= tolHalf, selain itu 0.
   */
  evalMeasure(actualMs, targetMs, tolFull, tolHalf) {
    const diff = Math.abs(actualMs - targetMs);
    if (diff <= tolFull) return 1.0;
    if (diff <= tolHalf) return 0.5;
    return 0.0;
  },

  /**
   * Menghitung skor Level 1 (Napas).
   * @param {Array<Object>} cycles - Array berisi 6 data siklus napas:
   *        [{ holdMs, releaseMs, targetIn, targetOut, tolFull, tolHalf }, ...]
   * @param {number} distractHits - Jumlah notifikasi palsu yang diklik pemain
   * @returns {Object} { sinkron, ketahanan, konsisten, score, stars, passed }
   */
  calcL1(cycles = [], distractHits = 0) {
    const totalCycles = cycles.length || 6;
    let cycleScores = [];

    for (const c of cycles) {
      const targetIn = c.targetIn ?? JEDA.CFG.L1.inMs;
      const targetOut = c.targetOut ?? JEDA.CFG.L1.outMs;
      const tolFull = c.tolFull ?? JEDA.CFG.L1.tolFull;
      const tolHalf = c.tolHalf ?? JEDA.CFG.L1.tolHalf;

      const scoreIn = this.evalMeasure(c.holdMs, targetIn, tolFull, tolHalf);
      const scoreOut = this.evalMeasure(c.releaseMs, targetOut, tolFull, tolHalf);
      const cycleScore = (scoreIn + scoreOut) / 2;
      cycleScores.push(cycleScore);
    }

    // 1. Sinkron = rata-rata nilai siklus x 100
    const sumCycleScores = cycleScores.reduce((acc, val) => acc + val, 0);
    const sinkron = totalCycles > 0 ? (sumCycleScores / totalCycles) * 100 : 0;

    // 2. Ketahanan = max(0, 100 - 20 x jumlah notifikasi palsu yang diklik)
    const penalty = JEDA.CFG.L1.distractPenalty ?? 20;
    const ketahanan = Math.max(0, 100 - penalty * distractHits);

    // 3. Konsisten = (rangkaian terpanjang siklus dengan nilai >= 0.75) / 6 x 100
    let longestStreak = 0;
    let currentStreak = 0;
    for (const score of cycleScores) {
      if (score >= 0.75) {
        currentStreak++;
        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
        }
      } else {
        currentStreak = 0;
      }
    }
    const konsisten = (longestStreak / 6) * 100;

    // Skor L1 = 0.6 Sinkron + 0.3 Ketahanan + 0.1 Konsisten
    const rawScore = (0.6 * sinkron) + (0.3 * ketahanan) + (0.1 * konsisten);
    const finalScore = Math.round(rawScore);
    const stars = this.calcStars(finalScore);
    const passed = finalScore >= (JEDA.CFG.PASS || 60);

    return {
      sinkron: Math.round(sinkron),
      ketahanan: Math.round(ketahanan),
      konsisten: Math.round(konsisten),
      score: finalScore,
      stars: stars,
      passed: passed,
      cycleScores: cycleScores
    };
  },

  /**
   * Menghitung skor Level 2 (Awan Pikiran).
   * @param {number} firstTryCorrect - Jumlah gelembung yang benar di percobaan pertama (maks 10)
   * @param {number} panicHits - Jumlah kejadian panik klik
   * @param {number} completedThoughts - Jumlah gelembung yang berhasil terselesaikan (maks 10)
   * @returns {Object} { akurasi, tenang, selesai, score, stars, passed }
   */
  calcL2(firstTryCorrect = 0, panicHits = 0, completedThoughts = 10) {
    // Akurasi = (gelembung benar di percobaan pertama) / 10 x 100
    const akurasi = (firstTryCorrect / 10) * 100;

    // Tenang = max(0, 100 - 25 x jumlah kejadian panik klik)
    const tenang = Math.max(0, 100 - 25 * panicHits);

    // Selesai = (gelembung terselesaikan) / 10 x 100
    const selesai = (completedThoughts / 10) * 100;

    // Skor L2 = 0.7 Akurasi + 0.2 Tenang + 0.1 Selesai
    const rawScore = (0.7 * akurasi) + (0.2 * tenang) + (0.1 * selesai);
    const finalScore = Math.round(rawScore);
    const stars = this.calcStars(finalScore);
    const passed = finalScore >= (JEDA.CFG.PASS || 60);

    return {
      akurasi: Math.round(akurasi),
      tenang: Math.round(tenang),
      selesai: Math.round(selesai),
      score: finalScore,
      stars: stars,
      passed: passed
    };
  },

  /**
   * Mengambil dek 10 pikiran untuk Level 2 (PRD Bagian 8.1 & 15.5).
   * - Komposisi tetap: 3 Cemas, 3 Rencana, 2 Menilai Diri, 2 Kenangan
   * - Menghindari pengulangan pikiran dari run sebelumnya (previousIds)
   * - Mengacak urutan kemunculan dan mencegah 3 kategori sama berturut-turut (PRD 8.1)
   * @param {Array<number|string|Object>} previousIds - Daftar ID pikiran dari run sebelumnya
   * @returns {Array<Object>} 10 pikiran teracak siap dimainkan
   */
  drawDeck(previousIds = []) {
    const allThoughts = (window.JEDA && JEDA.DATA && JEDA.DATA.thoughts) || [];
    if (!allThoughts.length) return [];

    // Normalisasi previousIds ke Set angka/id
    const prevSet = new Set(
      Array.isArray(previousIds)
        ? previousIds.map(x => (typeof x === 'object' && x !== null ? x.id : x))
        : []
    );

    const quotas = {
      'Cemas': 3,
      'Rencana': 3,
      'Menilai Diri': 2,
      'Kenangan': 2
    };

    // Helper Fisher-Yates shuffle murni
    const shuffleArray = (arr) => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const selected = [];

    // Ambil per kategori sesuai kuota, utamakan yang belum dipakai di run sebelumnya
    for (const [catName, quota] of Object.entries(quotas)) {
      const pool = allThoughts.filter(t => (t.cat === catName || t.category === catName));
      const fresh = shuffleArray(pool.filter(t => !prevSet.has(t.id)));
      const used = shuffleArray(pool.filter(t => prevSet.has(t.id)));

      // Ambil dari fresh terlebih dahulu
      let chosen = fresh.slice(0, quota);
      // Jika fresh belum mencukupi kuota, isi kekurangannya dari used
      if (chosen.length < quota) {
        const remaining = quota - chosen.length;
        chosen = chosen.concat(used.slice(0, remaining));
      }
      selected.push(...chosen);
    }

    // Acak urutan seluruh 10 pikiran dan pastikan tidak ada 3 kategori berturut-turut yang sama (PRD 8.1)
    let result = shuffleArray(selected);
    for (let attempt = 0; attempt < 100; attempt++) {
      let hasThreeConsecutive = false;
      for (let i = 0; i < result.length - 2; i++) {
        const c1 = result[i].cat || result[i].category;
        const c2 = result[i + 1].cat || result[i + 1].category;
        const c3 = result[i + 2].cat || result[i + 2].category;
        if (c1 === c2 && c2 === c3) {
          hasThreeConsecutive = true;
          break;
        }
      }
      if (!hasThreeConsecutive) break;
      result = shuffleArray(selected);
    }

    // Kembalikan salinan baru objek pikiran
    return result.map(t => ({ ...t }));
  },

  /**
   * Menghitung skor Level 3 (Jeda S.T.O.P.).
   * @param {Array<Object>} scenarioResults - Hasil 3 skenario:
   *        [{ choseStop: boolean, responseScore: number (100|60|0), observedCorrect: boolean }, ...]
   * @returns {Object} { jeda, respons, observe, score, stars, passed }
   */
  calcL3(scenarioResults = []) {
    const total = scenarioResults.length || 3;
    let stopCount = 0;
    let totalResponse = 0;
    let stopObservedScores = [];

    for (const r of scenarioResults) {
      if (r.choseStop) {
        stopCount++;
        totalResponse += (r.responseScore || 0);
        stopObservedScores.push(r.observedCorrect ? 100 : 0);
      } else {
        totalResponse += 0; // Jalur reaksi bernilai respons 0
      }
    }

    // Jeda = (jumlah skenario yang memilih STOP) / 3 x 100
    const jeda = (stopCount / total) * 100;

    // Respons = rata-rata nilai respons tiga skenario
    const respons = totalResponse / total;

    // Observe = rata-rata pada jalur STOP; 0 bila tidak ada jalur STOP
    const observe = stopObservedScores.length > 0
      ? stopObservedScores.reduce((acc, v) => acc + v, 0) / stopObservedScores.length
      : 0;

    // Skor L3 = 0.4 Jeda + 0.4 Respons + 0.2 Observe
    const rawScore = (0.4 * jeda) + (0.4 * respons) + (0.2 * observe);
    const finalScore = Math.round(rawScore);
    const stars = this.calcStars(finalScore);
    const passed = finalScore >= (JEDA.CFG.PASS || 60);

    return {
      jeda: Math.round(jeda),
      respons: Math.round(respons),
      observe: Math.round(observe),
      score: finalScore,
      stars: stars,
      passed: passed
    };
  },

  /**
   * Menghitung skor akhir terbobot (0.25 L1 + 0.30 L2 + 0.45 L3).
   */
  calcFinal(scoreL1, scoreL2, scoreL3) {
    const weights = JEDA.CFG.WEIGHT || { l1: 0.25, l2: 0.30, l3: 0.45 };
    const rawFinal = (weights.l1 * scoreL1) + (weights.l2 * scoreL2) + (weights.l3 * scoreL3);
    const finalScore = Math.round(rawFinal);
    return {
      score: finalScore,
      stars: this.calcStars(finalScore),
      passed: finalScore >= (JEDA.CFG.PASS || 60)
    };
  },

  /**
   * Mengonversi skor numerik ke jumlah bintang (0 s.d. 3).
   * < 60: 0 bintang
   * 60 - 79: 1 bintang
   * 80 - 89: 2 bintang
   * >= 90: 3 bintang
   */
  calcStars(score) {
    const thresholds = JEDA.CFG.STARS || [60, 80, 90];
    if (score >= thresholds[2]) return 3;
    if (score >= thresholds[1]) return 2;
    if (score >= thresholds[0]) return 1;
    return 0;
  },

  /**
   * Definisi 5 Lencana Positif Mindfulness (PRD Bagian 14.2 G4).
   */
  BADGES: [
    {
      id: 'no_distract',
      name: 'Tidak Menoleh',
      desc: 'Level 1 dengan 0 notifikasi diklik',
      icon: '🛡️',
      check: (run) => (run.distractHits === 0 && (run.l1Passed || run.l1Score >= 60))
    },
    {
      id: 'full_breath',
      name: 'Napas Penuh',
      desc: 'Skor Level 1 sebesar 90 atau lebih',
      icon: '🪷',
      check: (run) => (run.l1Score >= 90)
    },
    {
      id: 'thought_namer',
      name: 'Penamai Pikiran',
      desc: 'Akurasi label Level 2 sebesar 80% atau lebih',
      icon: '💭',
      check: (run) => (run.l2Accuracy >= 80 || run.l2FirstTry >= 8)
    },
    {
      id: 'pause_before_react',
      name: 'Jeda Sebelum Balas',
      desc: 'Memilih STOP di ketiga skenario Level 3',
      icon: '🛑',
      check: (run) => (run.l3AllStop === true || run.l3StopCount >= 3)
    },
    {
      id: 'lantern_keeper',
      name: 'Penjaga Lentera',
      desc: 'Ketiga level lulus dalam satu run',
      icon: '🏮',
      check: (run) => (run.l1Passed && run.l2Passed && run.l3Passed)
    }
  ],

  /**
   * Evaluasi dan pembaharuan status 5 Lencana (PRD 14.2 G4).
   * @param {Object} run - Data performa run saat ini
   * @returns {Object} { badges, earned, newlyUnlocked }
   */
  badges(run = {}) {
    const session = (window.JEDA && JEDA.State && JEDA.State.session) || {};
    const state = (window.JEDA && JEDA.State && JEDA.State.data) || {};
    const passScore = (window.JEDA && JEDA.CFG && JEDA.CFG.PASS) || 60;

    const l1Score = run.l1Score ?? session.levelScores?.l1 ?? state.best?.l1 ?? 0;
    const l2Score = run.l2Score ?? session.levelScores?.l2 ?? state.best?.l2 ?? 0;
    const l3Score = run.l3Score ?? session.levelScores?.l3 ?? state.best?.l3 ?? 0;

    const runData = {
      l1Score,
      l2Score,
      l3Score,
      distractHits: run.distractHits ?? session.distractHits ?? 0,
      l1Passed: run.l1Passed ?? (l1Score >= passScore),
      l2FirstTry: run.l2FirstTry ?? session.l2FirstTry ?? 0,
      l2Accuracy: run.l2Accuracy ?? session.l2Accuracy ?? (session.l2FirstTry ? (session.l2FirstTry / 10) * 100 : 0),
      l2Passed: run.l2Passed ?? (l2Score >= passScore),
      l3StopCount: run.l3StopCount ?? session.l3StopCount ?? 0,
      l3AllStop: run.l3AllStop ?? (session.l3AllStop ?? (session.l3StopCount === 3)),
      l3Passed: run.l3Passed ?? (l3Score >= passScore)
    };

    const earned = [];
    const newlyUnlocked = [];
    const existingBadges = (state.badges && Array.isArray(state.badges)) ? state.badges : [];

    for (const b of this.BADGES) {
      const qualifies = b.check(runData);
      const wasEarnedBefore = existingBadges.includes(b.id);

      if (qualifies || wasEarnedBefore) {
        earned.push(b.id);
      }

      if (qualifies && !wasEarnedBefore) {
        newlyUnlocked.push(b.id);
        if (window.JEDA && JEDA.State && JEDA.State.unlockBadge) {
          JEDA.State.unlockBadge(b.id);
        }
      }
    }

    return {
      badges: this.BADGES,
      earned,
      newlyUnlocked
    };
  }
};
