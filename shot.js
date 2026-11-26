/* Screenshot NusaStat untuk kompetisi make.fun — VIEWPORT ONLY (bukan full-page).
 *
 * Aturan kompetisi: screenshots/ berisi 3-4 gambar, masing-masing maks 256 KiB,
 * format PNG atau JPEG, sisi panjang MAKS 1280px, sisi pendek MIN 360px.
 * Karena itu: deviceScaleFactor SELALU 1 (DSF 2 akan menggandakan piksel gambar
 * sehingga viewport 390x844 jadi 780x1688 dan melanggar batas 1280px),
 * dan screenshot memakai fullPage: false (default Playwright = viewport saja).
 *
 * Bila PNG hasil tangkapan > 256 KiB, skrip otomatis mengambil ulang halaman
 * yang sama sebagai JPEG kualitas 85 dan menghapus PNG yang kelebihan itu
 * (nama file berubah .png -> .jpg; format JPEG diizinkan aturan).
 *
 * Jalankan: node shot.js
 * Output: screenshots/shot-beranda-desktop.png (COVER — nama pertama),
 *         screenshots/shot-penduduk-desktop.png,
 *         screenshots/shot-ekonomi-desktop.png,
 *         screenshots/shot-beranda-mobile.png
 * Situs TIDAK diubah — skrip ini hanya membaca app/index.html via file://.
 */
const { chromium } = require('/home/hatch/muse-web3-bot/node_modules/playwright-core');
const path = require('path');
const fs = require('fs');

const ROOT = __dirname;
const URL = 'file://' + path.join(ROOT, 'app', 'index.html');
const OUT = path.join(ROOT, 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

const MAX_BYTES = 256 * 1024;

function pngSize(file) {
  const b = fs.readFileSync(file);
  // Header IHDR PNG: lebar di offset 16, tinggi di offset 20 (big-endian).
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), bytes: b.length };
}

async function shot(page, navHash, outName) {
  await page.click(`a[href="#${navHash}"]`);
  await page.waitForTimeout(700); // render + grafik canvas selesai
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
  const pngPath = path.join(OUT, outName);
  // fullPage TIDAK di-set (default false) -> hanya viewport yang tertangkap.
  await page.screenshot({ path: pngPath });
  const info = pngSize(pngPath);
  console.log(`${outName}: ${info.width}x${info.height}, ${(info.bytes / 1024).toFixed(1)} KiB`);
  if (info.bytes > MAX_BYTES) {
    // Ambil ulang sebagai JPEG kualitas 85, hapus PNG yang kelebihan.
    const jpgPath = pngPath.replace(/\.png$/, '.jpg');
    await page.screenshot({ path: jpgPath, type: 'jpeg', quality: 85 });
    fs.unlinkSync(pngPath);
    const jpgBytes = fs.statSync(jpgPath).size;
    console.log(`  -> PNG > 256 KiB, diambil ulang sebagai JPEG 85: ${path.basename(jpgPath)}, ${(jpgBytes / 1024).toFixed(1)} KiB`);
    return { file: path.basename(jpgPath), width: info.width, height: info.height, bytes: jpgBytes };
  }
  return { file: outName, width: info.width, height: info.height, bytes: info.bytes };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  // Desktop 1280x800, DSF 1 -> gambar tepat 1280x800.
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  results.push(await shot(page, 'beranda', 'shot-beranda-desktop.png'));
  results.push(await shot(page, 'penduduk', 'shot-penduduk-desktop.png'));
  results.push(await shot(page, 'ekonomi', 'shot-ekonomi-desktop.png'));
  await page.close();

  // Mobile 390x844, DSF 1 -> gambar tepat 390x844 (sisi panjang 844, sisi pendek 390).
  const mob = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await mob.goto(URL, { waitUntil: 'load' });
  await mob.waitForTimeout(700);
  results.push(await shot(mob, 'beranda', 'shot-beranda-mobile.png'));
  await mob.close();

  await browser.close();

  // Hapus screenshot lama yang tidak dipakai (sudah dibackup ke /tmp sebelum run ini).
  const stale = path.join(OUT, 'shot-pendidikan-mobile.png');
  if (fs.existsSync(stale)) { fs.unlinkSync(stale); console.log('dihapus: shot-pendidikan-mobile.png'); }

  console.log('\nVerifikasi aturan (maks 256 KiB, sisi panjang <= 1280, sisi pendek >= 360):');
  let allOk = true;
  for (const r of results) {
    const longSide = Math.max(r.width, r.height);
    const shortSide = Math.min(r.width, r.height);
    const ok = r.bytes <= MAX_BYTES && longSide <= 1280 && shortSide >= 360;
    if (!ok) allOk = false;
    console.log(`${ok ? 'PASS' : 'FAIL'} | ${r.file} | ${r.width}x${r.height} | ${(r.bytes / 1024).toFixed(1)} KiB`);
  }
  console.log(allOk ? 'SEMUA SCREENSHOT MEMENUHI ATURAN' : 'ADA YANG GAGAL — periksa di atas');
  process.exit(allOk ? 0 : 1);
})().catch(e => { console.error('ERROR', e); process.exit(2); });
