/* ============================================================
   app.js — logika antarmuka: input, opsi, render, ekspor
   ============================================================ */
(function () {
  'use strict';

  var P = window.VisualParse;
  var C = window.VisualCharts;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var LS = 'visual.v1.';

  /* ---------------- contoh data ---------------- */
  var SAMPLES = {
    penjualan: 'Bulan\tPenjualan\tTarget\nJan\t120\t100\nFeb\t185\t150\nMar\t164\t150\nApr\t210\t180\nMei\t198\t190\nJun\t245\t200\nJul\t232\t210\nAgu\t268\t220',
    kategori: 'Kategori\tPenjualan\nMakanan\t420\nMinuman\t315\nSnack\t268\nRumah Tangga\t190\nPerawatan Diri\t142\nElektronik\t96',
    suhu: 'Bulan\tJakarta\tBandung\tSurabaya\nJan\t28\t22\t29\nFeb\t28\t22\t29\nMar\t29\t23\t30\nApr\t30\t23\t31\nMei\t30\t24\t31\nJun\t30\t23\t31\nJul\t30\t23\t31\nAgu\t31\t24\t32\nSep\t31\t24\t32\nOkt\t31\t24\t32\nNov\t30\t24\t31\nDes\t29\t23\t30',
    populasi: 'Kota\tPopulasi\nJakarta\t10560000\nSurabaya\t2874000\nBandung\t2507000\nMedan\t2435000\nSemarang\t1659000\nMakassar\t1424000\nPalembang\t1668000\nDenpasar\t725000',
    pangsa: 'Merek\tPangsa\nMerek A\t32\nMerek B\t24\nMerek C\t18\nMerek D\t14\nMerek E\t8\nLainnya\t4',
    nilai: 'Kelas\tMatematika\tB. Indonesia\tIPA\tIPS\n7A\t82\t78\t75\t80\n7B\t76\t85\t72\t78\n7C\t88\t80\t85\t74\n7D\t71\t74\t68\t83\n7E\t85\t82\t80\t77',
    tinggi: 'Tinggi\tBerat\n150\t45\n155\t48\n158\t52\n160\t55\n162\t54\n165\t60\n168\t63\n170\t66\n172\t68\n175\t72\n178\t75\n180\t80\n183\t85\n185\t88',
    kunjungan: 'Jam\tKunjungan\n00\t120\n01\t80\n02\t55\n03\t40\n04\t48\n05\t120\n06\t340\n07\t720\n08\t1140\n09\t1480\n10\t1690\n11\t1750\n12\t1520\n13\t1610\n14\t1780\n15\t1720\n16\t1560\n17\t1380\n18\t1240\n19\t1560\n20\t1820\n21\t1680\n22\t980\n23\t420',
    kepadatan: 'Hari\tPagi\tSiang\tSore\tMalam\nSenin\t120\t340\t280\t90\nSelasa\t140\t380\t310\t110\nRabu\t135\t420\t295\t105\nKamis\t150\t400\t330\t125\nJumat\t180\t460\t390\t160\nSabtu\t260\t520\t480\t240\nMinggu\t310\t580\t520\t280',
    anggaran: 'Divisi\tAnggaran\nOperasional\t4200\nTeknologi\t3600\nPemasaran\t2800\nSDM\t1800\nKeuangan\t1500\nRiset\t1200\nUmum\t900\nLegal\t600',
    target: 'Metrik\tNilai\tTarget\nPencapaian\t78\t100',
    funnel: 'Tahap\tJumlah\nKunjungan\t12000\nTambah Keranjang\t4200\nCheckout\t1850\nPembayaran\t1120\nSelesai\t940',
    angka: 'Nilai\n42\n58\n71\n35\n64\n88\n53\n77\n46\n92'
  };

  /* ---------------- state ---------------- */
  var state = {
    raw: '',
    parsed: null,
    type: 'bar',
    theme: 'light',
    opts: {
      title: '', xLabel: '', yLabel: '',
      palette: 'ocean', legend: true, values: false, grid: true,
      smooth: true, anim: true, barMode: 'grouped', sort: 'none', numMode: 'auto', stroke: 2.5
    }
  };

  /* ---------------- util ---------------- */
  function debounce(fn, ms) {
    var t;
    return function () {
      var a = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, a); }, ms);
    };
  }

  var toastTimer;
  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-on'); }, 2200);
  }

  function download(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function stamp() {
    var d = new Date();
    function p(n) { return String(n).padStart(2, '0'); }
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  }

  function readTheme() {
    var cs = getComputedStyle(document.documentElement);
    var v = function (n) { return cs.getPropertyValue(n).trim(); };
    return {
      text: v('--text') || '#16203a',
      text2: v('--text-2') || '#59648a',
      text3: v('--text-3') || '#8b95b3',
      border: v('--border') || '#dfe5f0',
      borderStrong: v('--border-strong') || '#c6d0e2',
      surface: v('--surface') || '#ffffff',
      surface2: v('--surface-2') || '#f7f9fd',
      surface3: v('--surface-3') || '#eef2f9'
    };
  }

  /* ---------------- parser + status ---------------- */
  function reparse(silent) {
    var text = state.raw;
    var locale = $('#selLocale').value;
    state.parsed = P.parseTable(text, locale);
    updateStatus();
    renderChart();
    renderStats();
    renderPreview();
    if (!silent) save();
  }

  function updateStatus() {
    var el = $('#parseStatus');
    var d = state.parsed;
    el.className = 'status';
    if (!d || !d.series.length || !d.labels.length) {
      el.className = 'status is-warn';
      el.innerHTML = 'Menunggu data… tempel minimal satu kolom angka.';
      return;
    }
    var rows = d.labels.length, cols = d.series.length;
    var msgs = [];
    msgs.push('<b>✔ ' + rows + ' baris</b> · <b>' + cols + ' seri</b>: ' + d.series.map(function (s) { return s.name; }).join(', '));
    if (d.xValues) msgs.push('Kolom pertama dibaca sebagai sumbu X numerik (cocok untuk Sebaran/Gelembung).');
    if (['pie', 'donut', 'treemap', 'funnel', 'gauge'].indexOf(state.type) > -1 && cols > 1) {
      msgs.push('Visual ini memakai <b>seri pertama</b> (' + d.series[0].name + ') saja.');
    }
    if (d.warnings && d.warnings.length) msgs.push(d.warnings.join(' '));
    el.className = 'status is-ok';
    el.innerHTML = msgs.join('<br />');
  }

  /* ---------------- render chart ---------------- */
  function buildOpts() {
    var o = state.opts;
    return {
      title: o.title, xLabel: o.xLabel, yLabel: o.yLabel,
      palette: o.palette, legend: o.legend, values: o.values, grid: o.grid,
      smooth: o.smooth, anim: o.anim, barMode: o.barMode, sort: o.sort,
      numMode: o.numMode, stroke: o.stroke,
      dark: state.theme === 'dark',
      theme: readTheme()
    };
  }

  function renderChart() {
    var stage = $('#chartStage');
    var empty = $('#chartEmpty');
    var d = state.parsed;

    if (!d || !d.series.length || !d.labels.length) {
      var h0 = $('.chart-holder', stage);
      if (h0) h0.remove();
      empty.hidden = false;
      $('#chartName').textContent = '—';
      return;
    }
    empty.hidden = true;

    var opts = buildOpts();
    var data = P.applyOptions(d, opts);
    var out;
    try {
      out = C.render(state.type, data, opts);
    } catch (err) {
      console.error(err);
      $('#chartName').textContent = 'Gagal menggambar';
      return;
    }

    var holder = $('.chart-holder', stage);
    if (!holder) {
      holder = document.createElement('div');
      holder.className = 'chart-holder';
      stage.appendChild(holder);
    }
    holder.replaceChildren(out.svg);
    $('#chartName').textContent = (opts.title ? opts.title + ' — ' : '') + (out.name || '');
    requestAnimationFrame(function () { window.__vizSvg = out.svg; });
  }

  /* ---------------- statistik & pratinjau ---------------- */
  function renderStats() {
    var wrap = $('#statsWrap');
    var d = state.parsed;
    if (!d || !d.series.length) { wrap.innerHTML = '<div class="status">Belum ada data.</div>'; return; }
    var head = ['Seri', 'Jumlah', 'Rata-rata', 'Median', 'Min', 'Maks', 'Std. Deviasi', 'n'];
    var html = '<table><thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>';
    d.series.forEach(function (s, i) {
      var st = P.stats(s.values);
      var color = C.paletteColors(state.opts.palette, state.theme === 'dark')[i % C.paletteColors(state.opts.palette, state.theme === 'dark').length];
      html += '<tr><td><span class="swatch" style="background:' + color + '"></span>' + escapeHtml(s.name) + '</td>';
      if (!st) {
        html += '<td colspan="7">tidak ada angka</td>';
      } else {
        html += ['sum', 'mean', 'median', 'min', 'max', 'sd'].map(function (k) {
          return '<td class="num">' + P.formatNumber(st[k]) + '</td>';
        }).join('') + '<td class="num">' + st.n + '</td>';
      }
      html += '</tr>';
    });
    html += '</tbody></table>';
    wrap.innerHTML = html;
  }

  function renderPreview() {
    var wrap = $('#dataWrap');
    var d = state.parsed;
    if (!d || !d.series.length) { wrap.innerHTML = '<div class="status">Belum ada data.</div>'; return; }
    var colors = C.paletteColors(state.opts.palette, state.theme === 'dark');
    var head = ['Label'].concat(d.series.map(function (s, i) {
      return '<span class="swatch" style="background:' + colors[i % colors.length] + '"></span>' + escapeHtml(s.name);
    }));
    var html = '<table><thead><tr>' + head.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead><tbody>';
    var limit = Math.min(d.labels.length, 300);
    for (var i = 0; i < limit; i++) {
      html += '<tr><td>' + escapeHtml(d.labels[i]) + '</td>';
      for (var j = 0; j < d.series.length; j++) {
        var v = d.series[j].values[i];
        html += '<td class="num">' + (v === null || v === undefined ? '–' : P.formatNumber(v)) + '</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    if (d.labels.length > limit) {
      html += '<div class="status" style="margin:8px">Menampilkan ' + limit + ' dari ' + d.labels.length + ' baris.</div>';
    }
    wrap.innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------------- tabel editor ---------------- */
  var gridMatrix = [['Label', 'Nilai']];

  function textToMatrix(text) {
    var lines = String(text || '').replace(/\r\n?/g, '\n').split('\n')
      .filter(function (l) { return l.trim() !== '' && l.trim().charAt(0) !== '#'; });
    if (!lines.length) return [['Label', 'Nilai'], ['', '']];
    var delim = P.detectDelimiter(lines);
    var m = lines.map(function (l) { return P.splitLine(l, delim).map(function (c) { return c.trim(); }); });
    var w = 0;
    m.forEach(function (r) { if (r.length > w) w = r.length; });
    m.forEach(function (r) { while (r.length < w) r.push(''); });
    return m;
  }

  function matrixToText(m) {
    return m.map(function (r) { return r.join('\t').replace(/\t+$/, ''); }).join('\n');
  }

  function buildGrid() {
    gridMatrix = textToMatrix(state.raw);
    var html = '<table class="grid"><thead><tr><th class="rowhead">#</th>';
    for (var c = 0; c < gridMatrix[0].length; c++) {
      html += '<th><input class="cellin" data-r="0" data-c="' + c + '" value="' + escapeHtml(gridMatrix[0][c]) + '" /></th>';
    }
    html += '</tr></thead><tbody>';
    for (var r = 1; r < gridMatrix.length; r++) {
      html += '<tr><td class="rowhead">' + r + '</td>';
      for (var c2 = 0; c2 < gridMatrix[r].length; c2++) {
        html += '<td><input class="cellin" data-r="' + r + '" data-c="' + c2 + '" value="' + escapeHtml(gridMatrix[r][c2]) + '" /></td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    $('#gridWrap').innerHTML = html;
  }

  var gridCommit = debounce(function () {
    state.raw = matrixToText(gridMatrix);
    $('#inputText').value = state.raw;
    reparse();
  }, 320);

  function onGridInput(e) {
    var t = e.target;
    if (!t.classList || !t.classList.contains('cellin')) return;
    var r = +t.dataset.r, c = +t.dataset.c;
    while (gridMatrix.length <= r) gridMatrix.push([]);
    var w = gridMatrix[0].length;
    for (var i = 0; i < gridMatrix.length; i++) {
      while (gridMatrix[i].length < w) gridMatrix[i].push('');
    }
    gridMatrix[r][c] = t.value;
    gridCommit();
  }

  function onGridKey(e) {
    var t = e.target;
    if (!t.classList || !t.classList.contains('cellin')) return;
    var r = +t.dataset.r, c = +t.dataset.c;
    var rows = gridMatrix.length, cols = gridMatrix[0].length;
    function focus(nr, nc) {
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) return;
      var nx = $('.cellin[data-r="' + nr + '"][data-c="' + nc + '"]');
      if (nx) { nx.focus(); nx.select(); }
    }
    if (e.key === 'Enter') { e.preventDefault(); focus(r + 1, c); }
    else if (e.key === 'ArrowDown' && !e.shiftKey) { e.preventDefault(); focus(r + 1, c); }
    else if (e.key === 'ArrowUp' && !e.shiftKey) { e.preventDefault(); focus(r - 1, c); }
  }

  /* ---------------- ekspor ---------------- */
  function cleanSvg(svg, scale) {
    var clone = svg.cloneNode(true);
    var st = clone.querySelector('style');
    if (st) st.remove();
    $$('[class]', clone).forEach(function (n) {
      if (/a-(grow|growx|fade|pop)/.test(n.getAttribute('class') || '')) n.removeAttribute('class');
    });
    $$('[style]', clone).forEach(function (n) {
      var s = n.getAttribute('style') || '';
      if (s.indexOf('animation') > -1) n.removeAttribute('style');
    });
    var w = C.W * (scale || 1), h = C.H * (scale || 1);
    clone.setAttribute('width', w);
    clone.setAttribute('height', h);
    return clone;
  }

  function currentSvg() { return $('#chartStage svg'); }

  function svgString(scale) {
    var svg = currentSvg();
    if (!svg) return null;
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(cleanSvg(svg, scale || 1));
  }

  function exportSvg() {
    var s = svgString(1);
    if (!s) return toast('Belum ada diagram untuk diunduh');
    download(new Blob([s], { type: 'image/svg+xml;charset=utf-8' }), 'visual-' + state.type + '-' + stamp() + '.svg');
    toast('SVG diunduh');
  }

  function exportPng() {
    var svg = currentSvg();
    if (!svg) return toast('Belum ada diagram untuk diunduh');
    var scale = 2;
    var str = new XMLSerializer().serializeToString(cleanSvg(svg, scale));
    var url = URL.createObjectURL(new Blob([str], { type: 'image/svg+xml;charset=utf-8' }));
    var img = new Image();
    img.onload = function () {
      var cv = document.createElement('canvas');
      cv.width = C.W * scale;
      cv.height = C.H * scale;
      var ctx = cv.getContext('2d');
      ctx.fillStyle = readTheme().surface;
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      cv.toBlob(function (b) {
        download(b, 'visual-' + state.type + '-' + stamp() + '.png');
        toast('PNG diunduh (2000×1120)');
      }, 'image/png');
    };
    img.onerror = function () {
      URL.revokeObjectURL(url);
      toast('Gagal membuat PNG — coba unduh SVG');
    };
    img.src = url;
  }

  function exportCsv() {
    if (!state.parsed || !state.parsed.series.length) return toast('Belum ada data');
    download(new Blob(['\ufeff' + P.toCSV(state.parsed, ',')], { type: 'text/csv;charset=utf-8' }), 'data-' + stamp() + '.csv');
    toast('CSV diunduh');
  }

  function copyChart() {
    var s = svgString(1);
    if (!s) return toast('Belum ada diagram untuk disalin');
    var svg = currentSvg();
    var scale = 2, str = new XMLSerializer().serializeToString(cleanSvg(svg, scale));
    var url = URL.createObjectURL(new Blob([str], { type: 'image/svg+xml;charset=utf-8' }));
    var img = new Image();
    img.onload = function () {
      var cv = document.createElement('canvas');
      cv.width = C.W * scale; cv.height = C.H * scale;
      var ctx = cv.getContext('2d');
      ctx.fillStyle = readTheme().surface;
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      if (navigator.clipboard && window.ClipboardItem) {
        cv.toBlob(function (b) {
          navigator.clipboard.write([new ClipboardItem({ 'image/png': b })])
            .then(function () { toast('Gambar disalin ke clipboard'); })
            .catch(function () { copyText(s); });
        }, 'image/png');
      } else copyText(s);
    };
    img.onerror = function () { URL.revokeObjectURL(url); copyText(s); };
    img.src = url;
  }

  function copyText(s) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(s).then(function () { toast('Kode SVG disalin'); }, function () { toast('Gagal menyalin'); });
    } else toast('Gagal menyalin');
  }

  /* ---------------- tooltip ---------------- */
  function initTooltip() {
    var tip = $('#tip');
    var stage = $('#chartStage');
    stage.addEventListener('mouseover', function (e) {
      var n = e.target;
      while (n && n !== stage && !(n.getAttribute && n.getAttribute('data-tip'))) n = n.parentNode;
      if (!n || n === stage) return;
      var t = n.getAttribute('data-tip');
      if (!t) return;
      tip.textContent = t;
      tip.classList.add('is-on');
    });
    stage.addEventListener('mousemove', function (e) {
      if (!tip.classList.contains('is-on')) return;
      tip.style.left = e.clientX + 'px';
      tip.style.top = e.clientY + 'px';
    });
    stage.addEventListener('mouseout', function (e) {
      var n = e.target;
      while (n && n !== stage && !(n.getAttribute && n.getAttribute('data-tip'))) n = n.parentNode;
      if (n && n !== stage) tip.classList.remove('is-on');
    });
  }

  /* ---------------- chart picker ---------------- */
  function buildPicker() {
    var wrap = $('#chartPicker');
    wrap.innerHTML = C.TYPES.map(function (t) {
      return '<button class="chip" type="button" role="tab" data-type="' + t.id + '" title="' + escapeHtml(t.hint) + '">' +
        '<span class="ci">' + t.icon + '</span>' + escapeHtml(t.name) + '</button>';
    }).join('');
    wrap.addEventListener('click', function (e) {
      var b = e.target.closest('.chip');
      if (!b) return;
      setType(b.dataset.type);
    });
  }

  function setType(t) {
    state.type = t;
    $$('#chartPicker .chip').forEach(function (b) {
      var on = b.dataset.type === t;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $('#optBarMode').disabled = ['bar', 'area'].indexOf(t) === -1;
    $('#optSmooth').disabled = ['line', 'area'].indexOf(t) === -1;
    updateStatus();
    renderChart();
    save();
  }

  /* ---------------- opsi ---------------- */
  function buildPaletteSelect() {
    var sel = $('#optPalette');
    sel.innerHTML = Object.keys(C.PALETTES).map(function (k) {
      return '<option value="' + k + '">' + C.PALETTES[k].name + '</option>';
    }).join('');
    sel.value = state.opts.palette;
  }

  function bindOptions() {
    $('#optTitle').addEventListener('input', function () { state.opts.title = this.value.trim(); renderChart(); save(); });
    $('#optXLabel').addEventListener('input', function () { state.opts.xLabel = this.value.trim(); renderChart(); save(); });
    $('#optYLabel').addEventListener('input', function () { state.opts.yLabel = this.value.trim(); renderChart(); save(); });
    $('#optPalette').addEventListener('change', function () { state.opts.palette = this.value; renderChart(); renderStats(); renderPreview(); save(); });
    $('#optSort').addEventListener('change', function () { state.opts.sort = this.value; renderChart(); save(); });
    $('#optBarMode').addEventListener('change', function () { state.opts.barMode = this.value; renderChart(); save(); });
    $('#optNum').addEventListener('change', function () { state.opts.numMode = this.value; renderChart(); save(); });
    $('#optStroke').addEventListener('input', function () { state.opts.stroke = +this.value; renderChart(); save(); });
    ['legend', 'values', 'grid', 'smooth', 'anim'].forEach(function (k) {
      var el = $('#opt' + k.charAt(0).toUpperCase() + k.slice(1));
      el.addEventListener('change', function () { state.opts[k] = this.checked; renderChart(); save(); });
    });
    $('#btnOptions').addEventListener('click', function () {
      var panel = $('#optionsPanel');
      panel.hidden = !panel.hidden;
      this.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
    });
  }

  function applyOptsToInputs() {
    var o = state.opts;
    $('#optTitle').value = o.title;
    $('#optXLabel').value = o.xLabel;
    $('#optYLabel').value = o.yLabel;
    $('#optPalette').value = o.palette;
    $('#optSort').value = o.sort;
    $('#optBarMode').value = o.barMode;
    $('#optNum').value = o.numMode;
    $('#optStroke').value = o.stroke;
    $('#optLegend').checked = o.legend;
    $('#optValues').checked = o.values;
    $('#optGrid').checked = o.grid;
    $('#optSmooth').checked = o.smooth;
    $('#optAnim').checked = o.anim;
  }

  /* ---------------- simpanan ---------------- */
  function save() {
    try {
      localStorage.setItem(LS + 'raw', state.raw);
      localStorage.setItem(LS + 'type', state.type);
      localStorage.setItem(LS + 'opts', JSON.stringify(state.opts));
      localStorage.setItem(LS + 'theme', state.theme);
      localStorage.setItem(LS + 'locale', $('#selLocale').value);
    } catch (e) { /* mode privat: abaikan */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(LS + 'raw');
      var type = localStorage.getItem(LS + 'type');
      var opts = localStorage.getItem(LS + 'opts');
      var theme = localStorage.getItem(LS + 'theme');
      var loc = localStorage.getItem(LS + 'locale');
      if (raw) state.raw = raw;
      if (type) state.type = type;
      if (opts) state.opts = Object.assign(state.opts, JSON.parse(opts));
      if (theme) state.theme = theme;
      if (loc) $('#selLocale').value = loc;
      return !!raw;
    } catch (e) { return false; }
  }

  /* ---------------- tema ---------------- */
  function setTheme(t) {
    state.theme = t;
    document.documentElement.setAttribute('data-theme', t);
    $('#icoTheme').textContent = t === 'dark' ? '☀' : '🌙';
    $('#btnTheme .lbl').textContent = t === 'dark' ? 'Terang' : 'Gelap';
    renderChart();
    renderStats();
    renderPreview();
    save();
  }

  /* ---------------- tab ---------------- */
  function setTab(name) {
    $$('.tab').forEach(function (b) {
      var on = b.dataset.tab === name;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $$('.tabpane').forEach(function (p) { p.classList.toggle('is-active', p.dataset.pane === name); });
    if (name === 'table') buildGrid();
    else $('#inputText').value = state.raw;
  }

  /* ---------------- inisialisasi ---------------- */
  function init() {
    buildPicker();
    buildPaletteSelect();

    var had = load();
    if (!had) state.raw = SAMPLES.penjualan;
    $('#inputText').value = state.raw;
    if (state.raw === SAMPLES.penjualan) $('#selSample').value = 'penjualan';

    applyOptsToInputs();
    bindOptions();
    setTheme(state.theme);
    setType(state.type);
    buildGrid();
    reparse(true);

    $('#inputText').addEventListener('input', debounce(function () {
      state.raw = this.value;
      reparse();
      if ($('.tabpane[data-pane="table"]').classList.contains('is-active')) buildGrid();
    }, 350));

    $('#btnRender').addEventListener('click', function () {
      state.raw = $('#inputText').value;
      reparse();
      toast('Visual diperbarui');
    });

    $('#btnClear').addEventListener('click', function () {
      state.raw = '';
      $('#inputText').value = '';
      $('#selSample').value = '';
      gridMatrix = [['Label', 'Nilai'], ['', '']];
      buildGrid();
      reparse();
      toast('Data dibersihkan');
    });

    $('#selSample').addEventListener('change', function () {
      if (!this.value) return;
      state.raw = SAMPLES[this.value] || '';
      $('#inputText').value = state.raw;
      var guess = { pie: 'pangsa', radar: 'nilai', scatter: 'tinggi', bubble: 'tinggi', heatmap: 'kepadatan', treemap: 'anggaran', gauge: 'target', funnel: 'funnel', area: 'kunjungan', hbar: 'populasi' };
      var target = { penjualan: 'bar', kategori: 'donut', suhu: 'line', populasi: 'hbar', pangsa: 'pie', nilai: 'radar', tinggi: 'scatter', kunjungan: 'area', kepadatan: 'heatmap', anggaran: 'treemap', target: 'gauge', funnel: 'funnel', angka: 'bar' };
      if (target[this.value]) setType(target[this.value]);
      reparse();
      toast('Contoh data dimuat');
    });

    $('#selLocale').addEventListener('change', function () { reparse(); });

    $('#fileCsv').addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        state.raw = String(fr.result);
        $('#inputText').value = state.raw;
        reparse();
        buildGrid();
        toast('Berkas dimuat: ' + f.name);
      };
      fr.readAsText(f, 'UTF-8');
      this.value = '';
    });

    $$('.tab').forEach(function (b) {
      b.addEventListener('click', function () { setTab(this.dataset.tab); });
    });

    $('#gridWrap').addEventListener('input', onGridInput);
    $('#gridWrap').addEventListener('keydown', onGridKey);

    $('#btnAddRow').addEventListener('click', function () {
      var w = gridMatrix[0].length;
      var row = [];
      for (var i = 0; i < w; i++) row.push('');
      gridMatrix.push(row);
      buildGrid();
      gridCommit();
    });
    $('#btnAddCol').addEventListener('click', function () {
      gridMatrix.forEach(function (r, i) { r.push(i === 0 ? 'Seri ' + (r.length) : ''); });
      buildGrid();
      gridCommit();
    });
    $('#btnDelRow').addEventListener('click', function () {
      if (gridMatrix.length <= 2) return toast('Minimal harus ada 1 baris data');
      gridMatrix.pop();
      buildGrid();
      gridCommit();
    });
    $('#btnDelCol').addEventListener('click', function () {
      if (gridMatrix[0].length <= 2) return toast('Minimal harus ada 1 kolom data');
      gridMatrix.forEach(function (r) { r.pop(); });
      buildGrid();
      gridCommit();
    });

    $('#btnPng').addEventListener('click', exportPng);
    $('#btnSvg').addEventListener('click', exportSvg);
    $('#btnCsv').addEventListener('click', exportCsv);
    $('#btnCopy').addEventListener('click', copyChart);

    $('#btnTheme').addEventListener('click', function () {
      setTheme(state.theme === 'dark' ? 'light' : 'dark');
    });

    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        state.raw = $('#inputText').value;
        reparse();
        toast('Visual diperbarui');
      }
    });

    window.addEventListener('beforeprint', function () { renderChart(); });
    initTooltip();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
