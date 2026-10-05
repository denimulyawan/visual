/* ============================================================
   render-test.mjs — uji render semua jenis visual tanpa browser.
   Memakai DOM tiruan kecil, lalu memeriksa keluaran SVG.
   Jalankan:  node tools/render-test.mjs
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ---------- DOM tiruan minimal ---------- */
class Elem {
  constructor(ns, tag) {
    this.ns = ns;
    this.tagName = tag;
    this.attrs = {};
    this.children = [];
    this.style = {};
    this._text = '';
  }
  setAttribute(k, v) { if (v !== null && v !== undefined) this.attrs[k] = String(v); }
  getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; }
  removeAttribute(k) { delete this.attrs[k]; }
  appendChild(c) { this.children.push(c); return c; }
  set textContent(v) { this._text = String(v); }
  get textContent() { return this._text; }
}

function escText(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escAttr(s) { return escText(s).replace(/"/g, '&quot;'); }

function serialize(n) {
  if (n === null || n === undefined) return '';
  if (typeof n === 'string') return escText(n);
  let s = '<' + n.tagName;
  for (const k of Object.keys(n.attrs)) s += ' ' + k + '="' + escAttr(n.attrs[k]) + '"';
  s += '>';
  if (n._text) s += escText(n._text);
  for (const c of n.children) s += serialize(c);
  s += '</' + n.tagName + '>';
  return s;
}

/* ---------- muat skrip aplikasi ke konteks tiruan ---------- */
const sandbox = {
  console,
  document: { createElementNS: (ns, tag) => new Elem(ns, tag) }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

for (const f of ['assets/js/parse.js', 'assets/js/charts.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
}

const P = sandbox.VisualParse;
const C = sandbox.VisualCharts;

/* ---------- perkakas uji ---------- */
let pass = 0, fail = 0;
const failures = [];

function check(name, cond, detail) {
  if (cond) { pass++; }
  else { fail++; failures.push(name + (detail ? ' :: ' + detail : '')); }
}

function theme(dark) {
  return dark
    ? { text: '#eaefff', text2: '#9fabce', text3: '#6d7899', border: '#2a3452', borderStrong: '#3a4668', surface: '#151b2e', surface2: '#1a2138', surface3: '#202a45' }
    : { text: '#16203a', text2: '#59648a', text3: '#8b95b3', border: '#dfe5f0', borderStrong: '#c6d0e2', surface: '#ffffff', surface2: '#f7f9fd', surface3: '#eef2f9' };
}

function opts(extra) {
  return Object.assign({
    title: 'Uji Coba Diagram', xLabel: 'Sumbu X', yLabel: 'Sumbu Y',
    palette: 'ocean', legend: true, values: true, grid: true,
    smooth: true, anim: true, barMode: 'grouped', sort: 'none',
    numMode: 'auto', stroke: 2.5, dark: false, theme: theme(false)
  }, extra || {});
}

/* ---------- kumpulan data uji ---------- */
const DATASETS = {
  'multi (label + 3 seri)': `Wilayah\tQ1\tQ2\tQ3
Jakarta\t1200\t1350\t1500
Bandung\t800\t920\t1010
Surabaya\t950\t880\t1120
Medan\t400\t520\t610
Makassar\t300\t280\t360`,
  'satu seri': `Kategori\tNilai
Alfa\t42
Beta\t58
Gamma\t71
Delta\t35
Epsilon\t64`,
  'angka polos 1 kolom': `42
58
71
35
64
88
53`,
  'semua numerik 2 kolom': `150\t45
155\t48
160\t55
165\t60
170\t66
175\t72
180\t80`,
  '3 kolom numerik (bubble)': `10\t25\t120
18\t41\t300
26\t33\t180
34\t58\t520
42\t47\t260
50\t66\t640`,
  'nilai kosong & negatif': `Bulan\tA\tB
Jan\t120\t-30
Feb\t\t45
Mar\t210\t
Apr\t-15\t88
Mei\t175\t120`,
  'format angka Indonesia': `Item\tNilai
Satu\tRp 1.500.000
Dua\t2,75
Tiga\t(250)
Empat\t12,5%
Lima\t1,2 jt`,
  'satu baris': `Metrik\tNilai\tTarget
Pencapaian\t78\t100`,
  'nilai nol semua': `A\t0
B\t0
C\t0`
};

const DARK = [false, true];
const BAR_MODES = ['grouped', 'stacked', 'percent'];

/* ---------- jalankan ---------- */
for (const [dname, raw] of Object.entries(DATASETS)) {
  const parsed = P.parseTable(raw, 'auto');
  check(`parse:${dname}`, parsed.series.length > 0 && parsed.labels.length > 0,
    `seri=${parsed.series.length} label=${parsed.labels.length}`);
  if (!parsed.series.length) continue;

  // nilai hasil parse harus berupa angka atau null
  let badVal = null;
  parsed.series.forEach(s => s.values.forEach(v => {
    if (v !== null && (typeof v !== 'number' || !isFinite(v))) badVal = String(v);
  }));
  check(`parse-nilai:${dname}`, badVal === null, 'nilai tidak valid: ' + badVal);

  for (const t of C.TYPES) {
    for (const dark of DARK) {
      for (const bm of (t.id === 'bar' || t.id === 'area' ? BAR_MODES : ['grouped'])) {
        for (const sort of ['none', 'desc']) {
          const o = opts({ dark, theme: theme(dark), barMode: bm, sort, smooth: true });
          const data = P.applyOptions(parsed, o);
          let svg, err = null;
          try { svg = C.render(t.id, data, o).svg; } catch (e) { err = e; }
          const label = `${t.id}/${dname}/dark=${dark}/${bm}/${sort}`;
          if (err) { check(label, false, err.message); continue; }
          const out = serialize(svg);
          const problem =
            /NaN/.test(out) ? 'mengandung NaN' :
            /undefined/.test(out) ? 'mengandung undefined' :
            /Infinity/.test(out) ? 'mengandung Infinity' :
            out.length < 400 ? 'SVG terlalu pendek (' + out.length + ')' : null;
          check(label, problem === null, problem || '');
        }
      }
    }
  }
}

/* ---------- uji parser khusus ---------- */
const numCases = [
  ['1.500.000', 'auto', 1500000],
  ['1,234.56', 'auto', 1234.56],
  ['1.234,56', 'id', 1234.56],
  ['12,5', 'auto', 12.5],
  ['12.5', 'auto', 12.5],
  ['1,234', 'auto', 1234],
  ['Rp 2.500.000', 'auto', 2500000],
  ['(250)', 'auto', -250],
  ['12,5%', 'auto', 12.5],
  ['1,2 jt', 'auto', 1200000],
  ['3.5k', 'auto', 3500],
  ['-40', 'auto', -40],
  ['abc', 'auto', null],
  ['', 'auto', null]
];
for (const [raw, loc, want] of numCases) {
  const got = P.parseNumber(raw, loc);
  check(`angka("${raw}",${loc})=${want}`, got === want, 'dapat ' + got);
}

check('delimiter:tab', P.detectDelimiter(['a\tb\tc', '1\t2\t3']) === '\t');
check('delimiter:koma', P.detectDelimiter(['a,b,c', '1,2,3']) === ',');
check('delimiter:pipe', P.detectDelimiter(['a|b', '1|2']) === '|');
check('csv-kutip', JSON.stringify(P.splitLine('a,"b,c",d', ',')) === JSON.stringify(['a', 'b,c', 'd']));

const st = P.stats([1, 2, 3, 4]);
check('statistik', st && st.sum === 10 && st.mean === 2.5 && st.median === 2.5 && st.min === 1 && st.max === 4, JSON.stringify(st));

/* ---------- judul: harus selalu muat di kanvas ---------- */
function walk(n, fn) {
  if (!n || typeof n === 'string') return;
  fn(n);
  (n.children || []).forEach(c => walk(c, fn));
}
function findTitle(svg, prefix) {
  let found = null;
  walk(svg, n => {
    if (n.tagName === 'text' && String(n.textContent).indexOf(prefix) === 0) found = n;
  });
  return found;
}

for (const len of [20, 60, 120, 200]) {
  const title = ('Judul diagram yang sangat panjang sekali '.repeat(8)).slice(0, len);
  const o = opts({ title });
  const svg = C.render('bar', P.parseTable(DATASETS['satu seri'], 'auto'), o).svg;
  const el = findTitle(svg, 'Judul diagram');
  const label = el ? String(el.textContent) : '';
  const size = el ? parseFloat(el.getAttribute('font-size')) : NaN;
  check(`judul-${len}: tergambar`, !!el);
  check(`judul-${len}: ukuran huruf wajar 11-20`, size >= 11 && size <= 20, 'font-size=' + size);
  check(`judul-${len}: lebar perkiraan <= kanvas`,
    label.length * size * 0.56 <= 1000 - 60, `perkiraan ${Math.round(label.length * size * 0.56)}px`);
  check(`judul-${len}: tidak terpotong berlebihan`, label.length >= Math.min(len, 110), `panjang=${label.length}`);
}
check('judul kosong tidak digambar', !findTitle(C.render('bar', P.parseTable(DATASETS['satu seri'], 'auto'), opts({ title: '' })).svg, 'Judul'));

const ns = P.niceScale(0, 97, 5);
check('niceScale', ns.min <= 0 && ns.max >= 97 && ns.ticks.length >= 3, JSON.stringify(ns));

const csv = P.toCSV(P.parseTable('A\tB\n1\t2\n3\t4', 'auto'), ',');
check('toCSV', csv.indexOf('A,B') === 0 && csv.split('\r\n').length === 3, csv);

/* ---------- legenda interaktif, warna seri, dan satuan ---------- */
const OC = C.PALETTES.ocean.colors;

{
  const parsed = P.parseTable(DATASETS['multi (label + 3 seri)'], 'auto');
  // Aplikasi mengirim daftar legenda lengkap + seri yang lolos filter saja.
  const legend = parsed.series.map((s, i) => ({ name: s.name, color: OC[i], ci: i, off: i === 1 }));
  const visible = [Object.assign({}, parsed.series[0], { ci: 0 }), Object.assign({}, parsed.series[2], { ci: 2 })];
  const svg = C.render('bar', { labels: parsed.labels, xValues: parsed.xValues, series: visible, legend }, opts({})).svg;

  const groups = [];
  walk(svg, n => { if (n.getAttribute && n.getAttribute('data-legend')) groups.push(n); });
  check('legenda: semua seri tetap terdaftar', groups.length === 3, 'dapat ' + groups.length);
  check('legenda: entri tersembunyi diredupkan', groups.filter(g => g.getAttribute('opacity') === '0.42').length === 1);
  check('legenda: tiap entri membawa data-series', groups.every(g => /^[0-9]+$/.test(g.getAttribute('data-series') || '')));

  const fills = new Set();
  walk(svg, n => { if (n.tagName === 'path' && n.getAttribute('fill')) fills.add(n.getAttribute('fill')); });
  check('warna seri tidak bergeser saat seri tengah disembunyikan',
    fills.has(OC[0]) && fills.has(OC[2]) && !fills.has(OC[1]), [...fills].join(' '));
}

{
  const parsed = P.parseTable(DATASETS['satu seri'], 'auto');
  const withFmt = opts({
    values: true,
    fmt: { value: v => 'Rp ' + Math.round(v), tick: v => 'Rp' + Math.round(v) }
  });
  const svg = C.render('bar', parsed, withFmt).svg;
  let axisHit = false, valueHit = false;
  walk(svg, n => {
    if (n.tagName !== 'text') return;
    const t = String(n.textContent);
    if (t.indexOf('Rp') === 0 && t.indexOf(' ') === -1) axisHit = true;
    if (t.indexOf('Rp ') === 0) valueHit = true;
  });
  check('satuan dipakai pada label sumbu', axisHit);
  check('satuan dipakai pada label nilai', valueHit);
}

{
  // tanpa opsi fmt: perilaku lama harus tetap sama
  const parsed = P.parseTable(DATASETS['satu seri'], 'auto');
  const svg = C.render('bar', parsed, opts({ values: true })).svg;
  let anyRp = false;
  walk(svg, n => { if (n.tagName === 'text' && String(n.textContent).indexOf('Rp') > -1) anyRp = true; });
  check('tanpa satuan: tidak ada awalan tambahan', !anyRp);
}

/* ---------- hasil ---------- */
console.log('\n' + '='.repeat(58));
console.log(`  LULUS: ${pass}   GAGAL: ${fail}`);
console.log('='.repeat(58));
if (fail) {
  console.log('\nRincian kegagalan:');
  failures.slice(0, 40).forEach(f => console.log('  ✗ ' + f));
  if (failures.length > 40) console.log(`  … dan ${failures.length - 40} lagi`);
  process.exit(1);
}
console.log('\nSemua visual berhasil digambar tanpa galat.\n');
