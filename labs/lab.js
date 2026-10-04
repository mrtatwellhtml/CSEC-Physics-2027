/* Lab kit — shared helpers for every interactive lab page (labs/*.html).
   Loaded in <head> after registry.js, so the saved theme applies before first paint.
   Page contract: <body data-lab="id"> with #lab-top and #lab-foot placeholders. */
(function () {
  'use strict';
  var KEY = 'csec-phys-2027-v1';      // the workbook's state (theme lives here)
  var LKEY = 'csec-phys-2027-labs';   // lab progress, kept separate so the two never overwrite each other

  function readJSON(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } }
  function writeJSON(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage blocked */ } }

  // ---------- theme (shared with the workbook) ----------
  function savedTheme() { var s = readJSON(KEY); return s && s.theme ? s.theme : ''; }
  function applyTheme() {
    var t = savedTheme();
    if (t) document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme');
  }
  function isDark() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t) return t === 'dark';
    return !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function toggleTheme() {
    var s = readJSON(KEY);
    if (!s || s.v !== 1) s = { v: 1 };
    s.theme = isDark() ? 'light' : 'dark';
    writeJSON(KEY, s);
    applyTheme();
    colorCache = {};
    themeButton();
    listeners.forEach(function (fn) { fn(); });
  }
  applyTheme();

  var listeners = [];   // redraw callbacks when the theme changes
  function onTheme(fn) { listeners.push(fn); }
  if (window.matchMedia) {
    var mq = matchMedia('(prefers-color-scheme: dark)');
    var mqFn = function () { colorCache = {}; listeners.forEach(function (fn) { fn(); }); };
    if (mq.addEventListener) mq.addEventListener('change', mqFn); else if (mq.addListener) mq.addListener(mqFn);
  }

  var colorCache = {};
  function c(name) {
    if (!colorCache[name]) colorCache[name] = getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim() || '#888';
    return colorCache[name];
  }

  // ---------- small utilities ----------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  function el(tag, attrs, html) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] != null) node.setAttribute(k, attrs[k]); });
    if (html != null) node.innerHTML = html;
    return node;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  // Round to n significant figures and print without exponent noise (e.g. 0.0450, 1250).
  function sf(v, n) {
    if (!isFinite(v)) return '—';
    if (v === 0) return '0';
    n = n || 3;
    var digits = n - 1 - Math.floor(Math.log10(Math.abs(v)));
    var r = Number(v.toPrecision(n));
    return digits > 0 ? r.toFixed(Math.min(digits, 10)) : String(Math.round(r));
  }
  function dp(v, n) { return isFinite(v) ? Number(v).toFixed(n) : '—'; }
  var SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  function sup(n) { return String(n).split('').map(function (ch) { return SUP[ch] || ch; }).join(''); }
  // Standard form: 3.0 × 10⁸ (falls back to plain numbers between 0.01 and 99 999).
  function sci(v, n) {
    n = n || 3;
    if (!isFinite(v)) return '—';
    if (v === 0) return '0';
    var e = Math.floor(Math.log10(Math.abs(v)));
    if (e >= -2 && e <= 4) return sf(v, n);
    var m = v / Math.pow(10, e);
    if (Math.abs(Number(m.toPrecision(n))) >= 10) { m /= 10; e += 1; }
    return Number(m.toPrecision(n)).toFixed(n - 1) + ' × 10' + sup(e);
  }

  // ---------- lab registry lookups ----------
  function labMeta(id) { return (window.WB_LABS || []).find(function (l) { return l.id === id; }) || null; }
  function lessonMeta(id) {
    var idx = window.WB_INDEX; if (!idx) return null;
    for (var i = 0; i < idx.books.length; i++) {
      var l = idx.books[i].lessons.find(function (x) { return x.id === id; });
      if (l) return l;
    }
    return null;
  }
  function plain(s) { return String(s || '').replace(/⟪([^⟫]*)⟫/g, '$1').replace(/\*\*|__|[\^~]/g, '').replace(/\\[a-z]+/g, '').replace(/[{}]/g, ''); }
  function param(name) { var m = new RegExp('[?&]' + name + '=([^&#]+)').exec(location.search); return m ? decodeURIComponent(m[1]) : ''; }

  // ---------- page chrome ----------
  var ICON_MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>';
  var ICON_SUN = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 1.5v2.5M12 20v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M1.5 12H4M20 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/></svg>';
  function themeButton() {
    var b = document.getElementById('lab-theme');
    if (!b) return;
    var dark = isDark();
    b.innerHTML = dark ? ICON_SUN : ICON_MOON;
    b.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  }
  function topBar(current) {
    return '<header class="lab-top"><a class="lab-brand" href="../index.html#/"><b aria-hidden="true">P27</b><span>CSEC Physics 2027</span><i class="sr">Workbook home</i></a>' +
      '<nav class="lab-nav" aria-label="Labs and tools"><a href="../index.html#/">Lessons</a>' +
      '<a href="index.html"' + (current === 'hub' ? ' aria-current="page"' : '') + '>All labs</a>' +
      '<a href="maths.html"' + (current === 'maths' ? ' aria-current="page"' : '') + '>Maths help</a>' +
      '<a href="formula-coach.html"' + (current === 'coach' ? ' aria-current="page"' : '') + '>Formula coach</a></nav>' +
      '<button type="button" class="lab-theme" id="lab-theme"></button></header>';
  }
  function backLink() {
    var from = param('from'), l = from && lessonMeta(from);
    if (!l) return '';
    return '<a class="back-lesson" href="../index.html#/lesson/' + esc(from) + '">← Back to Lesson ' + l.n + ': ' + esc(plain(l.title)) + '</a>';
  }
  function relatedHTML(ids) {
    var items = (ids || []).map(function (id) {
      var l = lessonMeta(id); if (!l) return '';
      return '<li><a href="../index.html#/lesson/' + esc(id) + '"><small>Lesson ' + l.n + (l.unit ? ' · Unit ' + esc(l.unit) : '') + '</small>' + esc(plain(l.title)) + '</a></li>';
    }).join('');
    return items ? '<ul class="related">' + items + '</ul>' : '';
  }

  function init() {
    var id = document.body.getAttribute('data-lab') || '';
    var meta = labMeta(id);
    var top = document.getElementById('lab-top');
    var page = document.body.getAttribute('data-page') || 'lab';
    if (top) {
      var head = '';
      if (meta) {
        var sec = (window.WB_LAB_SECTIONS || {})[meta.section] || ['', 't2'];
        head = '<div class="lab-head ' + sec[1] + '">' + backLink() +
          '<div class="eyebrow">Lab · Section ' + meta.section + ' · ' + esc(sec[0]) + '</div>' +
          '<h1>' + esc(meta.title) + '</h1><p class="lead">' + esc(meta.blurb) + '</p></div>';
        document.title = meta.title + ' · CSEC Physics 2027 Labs';
      } else {
        head = '<div class="lab-head">' + backLink() + (top.innerHTML || '') + '</div>';
      }
      top.innerHTML = topBar(page) + head;
    }
    var foot = document.getElementById('lab-foot');
    if (foot) {
      foot.innerHTML = (meta && meta.lessons.length ? '<section class="card" style="margin-top:16px"><h2>Learn the theory</h2><p class="note" style="margin:0">These workbook lessons go with this lab. Read the notes, then do the questions.</p>' + relatedHTML(meta.lessons) + '</section>' : '') +
        '<footer class="foot"><a href="index.html">All labs</a><a href="maths.html">Maths help</a><a href="../index.html#/">Back to the workbook</a><span>Your lab progress saves on this device.</span></footer>';
    }
    var tb = document.getElementById('lab-theme');
    if (tb) { themeButton(); tb.addEventListener('click', toggleTheme); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  // ---------- lab progress (tasks done) ----------
  function progress(labId) { var all = readJSON(LKEY) || {}; return all[labId] || { tasks: [] }; }
  function saveProgress(labId, p) { var all = readJSON(LKEY) || {}; all[labId] = p; writeJSON(LKEY, all); }
  function labId() { return document.body.getAttribute('data-lab') || 'page'; }

  // ---------- controls ----------
  // slider(parent, {label, min, max, step, value, unit, fmt(v), help, onInput(v)})
  var uid = 0;
  function slider(parent, o) {
    var id = 'sl' + (++uid);
    var wrap = el('label', { class: 'ctl', for: id });
    var fmt = o.fmt || function (v) { return String(v); };
    wrap.innerHTML = '<span class="ctl-top"><span>' + o.label + '</span><output for="' + id + '"></output></span>' +
      '<input type="range" id="' + id + '" min="' + o.min + '" max="' + o.max + '" step="' + (o.step || 1) + '" value="' + o.value + '">' +
      (o.help ? '<span class="help">' + o.help + '</span>' : '');
    parent.appendChild(wrap);
    var input = wrap.querySelector('input'), out = wrap.querySelector('output');
    function show() {
      var v = Number(input.value), text = fmt(v) + (o.unit ? ' ' + o.unit : '');
      out.textContent = text; input.setAttribute('aria-valuetext', text);
    }
    input.addEventListener('input', function () { show(); if (o.onInput) o.onInput(Number(input.value)); });
    show();
    return {
      el: wrap, input: input,
      get value() { return Number(input.value); },
      set: function (v, silent) { input.value = v; show(); if (!silent && o.onInput) o.onInput(Number(input.value)); },
      disable: function (d) { input.disabled = !!d; },
    };
  }
  // seg(parent, {label, options: [[value, text], ...], value, onChange(v)}) — a pressed-button group
  function seg(parent, o) {
    var wrap = el('div', { class: 'seg', role: 'group', 'aria-label': o.label || 'Choose' });
    var value = o.value;
    o.options.forEach(function (opt) {
      var b = el('button', { type: 'button', 'data-v': opt[0], 'aria-pressed': String(opt[0] === value) }, opt[1]);
      b.addEventListener('click', function () { api.set(opt[0]); });
      wrap.appendChild(b);
    });
    parent.appendChild(wrap);
    var api = {
      el: wrap,
      get value() { return value; },
      set: function (v, silent) {
        value = v;
        wrap.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === String(v))); });
        if (!silent && o.onChange) o.onChange(v);
      },
    };
    return api;
  }
  function button(parent, text, onClick, ghost) {
    var b = el('button', { type: 'button', class: 'btn' + (ghost ? ' ghost' : '') }, text);
    b.addEventListener('click', onClick);
    parent.appendChild(b);
    return b;
  }

  // readout(el, [[label, value, big?], ...])
  function readout(node, rows) {
    node.innerHTML = '<dl class="readout">' + rows.map(function (r) {
      return '<dt>' + r[0] + '</dt><dd' + (r[2] ? ' class="big"' : '') + '>' + r[1] + '</dd>';
    }).join('') + '</dl>';
  }
  // math(el, title, [[step label, working], ...]) — "Show the maths", one step per line
  function math(node, title, steps) {
    node.className = 'mathbox';
    node.innerHTML = '<span class="lbl">' + (title || 'Show the maths') + '</span><ol>' + steps.map(function (s) {
      return '<li><span>' + s[0] + '</span><code>' + s[1] + '</code></li>';
    }).join('') + '</ol>';
  }

  // ---------- canvas ----------
  // canvas(cv, draw(ctx, W, H), {ratio, min, max}) — DPR-sharp, resizes with its box, redraws on theme change.
  function canvas(cv, draw, o) {
    o = o || {};
    var ctx = cv.getContext('2d'), api = { ctx: ctx, W: 0, H: 0, cv: cv };
    function size() {
      var w = cv.clientWidth || cv.parentNode.clientWidth || 600;
      var h = Math.round(clamp(w * (o.ratio || 0.6), o.min || 240, o.max || 480));
      var dpr = window.devicePixelRatio || 1;
      cv.style.height = h + 'px';
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      api.W = w; api.H = h;
    }
    api.redraw = function () { ctx.save(); ctx.clearRect(0, 0, api.W, api.H); draw(ctx, api.W, api.H); ctx.restore(); };
    size();
    if (window.ResizeObserver) {
      var lastW = cv.clientWidth;
      new ResizeObserver(function () { if (cv.clientWidth !== lastW) { lastW = cv.clientWidth; size(); api.redraw(); } }).observe(cv);
    } else window.addEventListener('resize', function () { size(); api.redraw(); });
    onTheme(api.redraw);
    api.redraw();
    return api;
  }
  // loop(step(dt)) — requestAnimationFrame loop with start/stop; dt in seconds (capped).
  function loop(step) {
    var running = false, last = 0, raf = 0;
    function frame(t) {
      if (!running) return;
      var dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      step(dt);
      raf = requestAnimationFrame(frame);
    }
    return {
      start: function () { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); },
      stop: function () { running = false; cancelAnimationFrame(raf); },
      get running() { return running; },
    };
  }
  var reducedMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // drag(cv, {down(x, y) → target|null, move(target, x, y), up(target)}) — pointer coords in CSS px
  function drag(cv, o) {
    var target = null;
    function pos(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    cv.addEventListener('pointerdown', function (e) {
      var p = pos(e); target = o.down(p[0], p[1]);
      if (target != null) { cv.setPointerCapture(e.pointerId); e.preventDefault(); cv.style.cursor = 'grabbing'; }
    });
    cv.addEventListener('pointermove', function (e) {
      var p = pos(e);
      if (target != null) { o.move(target, p[0], p[1]); e.preventDefault(); }
      else if (o.hover) cv.style.cursor = o.hover(p[0], p[1]) ? 'grab' : 'default';
    });
    function end() { if (target != null && o.up) o.up(target); target = null; cv.style.cursor = ''; }
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
  }

  // ---------- drawing helpers ----------
  function font(size, kind, weight) {
    var fam = kind === 'mono' ? "'DM Mono',ui-monospace,Consolas,monospace" : kind === 'display' ? "'Bricolage Grotesque','Segoe UI',system-ui,sans-serif" : "'Atkinson Hyperlegible','Segoe UI',system-ui,sans-serif";
    return (weight || 400) + ' ' + size + 'px ' + fam;
  }
  // text(ctx, s, x, y, {color, size, align, base, weight, kind, bg})
  function text(ctx, s, x, y, o) {
    o = o || {};
    ctx.font = font(o.size || 13, o.kind, o.weight);
    ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'middle';
    if (o.bg) {
      var w = ctx.measureText(s).width, h = (o.size || 13) + 6;
      var x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
      var y0 = o.base === 'top' ? y : o.base === 'bottom' ? y - h : y - h / 2;
      ctx.fillStyle = o.bg; roundRect(ctx, x0 - 4, y0 - (o.base === 'top' || o.base === 'bottom' ? 0 : 0), w + 8, h, 5); ctx.fill();
    }
    ctx.fillStyle = o.color || c('ink');
    ctx.fillText(s, x, y);
  }
  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  // arrow(ctx, x1, y1, x2, y2, {color, width, head, dash, label, labelSide})
  function arrow(ctx, x1, y1, x2, y2, o) {
    o = o || {};
    var col = o.color || c('ink'), w = o.width || 2.5, hd = o.head || Math.max(8, w * 3.2);
    var len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 1) return;
    var a = Math.atan2(y2 - y1, x2 - x1);
    ctx.save();
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    var hx = x2 - Math.cos(a) * Math.min(hd * 0.8, len), hy = y2 - Math.sin(a) * Math.min(hd * 0.8, len);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.setLineDash([]);
    var h = Math.min(hd, len);
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - h * Math.cos(a - 0.42), y2 - h * Math.sin(a - 0.42));
    ctx.lineTo(x2 - h * Math.cos(a + 0.42), y2 - h * Math.sin(a + 0.42));
    ctx.closePath(); ctx.fill();
    ctx.restore();
    if (o.label) {
      var mx = (x1 + x2) / 2, my = (y1 + y2) / 2, nx = -Math.sin(a), ny = Math.cos(a), off = o.labelOff || 14;
      if (o.labelSide === 'end') { mx = x2 + Math.cos(a) * 12; my = y2 + Math.sin(a) * 12; nx = 0; ny = 0; }
      text(ctx, o.label, mx + nx * off, my + ny * off, { color: col, size: o.labelSize || 13, weight: 700, align: 'center' });
    }
  }
  function line(ctx, x1, y1, x2, y2, col, w, dash) {
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = w || 1; if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
  }
  function dot(ctx, x, y, r, col, stroke) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }
  function niceStep(range, target) {
    var raw = range / (target || 5), p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
  }
  // axes(ctx, {x, y, w, h}, {xmin, xmax, ymin, ymax, xstep, ystep, xlabel, ylabel}) → {X(v), Y(v), ...}
  function axes(ctx, r, o) {
    var xs = o.xstep || niceStep(o.xmax - o.xmin, r.w > 360 ? 8 : 5), ys = o.ystep || niceStep(o.ymax - o.ymin, 5);
    var X = function (v) { return r.x + (v - o.xmin) / (o.xmax - o.xmin) * r.w; };
    var Y = function (v) { return r.y + r.h - (v - o.ymin) / (o.ymax - o.ymin) * r.h; };
    ctx.save();
    ctx.lineWidth = 1;
    var v, eps = 1e-9;
    for (v = Math.ceil(o.xmin / xs) * xs; v <= o.xmax + eps; v += xs) {
      line(ctx, X(v), r.y, X(v), r.y + r.h, c('grid'), 1);
      text(ctx, fmtTick(v, xs), X(v), r.y + r.h + 4, { color: c('muted'), size: 11, kind: 'mono', align: 'center', base: 'top' });
    }
    for (v = Math.ceil(o.ymin / ys) * ys; v <= o.ymax + eps; v += ys) {
      line(ctx, r.x, Y(v), r.x + r.w, Y(v), c('grid'), 1);
      text(ctx, fmtTick(v, ys), r.x - 5, Y(v), { color: c('muted'), size: 11, kind: 'mono', align: 'right' });
    }
    var x0 = o.xmin <= 0 && o.xmax >= 0 ? X(0) : r.x, y0 = o.ymin <= 0 && o.ymax >= 0 ? Y(0) : r.y + r.h;
    line(ctx, r.x, y0, r.x + r.w, y0, c('grid-strong'), 1.5);
    line(ctx, x0, r.y, x0, r.y + r.h, c('grid-strong'), 1.5);
    if (o.xlabel) text(ctx, o.xlabel, r.x + r.w, r.y + r.h + 22, { color: c('muted'), size: 12, weight: 700, align: 'right', base: 'top' });
    if (o.ylabel) text(ctx, o.ylabel, r.x - 4, r.y - 12, { color: c('muted'), size: 12, weight: 700, align: 'left' });
    ctx.restore();
    return { X: X, Y: Y, r: r, o: o };
  }
  function fmtTick(v, step) {
    var d = step >= 1 ? 0 : Math.min(4, Math.ceil(-Math.log10(step) + 0.001));
    var s = (Math.abs(v) < 1e-9 ? 0 : v).toFixed(d);
    return s;
  }

  // ---------- guided "Try this" tasks ----------
  // tasks(el, [{t: text, s: small hint, ok: state => bool}], {title}) → {update(state)}
  function tasks(node, list, o) {
    o = o || {};
    var id = labId(), p = progress(id), done = {};
    (p.tasks || []).forEach(function (i) { done[i] = true; });
    node.className = 'tasks';
    function render() {
      var n = list.filter(function (_, i) { return done[i]; }).length;
      node.innerHTML = '<span class="prog">' + n + ' of ' + list.length + ' done</span><span class="lbl">Try this</span>' +
        '<h2>' + (o.title || 'Experiment with the lab') + '</h2>' +
        (o.intro ? '<p class="note" style="margin:4px 0 0">' + o.intro + '</p>' : '') +
        '<ol>' + list.map(function (t, i) {
          return '<li class="' + (done[i] ? 'done' : '') + '"><span class="tick" aria-hidden="true">' + (done[i] ? '✓' : i + 1) + '</span>' +
            '<span class="tt">' + t.t + (t.s ? '<small>' + t.s + '</small>' : '') + '<span class="sr">' + (done[i] ? ' (done)' : ' (not done yet)') + '</span></span></li>';
        }).join('') + '</ol>' +
        (n === list.length ? '<p class="yay" role="status">All done! You have explored every idea in this lab. Now try the quick check below.</p>' : '');
    }
    render();
    return {
      update: function (state) {
        var changed = false;
        list.forEach(function (t, i) {
          if (!done[i]) { var ok = false; try { ok = t.ok(state); } catch (e) { ok = false; } if (ok) { done[i] = true; changed = true; } }
        });
        if (changed) {
          p.tasks = Object.keys(done).map(Number); p.total = list.length; saveProgress(id, p); render();
        }
      },
    };
  }

  // ---------- quick check ----------
  // quiz(el, [{q, o: [options], a: index, why} | {q, n: value, tol: 0.02, unit, why}])
  function quiz(node, qs, title) {
    node.classList.add('card', 'quiz');
    node.innerHTML = '<span class="lbl">Quick check</span><h2>' + (title || 'Check you understand') + '</h2>' + qs.map(function (q, i) {
      var body;
      if (q.o) {
        body = '<div class="qopts" role="group" aria-label="Answer options">' + q.o.map(function (opt, j) {
          return '<button type="button" data-q="' + i + '" data-o="' + j + '">' + String.fromCharCode(65 + j) + '. ' + opt + '</button>';
        }).join('') + '</div>';
      } else {
        body = '<form class="qnum" data-q="' + i + '"><label class="sr" for="qn' + uid + '_' + i + '">Your answer</label>' +
          '<input id="qn' + uid + '_' + i + '" inputmode="decimal" autocomplete="off" placeholder="Your answer">' +
          (q.unit ? '<span>' + q.unit + '</span>' : '') + '<button class="btn" type="submit">Check</button></form>';
      }
      return '<div class="qitem"><p class="qq">' + (i + 1) + '. ' + q.q + '</p>' + body + '<div class="qfb-slot" aria-live="polite"></div></div>';
    }).join('');
    uid++;
    function feedback(item, ok, q, extra) {
      item.querySelector('.qfb-slot').innerHTML = '<p class="qfb ' + (ok ? 'ok' : 'no') + '"><strong>' + (ok ? '✓ Correct!' : '✗ Not quite. ' + (extra || 'Have another go.')) + '</strong>' + (ok || q.showWhy ? q.why || '' : (q.hint || '')) + '</p>';
    }
    node.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-o]'); if (!b) return;
      var q = qs[+b.getAttribute('data-q')], item = b.closest('.qitem'), ok = +b.getAttribute('data-o') === q.a;
      b.classList.add(ok ? 'right' : 'wrong');
      feedback(item, ok, q);
    });
    node.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, q = qs[+f.getAttribute('data-q')], item = f.closest('.qitem'), raw = f.querySelector('input').value;
      var res = window.WBC ? WBC.checkNumber(raw, { value: q.n, pct: q.tol == null ? 0.02 : q.tol }) : { ok: Math.abs(parseFloat(raw) - q.n) <= Math.abs(q.n) * 0.02 };
      if (res.reason === 'nonumber') { feedback(item, false, q, 'Type a number.'); return; }
      feedback(item, res.ok, q);
    });
  }

  window.Lab = {
    $: $, el: el, esc: esc, c: c, clamp: clamp, sf: sf, dp: dp, sci: sci, sup: sup,
    slider: slider, seg: seg, button: button, readout: readout, math: math,
    canvas: canvas, loop: loop, drag: drag, reducedMotion: reducedMotion,
    text: text, arrow: arrow, line: line, dot: dot, roundRect: roundRect, axes: axes, niceStep: niceStep, font: font,
    tasks: tasks, quiz: quiz, onTheme: onTheme, isDark: isDark,
    lessonMeta: lessonMeta, labMeta: labMeta, plain: plain, param: param, relatedHTML: relatedHTML,
    progress: progress, saveProgress: saveProgress, readJSON: readJSON, LKEY: LKEY,
  };
})();
