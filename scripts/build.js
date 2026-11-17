const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// Pastikan direktori output dist/ ada
const distJsDir = path.join(__dirname, '../dist/js');
const distCssDir = path.join(__dirname, '../dist/css');
fs.mkdirSync(distJsDir, { recursive: true });
fs.mkdirSync(distCssDir, { recursive: true });

// Urutan pemuatan modul game JEDA sesuai spesifikasi arsitektur
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

console.log('[Build] Menggabungkan script aplikasi...');
const concatenatedJs = jsFiles.map(file => {
  const filePath = path.join(__dirname, '..', file);
  return `\n/* --- File: ${file} --- */\n` + fs.readFileSync(filePath, 'utf8');
}).join('\n');

console.log('[Build] Meminifikasi JavaScript dengan esbuild...');
const minifiedJs = esbuild.transformSync(concatenatedJs, {
  minify: true,
  sourcemap: true,
  sourcefile: 'app.js',
  target: 'es2018'
});

fs.writeFileSync(path.join(distJsDir, 'app.min.js'), minifiedJs.code);
if (minifiedJs.map) {
  fs.writeFileSync(path.join(distJsDir, 'app.min.js.map'), minifiedJs.map);
}

console.log('[Build] Meminifikasi CSS...');
const cssPath = path.join(__dirname, '../css/style.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');
const minifiedCss = esbuild.transformSync(cssContent, {
  loader: 'css',
  minify: true
});
fs.writeFileSync(path.join(distCssDir, 'style.min.css'), minifiedCss.code);

const origJsSize = Buffer.byteLength(concatenatedJs, 'utf8');
const minJsSize = Buffer.byteLength(minifiedJs.code, 'utf8');
const origCssSize = Buffer.byteLength(cssContent, 'utf8');
const minCssSize = Buffer.byteLength(minifiedCss.code, 'utf8');

console.log(`[Build] JS : ${(origJsSize / 1024).toFixed(1)} KB -> ${(minJsSize / 1024).toFixed(1)} KB (hemat ${((1 - minJsSize / origJsSize) * 100).toFixed(1)}%)`);
console.log(`[Build] CSS: ${(origCssSize / 1024).toFixed(1)} KB -> ${(minCssSize / 1024).toFixed(1)} KB (hemat ${((1 - minCssSize / origCssSize) * 100).toFixed(1)}%)`);
console.log('[Build] Proses build & minifikasi selesai!');
