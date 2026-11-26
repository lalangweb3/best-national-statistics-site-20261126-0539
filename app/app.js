/* NusaStat — app.js. Satu sumber data, tanpa network, tanpa library. */
'use strict';

/* ============ DATA — satu sumber kebenaran ============ */
var YEARS = [2019, 2020, 2021, 2022, 2023, 2024];
var DATA = {
  population:    [268.1, 270.2, 272.2, 275.8, 278.7, 281.6], // juta jiwa
  gdpNominal:    [1119, 1059, 1186, 1319, 1371, 1400],        // miliar US$
  gdpPerCapita:  [4174, 3919, 4357, 4783, 4919, 4972],        // US$
  gdpGrowth:     [5.0, -2.1, 3.7, 5.3, 5.1, 5.0],             // %/thn
  inflation:     [2.7, 2.0, 1.9, 5.5, 2.6, 1.6],              // %
  unemployment:  [5.2, 7.1, 6.5, 5.9, 5.3, 4.9],              // %
  poverty:       [9.2, 10.2, 10.1, 9.5, 9.4, 8.6],            // %
  exports:       [167, 163, 231, 291, 258, 264],              // miliar US$
  imports:       [170, 141, 196, 237, 221, 233],              // miliar US$
  laborForce:    [133.9, 134.8, 137.2, 139.5, 143.6, 147.7],  // juta orang
  youthUnemployment: [15.8, 19.5, 18.2, 16.8, 15.2, 13.8],   // %
  gini:          [0.382, 0.385, 0.379, 0.381, 0.379, 0.377],
  lifeExpectancy:[71.7, 71.7, 71.8, 72.2, 72.6, 73.0],        // tahun
  infantMortality:[20.5, 20.0, 19.6, 19.0, 18.5, 17.9],      // per 1000
  literacy:      [96.0, 96.0, 96.2, 96.4, 96.6, 96.8],        // %
  meanSchooling: [8.3, 8.5, 8.6, 8.7, 8.8, 8.9],              // tahun
  netEnrollmentSD:[97.8, 97.9, 98.0, 98.1, 98.2, 98.3],       // %
  urban:         [56.6, 57.1, 57.6, 58.1, 58.6, 59.0]         // %
};
var AGE_2024 = [ // juta jiwa
  {label: '0–14 tahun', value: 69.3},
  {label: '15–24 tahun', value: 44.1},
  {label: '25–54 tahun', value: 118.9},
  {label: '55–64 tahun', value: 28.6},
  {label: '65+ tahun', value: 20.7}
];
var SECTOR_2024 = [
  {label: 'Pertanian', value: 28.2},
  {label: 'Industri', value: 22.0},
  {label: 'Jasa', value: 49.8}
];
var LAND_KM2 = 1904569;
var selectedYear = 2024;
function yearIdx(){ return YEARS.indexOf(selectedYear); }

/* ============ Format angka (Indonesia) ============ */
function fmtID(n, dec){
  return Number(n).toLocaleString('id-ID', {minimumFractionDigits: dec, maximumFractionDigits: dec});
}
function fmtKPI(key, idx){
  var v;
  if (key === 'tradeBalance') v = DATA.exports[idx] - DATA.imports[idx];
  else if (key === 'density') v = DATA.population[idx] * 1e6 / LAND_KM2;
  else if (key === 'popGrowth'){
    if (idx === 0) return 'tahun dasar';
    return '+' + fmtID((DATA.population[idx] / DATA.population[idx - 1] - 1) * 100, 1) + '%';
  }
  else v = DATA[key][idx];
  var el = document.querySelector('[data-kpi="' + key + '"]');
  var fmt = el ? el.getAttribute('data-fmt') : 'pct';
  if (fmt === 'jt') return fmtID(v, 1) + ' jt';
  if (fmt === 'usd-m') return 'US$ ' + fmtID(v, 0) + ' M';
  if (fmt === 'usd') return 'US$ ' + fmtID(v, 0);
  if (fmt === 'pct') return fmtID(v, 1) + '%';
  if (fmt === 'gini') return fmtID(v, 3);
  if (fmt === 'thn') return fmtID(v, 1) + ' thn';
  if (fmt === 'imr') return fmtID(v, 1);
  if (fmt === 'dens') return fmtID(v, 0) + ' /km²';
  return String(v);
}
function updateKPIs(){
  var idx = yearIdx();
  document.querySelectorAll('[data-kpi]').forEach(function(el){
    el.textContent = fmtKPI(el.getAttribute('data-kpi'), idx);
  });
  document.querySelectorAll('.yr').forEach(function(el){ el.textContent = String(selectedYear); });
}

/* ============ Grafik Canvas murni ============ */
var C_TEAL = '#0c5460', C_AMBER = '#f2a541', C_CORAL = '#d9552c', C_GRID = '#e8e4d8', C_TXT = '#5c6b6b';
function fitCanvas(cv){
  var dpr = window.devicePixelRatio || 1;
  var w = cv.clientWidth || 600;
  var h = parseInt(cv.getAttribute('height'), 10) || 240;
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  cv.style.height = h + 'px';
  var ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return {ctx: ctx, w: w, h: h};
}
function niceTicks(min, max, n){
  if (min === max){ min -= 1; max += 1; }
  var span = max - min, step = span / n, mag = Math.pow(10, Math.floor(Math.log10(step)));
  var norm = step / mag;
  var nice = norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10;
  step = nice * mag;
  var lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  var ticks = [];
  for (var v = lo; v <= hi + 1e-9; v += step) ticks.push(v);
  return {lo: lo, hi: hi, ticks: ticks, step: step};
}
function axes(ctx, box, ticks, fmt){
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = C_TXT;
  ctx.strokeStyle = C_GRID;
  ctx.lineWidth = 1;
  ticks.ticks.forEach(function(t){
    var y = box.y + box.h - ((t - ticks.lo) / (ticks.hi - ticks.lo)) * box.h;
    ctx.beginPath(); ctx.moveTo(box.x, y); ctx.lineTo(box.x + box.w, y); ctx.stroke();
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(fmt(t), box.x - 6, y);
  });
}
function xLabels(ctx, box, labels){
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = C_TXT; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  labels.forEach(function(l, i){
    var x = box.x + (i + 0.5) * (box.w / labels.length);
    ctx.fillText(String(l), x, box.y + box.h + 6);
  });
}
function yOf(v, ticks, box){ return box.y + box.h - ((v - ticks.lo) / (ticks.hi - ticks.lo)) * box.h; }

function drawLine(cv, values, opts){
  var f = fitCanvas(cv), ctx = f.ctx;
  var labels = YEARS.map(String);
  var min = Math.min.apply(null, values), max = Math.max.apply(null, values);
  var pad = (max - min) * 0.15 || 1;
  var ticks = niceTicks(min - pad, max + pad, 4);
  var box = {x: 46, y: 10, w: f.w - 56, h: f.h - 34};
  axes(ctx, box, ticks, function(v){ return fmtID(v, opts.dec != null ? opts.dec : 1); });
  xLabels(ctx, box, labels);
  var pts = values.map(function(v, i){
    return {x: box.x + (i + 0.5) * (box.w / values.length), y: yOf(v, ticks, box)};
  });
  // area fill
  ctx.beginPath();
  pts.forEach(function(p, i){ i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); });
  ctx.lineTo(pts[pts.length - 1].x, box.y + box.h);
  ctx.lineTo(pts[0].x, box.y + box.h);
  ctx.closePath();
  ctx.fillStyle = 'rgba(12,84,96,.08)'; ctx.fill();
  // line
  ctx.beginPath();
  pts.forEach(function(p, i){ i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); });
  ctx.strokeStyle = C_TEAL; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
  // points
  pts.forEach(function(p, i){
    ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.strokeStyle = C_TEAL; ctx.lineWidth = 2; ctx.stroke();
  });
  // highlight selected year
  var hi = yearIdx();
  var hp = pts[hi];
  ctx.beginPath(); ctx.arc(hp.x, hp.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = C_AMBER; ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  ctx.font = 'bold 11px system-ui, sans-serif'; ctx.fillStyle = C_TEAL;
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillText(fmtID(values[hi], opts.dec != null ? opts.dec : 1), hp.x, hp.y - 9);
}

function drawBar(cv, values, opts){
  var f = fitCanvas(cv), ctx = f.ctx;
  var labels = YEARS.map(String);
  var min = Math.min(0, Math.min.apply(null, values));
  var max = Math.max.apply(null, values);
  var ticks = niceTicks(min, max * 1.08, 4);
  var box = {x: 46, y: 10, w: f.w - 56, h: f.h - 34};
  axes(ctx, box, ticks, function(v){ return fmtID(v, 0); });
  xLabels(ctx, box, labels);
  var zeroY = yOf(0, ticks, box);
  var slot = box.w / values.length, bw = Math.min(44, slot * 0.62);
  values.forEach(function(v, i){
    var x = box.x + (i + 0.5) * slot - bw / 2;
    var y = yOf(Math.max(v, 0), ticks, box);
    var hgt = Math.abs(yOf(v, ticks, box) - zeroY);
    var isHi = i === yearIdx();
    ctx.fillStyle = isHi ? C_AMBER : (v < 0 ? C_CORAL : C_TEAL);
    ctx.fillRect(x, v < 0 ? zeroY : y, bw, hgt);
    ctx.font = 'bold 11px system-ui, sans-serif'; ctx.fillStyle = C_TEAL;
    ctx.textAlign = 'center';
    if (v < 0){ ctx.textBaseline = 'top'; ctx.fillText(fmtID(v, 1), x + bw / 2, zeroY + 4); }
    else { ctx.textBaseline = 'bottom'; ctx.fillText(fmtID(v, 1), x + bw / 2, y - 4); }
  });
  // zero line
  ctx.strokeStyle = '#9aa5a5'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(box.x, zeroY); ctx.lineTo(box.x + box.w, zeroY); ctx.stroke();
}

function drawGroupedBar(cv, seriesA, seriesB, labelA, labelB){
  var f = fitCanvas(cv), ctx = f.ctx;
  var labels = YEARS.map(String);
  var max = Math.max.apply(null, seriesA.concat(seriesB));
  var ticks = niceTicks(0, max * 1.1, 4);
  var box = {x: 46, y: 26, w: f.w - 56, h: f.h - 50};
  axes(ctx, box, ticks, function(v){ return fmtID(v, 0); });
  xLabels(ctx, box, labels);
  var slot = box.w / labels.length, bw = Math.min(26, slot * 0.26);
  labels.forEach(function(_, i){
    var cx = box.x + (i + 0.5) * slot;
    var hA = (seriesA[i] / ticks.hi) * box.h;
    var hB = (seriesB[i] / ticks.hi) * box.h;
    ctx.fillStyle = C_TEAL;
    ctx.fillRect(cx - bw - 2, box.y + box.h - hA, bw, hA);
    ctx.fillStyle = C_CORAL;
    ctx.fillRect(cx + 2, box.y + box.h - hB, bw, hB);
  });
  // legend
  ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = C_TEAL; ctx.fillRect(box.x, 6, 12, 12);
  ctx.fillStyle = C_TXT; ctx.fillText(labelA, box.x + 17, 12);
  var wA = ctx.measureText(labelA).width;
  ctx.fillStyle = C_CORAL; ctx.fillRect(box.x + 24 + wA, 6, 12, 12);
  ctx.fillStyle = C_TXT; ctx.fillText(labelB, box.x + 41 + wA, 12);
}

function drawHBar(cv, items, unit){
  var f = fitCanvas(cv), ctx = f.ctx;
  var max = Math.max.apply(null, items.map(function(d){ return d.value; }));
  var box = {x: 92, y: 12, w: f.w - 150, h: f.h - 30};
  var rowH = box.h / items.length;
  ctx.font = '12px system-ui, sans-serif';
  items.forEach(function(d, i){
    var y = box.y + i * rowH + rowH * 0.18;
    var bh = rowH * 0.58;
    ctx.fillStyle = C_TXT; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(d.label, box.x - 8, y + bh / 2);
    var bw = (d.value / max) * box.w;
    ctx.fillStyle = i === 2 ? C_AMBER : C_TEAL;
    ctx.fillRect(box.x, y, bw, bh);
    ctx.fillStyle = C_TEAL; ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText(fmtID(d.value, 1) + ' ' + unit, box.x + bw + 7, y + bh / 2);
    ctx.font = '12px system-ui, sans-serif';
  });
}

function drawVBar(cv, items, fmtDec){
  var f = fitCanvas(cv), ctx = f.ctx;
  var labels = items.map(function(d){ return d.label; });
  var values = items.map(function(d){ return d.value; });
  var max = Math.max.apply(null, values);
  var ticks = niceTicks(0, max * 1.12, 4);
  var box = {x: 46, y: 10, w: f.w - 56, h: f.h - 34};
  axes(ctx, box, ticks, function(v){ return fmtID(v, 0); });
  xLabels(ctx, box, labels);
  var slot = box.w / values.length, bw = Math.min(64, slot * 0.6);
  values.forEach(function(v, i){
    var x = box.x + (i + 0.5) * slot - bw / 2;
    var hgt = (v / ticks.hi) * box.h;
    ctx.fillStyle = i === 2 ? C_AMBER : C_TEAL;
    ctx.fillRect(x, box.y + box.h - hgt, bw, hgt);
    ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillStyle = C_TEAL;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(fmtID(v, fmtDec != null ? fmtDec : 1) + '%', x + bw / 2, box.y + box.h - hgt - 4);
  });
}

/* ============ Render semua grafik di halaman aktif ============ */
function renderCharts(){
  var page = document.querySelector('.page.active');
  if (!page) return;
  var q = function(id){ return page.querySelector('#' + id); };
  var cv;
  if ((cv = q('ch-population'))) drawLine(cv, DATA.population, {dec: 1});
  if ((cv = q('ch-population-2'))) drawLine(cv, DATA.population, {dec: 1});
  if ((cv = q('ch-gdp'))) drawBar(cv, DATA.gdpGrowth, {});
  if ((cv = q('ch-gdp-2'))) drawBar(cv, DATA.gdpGrowth, {});
  if ((cv = q('ch-age'))) drawHBar(cv, AGE_2024, 'jt');
  if ((cv = q('ch-inflation'))) drawLine(cv, DATA.inflation, {dec: 1});
  if ((cv = q('ch-trade'))) drawGroupedBar(cv, DATA.exports, DATA.imports, 'Ekspor', 'Impor');
  if ((cv = q('ch-gdppc'))) drawLine(cv, DATA.gdpPerCapita, {dec: 0});
  if ((cv = q('ch-unemp'))) drawLine(cv, DATA.unemployment, {dec: 1});
  if ((cv = q('ch-sector'))) drawVBar(cv, SECTOR_2024, 1);
  if ((cv = q('ch-poverty'))) drawLine(cv, DATA.poverty, {dec: 1});
  if ((cv = q('ch-gini'))) drawLine(cv, DATA.gini, {dec: 3});
  if ((cv = q('ch-literacy'))) drawBar(cv, DATA.literacy, {});
  if ((cv = q('ch-schooling'))) drawLine(cv, DATA.meanSchooling, {dec: 1});
  if ((cv = q('ch-life'))) drawLine(cv, DATA.lifeExpectancy, {dec: 1});
  if ((cv = q('ch-imr'))) drawLine(cv, DATA.infantMortality, {dec: 1});
}

/* ============ Routing halaman ============ */
function currentPage(){
  var h = (location.hash || '#beranda').replace('#', '');
  return document.getElementById('page-' + h) ? h : 'beranda';
}
function showPage(){
  var name = currentPage();
  document.querySelectorAll('.page').forEach(function(s){
    s.classList.toggle('active', s.getAttribute('data-page') === name);
  });
  document.querySelectorAll('.mainnav a').forEach(function(a){
    a.classList.toggle('active', a.getAttribute('href') === '#' + name);
  });
  document.getElementById('mainNav').classList.remove('open');
  document.getElementById('menuBtn').setAttribute('aria-expanded', 'false');
  window.scrollTo(0, 0);
  requestAnimationFrame(renderCharts);
}
window.addEventListener('hashchange', showPage);

/* ============ Menu HP ============ */
document.getElementById('menuBtn').addEventListener('click', function(){
  var nav = document.getElementById('mainNav');
  var open = nav.classList.toggle('open');
  this.setAttribute('aria-expanded', open ? 'true' : 'false');
});

/* ============ Filter tahun ============ */
document.getElementById('yearPills').addEventListener('click', function(e){
  var btn = e.target.closest('button[data-year]');
  if (!btn) return;
  selectedYear = parseInt(btn.getAttribute('data-year'), 10);
  document.querySelectorAll('#yearPills button').forEach(function(b){
    b.classList.toggle('active', b === btn);
  });
  updateKPIs();
  renderCharts();
});

/* ============ Kalkulator pertumbuhan ============ */
document.getElementById('calcForm').addEventListener('submit', function(e){
  e.preventDefault();
  var s = parseFloat(document.getElementById('calcStart').value);
  var en = parseFloat(document.getElementById('calcEnd').value);
  var ys = parseInt(document.getElementById('calcYearStart').value, 10);
  var ye = parseInt(document.getElementById('calcYearEnd').value, 10);
  var out = document.getElementById('calcResult');
  if (isNaN(s) || isNaN(en) || isNaN(ys) || isNaN(ye)){
    out.innerHTML = '<p><strong>Periksa isian:</strong> semua kolom harus diisi angka.</p>';
    return;
  }
  if (s <= 0){
    out.innerHTML = '<p><strong>Nilai awal harus lebih dari 0</strong> agar persentase bisa dihitung.</p>';
    return;
  }
  if (ye <= ys){
    out.innerHTML = '<p><strong>Tahun akhir harus lebih besar dari tahun awal.</strong></p>';
    return;
  }
  var total = (en / s - 1) * 100;
  var years = ye - ys;
  var cagr = (Math.pow(en / s, 1 / years) - 1) * 100;
  var dir = total >= 0 ? 'naik' : 'turun';
  out.innerHTML = '<p>Dari <strong>' + fmtID(s, 0) + '</strong> (' + ys + ') menjadi <strong>' +
    fmtID(en, 0) + '</strong> (' + ye + '): nilai ' + dir + ' <strong>' +
    fmtID(Math.abs(total), 1) + '%</strong> dalam ' + years + ' tahun, atau rata-rata <strong>' +
    fmtID(Math.abs(cagr), 1) + '% per tahun</strong> (CAGR).</p>';
});
document.getElementById('calcFill').addEventListener('click', function(){
  document.getElementById('calcStart').value = 1119;
  document.getElementById('calcEnd').value = 1400;
  document.getElementById('calcYearStart').value = 2019;
  document.getElementById('calcYearEnd').value = 2024;
  document.getElementById('calcForm').dispatchEvent(new Event('submit', {cancelable: true}));
});

/* ============ Tabel pengangguran muda ============ */
(function(){
  var tb = document.getElementById('youthTable');
  var rows = YEARS.map(function(y, i){
    return '<tr><td>' + y + '</td><td>' + fmtID(DATA.unemployment[i], 1) + '</td><td>' +
      fmtID(DATA.youthUnemployment[i], 1) + '</td><td>' + fmtID(DATA.laborForce[i], 1) + '</td></tr>';
  }).join('');
  tb.innerHTML = rows;
})();

/* ============ Indeks indikator + pencarian ============ */
var INDICATORS = [
  {name: 'Jumlah penduduk', key: 'population', fmt: 'jt', page: 'penduduk', label: 'Penduduk'},
  {name: 'Kepadatan penduduk', key: 'density', fmt: 'dens', page: 'penduduk', label: 'Penduduk'},
  {name: 'Penduduk perkotaan', key: 'urban', fmt: 'pct', page: 'penduduk', label: 'Penduduk'},
  {name: 'PDB nominal', key: 'gdpNominal', fmt: 'usd-m', page: 'ekonomi', label: 'Ekonomi'},
  {name: 'PDB per kapita', key: 'gdpPerCapita', fmt: 'usd', page: 'ekonomi', label: 'Ekonomi'},
  {name: 'Pertumbuhan PDB', key: 'gdpGrowth', fmt: 'pct', page: 'ekonomi', label: 'Ekonomi'},
  {name: 'Inflasi', key: 'inflation', fmt: 'pct', page: 'ekonomi', label: 'Ekonomi'},
  {name: 'Ekspor', key: 'exports', fmt: 'usd-m', page: 'ekonomi', label: 'Ekonomi'},
  {name: 'Impor', key: 'imports', fmt: 'usd-m', page: 'ekonomi', label: 'Ekonomi'},
  {name: 'Neraca perdagangan', key: 'tradeBalance', fmt: 'usd-m', page: 'ekonomi', label: 'Ekonomi'},
  {name: 'Angkatan kerja', key: 'laborForce', fmt: 'jt', page: 'kerja', label: 'Ketenagakerjaan'},
  {name: 'Tingkat pengangguran', key: 'unemployment', fmt: 'pct', page: 'kerja', label: 'Ketenagakerjaan'},
  {name: 'Pengangguran muda (15–24)', key: 'youthUnemployment', fmt: 'pct', page: 'kerja', label: 'Ketenagakerjaan'},
  {name: 'Tingkat kemiskinan', key: 'poverty', fmt: 'pct', page: 'sosial', label: 'Kemiskinan & Sosial'},
  {name: 'Rasio Gini', key: 'gini', fmt: 'gini', page: 'sosial', label: 'Kemiskinan & Sosial'},
  {name: 'Melek huruf (15+)', key: 'literacy', fmt: 'pct', page: 'pendidikan', label: 'Pendidikan'},
  {name: 'Rata-rata lama sekolah', key: 'meanSchooling', fmt: 'thn', page: 'pendidikan', label: 'Pendidikan'},
  {name: 'Angka partisipasi murni SD', key: 'netEnrollmentSD', fmt: 'pct', page: 'pendidikan', label: 'Pendidikan'},
  {name: 'Harapan hidup', key: 'lifeExpectancy', fmt: 'thn', page: 'kesehatan', label: 'Kesehatan'},
  {name: 'Kematian bayi', key: 'infantMortality', fmt: 'imr', page: 'kesehatan', label: 'Kesehatan'}
];
function unitOf(fmt){
  return {jt: 'juta jiwa', 'usd-m': 'miliar US$', usd: 'US$', pct: '%', gini: 'rasio 0–1',
    thn: 'tahun', imr: 'per 1.000 kelahiran', dens: 'jiwa/km²'}[fmt] || '';
}
function renderIndex(filter){
  var idx = yearIdx();
  var q = (filter || '').trim().toLowerCase();
  var body = document.getElementById('indexBody');
  var shown = 0;
  var rows = INDICATORS.map(function(ind){
    var hay = (ind.name + ' ' + ind.label).toLowerCase();
    if (q && hay.indexOf(q) === -1) return '';
    shown++;
    return '<tr><td>' + ind.name + '</td><td>' + fmtKPI(ind.key, idx) + '</td><td>' +
      unitOf(ind.fmt) + '</td><td><a href="#' + ind.page + '" data-nav>' + ind.label + ' →</a></td></tr>';
  }).join('');
  body.innerHTML = rows;
  document.getElementById('searchCount').textContent = shown + ' dari ' + INDICATORS.length + ' indikator';
  document.getElementById('searchEmpty').hidden = shown !== 0;
}
document.getElementById('searchInput').addEventListener('input', function(e){
  renderIndex(e.target.value);
});

/* ============ Init ============ */
updateKPIs();
renderIndex('');
showPage();
var rsT;
window.addEventListener('resize', function(){
  clearTimeout(rsT);
  rsT = setTimeout(renderCharts, 150);
});
