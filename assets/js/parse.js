/* ============================================================
   parse.js — mengubah teks/tabel mentah menjadi struktur data
   { labels: [...], xValues: [...]|null, series: [{name, values:[]}] }
   ============================================================ */
(function (global) {
  'use strict';

  var DELIMS = ['\t', ';', ',', '|'];

  /* ---------- pemisah kolom ---------- */

  function detectDelimiter(lines) {
    var best = ',', bestScore = -1;
    for (var d = 0; d < DELIMS.length; d++) {
      var delim = DELIMS[d];
      var counts = [];
      for (var i = 0; i < lines.length; i++) {
        counts.push(splitLine(lines[i], delim).length);
      }
      var max = counts[0] || 1;
      var consistent = 0;
      for (var j = 0; j < counts.length; j++) if (counts[j] === max) consistent++;
      // skor: jumlah kolom terbanyak * konsistensi
      var score = max > 1 ? max * (consistent / counts.length) : 0;
      if (score > bestScore) { bestScore = score; best = delim; }
    }
    return best;
  }

  function splitLine(line, delim) {
    if (delim !== ',' && delim !== ';') return line.split(delim);
    var out = [], cur = '', inQ = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (inQ) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; }
          else inQ = false;
        } else cur += ch;
      } else if (ch === '"') {
        inQ = true;
      } else if (ch === delim) {
        out.push(cur); cur = '';
      } else cur += ch;
    }
    out.push(cur);
    return out;
  }

  /* ---------- angka ---------- */

  var SUFFIX = /(ribu|miliar|juta|rb|jt|bn|k|m)$/i;

  /**
   * Mengubah teks apa pun menjadi angka.
   * Mendukung: "Rp 1.500.000", "1,234.56", "1.234,56", "12,5%", "(250)",
   * "1,2 jt" -> 1200000, "3.5k" -> 3500.
   */
  function parseNumber(raw, locale) {
    if (raw === null || raw === undefined) return null;
    if (typeof raw === 'number') return isFinite(raw) ? raw : null;

    var s = String(raw).trim();
    if (!s) return null;

    s = s.replace(/[\s\u00a0\u202f']/g, '');
    s = s.replace(/^(rp|idr|usd|sgd|myr|eur|jpy|aud|cny)\.?/i, '');
    s = s.replace(/^[$€£¥₹]/, '');

    var neg = false;
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }

    var pct = false;
    if (/%$/.test(s)) { pct = true; s = s.slice(0, -1); }

    var mult = 1;
    var suf = s.match(SUFFIX);
    if (suf && /[0-9]/.test(s.slice(0, -suf[0].length))) {
      var u = suf[1].toLowerCase();
      if (u === 'rb' || u === 'ribu' || u === 'k') mult = 1e3;
      else if (u === 'jt' || u === 'juta' || u === 'm') mult = 1e6;
      else if (u === 'bn' || u === 'miliar') mult = 1e9;
      s = s.slice(0, -suf[0].length);
    }

    if (s.charAt(0) === '+') s = s.slice(1);
    if (s.charAt(0) === '-') { neg = true; s = s.slice(1); }
    if (!/[0-9]/.test(s)) return null;

    var mode = locale || 'auto';
    var hasComma = s.indexOf(',') > -1;
    var hasDot = s.indexOf('.') > -1;
    var norm;

    if (mode === 'id') {
      norm = s.replace(/\./g, '').replace(/,/g, '.');
    } else if (mode === 'us') {
      norm = s.replace(/,/g, '');
    } else if (hasComma && hasDot) {
      norm = (s.lastIndexOf(',') > s.lastIndexOf('.'))
        ? s.replace(/\./g, '').replace(/,/g, '.')
        : s.replace(/,/g, '');
    } else if (hasComma) {
      var pc = s.split(',');
      if (pc.length > 2) norm = pc.join('');                       // 1,234,567
      else if (pc[1].length === 3) norm = pc.join('');              // 1,234 -> 1234
      else norm = pc.join('.');                                     // 12,5 -> 12.5
    } else if (hasDot) {
      var pd = s.split('.');
      if (pd.length > 2) {
        var tail = pd.slice(1);
        var allThree = true;
        for (var i = 0; i < tail.length; i++) if (tail[i].length !== 3) allThree = false;
        norm = allThree ? pd.join('') : pd.slice(0, -1).join('') + '.' + pd[pd.length - 1];
      } else if (pd[1].length === 3 && pd[0].length <= 3 && pd[0] !== '0') {
        norm = pd.join('');                                         // 1.234 -> 1234
      } else {
        norm = s;                                                   // 12.5 -> 12.5
      }
    } else {
      norm = s;
    }

    if (norm === '' || norm === '.' || norm === '-') return null;
    var v = Number(norm);
    if (!isFinite(v)) return null;
    if (neg) v = -v;
    v *= mult;
    if (pct) v = v / 100 * 100; // "12,5%" -> 12.5 (nilai persen apa adanya)
    return v;
  }

  function isNumericCell(raw) {
    if (raw === null || raw === undefined) return false;
    if (typeof raw === 'number') return true;
    var s = String(raw).trim();
    if (!s) return false;
    return /[0-9]/.test(s) && parseNumber(s, 'auto') !== null;
  }

  /* ---------- format angka untuk tampilan ---------- */

  var idFmt = null;
  try { idFmt = new Intl.NumberFormat('id-ID'); } catch (e) { idFmt = null; }

  function formatNumber(v, opts) {
    opts = opts || {};
    if (v === null || v === undefined || !isFinite(v)) return '–';
    if (opts.compact) return formatCompact(v);
    if (opts.decimals !== undefined) {
      return idFmt ? idFmt.format(Number(v.toFixed(opts.decimals))) : String(Number(v.toFixed(opts.decimals)));
    }
    var abs = Math.abs(v);
    var dec = abs >= 1000 ? 0 : (abs >= 100 ? 1 : (abs >= 1 ? 2 : 3));
    var rounded = Number(v.toFixed(dec));
    return idFmt ? idFmt.format(rounded) : String(rounded);
  }

  function formatCompact(v) {
    if (v === null || v === undefined || !isFinite(v)) return '–';
    var abs = Math.abs(v), sign = v < 0 ? '-' : '';
    function trim(x) {
      var s = x.toFixed(x < 10 ? 1 : (x < 100 ? 1 : 0));
      return s.replace(/\.0$/, '').replace('.', ',');
    }
    if (abs >= 1e12) return sign + trim(abs / 1e12) + ' T';
    if (abs >= 1e9) return sign + trim(abs / 1e9) + ' M';
    if (abs >= 1e6) return sign + trim(abs / 1e6) + ' jt';
    if (abs >= 1e4) return sign + trim(abs / 1e3) + ' rb';
    return formatNumber(v);
  }

  function formatSmart(v, full) {
    if (v === null || v === undefined || !isFinite(v)) return '–';
    if (full) return formatNumber(v);
    if (Math.abs(v) >= 10000) return formatCompact(v);
    return formatNumber(v);
  }

  /* ---------- tabel -> struktur ---------- */

  function parseTable(text, locale) {
    var result = { labels: [], xValues: null, series: [], warnings: [], matrix: [], headerRow: false };

    if (!text || !String(text).trim()) return result;

    var lines = String(text).replace(/\r\n?/g, '\n').split('\n')
      .filter(function (l) { return l.trim() !== '' && l.trim().charAt(0) !== '#'; });
    if (!lines.length) return result;

    var delim = detectDelimiter(lines);
    var matrix = lines.map(function (l) {
      return splitLine(l, delim).map(function (c) { return c.trim(); });
    });

    // seragamkan lebar kolom
    var width = 0;
    matrix.forEach(function (r) { if (r.length > width) width = r.length; });
    if (!width) return result;
    matrix.forEach(function (r) { while (r.length < width) r.push(''); });

    // --- deteksi baris header
    var headerRow = false;
    if (matrix.length >= 2) {
      var nonNum = 0, numBelow = 0;
      for (var c = 0; c < width; c++) {
        if (matrix[0][c] !== '' && !isNumericCell(matrix[0][c])) {
          nonNum++;
          for (var r = 1; r < matrix.length; r++) {
            if (isNumericCell(matrix[r][c])) { numBelow++; break; }
          }
        }
      }
      headerRow = nonNum > 0 && numBelow > 0;
    }

    var header = headerRow ? matrix[0].slice() : null;
    var body = headerRow ? matrix.slice(1) : matrix;
    if (!body.length) return result;

    // --- klasifikasi kolom
    var colIsText = [];
    for (var ci = 0; ci < width; ci++) {
      var filled = 0, text = 0;
      for (var ri = 0; ri < body.length; ri++) {
        var cell = body[ri][ci];
        if (cell === '') continue;
        filled++;
        if (!isNumericCell(cell)) text++;
      }
      colIsText[ci] = filled === 0 ? true : (text / filled) >= 0.5;
    }

    var labelCol = -1;
    if (width >= 2 && colIsText[0]) labelCol = 0;

    var labels = [];
    var xValues = null;

    if (labelCol === 0) {
      for (var r2 = 0; r2 < body.length; r2++) {
        labels.push(body[r2][0] === '' ? String(r2 + 1) : body[r2][0]);
      }
      // kalau label ternyata angka semua, simpan sebagai x numerik (scatter)
      var numericLabels = labels.map(function (l) { return parseNumber(l, locale); });
      if (numericLabels.every(function (n) { return n !== null; })) xValues = numericLabels;
    } else if (width === 1) {
      for (var r3 = 0; r3 < body.length; r3++) labels.push(String(r3 + 1));
    } else {
      // kolom 0 numerik -> jadi sumbu X
      var xs = [];
      var okAll = true;
      for (var r4 = 0; r4 < body.length; r4++) {
        var xv = parseNumber(body[r4][0], locale);
        xs.push(xv);
        if (xv === null) okAll = false;
        labels.push(body[r4][0] === '' ? String(r4 + 1) : body[r4][0]);
      }
      if (okAll) xValues = xs;
    }

    // --- susun seri
    var startCol = labelCol === 0 ? 1 : (width === 1 ? 0 : 1);
    if (width === 1) startCol = 0;

    var series = [];
    for (var c2 = startCol; c2 < width; c2++) {
      if (colIsText[c2]) {
        if (c2 !== labelCol) result.warnings.push('Kolom "' + (header ? header[c2] : 'kolom ' + (c2 + 1)) + '" bukan angka, dilewati.');
        continue;
      }
      var vals = [];
      var nonEmpty = 0;
      for (var r5 = 0; r5 < body.length; r5++) {
        var v = parseNumber(body[r5][c2], locale);
        vals.push(v);
        if (v !== null) nonEmpty++;
      }
      if (!nonEmpty) continue;
      var name = header && header[c2] ? header[c2] : (width === 1 ? 'Nilai' : 'Seri ' + (series.length + 1));
      series.push({ name: name, values: vals });
    }

    // fallback: kalau tidak ada seri sama sekali tapi ada kolom 0 teks+angka aneh
    if (!series.length && labelCol === 0) {
      for (var c3 = 1; c3 < width; c3++) {
        var v2 = [];
        for (var r6 = 0; r6 < body.length; r6++) v2.push(parseNumber(body[r6][c3], locale));
        series.push({ name: header && header[c3] ? header[c3] : 'Seri ' + (series.length + 1), values: v2 });
      }
    }

    result.labels = labels;
    result.xValues = xValues;
    result.series = series;
    result.matrix = matrix;
    result.headerRow = headerRow;
    result.delimiter = delim;
    return result;
  }

  /* ---------- struktur -> teks CSV ---------- */

  function toCSV(data, delimiter) {
    var d = delimiter || ',';
    function q(s) {
      s = s === null || s === undefined ? '' : String(s);
      if (s.indexOf(d) > -1 || s.indexOf('"') > -1 || s.indexOf('\n') > -1 || s.indexOf('\r') > -1) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }
    if (data.matrix && data.matrix.length) {
      return data.matrix.map(function (row) {
        return row.map(q).join(d);
      }).join('\r\n');
    }
    var head = ['Label'].concat(data.series.map(function (s) { return s.name; }));
    var out = [head.map(q).join(d)];
    for (var i = 0; i < data.labels.length; i++) {
      var row = [q(data.labels[i])];
      for (var j = 0; j < data.series.length; j++) {
        var v = data.series[j].values[i];
        row.push(v === null || v === undefined ? '' : String(v).replace('.', ','));
      }
      out.push(row.join(d));
    }
    return out.join('\r\n');
  }

  /* ---------- statistik ---------- */

  function stats(values) {
    var v = values.filter(function (x) { return typeof x === 'number' && isFinite(x); });
    if (!v.length) return null;
    var sorted = v.slice().sort(function (a, b) { return a - b; });
    var n = v.length;
    var sum = v.reduce(function (a, b) { return a + b; }, 0);
    var mean = sum / n;
    var median = n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    var variance = v.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / n;
    return {
      n: n, sum: sum, mean: mean, median: median,
      min: sorted[0], max: sorted[n - 1],
      range: sorted[n - 1] - sorted[0],
      sd: Math.sqrt(variance)
    };
  }

  /** Terapkan pengurutan / transformasi ke struktur data (mengembalikan salinan). */
  function applyOptions(data, opts) {
    var labels = data.labels.slice();
    var series = data.series.map(function (s) { return { name: s.name, values: s.values.slice() }; });
    var xValues = data.xValues ? data.xValues.slice() : null;

    if (opts.sort && opts.sort !== 'none') {
      var order = labels.map(function (_, i) { return i; });
      var key = function (i) {
        var s = 0, c = 0;
        for (var j = 0; j < series.length; j++) {
          var v = series[j].values[i];
          if (typeof v === 'number' && isFinite(v)) { s += v; c++; }
        }
        return c ? s : -Infinity;
      };
      if (opts.sort === 'desc') order.sort(function (a, b) { return key(b) - key(a); });
      else if (opts.sort === 'asc') order.sort(function (a, b) { return key(a) - key(b); });
      else if (opts.sort === 'label') order.sort(function (a, b) { return String(labels[a]).localeCompare(String(labels[b]), 'id'); });

      labels = order.map(function (i) { return labels[i]; });
      series.forEach(function (s) { s.values = order.map(function (i) { return s.values[i]; }); });
      if (xValues) xValues = order.map(function (i) { return xValues[i]; });
    }

    return { labels: labels, series: series, xValues: xValues, warnings: data.warnings || [] };
  }

  /** Ambil maksimum/minimum seluruh seri. */
  function extent(series) {
    var min = Infinity, max = -Infinity, any = false;
    series.forEach(function (s) {
      s.values.forEach(function (v) {
        if (typeof v === 'number' && isFinite(v)) {
          any = true;
          if (v < min) min = v;
          if (v > max) max = v;
        }
      });
    });
    if (!any) return { min: 0, max: 1 };
    return { min: min, max: max };
  }

  /** Skala "cantik" untuk sumbu. */
  function niceScale(min, max, count) {
    count = count || 5;
    if (!isFinite(min) || !isFinite(max)) { min = 0; max = 1; }
    if (min === max) {
      if (min === 0) { min = 0; max = 1; }
      else if (min > 0) { max = min * 1.15; min = Math.min(0, min); }
      else { min = min * 1.15; max = 0; }
    }
    var span = max - min;
    var rawStep = span / count;
    var mag = Math.pow(10, Math.floor(Math.log(rawStep) / Math.LN10));
    var norm = rawStep / mag;
    var step;
    if (norm <= 1) step = 1;
    else if (norm <= 2) step = 2;
    else if (norm <= 2.5) step = 2.5;
    else if (norm <= 5) step = 5;
    else step = 10;
    step *= mag;

    var nmin = Math.floor(min / step) * step;
    var nmax = Math.ceil(max / step) * step;
    var ticks = [];
    var guard = 0;
    for (var v = nmin; v <= nmax + step * 1e-6 && guard < 400; v += step, guard++) {
      ticks.push(Math.abs(v) < step * 1e-9 ? 0 : v);
    }
    return { min: nmin, max: nmax, step: step, ticks: ticks.length ? ticks : [nmin, nmax] };
  }

  global.VisualParse = {
    detectDelimiter: detectDelimiter,
    splitLine: splitLine,
    parseNumber: parseNumber,
    isNumericCell: isNumericCell,
    formatNumber: formatNumber,
    formatCompact: formatCompact,
    formatSmart: formatSmart,
    parseTable: parseTable,
    toCSV: toCSV,
    stats: stats,
    applyOptions: applyOptions,
    extent: extent,
    niceScale: niceScale
  };
})(typeof window !== 'undefined' ? window : globalThis);
