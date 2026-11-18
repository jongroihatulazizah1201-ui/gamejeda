/**
 * Skrip Uji dan Audit Otomatis Komprehensif Proyek Game JEDA
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('====================================================');
console.log('   PENGUJIAN & AUDIT KUALITAS GAME JEDA (V3.2)');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, testName, errorDetails = '') {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    if (errorDetails) console.error(`         Detail: ${errorDetails}`);
    failCount++;
  }
}

// 1. UJI SINTAKS SELURUH FILE JAVASCRIPT
console.log('--- 1. Uji Sintaks dan Validitas File JS ---');
const jsFiles = [
  'js/config.js',
  'js/data.js',
  'js/journal.js',
  'js/state.js',
  'js/score.js',
  'js/guard.js',
  'js/stage3d.js',
  'js/layout.js',
  'js/fx.js',
  'js/audio.js',
  'js/ui.js',
  'js/lumi.js',
  'js/scenes/boot.js',
  'js/scenes/checkin.js',
  'js/scenes/level1.js',
  'js/scenes/level2.js',
  'js/scenes/level3.js',
  'js/scenes/result.js',
  'js/scenes/pause.js',
  'js/main.js'
];

jsFiles.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  try {
    const code = fs.readFileSync(fullPath, 'utf8');
    new vm.Script(code);
    assert(true, `Sintaks ${file} valid tanpa error kompilasi`);
  } catch (err) {
    assert(false, `Sintaks ${file} valid`, err.message);
  }
});

// 2. SIMULASI LINGKUNGAN RUNTIME JEDA
console.log('\n--- 2. Uji Logika Skor, State, dan Data Game ---');
const sandbox = {
  window: {},
  document: {
    createElement: () => ({ getContext: () => ({}) })
  },
  console: console,
  Math: Math,
  Date: Date,
  Set: Set,
  Array: Array,
  Object: Object,
  String: String,
  Number: Number,
  Float32Array: Float32Array,
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
  }
};
sandbox.window = sandbox;
vm.createContext(sandbox);

// Muat modul-modul non-Phaser ke sandbox
const coreModules = [
  'js/config.js',
  'js/data.js',
  'js/state.js',
  'js/score.js'
];

coreModules.forEach(mod => {
  const code = fs.readFileSync(path.join(__dirname, '..', mod), 'utf8');
  vm.runInContext(code, sandbox);
});

// A. Uji JEDA.CFG
const JEDA = sandbox.window.JEDA;
assert(JEDA && JEDA.CFG, 'JEDA.CFG terdefinisi');
assert(JEDA.CFG.PASS === 60, 'Nilai ambang kelulusan CFG.PASS = 60');

// B. Uji JEDA.DATA
assert(Array.isArray(JEDA.DATA.thoughts) && JEDA.DATA.thoughts.length === 30, 'Dek pikiran berisi 30 item terkurasi');
const validCats = ['Cemas', 'Rencana', 'Menilai Diri', 'Kenangan'];
const allCatsValid = JEDA.DATA.thoughts.every(t => validCats.includes(t.cat));
assert(allCatsValid, 'Seluruh 30 pikiran memiliki kategori valid (Cemas, Rencana, Menilai Diri, Kenangan)');

assert(Array.isArray(JEDA.DATA.scenarios) && JEDA.DATA.scenarios.length === 3, 'Level 3 memiliki 3 skenario resmi');
const allScenariosValid = JEDA.DATA.scenarios.every(s => s.id && s.title && s.trigger && s.reactionConsequence && s.bestResponse);
assert(allScenariosValid, 'Seluruh 3 skenario memiliki pemicu, konsekuensi reaksi, dan opsi respon STOP lengkap');

// C. Uji Logika Skor Level 1 (Napas)
console.log('\n--- 3. Uji Rumus Skor Level 1, 2, 3 & Final ---');
const mockCyclesPerfect = [
  { holdMs: 4000, releaseMs: 6000 },
  { holdMs: 4000, releaseMs: 6000 },
  { holdMs: 4000, releaseMs: 6000 },
  { holdMs: 4000, releaseMs: 6000 },
  { holdMs: 4000, releaseMs: 6000 },
  { holdMs: 4000, releaseMs: 6000 }
];
const l1Perfect = JEDA.Score.calcL1(mockCyclesPerfect, 0);
assert(l1Perfect.score === 100 && l1Perfect.stars === 3 && l1Perfect.passed === true, 'Level 1 Skor Sempurna = 100, 3 Bintang, Lulus');

const mockCyclesTolerance = [
  { holdMs: 4500, releaseMs: 4500 },
  { holdMs: 4600, releaseMs: 4600 },
  { holdMs: 4400, releaseMs: 4400 },
  { holdMs: 4500, releaseMs: 4500 },
  { holdMs: 4600, releaseMs: 4600 },
  { holdMs: 4500, releaseMs: 4500 }
];
const l1Half = JEDA.Score.calcL1(mockCyclesTolerance, 1);
assert(l1Half.score >= 50 && l1Half.ketahanan === 80, 'Level 1 Toleransi Setengah & 1 Gangguan terhitung akurat');

// D. Uji Logika Skor Level 2 (Awan Pikiran)
const l2Perfect = JEDA.Score.calcL2(10, 0, 10);
assert(l2Perfect.score === 100 && l2Perfect.stars === 3 && l2Perfect.passed === true, 'Level 2 Skor Sempurna = 100, 3 Bintang, Lulus');

const l2Partial = JEDA.Score.calcL2(7, 1, 10);
assert(l2Partial.score === 74 && l2Partial.stars === 1 && l2Partial.passed === true, 'Level 2 Skor Parsial (7 benar pertama, 1 panik) = 74, Lulus');

// E. Uji Logika Skor Level 3 (Jeda S.T.O.P.)
const l3ScenariosAllStop = [
  { choseStop: true, responseScore: 100, observedCorrect: true },
  { choseStop: true, responseScore: 100, observedCorrect: true },
  { choseStop: true, responseScore: 100, observedCorrect: true }
];
const l3Perfect = JEDA.Score.calcL3(l3ScenariosAllStop);
assert(l3Perfect.score === 100 && l3Perfect.stars === 3 && l3Perfect.passed === true, 'Level 3 Skor Sempurna (3 STOP) = 100, 3 Bintang, Lulus');

const l3ScenariosMixed = [
  { choseStop: true, responseScore: 60, observedCorrect: true },
  { choseStop: false, responseScore: 0, observedCorrect: false },
  { choseStop: true, responseScore: 100, observedCorrect: false }
];
const l3Mixed = JEDA.Score.calcL3(l3ScenariosMixed);
assert(l3Mixed.jeda === 67 && l3Mixed.passed === false, 'Level 3 Skor Campuran (1 Reaksi, 2 STOP) terhitung adil');

// F. Uji Skor Akhir Terbobot
const finalRes = JEDA.Score.calcFinal(100, 100, 100);
assert(finalRes.score === 100 && finalRes.stars === 3 && finalRes.passed === true, 'Skor Akhir Terbobot (100, 100, 100) = 100');

// G. Uji State & Buka Kunci Level
console.log('\n--- 4. Uji Buka Kunci Level & Penyimpanan Progres ---');
JEDA.State.init();
assert(JEDA.State.isLevelUnlocked(1) === true, 'Level 1 selalu terbuka saat awal');
assert(JEDA.State.isLevelUnlocked(2) === false, 'Level 2 terkunci saat skor L1 < 60');

JEDA.State.saveLevelScore(1, 80, 2);
assert(JEDA.State.isLevelUnlocked(2) === true, 'Level 2 terbuka setelah L1 diselesaikan dengan skor 80');
assert(JEDA.State.isLevelUnlocked(3) === false, 'Level 3 terkunci saat skor L2 < 60');

JEDA.State.saveLevelScore(2, 75, 2);
assert(JEDA.State.isLevelUnlocked(3) === true, 'Level 3 terbuka setelah L2 diselesaikan dengan skor 75');

// H. Uji Lencana Positif
const badgesRun = {
  distractHits: 0,
  l1Passed: true,
  l1Score: 95,
  l2Accuracy: 85,
  l2FirstTry: 9,
  l3AllStop: true,
  l3StopCount: 3,
  l2Passed: true,
  l3Passed: true
};
const evaluatedBadges = JEDA.Score.badges(badgesRun);
assert(evaluatedBadges.earned.length === 5, 'Kelima lencana positif berhasil diraih pada sesi optimal');

// 5. UJI INTEGRITAS BUNDLE & MINIFIKASI
console.log('\n--- 5. Uji File Distribusi Produksi (dist/) ---');
const distJs = path.join(__dirname, '../dist/js/app.min.js');
const distCss = path.join(__dirname, '../dist/css/style.min.css');
assert(fs.existsSync(distJs), 'File dist/js/app.min.js tersedia');
assert(fs.existsSync(distCss), 'File dist/css/style.min.css tersedia');

const htmlContent = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
assert(htmlContent.includes('role="region"'), 'Atribut aksesibilitas ARIA role="region" ada pada #game-container');
assert(htmlContent.includes('dist/js/app.min.js?v=3.2'), 'index.html memuat app.min.js versi 3.2');
assert(htmlContent.includes('dist/css/style.min.css?v=3.2'), 'index.html memuat style.min.css versi 3.2');

console.log('\n====================================================');
console.log(`HASIL AKHIR: ${passCount} LULUS, ${failCount} GAGAL`);
console.log('====================================================');

process.exit(failCount > 0 ? 1 : 0);
