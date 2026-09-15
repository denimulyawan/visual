/* ============================================================
   charts.js — mesin render visual berbasis SVG murni
   Tanpa dependensi eksternal. Semua warna ditulis sebagai atribut
   (bukan CSS halaman) supaya hasil ekspor PNG/SVG tetap benar.
   ============================================================ */
(function (global) {
  'use strict';

  var P = global.VisualParse;
  var NS = 'http://www.w3.org/2000/svg';
  var W = 1000, H = 560;
  var FONT = 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

  /* ---------------- palet warna ---------------- */
  var PALETTES = {
    ocean: { name: 'Samudra', colors: ['#2563eb', '#0ea5e9', '#06b6d4', '#14b8a6', '#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444', '#ec4899'] },
    sunset: { name: 'Senja', colors: ['#f97316', '#fb923c', '#f59e0b', '#eab308', '#ef4444', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1'] },
    forest: { name: 'Rimba', colors: ['#15803d', '#16a34a', '#22c55e', '#4ade80', '#84cc16', '#a3e635', '#65a30d', '#0d9488', '#0f766e', '#059669'] },
    berry: { name: 'Beri', colors: ['#7c3aed', '#8b5cf6', '#a855f7', '#c026d3', '#d946ef', '#ec4899', '#f43f5e', '#e11d48', '#be123c', '#9333ea'] },
    candy: { name: 'Permen', colors: ['#06b6d4', '#38bdf8', '#818cf8', '#a78bfa', '#f472b6', '#fb7185', '#fbbf24', '#34d399', '#60a5fa', '#c084fc'] },
    corporate: {
      name: 'Korporat',
      colors: ['#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#0f766e', '#0d9488', '#14b8a6', '#475569', '#64748b'],
      dark: ['#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#5eead4', '#2dd4bf', '#14b8a6', '#cbd5e1', '#94a3b8']
    },
    mono: {
      name: 'Monokrom',
      colors: ['#0f172a', '#1e293b', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#0ea5e9', '#38bdf8'],
      dark: ['#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#38bdf8', '#0ea5e9', '#a5b4fc', '#f0abfc']
    },
    neon: { name: 'Neon', colors: ['#22d3ee', '#a3e635', '#facc15', '#fb923c', '#f472b6', '#e879f9', '#818cf8', '#2dd4bf', '#4ade80', '#f87171'] }
  };

  function paletteColors(key, dark) {
    var p = PALETTES[key] || PALETTES.ocean;
    return (dark && p.dark) ? p.dark : p.colors;
  }
  function colorAt(i, opts) {
    var c = paletteColors(opts.palette, opts.dark);
    return c[i % c.length];
  }

  /* ---------------- helper SVG ---------------- */
  function el(name, attrs) {
    var e = document.createElementNS(NS, name);
    if (attrs) for (var k in attrs) if (attrs[k] !== null && attrs[k] !== undefined) e.setAttribute(k, attrs[k]);
    return e;
  }
  function add(parent, name, attrs) { var e = el(name, attrs); parent.appendChild(e); return e; }
  function txt(parent, x, y, s, attrs) {
    var t = el('text', attrs);
    t.setAttribute('x', x);
    t.setAttribute('y', y);
    t.textContent = (s === null || s === undefined) ? '' : String(s);
    parent.appendChild(t);
    return t;
  }
  function num(v) { return Math.round(v * 100) / 100; }

  function pol(cx, cy, r, deg) {
    var a = (deg - 90) * Math.PI / 180;
    return [num(cx + r * Math.cos(a)), num(cy + r * Math.sin(a))];
  }
  function wedge(cx, cy, r0, r1, a0, a1) {
    var large = Math.abs(a1 - a0) > 180 ? 1 : 0;
    if (a1 < a0) { var t = a0; a0 = a1; a1 = t; }
    var p0 = pol(cx, cy, r1, a0), p1 = pol(cx, cy, r1, a1);
    if (r0 <= 0.5) {
      return 'M' + cx + ',' + cy + 'L' + p0[0] + ',' + p0[1] +
        'A' + r1 + ',' + r1 + ' 0 ' + large + ' 1 ' + p1[0] + ',' + p1[1] + 'Z';
    }
    var q1 = pol(cx, cy, r0, a1), q0 = pol(cx, cy, r0, a0);
    return 'M' + p0[0] + ',' + p0[1] + 'A' + r1 + ',' + r1 + ' 0 ' + large + ' 1 ' + p1[0] + ',' + p1[1] +
      'L' + q1[0] + ',' + q1[1] + 'A' + r0 + ',' + r0 + ' 0 ' + large + ' 0 ' + q0[0] + ',' + q0[1] + 'Z';
  }
  function roundTopRect(x, y, w, h, r) {
    if (h <= 0.2) h = 0.2;
    r = Math.max(0, Math.min(r, w / 2, h));
    return 'M' + num(x) + ',' + num(y + h) + 'V' + num(y + r) +
      'a' + num(r) + ',' + num(r) + ' 0 0 1 ' + num(r) + ',' + num(-r) +
      'h' + num(w - 2 * r) +
      'a' + num(r) + ',' + num(r) + ' 0 0 1 ' + num(r) + ',' + num(r) +
      'V' + num(y + h) + 'Z';
  }
  function roundRightRect(x, y, w, h, r) {
    if (w <= 0.2) w = 0.2;
    r = Math.max(0, Math.min(r, h / 2, w));
    return 'M' + num(x) + ',' + num(y) +
      'h' + num(w - r) + 'a' + num(r) + ',' + num(r) + ' 0 0 1 ' + num(r) + ',' + num(r) +
      'v' + num(h - 2 * r) + 'a' + num(r) + ',' + num(r) + ' 0 0 1 ' + num(-r) + ',' + num(r) +
      'H' + num(x) + 'Z';
  }

  function hexToRgb(h) {
    h = String(h).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function mix(a, b, t) {
    t = Math.max(0, Math.min(1, t));
    var A = hexToRgb(a), B = hexToRgb(b);
    var r = Math.round(A[0] + (B[0] - A[0]) * t);
    var g = Math.round(A[1] + (B[1] - A[1]) * t);
    var bl = Math.round(A[2] + (B[2] - A[2]) * t);
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }
  function shade(hex, amt) {
    return amt >= 0 ? mix(hex, '#ffffff', amt) : mix(hex, '#000000', -amt);
  }

  function smoothPath(pts, tension) {
    if (!pts.length) return '';
    if (pts.length < 3) return 'M' + pts.map(function (p) { return p[0] + ',' + p[1]; }).join('L');
    var k = tension === undefined ? 0.62 : tension;
    var d = 'M' + num(pts[0][0]) + ',' + num(pts[0][1]);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i];
      var p1 = pts[i];
      var p2 = pts[i + 1];
      var p3 = pts[i + 2] || p2;
      var c1x = p1[0] + (p2[0] - p0[0]) / 6 * k;
      var c1y = p1[1] + (p2[1] - p0[1]) / 6 * k;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6 * k;
      var c2y = p2[1] - (p3[1] - p1[1]) / 6 * k;
      d += 'C' + num(c1x) + ',' + num(c1y) + ' ' + num(c2x) + ',' + num(c2y) + ' ' + num(p2[0]) + ',' + num(p2[1]);
    }
    return d;
  }
  function linePath(pts) {
    if (!pts.length) return '';
    return 'M' + pts.map(function (p) { return num(p[0]) + ',' + num(p[1]); }).join('L');
  }

  /** pecah deret titik menjadi segmen-segmen terpisah (menghormati nilai kosong) */
  function segments(points) {
    var out = [], cur = [];
    points.forEach(function (p) {
      if (p === null) { if (cur.length) { out.push(cur); cur = []; } }
      else cur.push(p);
    });
    if (cur.length) out.push(cur);
    return out;
  }

  function tip(label, name, value, extra) {
    var s = label + '\n' + name + ': ' + value;
    return extra ? s + '\n' + extra : s;
  }

  /* ---------------- kerangka + legenda ---------------- */
  var ANIM_CSS =
    '.a-grow{transform-box:fill-box;transform-origin:bottom;animation:gY .62s cubic-bezier(.22,1,.36,1) both}' +
    '.a-growx{transform-box:fill-box;transform-origin:left;animation:gX .62s cubic-bezier(.22,1,.36,1) both}' +
    '.a-fade{animation:fU .5s cubic-bezier(.22,1,.36,1) both}' +
    '.a-pop{transform-box:fill-box;transform-origin:center;animation:pP .45s cubic-bezier(.22,1,.36,1) both}' +
    '@keyframes gY{from{transform:scaleY(.001)}to{transform:none}}' +
    '@keyframes gX{from{transform:scaleX(.001)}to{transform:none}}' +
    '@keyframes fU{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}' +
    '@keyframes pP{from{opacity:0;transform:scale(.65)}to{opacity:1;transform:none}}';

  function root(opts) {
    var svg = el('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      xmlns: NS,
      'xmlns:xlink': 'http://www.w3.org/1999/xlink',
      preserveAspectRatio: 'xMidYMid meet',
      'font-family': FONT,
      role: 'img'
    });
    if (opts.anim) {
      var st = el('style');
      st.textContent = ANIM_CSS;
      svg.appendChild(st);
    }
    if (opts.title) {
      txt(svg, W / 2, 30, opts.title, {
        'text-anchor': 'middle', 'font-size': 20, 'font-weight': 700, fill: opts.theme.text
      });
    }
    return svg;
  }

  function legendItems(series, opts, prefix) {
    return series.map(function (s, i) {
      return { name: (prefix ? prefix + ' ' : '') + s.name, color: colorAt(i, opts) };
    });
  }

  function legendPlan(items) {
    if (!items.length) return { rows: [], height: 0 };
    var maxW = W - 90;
    var rows = [[]], rowW = 0;
    items.forEach(function (it) {
      var iw = 16 + 8 + String(it.name).length * 6.9 + 22;
      if (rowW + iw > maxW && rows[rows.length - 1].length) { rows.push([]); rowW = 0; }
      rows[rows.length - 1].push(it); rowW += iw;
    });
    return { rows: rows, height: rows.length * 22 };
  }

  function drawLegend(svg, plan, yTop, theme) {
    var y = yTop;
    plan.rows.forEach(function (row) {
      var total = 0;
      row.forEach(function (it) { total += 16 + 8 + String(it.name).length * 6.9 + 22; });
      var x = (W - total) / 2;
      row.forEach(function (it) {
        add(svg, 'rect', { x: num(x), y: num(y - 9), width: 12, height: 12, rx: 3.5, fill: it.color });
        var t = txt(svg, num(x + 19), num(y + 1.5), it.name, { 'font-size': 13, fill: theme.text2 });
        x += 16 + 8 + String(it.name).length * 6.9 + 22;
      });
      y += 22;
    });
  }

  function frame(opts, items, over) {
    over = over || {};
    var svg = root(opts);
    var titleH = opts.title ? 40 : 6;
    var plan = (opts.legend && items && items.length > 1) ? legendPlan(items) : { rows: [], height: 0 };
    var legendH = plan.height ? plan.height + 14 : 0;
    var pad = {
      left: over.left !== undefined ? over.left : 84,
      right: over.right !== undefined ? over.right : 36,
      top: titleH + (over.top || 12),
      bottom: (over.bottom || 64) + legendH
    };
    var f = {
      svg: svg, opts: opts, theme: opts.theme,
      pad: pad, plan: plan,
      plot: { x: pad.left, y: pad.top, w: W - pad.left - pad.right, h: H - pad.top - pad.bottom }
    };
    if (over.drawLegend !== false && plan.height) drawLegend(svg, plan, H - plan.height - 2, opts.theme);
    if (over.caption) {
      txt(svg, 34, H - 12, over.caption, { 'font-size': 12, fill: opts.theme.text3 });
    }
    return f;
  }

  function axisTicksY(f, scale) {
    var th = f.theme, p = f.plot;
    var yFor = function (v) { return p.y + p.h - (v - scale.min) / (scale.max - scale.min) * p.h; };
    if (f.opts.grid) {
      scale.ticks.forEach(function (t) {
        add(f.svg, 'line', {
          x1: p.x, x2: p.x + p.w, y1: num(yFor(t)), y2: num(yFor(t)),
          stroke: th.border, 'stroke-width': 1, 'shape-rendering': 'crispEdges'
        });
      });
    }
    add(f.svg, 'line', { x1: p.x, x2: p.x, y1: p.y, y2: p.y + p.h, stroke: th.borderStrong, 'stroke-width': 1 });
    scale.ticks.forEach(function (t) {
      txt(f.svg, p.x - 11, num(yFor(t) + 4.2), P.formatCompact(t), { 'text-anchor': 'end', 'font-size': 12, fill: th.text3 });
    });
    if (f.opts.yLabel) {
      txt(f.svg, 20, p.y + p.h / 2, f.opts.yLabel, {
        'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 600, fill: th.text2,
        transform: 'rotate(-90 20 ' + num(p.y + p.h / 2) + ')'
      });
    }
    return yFor;
  }

  function axisTicksX(f, scale) {
    var th = f.theme, p = f.plot;
    var xFor = function (v) { return p.x + (v - scale.min) / (scale.max - scale.min) * p.w; };
    if (f.opts.grid) {
      scale.ticks.forEach(function (t) {
        add(f.svg, 'line', {
          x1: num(xFor(t)), x2: num(xFor(t)), y1: p.y, y2: p.y + p.h,
          stroke: th.border, 'stroke-width': 1, 'shape-rendering': 'crispEdges'
        });
      });
    }
    add(f.svg, 'line', { x1: p.x, x2: p.x + p.w, y1: p.y + p.h, y2: p.y + p.h, stroke: th.borderStrong, 'stroke-width': 1 });
    scale.ticks.forEach(function (t) {
      txt(f.svg, num(xFor(t)), p.y + p.h + 20, P.formatCompact(t), { 'text-anchor': 'middle', 'font-size': 12, fill: th.text3 });
    });
    if (f.opts.xLabel) {
      txt(f.svg, p.x + p.w / 2, p.y + p.h + 48, f.opts.xLabel, {
        'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 600, fill: th.text2
      });
    }
    return xFor;
  }

  /* Perencanaan label kategori pada sumbu X: menentukan perlu/tidaknya
     rotasi dan berapa ruang bawah yang harus disediakan. */
  function catLabelPlan(labels, approxW) {
    var n = labels.length || 1;
    var longest = 0;
    labels.forEach(function (l) { longest = Math.max(longest, String(l).length); });
    var band = approxW / Math.max(1, n);
    var rotate = n > 13 || longest > 9 || (longest * 6.9 > band * 0.92);
    var shown = Math.min(longest, 14);
    return { rotate: rotate, shown: shown, below: rotate ? Math.min(78, shown * 4.6) : 0 };
  }

  function bottomPad(plan, hasXLabel) {
    if (plan && plan.rotate) return 24 + plan.below + (hasXLabel ? 28 : 8);
    return hasXLabel ? 66 : 44;
  }

  function xLabelY(f, plan) {
    return f.plot.y + f.plot.h + ((plan && plan.rotate) ? 24 + plan.below + 10 : 48);
  }

  function drawCategoryLabels(f, labels, centers, band, plan) {
    var th = f.theme, p = f.plot;
    plan = plan || catLabelPlan(labels, p.w);
    var y = p.y + p.h + (plan.rotate ? 14 : 20);
    labels.forEach(function (l, i) {
      var s = String(l);
      var t = s.length > plan.shown ? s.slice(0, plan.shown - 1) + '…' : s;
      if (plan.rotate) {
        txt(f.svg, num(centers[i]), num(y), t, {
          'text-anchor': 'end', 'font-size': 11.5, fill: th.text2,
          transform: 'rotate(-42 ' + num(centers[i]) + ' ' + num(y) + ')'
        });
      } else {
        txt(f.svg, num(centers[i]), num(y), t, {
          'text-anchor': 'middle', 'font-size': 12, fill: th.text2
        });
      }
    });
    if (f.opts.xLabel) {
      txt(f.svg, p.x + p.w / 2, num(xLabelY(f, plan)), f.opts.xLabel, {
        'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 600, fill: th.text2
      });
    }
  }

  function valueLabels(f, items) {
    if (!f.opts.values) return;
    items.forEach(function (it) {
      if (!it.show) return;
      txt(f.svg, num(it.x), num(it.y), it.text, {
        'text-anchor': it.anchor || 'middle', 'font-size': 11, 'font-weight': 700,
        fill: it.fill || f.theme.text,
        transform: it.rotate ? 'rotate(' + it.rotate + ' ' + num(it.x) + ' ' + num(it.y) + ')' : null
      });
    });
  }

  var fmt = function (v) { return P.formatNumber(v); };

  /* ============================================================
     BATANG (vertikal) — grouped / stacked / percent
     ============================================================ */
  function chartBar(data, opts) {
    var stacked = opts.barMode === 'stacked' || opts.barMode === 'percent';
    var percent = opts.barMode === 'percent';
    var labels = data.labels, series = data.series;
    var plan = catLabelPlan(labels, W - 120);
    var f = frame(opts, legendItems(series, opts), { bottom: bottomPad(plan, !!opts.xLabel) });
    var p = f.plot, th = f.theme;
    var n = labels.length, m = series.length;

    var totals = [];
    for (var i = 0; i < n; i++) {
      var t = 0, anyV = false;
      for (var j = 0; j < m; j++) {
        var v = series[j].values[i];
        if (typeof v === 'number' && isFinite(v)) { t += v; anyV = true; }
      }
      totals.push(anyV && percent && t !== 0 ? t : (anyV ? t : null));
    }

    var lo = 0, hi = 0;
    if (stacked && !percent) {
      for (var k = 0; k < n; k++) { var tt = 0; for (var q = 0; q < m; q++) { var vv = series[q].values[k]; if (typeof vv === 'number' && isFinite(vv)) tt += vv; } if (tt > hi) hi = tt; if (tt < lo) lo = tt; }
    } else if (percent) {
      hi = 100; lo = 0;
    } else {
      var ex = P.extent(series); lo = Math.min(0, ex.min); hi = ex.max;
    }
    var scale = P.niceScale(lo, hi === lo ? lo + 1 : hi, 5);

    var yFor = axisTicksY(f, scale);

    var band = p.w / n;
    var inner = band * 0.2;
    var usable = band - inner;
    var barW = stacked ? usable : usable / m;
    var radius = Math.min(6, barW * 0.28);

    var centers = [];
    for (var c = 0; c < n; c++) centers.push(p.x + band * c + band / 2);
    drawCategoryLabels(f, labels, centers, band, plan);

    for (var ci = 0; ci < n; ci++) {
      var baseX = p.x + band * ci + inner / 2;
      var acc = 0;
      for (var si = 0; si < m; si++) {
        var val = series[si].values[ci];
        if (typeof val !== 'number' || !isFinite(val)) continue;
        var drawVal = val;
        if (percent) {
          var tot = totals[ci];
          drawVal = tot ? (val / tot) * 100 : 0;
        }
        var color = colorAt(si, opts);
        var x, yTop, hgt;
        if (stacked) {
          x = baseX;
          var y0 = yFor(acc);
          var y1 = yFor(acc + drawVal);
          yTop = Math.min(y0, y1); hgt = Math.abs(y1 - y0);
          acc += drawVal;
        } else {
          x = baseX + si * barW;
          yTop = Math.min(yFor(0), yFor(val));
          hgt = Math.abs(yFor(val) - yFor(0));
        }
        var g = add(f.svg, 'g', { class: opts.anim ? 'a-grow' : null });
        if (opts.anim) g.setAttribute('style', 'animation-delay:' + Math.min(600, ci * 28 + si * 40) + 'ms');
        var path = add(g, 'path', {
          d: roundTopRect(x, yTop, Math.max(0.6, barW - (stacked ? 0 : barW * 0.14)), hgt, radius),
          fill: color
        });
        path.setAttribute('data-tip', tip(labels[ci], series[si].name, fmt(val)) + (percent ? '\n' + P.formatNumber((val / (totals[ci] || 1)) * 100) + '% dari total' : ''));
        path.style.cursor = 'pointer';

        if (opts.values) {
          var showTxt = percent ? (Math.round((val / (totals[ci] || 1)) * 1000) / 10) + '%' : P.formatSmart(val, opts.numMode === 'full');
          var small = barW < 46 || hgt < 20;
          if (stacked && hgt < 16 && !percent) { /* lewati label sempit */ }
          else {
            if (stacked) {
              txt(f.svg, num(x + barW / 2), num(yTop + hgt / 2 + 4), showTxt, {
                'text-anchor': 'middle', 'font-size': small ? 9.5 : 11, 'font-weight': 700, fill: '#ffffff'
              });
            } else {
              txt(f.svg, num(x + (barW * 0.86) / 2), num(yTop - 6), showTxt, {
                'text-anchor': 'middle', 'font-size': small ? 9.5 : 11, 'font-weight': 700, fill: th.text,
                transform: barW < 34 ? 'rotate(-90 ' + num(x + barW / 2) + ' ' + num(yTop - 6) + ')' : null
              });
            }
          }
        }
      }
    }
    return { svg: f.svg, name: 'Diagram Batang' + (percent ? ' (100%)' : (stacked ? ' Bertumpuk' : '')) };
  }

  /* ============================================================
     BATANG HORIZONTAL
     ============================================================ */
  function chartHBar(data, opts) {
    var labels = data.labels, series = data.series;
    var longest = 0;
    labels.forEach(function (l) { longest = Math.max(longest, String(l).length); });
    var left = Math.max(90, Math.min(260, longest * 7.6 + 24));
    var f = frame(opts, legendItems(series, opts), { left: left, bottom: bottomPad(null, !!opts.xLabel) });
    var p = f.plot, th = f.theme;
    var n = labels.length, m = series.length;
    var ex = P.extent(series);
    var scale = P.niceScale(Math.min(0, ex.min), ex.max === Math.min(0, ex.min) ? ex.min + 1 : ex.max, 5);
    var xFor = function (v) { return p.x + (v - scale.min) / (scale.max - scale.min) * p.w; };

    if (opts.grid) {
      scale.ticks.forEach(function (t) {
        add(f.svg, 'line', { x1: num(xFor(t)), x2: num(xFor(t)), y1: p.y, y2: p.y + p.h, stroke: th.border, 'stroke-width': 1, 'shape-rendering': 'crispEdges' });
      });
    }
    add(f.svg, 'line', { x1: p.x, x2: p.x, y1: p.y, y2: p.y + p.h, stroke: th.borderStrong, 'stroke-width': 1 });
    scale.ticks.forEach(function (t) {
      txt(f.svg, num(xFor(t)), p.y + p.h + 20, P.formatCompact(t), { 'text-anchor': 'middle', 'font-size': 12, fill: th.text3 });
    });
    if (opts.xLabel) txt(f.svg, p.x + p.w / 2, p.y + p.h + 48, opts.xLabel, { 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 600, fill: th.text2 });
    if (opts.yLabel) txt(f.svg, 20, p.y + p.h / 2, opts.yLabel, { 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 600, fill: th.text2, transform: 'rotate(-90 20 ' + num(p.y + p.h / 2) + ')' });

    var band = p.h / n;
    var inner = band * 0.22;
    var barH = (band - inner) / m;
    var zero = xFor(0);
    var radius = Math.min(6, barH * 0.28);

    for (var i = 0; i < n; i++) {
      var cy = p.y + band * i + band / 2;
      txt(f.svg, p.x - 12, num(cy + 4.2), String(labels[i]).length > 26 ? String(labels[i]).slice(0, 25) + '…' : String(labels[i]), {
        'text-anchor': 'end', 'font-size': 12, fill: th.text2
      });
      for (var j = 0; j < m; j++) {
        var v = series[j].values[i];
        if (typeof v !== 'number' || !isFinite(v)) continue;
        var y = p.y + band * i + inner / 2 + j * barH;
        var x0 = xFor(0), x1 = xFor(v);
        var rx = Math.min(x0, x1), rw = Math.abs(x1 - x0);
        var g = add(f.svg, 'g', { class: opts.anim ? 'a-growx' : null });
        if (opts.anim) g.setAttribute('style', 'animation-delay:' + Math.min(600, i * 26 + j * 40) + 'ms');
        var bar = add(g, 'path', {
          d: roundRightRect(rx, y, Math.max(0.6, rw), Math.max(0.6, barH - (m > 1 ? barH * 0.12 : barH * 0.1)), radius),
          fill: colorAt(j, opts)
        });
        bar.setAttribute('data-tip', tip(labels[i], series[j].name, fmt(v)));
        bar.style.cursor = 'pointer';
        if (opts.values) {
          txt(f.svg, num(x1 + 8), num(y + barH / 2 + 4), P.formatSmart(v, opts.numMode === 'full'), {
            'text-anchor': 'start', 'font-size': 11, 'font-weight': 700, fill: th.text
          });
        }
      }
    }
    return { svg: f.svg, name: 'Diagram Batang Horizontal' };
  }

  /* ============================================================
     GARIS & AREA
     ============================================================ */
  function chartLine(data, opts) {
    var area = opts._area === true;
    var stackedArea = area && (opts.barMode === 'stacked' || opts.barMode === 'percent');
    var labels = data.labels, series = data.series, xv = data.xValues;
    var n = labels.length, m = series.length;
    var numericX = !!(xv && xv.length === n);
    var plan = numericX ? null : catLabelPlan(labels, W - 120);
    var f = frame(opts, legendItems(series, opts), { bottom: bottomPad(plan, !!opts.xLabel) });
    var p = f.plot, th = f.theme;

    var xs = [];
    if (numericX) {
      var xmin = Math.min.apply(null, xv), xmax = Math.max.apply(null, xv);
      if (xmin === xmax) { xmin -= 0.5; xmax += 0.5; }
      var xscale = P.niceScale(xmin, xmax, 6);
      for (var i = 0; i < n; i++) xs.push(p.x + (xv[i] - xscale.min) / (xscale.max - xscale.min) * p.w);
      axisTicksX(f, xscale);
      if (opts.xLabel) txt(f.svg, p.x + p.w / 2, p.y + p.h + 48, opts.xLabel, { 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 600, fill: th.text2 });
    } else {
      var step = n > 1 ? p.w / (n - 1) : 0;
      if (n === 1) { for (var a = 0; a < n; a++) xs.push(p.x + p.w / 2); }
      else { for (var b = 0; b < n; b++) xs.push(p.x + step * b); }
      drawCategoryLabels(f, labels, xs, n > 1 ? step : p.w, plan);
    }

    // hitung nilai untuk area bertumpuk
    var seriesValues = series.map(function (s) { return s.values.slice(); });
    if (stackedArea) {
      var accs = new Array(n).fill(0);
      var totals = new Array(n).fill(0);
      if (opts.barMode === 'percent') {
        for (var c = 0; c < n; c++) {
          var t = 0;
          for (var d = 0; d < m; d++) { var v = series[d].values[c]; if (typeof v === 'number' && isFinite(v)) t += v; }
          totals[c] = t || 1;
        }
      }
      for (var e = 0; e < m; e++) {
        for (var g2 = 0; g2 < n; g2++) {
          var val = series[e].values[g2];
          if (typeof val !== 'number' || !isFinite(val)) { seriesValues[e][g2] = null; continue; }
          var dv = opts.barMode === 'percent' ? (val / totals[g2]) * 100 : val;
          accs[g2] += dv;
          seriesValues[e][g2] = accs[g2];
        }
      }
    }

    var allVals = [];
    seriesValues.forEach(function (s) { s.forEach(function (v) { allVals.push(v); }); });
    var lo = Math.min.apply(null, allVals.concat([0]).filter(function (v) { return typeof v === 'number' && isFinite(v); }));
    var hi = Math.max.apply(null, allVals.concat([0]).filter(function (v) { return typeof v === 'number' && isFinite(v); }));
    if (!area) lo = Math.min(0, lo);
    var scale = P.niceScale(lo, hi === lo ? lo + 1 : hi, 5);
    var yFor = axisTicksY(f, scale);

    // area
    if (area) {
      for (var s2 = m - 1; s2 >= 0; s2--) {
        var pts = [];
        for (var h2 = 0; h2 < n; h2++) {
          var vv = seriesValues[s2][h2];
          pts.push(typeof vv === 'number' && isFinite(vv) ? [xs[h2], yFor(vv)] : null);
        }
        var segs = segments(pts);
        var basePts = null;
        if (stackedArea) {
          basePts = [];
          for (var h3 = 0; h3 < n; h3++) {
            var bv = s2 === 0 ? 0 : seriesValues[s2 - 1][h3];
            basePts.push(typeof bv === 'number' && isFinite(bv) ? [xs[h3], yFor(bv)] : [xs[h3], yFor(0)]);
          }
        }
        var color = colorAt(s2, opts);
        segs.forEach(function (sg) {
          var top = (opts.smooth && sg.length > 2) ? smoothPath(sg) : linePath(sg);
          var d;
          if (stackedArea && basePts && segs.length === 1) {
            var rev = basePts.slice().reverse();
            d = top + 'L' + rev.map(function (q) { return num(q[0]) + ',' + num(q[1]); }).join('L') + 'Z';
          } else {
            var zeroY = num(yFor(stackedArea ? 0 : Math.max(scale.min, 0)));
            d = top + 'L' + num(sg[sg.length - 1][0]) + ',' + zeroY +
              'L' + num(sg[0][0]) + ',' + zeroY + 'Z';
          }
          add(f.svg, 'path', {
            d: d, fill: color, 'fill-opacity': stackedArea ? 0.92 : 0.24,
            stroke: 'none', class: opts.anim ? 'a-fade' : null
          });
        });
      }
    }

    // garis + titik
    for (var s3 = 0; s3 < m; s3++) {
      var color3 = colorAt(s3, opts);
      var pts3 = [];
      for (var h4 = 0; h4 < n; h4++) {
        var v3 = seriesValues[s3][h4];
        pts3.push(typeof v3 === 'number' && isFinite(v3) ? [xs[h4], yFor(v3)] : null);
      }
      segments(pts3).forEach(function (sg) {
        var d = (opts.smooth && sg.length > 2) ? smoothPath(sg) : linePath(sg);
        add(f.svg, 'path', {
          d: d, fill: 'none', stroke: color3,
          'stroke-width': opts.stroke || 2.5,
          'stroke-linecap': 'round', 'stroke-linejoin': 'round'
        });
      });
      pts3.forEach(function (pt, idx) {
        if (!pt) return;
        var c = add(f.svg, 'circle', {
          cx: num(pt[0]), cy: num(pt[1]), r: m > 4 ? 3.4 : 4.6,
          fill: color3, stroke: th.surface, 'stroke-width': 2, class: opts.anim ? 'a-pop' : null
        });
        if (opts.anim) c.setAttribute('style', 'animation-delay:' + Math.min(700, idx * 22) + 'ms');
        c.setAttribute('data-tip', tip(labels[idx], series[s3].name, fmt(series[s3].values[idx])));
        c.style.cursor = 'pointer';
        if (opts.values && n <= 24) {
          var orig = series[s3].values[idx];
          txt(f.svg, num(pt[0]), num(pt[1] - 12), P.formatSmart(orig, opts.numMode === 'full'), {
            'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 700, fill: th.text
          });
        }
      });
    }
    return { svg: f.svg, name: area ? (stackedArea ? 'Diagram Area Bertumpuk' : 'Diagram Area') : 'Diagram Garis' };
  }

  /* ============================================================
     PIE & DONUT
     ============================================================ */
  function chartPieDonut(data, opts, donut) {
    var values = data.series[0] ? data.series[0].values : [];
    var labels = data.labels;
    var pairs = [];
    for (var i = 0; i < labels.length; i++) {
      var v = values[i];
      if (typeof v === 'number' && isFinite(v) && v > 0) pairs.push({ label: labels[i], value: v, idx: i });
    }
    var f = frame(opts, null, { drawLegend: false, bottom: 30 });
    var th = f.theme;
    var total = pairs.reduce(function (a, b) { return a + b.value; }, 0);
    var cx = f.plot.x + f.plot.w * 0.33, cy = f.plot.y + f.plot.h * 0.5;
    var R = Math.min(f.plot.w * 0.28, f.plot.h * 0.45);
    var r0 = donut ? R * 0.58 : 0;

    if (!total) {
      txt(f.svg, W / 2, H / 2, 'Tidak ada nilai positif untuk digambar', { 'text-anchor': 'middle', 'font-size': 15, fill: th.text3 });
      return { svg: f.svg, name: donut ? 'Diagram Donat' : 'Diagram Pie' };
    }

    var a = 0;
    var legend = [];
    pairs.forEach(function (pr, i) {
      var sweep = pr.value / total * 360;
      var color = colorAt(pr.idx, opts);
      var g = add(f.svg, 'g', { class: opts.anim ? 'a-pop' : null });
      if (opts.anim) g.setAttribute('style', 'transform-origin:center;animation-delay:' + i * 55 + 'ms');
      var path = add(g, 'path', {
        d: wedge(cx, cy, r0, R, a, a + sweep - (pairs.length > 1 ? 0.6 : 0)),
        fill: color, stroke: th.surface, 'stroke-width': 2.5
      });
      path.setAttribute('data-tip', tip(pr.label, data.series[0].name, fmt(pr.value), P.formatNumber(pr.value / total * 100, { decimals: 1 }) + '% dari total'));
      path.style.cursor = 'pointer';
      legend.push({ name: pr.label, color: color, value: pr.value });
      a += sweep;
    });

    if (donut) {
      txt(f.svg, cx, cy - 2, P.formatCompact(total), { 'text-anchor': 'middle', 'font-size': 26, 'font-weight': 700, fill: th.text });
      txt(f.svg, cx, cy + 20, 'Total', { 'text-anchor': 'middle', 'font-size': 12.5, fill: th.text2 });
    }

    // legenda kanan (label + nilai + %)
    var lx = cx + R + 44;
    var count = Math.min(legend.length, 14);
    var ly = cy - (count - 1) * 11;
    legend.slice(0, 14).forEach(function (it, i) {
      var y = ly + i * 22;
      add(f.svg, 'rect', { x: num(lx), y: num(y - 9), width: 12, height: 12, rx: 3.5, fill: it.color });
      txt(f.svg, num(lx + 19), num(y + 1.5), String(it.name).length > 16 ? String(it.name).slice(0, 15) + '…' : String(it.name), { 'font-size': 12.5, fill: th.text2 });
      txt(f.svg, num(lx + 152), num(y + 1.5), P.formatCompact(it.value) + ' · ' + Math.round(it.value / total * 1000) / 10 + '%', { 'font-size': 11.5, fill: th.text3 });
    });
    if (legend.length > 14) {
      txt(f.svg, num(lx), num(ly + 14 * 22 + 1.5), '+ ' + (legend.length - 14) + ' lainnya', { 'font-size': 11.5, fill: th.text3 });
    }

    return { svg: f.svg, name: donut ? 'Diagram Donat' : 'Diagram Pie' };
  }

  /* ============================================================
     RADAR
     ============================================================ */
  function chartRadar(data, opts) {
    var labels = data.labels, series = data.series;
    var f = frame(opts, legendItems(series, opts));
    var p = f.plot, th = f.theme;
    var n = labels.length, m = series.length;
    var cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    var R = Math.min(p.w, p.h) * 0.40;

    if (n < 3) {
      txt(f.svg, cx, cy, 'Radar butuh minimal 3 kategori', { 'text-anchor': 'middle', 'font-size': 15, fill: th.text3 });
      return { svg: f.svg, name: 'Diagram Radar' };
    }
    var ex = P.extent(series);
    var maxV = Math.max(ex.max, 0.0001);
    var minV = Math.min(0, ex.min);
    var scale = P.niceScale(minV, maxV, 4);
    var rFor = function (v) { return (v - scale.min) / (scale.max - scale.min) * R; };

    // cincin
    scale.ticks.forEach(function (t) {
      var rr = rFor(t);
      if (rr <= 0) return;
      var pts = [];
      for (var i = 0; i < n; i++) pts.push(pol(cx, cy, rr, i * 360 / n));
      add(f.svg, 'path', {
        d: 'M' + pts.map(function (q) { return q[0] + ',' + q[1]; }).join('L') + 'Z',
        fill: 'none', stroke: th.border, 'stroke-width': 1
      });
      txt(f.svg, num(cx + 4), num(cy - rr + 3), P.formatCompact(t), { 'font-size': 10, fill: th.text3 });
    });
    // sumbu
    for (var i2 = 0; i2 < n; i2++) {
      var e2 = pol(cx, cy, R, i2 * 360 / n);
      add(f.svg, 'line', { x1: cx, y1: cy, x2: e2[0], y2: e2[1], stroke: th.border, 'stroke-width': 1 });
      var lp = pol(cx, cy, R + 22, i2 * 360 / n);
      var anchor = Math.abs(lp[0] - cx) < 12 ? 'middle' : (lp[0] > cx ? 'start' : 'end');
      var s = String(labels[i2]);
      txt(f.svg, num(lp[0]), num(lp[1] + 4), s.length > 14 ? s.slice(0, 13) + '…' : s, { 'text-anchor': anchor, 'font-size': 11.5, fill: th.text2 });
    }

    for (var si = 0; si < m; si++) {
      var color = colorAt(si, opts);
      var pts3 = [];
      for (var j = 0; j < n; j++) {
        var v = series[si].values[j];
        var rr2 = (typeof v === 'number' && isFinite(v)) ? Math.max(0, rFor(v)) : 0;
        pts3.push(pol(cx, cy, rr2, j * 360 / n));
      }
      var g = add(f.svg, 'g', { class: opts.anim ? 'a-pop' : null });
      if (opts.anim) g.setAttribute('style', 'animation-delay:' + si * 90 + 'ms');
      add(g, 'path', {
        d: 'M' + pts3.map(function (q) { return q[0] + ',' + q[1]; }).join('L') + 'Z',
        fill: color, 'fill-opacity': m > 3 ? 0.16 : 0.24,
        stroke: color, 'stroke-width': opts.stroke || 2.5, 'stroke-linejoin': 'round'
      });
      pts3.forEach(function (q, j2) {
        if (typeof series[si].values[j2] !== 'number') return;
        var c = add(g, 'circle', { cx: q[0], cy: q[1], r: 3.6, fill: color, stroke: th.surface, 'stroke-width': 1.6 });
        c.setAttribute('data-tip', tip(labels[j2], series[si].name, fmt(series[si].values[j2])));
        c.style.cursor = 'pointer';
      });
    }
    return { svg: f.svg, name: 'Diagram Radar' };
  }

  /* ============================================================
     SCATTER & BUBBLE
     ============================================================ */
  function chartScatter(data, opts, bubble) {
    var labels = data.labels, series = data.series, xv = data.xValues;
    var numericX = !!(xv && xv.length === labels.length);
    var inset = bubble ? 42 : 0; // ruang untuk gelembung terbesar agar tidak terpotong
    var f = frame(opts, legendItems(bubble ? series.slice(0, 1) : series, opts), {
      left: 84 + inset, right: 36 + inset,
      bottom: bottomPad(null, !!(opts.xLabel || !numericX)) + (numericX ? 0 : 22)
    });
    var p = f.plot, th = f.theme;
    var n = labels.length;

    var xsRaw = xv && xv.length === n ? xv : labels.map(function (_, i) { return i + 1; });
    var ys = series.map(function (s) { return s.values; });
    var yFlat = [];
    ys.forEach(function (a) { a.forEach(function (v) { if (typeof v === 'number' && isFinite(v)) yFlat.push(v); }); });
    var xMin = Math.min.apply(null, xsRaw), xMax = Math.max.apply(null, xsRaw);
    if (xMin === xMax) { xMin -= 1; xMax += 1; }
    var yMin = Math.min.apply(null, yFlat.concat([0])), yMax = Math.max.apply(null, yFlat);

    var xs2 = P.niceScale(xMin, xMax, 6);
    var ysc = P.niceScale(Math.min(0, yMin), yMax === yMin ? yMin + 1 : yMax, 5);
    var xFor = axisTicksX(f, xs2);
    var yFor = axisTicksY(f, ysc);

    var sizes = null;
    if (bubble && series.length > 1) {
      sizes = series[1].values;
      var sMax = Math.max.apply(null, sizes.filter(function (v) { return typeof v === 'number' && isFinite(v); }).concat([1]));
      sizes = sizes.map(function (v) { return typeof v === 'number' && isFinite(v) ? Math.sqrt(Math.max(0, v) / sMax) : 0; });
    }

    var maxSeries = bubble ? 1 : series.length;
    for (var s = 0; s < maxSeries; s++) {
      var color = colorAt(s, opts);
      for (var i = 0; i < n; i++) {
        var y = series[s].values[i];
        if (typeof y !== 'number' || !isFinite(y)) continue;
        var x = xsRaw[i];
        if (typeof x !== 'number' || !isFinite(x)) continue;
        var r = bubble ? 6 + (sizes ? sizes[i] * 34 : 8) : (n > 60 ? 4 : 6);
        var c = add(f.svg, 'circle', {
          cx: num(xFor(x)), cy: num(yFor(y)), r: num(r),
          fill: color, 'fill-opacity': bubble ? 0.5 : 0.75,
          stroke: color, 'stroke-width': 1.6,
          class: opts.anim ? 'a-pop' : null
        });
        if (opts.anim) c.setAttribute('style', 'animation-delay:' + Math.min(700, i * 18) + 'ms');
        var extra = sizes && series[1] ? series[1].name + ': ' + fmt(series[1].values[i]) : null;
        c.setAttribute('data-tip', tip('X: ' + P.formatNumber(x), series[s].name, fmt(y), extra));
        c.style.cursor = 'pointer';
        if (opts.values && n <= 20) {
          txt(f.svg, num(xFor(x)), num(yFor(y) - r - 5), String(labels[i]), { 'text-anchor': 'middle', 'font-size': 10, fill: th.text2 });
        }
      }
    }
    if (!numericX) {
      txt(f.svg, p.x + p.w / 2, num(xLabelY(f, null) + (opts.xLabel ? 20 : 0)),
        'Sumbu X memakai urutan baris. Tambahkan kolom angka pertama untuk sumbu X nyata.',
        { 'text-anchor': 'middle', 'font-size': 11, fill: th.text3 });
    }
    return { svg: f.svg, name: bubble ? 'Diagram Gelembung' : 'Diagram Sebaran' };
  }

  /* ============================================================
     HEATMAP
     ============================================================ */
  function chartHeatmap(data, opts) {
    var labels = data.labels, series = data.series;
    var plan = catLabelPlan(labels, W - 170);
    var f = frame(opts, null, { left: 128, bottom: bottomPad(plan, true) });
    var p = f.plot, th = f.theme;
    var n = labels.length, m = series.length;
    var cw = p.w / n, ch = p.h / m;
    var ex = P.extent(series);
    var base = paletteColors(opts.palette, opts.dark)[0];
    var lowColor = opts.dark ? th.surface2 : '#eef3fb';
    var span = (ex.max - ex.min) || 1;

    for (var j = 0; j < m; j++) {
      txt(f.svg, p.x - 12, num(p.y + ch * j + ch / 2 + 4), String(series[j].name).length > 16 ? String(series[j].name).slice(0, 15) + '…' : series[j].name, {
        'text-anchor': 'end', 'font-size': 12, fill: th.text2
      });
      for (var i = 0; i < n; i++) {
        var v = series[j].values[i];
        var t = (typeof v === 'number' && isFinite(v)) ? (v - ex.min) / span : null;
        var rect = add(f.svg, 'rect', {
          x: num(p.x + cw * i + 1.5), y: num(p.y + ch * j + 1.5),
          width: num(Math.max(1, cw - 3)), height: num(Math.max(1, ch - 3)), rx: 5,
          fill: t === null ? (opts.dark ? th.surface3 : '#f1f5fb') : mix(lowColor, base, 0.12 + t * 0.88),
          class: opts.anim ? 'a-fade' : null
        });
        if (opts.anim) rect.setAttribute('style', 'animation-delay:' + Math.min(600, (i + j) * 26) + 'ms');
        if (t !== null) {
          rect.setAttribute('data-tip', tip(labels[i], series[j].name, fmt(v)));
          rect.style.cursor = 'pointer';
        }
        if (opts.values && cw > 54 && ch > 26 && t !== null) {
          txt(f.svg, num(p.x + cw * i + cw / 2), num(p.y + ch * j + ch / 2 + 4), P.formatCompact(v), {
            'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 700,
            fill: t > 0.55 ? '#ffffff' : th.text
          });
        }
      }
    }
    drawCategoryLabels(f, labels, labels.map(function (_, i) { return p.x + cw * i + cw / 2; }), cw, plan);

    // skala warna (di bawah, rata kanan agar tidak bertabrakan dengan label sumbu X)
    var bw = Math.min(220, p.w * 0.3);
    var bx = p.x + p.w - bw, by = xLabelY(f, plan);
    txt(f.svg, bx, num(by - 7), P.formatCompact(ex.min), { 'font-size': 10.5, fill: th.text3 });
    txt(f.svg, num(bx + bw), num(by - 7), P.formatCompact(ex.max), { 'text-anchor': 'end', 'font-size': 10.5, fill: th.text3 });
    for (var k = 0; k < 40; k++) {
      add(f.svg, 'rect', {
        x: num(bx + bw * k / 40), y: num(by), width: num(bw / 40 + 0.6), height: 9,
        fill: mix(lowColor, base, 0.12 + (k / 40) * 0.88)
      });
    }
    return { svg: f.svg, name: 'Peta Panas (Heatmap)' };
  }

  /* ============================================================
     TREEMAP
     ============================================================ */
  function chartTreemap(data, opts) {
    var labels = data.labels;
    var vals = data.series[0] ? data.series[0].values : [];
    var items = [];
    for (var i = 0; i < labels.length; i++) {
      var v = vals[i];
      if (typeof v === 'number' && isFinite(v) && v > 0) items.push({ label: labels[i], value: v, idx: i });
    }
    items.sort(function (a, b) { return b.value - a.value; });
    var f = frame(opts, null, { left: 26, right: 26, bottom: 22 });
    var p = f.plot, th = f.theme;
    if (!items.length) {
      txt(f.svg, W / 2, H / 2, 'Tidak ada nilai positif untuk digambar', { 'text-anchor': 'middle', 'font-size': 15, fill: th.text3 });
      return { svg: f.svg, name: 'Treemap' };
    }
    var total = items.reduce(function (a, b) { return a + b.value; }, 0);
    var rects = squarify(items, p.x, p.y, p.w, p.h);
    rects.forEach(function (r, i) {
      var color = colorAt(i, opts);
      var g = add(f.svg, 'g', { class: opts.anim ? 'a-fade' : null });
      if (opts.anim) g.setAttribute('style', 'animation-delay:' + Math.min(650, i * 28) + 'ms');
      var rect = add(g, 'rect', {
        x: num(r.x + 1.5), y: num(r.y + 1.5), width: num(Math.max(1, r.w - 3)), height: num(Math.max(1, r.h - 3)),
        rx: 6, fill: color, stroke: th.surface, 'stroke-width': 1
      });
      rect.setAttribute('data-tip', tip(r.item.label, data.series[0].name, fmt(r.item.value), P.formatNumber(r.item.value / total * 100, { decimals: 1 }) + '% dari total'));
      rect.style.cursor = 'pointer';
      if (r.w > 62 && r.h > 34) {
        txt(g, num(r.x + 10), num(r.y + 22), String(r.item.label).length > Math.floor(r.w / 7.4) ? String(r.item.label).slice(0, Math.max(3, Math.floor(r.w / 7.4) - 1)) + '…' : String(r.item.label), {
          'font-size': 12.5, 'font-weight': 700, fill: '#ffffff'
        });
        txt(g, num(r.x + 10), num(r.y + 40), P.formatCompact(r.item.value) + '  (' + Math.round(r.item.value / total * 1000) / 10 + '%)', {
          'font-size': 11, fill: 'rgba(255,255,255,.85)'
        });
      }
    });
    return { svg: f.svg, name: 'Treemap' };
  }

  function squarify(items, x, y, w, h) {
    var total = items.reduce(function (a, b) { return a + b.value; }, 0);
    var scale = (w * h) / total;
    var queue = items.map(function (it) { return { item: it, area: it.value * scale }; });
    var out = [];
    var cx = x, cy = y, cw = w, ch = h;
    var row = [];

    function worst(r, side) {
      var sum = 0, mx = -Infinity, mn = Infinity;
      r.forEach(function (e) { sum += e.area; if (e.area > mx) mx = e.area; if (e.area < mn) mn = e.area; });
      if (!sum || mn === Infinity) return Infinity;
      return Math.max((side * side * mx) / (sum * sum), (sum * sum) / (side * side * mn));
    }
    function flush() {
      var sum = row.reduce(function (a, b) { return a + b.area; }, 0);
      if (cw >= ch) {
        var rh = sum / cw;
        var ox = cx;
        row.forEach(function (e) {
          var rw = e.area / rh;
          out.push({ x: ox, y: cy, w: rw, h: rh, item: e.item });
          ox += rw;
        });
        cy += rh; ch -= rh;
      } else {
        var rw2 = sum / ch;
        var oy = cy;
        row.forEach(function (e) {
          var rh2 = e.area / rw2;
          out.push({ x: cx, y: oy, w: rw2, h: rh2, item: e.item });
          oy += rh2;
        });
        cx += rw2; cw -= rw2;
      }
      row = [];
    }

    for (var i = 0; i < queue.length; i++) {
      var side = Math.min(cw, ch);
      if (!row.length) { row.push(queue[i]); continue; }
      if (worst(row.concat([queue[i]]), side) <= worst(row, side)) row.push(queue[i]);
      else { flush(); row.push(queue[i]); }
    }
    if (row.length) flush();
    return out;
  }

  /* ============================================================
     GAUGE
     ============================================================ */
  function chartGauge(data, opts) {
    var labels = data.labels, series = data.series;
    var f = frame(opts, null, { bottom: 30 });
    var th = f.theme;
    var vals = series[0] ? series[0].values : [];
    var last = null, lastIdx = -1;
    for (var i = vals.length - 1; i >= 0; i--) { if (typeof vals[i] === 'number' && isFinite(vals[i])) { last = vals[i]; lastIdx = i; break; } }
    if (last === null) {
      txt(f.svg, W / 2, H / 2, 'Tidak ada nilai untuk digambar', { 'text-anchor': 'middle', 'font-size': 15, fill: th.text3 });
      return { svg: f.svg, name: 'Gauge' };
    }
    var target = null;
    if (series[1]) {
      var tv = series[1].values;
      for (var j = tv.length - 1; j >= 0; j--) { if (typeof tv[j] === 'number' && isFinite(tv[j])) { target = tv[j]; break; } }
    }
    var maxV = target !== null ? target : P.niceScale(0, last, 4).max;
    if (!maxV || maxV <= 0) maxV = Math.max(1, last);
    var pct = Math.max(0, Math.min(1.35, last / maxV));

    var cx = W / 2, cy = f.plot.y + f.plot.h * 0.60;
    var R = Math.min(f.plot.w * 0.30, f.plot.h * 0.52);
    var A0 = -128, A1 = 128;
    var color = colorAt(0, opts);
    var track = opts.dark ? th.surface3 : '#e8eef8';
    var sw = R * 0.22;

    add(f.svg, 'path', {
      d: arcStroke(cx, cy, R, A0, A1), fill: 'none', stroke: track,
      'stroke-width': sw, 'stroke-linecap': 'round'
    });
    var endA = A0 + (A1 - A0) * Math.min(1, pct);
    var arc = add(f.svg, 'path', {
      d: arcStroke(cx, cy, R, A0, endA), fill: 'none', stroke: color,
      'stroke-width': sw, 'stroke-linecap': 'round'
    });
    arc.setAttribute('data-tip', tip(labels[lastIdx] || series[0].name, series[0].name, fmt(last), 'Target: ' + fmt(maxV)));
    arc.style.cursor = 'pointer';

    // jarum
    var nEnd = pol(cx, cy, R * 0.80, endA);
    add(f.svg, 'line', { x1: cx, y1: cy, x2: nEnd[0], y2: nEnd[1], stroke: th.text, 'stroke-width': 3.2, 'stroke-linecap': 'round' });
    add(f.svg, 'circle', { cx: cx, cy: cy, r: 7, fill: th.text });
    add(f.svg, 'circle', { cx: cx, cy: cy, r: 3, fill: th.surface });

    var vY = cy - R * 0.36;
    var fs = Math.max(24, Math.min(60, R * 0.30));
    txt(f.svg, cx, num(vY), P.formatNumber(last), { 'text-anchor': 'middle', 'font-size': fs, 'font-weight': 700, fill: th.text });
    var subY = vY + fs * 0.90 + 8;
    txt(f.svg, cx, num(subY), (target !== null ? 'dari target ' + P.formatNumber(maxV) : ''), { 'text-anchor': 'middle', 'font-size': 13, fill: th.text2 });

    var pY = cy + R * 0.42;
    txt(f.svg, cx, num(pY), P.formatNumber(last / maxV * 100, { decimals: 1 }) + '%', { 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 700, fill: color });
    txt(f.svg, cx, num(pY + 24), String(labels[lastIdx] || ''), { 'text-anchor': 'middle', 'font-size': 13, fill: th.text2 });

    txt(f.svg, num(cx - R * 1.06), num(cy + 16), '0', { 'text-anchor': 'middle', 'font-size': 12, fill: th.text3 });
    txt(f.svg, num(cx + R * 1.06), num(cy + 16), P.formatCompact(maxV), { 'text-anchor': 'middle', 'font-size': 12, fill: th.text3 });

    return { svg: f.svg, name: 'Gauge Pencapaian' };
  }

  function arcStroke(cx, cy, r, a0, a1) {
    var p0 = pol(cx, cy, r, a0), p1 = pol(cx, cy, r, a1);
    var large = Math.abs(a1 - a0) > 180 ? 1 : 0;
    var sweep = a1 >= a0 ? 1 : 0;
    return 'M' + p0[0] + ',' + p0[1] + 'A' + r + ',' + r + ' 0 ' + large + ' ' + sweep + ' ' + p1[0] + ',' + p1[1];
  }

  /* ============================================================
     FUNNEL
     ============================================================ */
  function chartFunnel(data, opts) {
    var labels = data.labels;
    var vals = data.series[0] ? data.series[0].values : [];
    var items = [];
    for (var i = 0; i < labels.length; i++) {
      var v = vals[i];
      if (typeof v === 'number' && isFinite(v)) items.push({ label: labels[i], value: v });
    }
    items.sort(function (a, b) { return b.value - a.value; });
    var f = frame(opts, null, { left: 60, right: 60, bottom: 30 });
    var p = f.plot, th = f.theme;
    if (!items.length) {
      txt(f.svg, W / 2, H / 2, 'Tidak ada data untuk digambar', { 'text-anchor': 'middle', 'font-size': 15, fill: th.text3 });
      return { svg: f.svg, name: 'Diagram Corong' };
    }
    var maxV = items[0].value || 1;
    var n = items.length;
    var band = p.h / n;
    var cx = p.x + p.w / 2;
    var maxW = p.w * 0.62;

    items.forEach(function (it, i) {
      var wTop = maxW * (it.value / maxV);
      var nextV = i < n - 1 ? items[i + 1].value : it.value * 0.86;
      var wBot = maxW * (nextV / maxV);
      var y0 = p.y + band * i + band * 0.12;
      var y1 = p.y + band * (i + 1) - band * 0.12;
      var color = colorAt(i, opts);
      var d = 'M' + num(cx - wTop / 2) + ',' + num(y0) + 'L' + num(cx + wTop / 2) + ',' + num(y0) +
        'L' + num(cx + wBot / 2) + ',' + num(y1) + 'L' + num(cx - wBot / 2) + ',' + num(y1) + 'Z';
      var g = add(f.svg, 'g', { class: opts.anim ? 'a-fade' : null });
      if (opts.anim) g.setAttribute('style', 'animation-delay:' + i * 75 + 'ms');
      var path = add(g, 'path', { d: d, fill: color, stroke: th.surface, 'stroke-width': 2 });
      var drop = i > 0 ? ' (' + P.formatNumber((it.value / items[i - 1].value - 1) * 100, { decimals: 1 }) + '% dari tahap sebelumnya)' : '';
      path.setAttribute('data-tip', tip(it.label, data.series[0].name, fmt(it.value), P.formatNumber(it.value / maxV * 100, { decimals: 1 }) + '% dari awal' + drop));
      path.style.cursor = 'pointer';
      var inner = (y1 - y0) > 26;
      txt(f.svg, num(cx), num((y0 + y1) / 2 + (inner ? -1 : -3)), String(it.label), { 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#ffffff' });
      if (inner) {
        txt(f.svg, num(cx), num((y0 + y1) / 2 + 16), P.formatNumber(it.value), { 'text-anchor': 'middle', 'font-size': 12, fill: 'rgba(255,255,255,.9)' });
      }
    });
    return { svg: f.svg, name: 'Diagram Corong' };
  }

  /* ============================================================
     REGISTRI & API
     ============================================================ */
  var RENDERERS = {
    bar: chartBar,
    hbar: chartHBar,
    line: function (d, o) { return chartLine(d, o); },
    area: function (d, o) { var o2 = Object.assign({}, o, { _area: true }); return chartLine(d, o2); },
    pie: function (d, o) { return chartPieDonut(d, o, false); },
    donut: function (d, o) { return chartPieDonut(d, o, true); },
    radar: chartRadar,
    scatter: function (d, o) { return chartScatter(d, o, false); },
    bubble: function (d, o) { return chartScatter(d, o, true); },
    heatmap: chartHeatmap,
    treemap: chartTreemap,
    gauge: chartGauge,
    funnel: chartFunnel
  };

  var TYPES = [
    { id: 'bar', name: 'Batang', icon: '▮', hint: 'Perbandingan antar kategori' },
    { id: 'hbar', name: 'Batang Horizontal', icon: '▬', hint: 'Cocok untuk nama kategori panjang' },
    { id: 'line', name: 'Garis', icon: '📈', hint: 'Tren dari waktu ke waktu' },
    { id: 'area', name: 'Area', icon: '⛰', hint: 'Tren dengan volume' },
    { id: 'pie', name: 'Pie', icon: '◕', hint: 'Porsi dari keseluruhan' },
    { id: 'donut', name: 'Donat', icon: '◎', hint: 'Porsi + total di tengah' },
    { id: 'radar', name: 'Radar', icon: '✳', hint: 'Perbandingan beberapa indikator' },
    { id: 'scatter', name: 'Sebaran', icon: '⁙', hint: 'Hubungan dua variabel' },
    { id: 'bubble', name: 'Gelembung', icon: '◍', hint: 'Tiga variabel sekaligus' },
    { id: 'heatmap', name: 'Peta Panas', icon: '▦', hint: 'Pola pada matriks data' },
    { id: 'treemap', name: 'Treemap', icon: '▤', hint: 'Komposisi bertingkat' },
    { id: 'gauge', name: 'Gauge', icon: '◐', hint: 'Pencapaian terhadap target' },
    { id: 'funnel', name: 'Corong', icon: '▽', hint: 'Tahapan yang menyusut' }
  ];

  function render(type, data, opts) {
    var fn = RENDERERS[type] || RENDERERS.bar;
    return fn(data, opts);
  }

  global.VisualCharts = {
    render: render,
    TYPES: TYPES,
    PALETTES: PALETTES,
    paletteColors: paletteColors,
    W: W,
    H: H
  };
})(typeof window !== 'undefined' ? window : globalThis);
