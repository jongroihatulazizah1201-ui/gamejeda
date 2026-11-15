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
  }
};
