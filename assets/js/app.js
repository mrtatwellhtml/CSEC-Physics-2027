/* CSEC Physics 2027 — app state, router and renderers (PLAN.md §2, §4, §7, §8). */
(function () {
  'use strict';
  var IDX = window.WB_INDEX;
  var CFG = window.WB_CONFIG || {};
  var KEY = 'csec-phys-2027-v1';
  var md = WBD.md, esc = WBD.esc;

  // ---------- state (one versioned localStorage key, PLAN.md §8) ----------
  function freshState() {
    return { v: 1, name: '', theme: '', xp: 0, streak: { last: '', n: 0 }, l: {}, log: {}, mistakes: [], queue: [] };
  }
  var S = load();
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var s = JSON.parse(raw); if (s && s.v === 1) return Object.assign(freshState(), s); }
    } catch (e) { /* private mode / blocked storage: run without saving */ }
    return freshState();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

  // ---------- index lookups ----------
  var SECTIONS = {}; IDX.sections.forEach(function (s) { SECTIONS[s.id] = s; });
  var LESSONS = [], LESSON = {}, BOOK = {};
  IDX.books.forEach(function (b) {
    BOOK[b.id] = b;
    b.lessons.forEach(function (l) { l.book = b.id; LESSONS.push(l); LESSON[l.id] = l; });
  });
  var lessonState = function (id) { return S.l[id] || null; };
  var isDone = function (id) { var s = lessonState(id); return !!(s && s.finished); };
  var stars = function () { var n = 0; for (var k in S.l) n += S.l[k].stars || 0; return n; };
  var rightCount = function () {
    var n = 0; for (var k in S.l) { var it = S.l[k].i || {}; for (var j in it) if (it[j].right) n++; } return n;
  };
  var doneCount = function (list) { return list.filter(function (l) { return isDone(l.id); }).length; };
  function nextLesson() {
    for (var i = 0; i < LESSONS.length; i++) if (!isDone(LESSONS[i].id)) return LESSONS[i];
    return null;
  }
  function anyStarted() { return Object.keys(S.l).length > 0; }

  // ---------- small UI helpers ----------
  var ICON = {
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
    star: '<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/>',
    moon: '<path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/>',
    sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 1.5v2.5M12 20v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M1.5 12H4M20 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8"/>',
    chev: '<path d="M9 18l6-6-6-6"/>', back: '<path d="M15 18l-6-6 6-6"/>',
    check: '<path d="M20 6L9 17l-5-5"/>', flame: '<path d="M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1 2-2 3-4 3 0-3-1-6-4-9 0 4-3 7-3 11 0 5 3 9 7 9z"/>',
  };
  function ico(name) { return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">' + ICON[name] + '</svg>'; }
  function sectionOf(bookId) { return SECTIONS[BOOK[bookId].section]; }
  function bookLabel(b) { return 'Book ' + b.n + (b.label ? ' · ' + b.label : ''); }
  function lessonLabel(l) {
    var b = BOOK[l.book];
    return 'Book ' + b.n + (l.unit ? ' · Unit ' + l.unit : '');
  }

  // ---------- theme ----------
  function effectiveTheme() {
    if (S.theme) return S.theme;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function applyTheme() {
    if (S.theme) document.documentElement.setAttribute('data-theme', S.theme);
    else document.documentElement.removeAttribute('data-theme');
  }
  function toggleTheme() {
    S.theme = effectiveTheme() === 'dark' ? 'light' : 'dark';
    save(); applyTheme(); render();
  }

  // ---------- countdown (America/Port_of_Spain, UTC−4, no DST) ----------
  function daysTo(iso) {
    var ms = new Date(iso).getTime() - Date.now();
    return ms <= 0 ? 0 : Math.ceil(ms / 86400000);
  }

  // ---------- top bar + footer ----------
  function topbar() {
    var dark = effectiveTheme() === 'dark';
    return '<header class="topbar" id="topbar">' +
      '<a class="brand" href="#/"><span class="brand-mark" aria-hidden="true">P27</span><span class="bn">CSEC Physics 2027</span><span class="sr">Home</span></a>' +
      '<div class="tb-right">' +
      '<span class="chip xp" id="xpchip" title="XP: 10 for right first time, 5 after a retry">' + ico('bolt') + '<span>' + S.xp + '</span><span class="sr"> XP</span></span>' +
      '<span class="chip star" title="Stars from exit checks">' + ico('star') + '<span>' + stars() + '</span><span class="sr"> stars</span></span>' +
      '<button type="button" class="iconbtn theme" id="themebtn" aria-label="' + (dark ? 'Switch to light mode' : 'Switch to dark mode') + '">' + ico(dark ? 'sun' : 'moon') + '</button>' +
      '</div></header>';
  }
  function footer() {
    return '<footer class="foot"><a href="#/mistakes">My Mistake Log</a><a href="#/teacher">Teacher summary</a>' +
      '<span>' + (CFG.endpoint ? 'Your name and answers are sent to your teacher.' : 'Your work saves on this device only.') + '</span></footer>';
  }

  // ---------- Home ----------
  var FLOW = [['Warm-up', '5m'], ['Learn', '10m'], ['Try it with help', '5m'], ['Practice', '10m'], ['Exit check', '3m'], ['Show your teacher', '']];

  function lessonCard(l) {
    var st = lessonState(l.id), done = isDone(l.id);
    var cls = 'daycard' + (done ? ' done' : st ? ' started' : '');
    var tag = l.kind === 'mock' ? '<span class="tag">Mock</span>' : l.check ? '<span class="tag">Check</span>' : '';
    var state = done ? ico('check') + 'Done' + (st.stars ? ' <span class="stars" aria-label="' + st.stars + ' stars">' + '★★★'.slice(0, st.stars) + '</span>' : '')
      : st ? 'In progress' : (l.kind === 'mock' ? l.minutes + ' min · timed' : 'Not started');
    return '<a class="' + cls + '" href="#/lesson/' + l.id + '" data-lesson="' + l.id + '">' + tag +
      '<span class="dn">' + l.n + '</span>' +
      (l.unit ? '<span class="du">Unit ' + esc(l.unit) + '</span>' : '') +
      '<span class="dt">' + md(l.title) + '</span><span class="state">' + state + '</span></a>';
  }

  function bookGroup(b) {
    var sec = SECTIONS[b.section];
    return '<section class="topic ' + sec.color + '" aria-labelledby="bk-' + b.id + '">' +
      '<div class="topic-h"><span class="dot" aria-hidden="true"></span>' +
      '<h3 id="bk-' + b.id + '"><a href="#/book/' + b.id + '">' + md(b.title) + '</a></h3>' +
      '<span class="code">' + (b.section === 'X' ? 'All sections' : esc(b.codes.join(', '))) + '</span>' +
      '<span class="tprog">' + doneCount(b.lessons) + '/' + b.lessons.length + '</span></div>' +
      '<div class="booklabel">' + esc(bookLabel(b)) + '</div>' +
      '<div class="daygrid">' + b.lessons.map(lessonCard).join('') + '</div></section>';
  }

  function home() {
    var total = LESSONS.length, done = doneCount(LESSONS);
    var C = 2 * Math.PI * 52, off = C * (1 - done / total);
    var nx = nextLesson();
    var hello = S.name ? 'Hi <span class="nm">' + esc(S.name) + '</span>' : 'Hi there';
    var cta = nx
      ? '<a class="cta" id="cta" href="#/lesson/' + nx.id + '"><div><small>' + (anyStarted() ? 'Continue' : 'Start here') + '</small><strong>Lesson ' + nx.n + ' · ' + md(nx.title) + '</strong></div><span class="go">' + ico('chev') + '</span></a>'
      : '<a class="cta" href="#/"><div><small>All done</small><strong>Every lesson finished. Well done!</strong></div></a>';
    var p02 = daysTo(IDX.exams.P02), p01 = daysTo(IDX.exams.P01);
    var bySec = IDX.sections.map(function (sec) {
      var books = IDX.books.filter(function (b) { return b.section === sec.id; });
      if (!books.length) return '';
      var ls = [].concat.apply([], books.map(function (b) { return b.lessons; }));
      return '<section class="section ' + sec.color + '"><div class="section-h">' +
        '<span class="sl">' + (sec.id === 'X' ? 'Exam prep' : 'Section ' + sec.id) + '</span><h2>' + esc(sec.name) + '</h2>' +
        '<span class="tprog">' + doneCount(ls) + '/' + ls.length + '</span></div>' + books.map(bookGroup).join('') + '</section>';
    }).join('');

    return '<main id="main">' +
      '<section class="hero">' +
        '<div><h1 class="hello" tabindex="-1">' + hello + '</h1>' +
        '<p class="hero-sub">One lesson at a time. Learn it, try it with help, then check yourself. About 35 minutes each.</p>' +
        '<div class="namebox"><label for="stu-name">Your name</label>' +
        '<input id="stu-name" type="text" autocomplete="name" required aria-required="true" aria-describedby="namehint" value="' + esc(S.name) + '" placeholder="Type your name"></div>' +
        '<p id="namehint" class="namehint' + (S.name ? ' ok' : '') + '">' + (S.name ? 'Saved on this device.' : 'Enter your name before starting so your teacher can see your work.') + '</p>' +
        '<div id="gate" role="alert"></div></div>' +
        '<div class="ring" role="img" aria-label="' + done + ' of ' + total + ' lessons done"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="rb" cx="60" cy="60" r="52"/>' +
        '<circle class="rf" cx="60" cy="60" r="52" stroke-dasharray="' + C + '" stroke-dashoffset="' + off + '"/></svg>' +
        '<div class="ring-t"><b>' + done + '</b><span>of ' + total + ' lessons</span></div></div>' +
        cta +
      '</section>' +
      '<div class="stats"><div class="stat xp"><b>' + S.xp + '</b><span>XP earned</span></div>' +
      '<div class="stat st"><b>' + stars() + '</b><span>Stars</span></div>' +
      '<div class="stat"><b>' + rightCount() + '</b><span>Questions right</span></div></div>' +
      '<div class="countdown">' +
        '<div class="cd t2"><b>' + p02 + '</b><span>days to <strong>Paper 02</strong><br>Tue 5 Jan, 9:00</span></div>' +
        '<div class="cd t4"><b>' + p01 + '</b><span>days to <strong>Paper 01</strong><br>Mon 25 Jan, 9:00</span></div>' +
        '<div class="cd t1"><b>' + (S.streak.n || 0) + '</b><span>day streak<br>finish a lesson a day</span></div>' +
      '</div>' +
      '<h2 class="sr">How each lesson works</h2>' +
      '<ol class="flow">' + FLOW.map(function (f) { return '<li>' + f[0] + (f[1] ? ' <span>' + f[1] + '</span>' : '') + '</li>'; }).join('') + '</ol>' +
      bySec + '</main>';
  }

  function saveName(v) {
    v = String(v || '').trim().replace(/\s+/g, ' ').slice(0, 60);
    if (v === S.name) return;
    S.name = v; save();
  }

  function bindHome() {
    var input = document.getElementById('stu-name');
    var hint = document.getElementById('namehint');
    var hello = document.querySelector('.hello');
    input.addEventListener('input', function () {
      saveName(input.value);
      input.removeAttribute('aria-invalid');
      document.getElementById('gate').innerHTML = '';
      hint.className = 'namehint' + (S.name ? ' ok' : '');
      hint.textContent = S.name ? 'Saved on this device.' : 'Enter your name before starting so your teacher can see your work.';
      hello.innerHTML = S.name ? 'Hi <span class="nm">' + esc(S.name) + '</span>' : 'Hi there';
    });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { input.blur(); var c = document.getElementById('cta'); if (c && S.name) c.focus(); } });
    // Name gate: no lesson starts without a name (PLAN.md §9)
    document.getElementById('main').addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#/lesson/"]');
      if (!a || S.name) return;
      e.preventDefault();
      showGate(input);
    });
  }
  function showGate(input) {
    input.setAttribute('aria-invalid', 'true');
    document.getElementById('gate').innerHTML = '<p class="name-gate">Type your name first, so your teacher can see your work.</p>';
    input.focus();
    input.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  // ---------- Book page ----------
  function bookPage(id) {
    var b = BOOK[id];
    if (!b) return notFound();
    var sec = SECTIONS[b.section];
    var data = (window.WB_BOOK || {})[id];
    var objs = data ? data.objectives : [];
    var objHTML = objs.length ? '<ul class="objs">' + objs.slice(0, 6).map(function (o) { return '<li><code>' + esc(o.code) + '</code><span>' + md(o.text) + '</span></li>'; }).join('') + '</ul>' +
      (objs.length > 6 ? '<details class="more"><summary>All ' + objs.length + ' objectives</summary><ul class="objs">' + objs.slice(6).map(function (o) { return '<li><code>' + esc(o.code) + '</code><span>' + md(o.text) + '</span></li>'; }).join('') + '</ul></details>' : '') : '';
    return '<main id="main" class="' + sec.color + '">' +
      '<p class="crumb"><a href="#/">' + (sec.id === 'X' ? 'Exam prep' : 'Section ' + sec.id + ' · ' + esc(sec.name)) + '</a> · ' + esc(bookLabel(b)) + '</p>' +
      '<section class="bookhead"><h1 tabindex="-1">' + md(b.title) + '</h1>' +
      (b.subtitle ? '<p class="sub">' + md(b.subtitle) + '</p>' : '') +
      (data ? '<p class="intro">' + md(data.intro) + '</p>' : bookErrors[id]
        ? '<p class="intro" role="alert">' + esc(bookErrors[id].message) + ' <button class="btn ghost" type="button" data-retry-book="' + esc(id) + '">Try again</button></p>'
        : '<p class="intro tiny">Loading…</p>') + objHTML + '</section>' +
      '<section class="topic ' + sec.color + '"><div class="topic-h"><span class="dot" aria-hidden="true"></span><h2 style="font-size:20px">Lessons</h2><span class="tprog">' + doneCount(b.lessons) + '/' + b.lessons.length + '</span></div>' +
      '<div class="daygrid">' + b.lessons.map(lessonCard).join('') + '</div></section></main>';
  }

  // ---------- Lesson renderer ----------
  function imageHTML(im, caption) {
    if (!im || !im.src) return '';
    var size = (im.w > 0 && im.h > 0) ? ' width="' + im.w + '" height="' + im.h + '"' : '';
    return '<figure class="figure"><picture><source srcset="' + esc(im.src) + '.webp" type="image/webp">' +
      '<img src="' + esc(im.src) + '.png" alt="' + esc(im.alt || '') + '"' + size + ' loading="lazy"></picture>' +
      (caption ? '<figcaption>' + md(caption) + '</figcaption>' : '') + '</figure>';
  }

  function blockHTML(b, lessonId) {
    var cls = 'lesson-block block-' + b.type;
    if (b.type === 'h') return '<h3 class="learn-h">' + md(b.text) + '</h3>';
    if (b.type === 'p') return '<p class="learn-p">' + md(b.text) + '</p>';
    if (b.type === 'bullets' || b.type === 'steps') {
      var tag = b.type === 'steps' ? 'ol' : 'ul';
      return '<' + tag + ' class="' + cls + '">' + (b.items || []).map(function (x) {
        return '<li>' + md(x) + '</li>';
      }).join('') + '</' + tag + '>';
    }
    if (b.type === 'def') return '<aside class="' + cls + '"><strong>' + md(b.term) + '</strong><p>' + md(b.text) + '</p></aside>';
    if (b.type === 'formula') {
      var formula = b.tex ? WBD.texHTML(b.tex, true) : md(b.text);
      return '<aside class="' + cls + '">' + (b.label ? '<span class="block-label">' + esc(b.label) + '</span>' : '') +
        '<div class="formula-main">' + formula + '</div>' +
        (b.where && b.where.length ? '<ul class="formula-where">' + b.where.map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ul>' : '') +
        '</aside>';
    }
    if (b.type === 'tip' || b.type === 'warn' || b.type === 'remember') {
      var label = b.label || (b.type === 'tip' ? 'Exam tip' : b.type === 'warn' ? 'Common mistake' : 'Remember');
      return '<aside class="' + cls + '"><strong>' + esc(label) + '</strong><p>' + md(b.text) + '</p></aside>';
    }
    if (b.type === 'img') return imageHTML(b, b.caption);
    if (b.type === 'table') {
      var head = b.headers && b.headers.length ? '<thead><tr>' + b.headers.map(function (x) { return '<th scope="col">' + md(x) + '</th>'; }).join('') + '</tr></thead>' : '';
      return '<div class="table-wrap" role="region" aria-label="Lesson table" tabindex="0"><table class="lesson-table">' + head +
        '<tbody>' + (b.rows || []).map(function (row) { return '<tr>' + row.map(function (x) { return '<td>' + md(x) + '</td>'; }).join('') + '</tr>'; }).join('') +
        '</tbody></table></div>';
    }
    if (b.type === 'fill') {
      var lines = Math.max(1, Math.min(5, Number(b.lines) || 1));
      var fillId = 'fill-' + blockHTML.nextFill++;
      var state = lessonState(lessonId), value = state && state.fills ? state.fills[fillId] : '';
      return '<div class="' + cls + '"><div>' + md(b.text) + '</div><label class="sr" for="' + fillId + '">Your response</label>' +
        '<textarea id="' + fillId + '" data-fill-key="' + fillId + '" rows="' + lines + '" aria-label="Your response">' + esc(value || '') + '</textarea></div>';
    }
    if (b.type === 'lines') {
      var count = Math.max(1, Math.min(8, Number(b.n) || 3)), out = '<div class="' + cls + '" aria-hidden="true">';
      for (var i = 0; i < count; i++) out += '<span></span>';
      return out + '</div>';
    }
    throw new Error('Unsupported lesson block type: ' + b.type);
  }
  blockHTML.nextFill = 0;

  function blocksHTML(list, lessonId) {
    return (list || []).map(function (block) { return blockHTML(block, lessonId); }).join('');
  }

  function exampleHTML(ex, index) {
    var steps = ex.steps || [];
    var stepHTML = steps.map(function (step, i) {
      return '<li class="example-step"' + (i ? ' hidden' : '') + '>' +
        (step.label ? '<strong>' + md(step.label) + '</strong>' : '') + '<div>' + md(step.text) + '</div></li>';
    }).join('');
    return '<article class="example" data-example="' + esc(ex.id) + '">' +
      '<div class="example-title"><span>Example ' + (index + 1) + '</span><h4>' + md(ex.title) + '</h4></div>' +
      '<p>' + md(ex.question) + '</p>' + imageHTML(ex.img, '') +
      '<ol class="example-steps">' + stepHTML + '</ol>' +
      '<div class="example-answer" hidden><strong>Answer</strong><p>' + md(ex.answer) + '</p></div>' +
      '<button class="btn ghost step-btn" type="button" data-stepper>Show next step</button></article>';
  }

  function selfMarkPoints(item) {
    return item.points && item.points.length ? item.points : [{ text: item.scheme || '', marks: Number(item.marks || 1) }];
  }

  function selfMarks(item, ticks) {
    var earned = selfMarkPoints(item).reduce(function (sum, point, i) {
      return ticks && ticks.indexOf(i) >= 0 ? sum + Number(point.marks || 1) : sum;
    }, 0);
    return Math.min(Number(item.marks || 1), earned);
  }

  function keypadHTML(controlId, disabled) {
    var keys = [['×', '×'], ['÷', '÷'], ['−', '−'], ['²', '²'], ['³', '³'], ['√', '√'],
      ['π', 'π'], ['θ', 'θ'], ['λ', 'λ'], ['ρ', 'ρ'], ['Ω', 'Ω'], ['μ', 'μ'],
      ['Δ', 'Δ'], ['°', '°'], ['⁻¹', '⁻¹'], ['×10ⁿ', '×10^']];
    return '<div class="keypad" role="group" aria-label="Symbol keypad">' + keys.map(function (key) {
      return '<button type="button" data-keypad-for="' + esc(controlId) + '" data-keypad-value="' + esc(key[1]) + '"' +
        (disabled ? ' disabled' : '') + '>' + key[0] + '</button>';
    }).join('') + '</div>';
  }

  function plainMath(text) {
    return String(text || '').replace(/⟪([^⟫]+)⟫/g, '$1').replace(/\*\*|__/g, '').replace(/\^([^ ^]+)\^/g, '$1').replace(/~([^ ~]+)~/g, '$1');
  }

  function axisDefinition(expression) {
    var source = plainMath(expression).toLowerCase().replace(/[()[\]]/g, ' ').replace(/\s+/g, ' ').trim();
    var transform = 'identity', power = 1, symbolMatch;
    if ((symbolMatch = /sin\s+([a-zθλρ])/i.exec(source))) {
      transform = 'sin';
    } else if ((symbolMatch = /1\s*\/\s*([a-zθλρ])\s*(\^?\s*2)?/i.exec(source))) {
      transform = symbolMatch[2] ? 'inverse-square' : 'inverse';
    } else {
      symbolMatch = /,\s*([a-zθλρ])/i.exec(source) ||
        (/^[a-zθλρ]\s*[a-z]?$/.test(source) ? [source, source.trim()[0]] : null);
    }
    return { source: source, symbol: symbolMatch ? symbolMatch[1].toLowerCase() : '', transform: transform, power: power };
  }

  function labelHasSymbol(label, symbol) {
    var text = plainMath(label).toLowerCase();
    return new RegExp('(?:^|[^a-zθλρ])' + symbol + '(?:s)?(?:$|[^a-zθλρ])').test(text);
  }

  function sourceValues(tables, axis, multi) {
    var values = [];
    function numbers(cells) {
      return cells.map(function (cell) {
        var number = window.WBC.parseNumber(plainMath(cell));
        return number ? number.value : null;
      });
    }
    tables.forEach(function (table) {
      var header = table.headers || [], rows = table.rows || [], headerSource = axis.symbol && labelHasSymbol(header[0], axis.symbol);
      var row = null;
      if (!headerSource) {
        row = rows.find(function (cells) { return axis.symbol && labelHasSymbol(cells[0], axis.symbol); });
        if (!row && !axis.symbol) {
          var search = axis.source.replace(/[^a-z ]/g, ' ').replace(/\b(the|of|against|graph|axis|y|x)\b/g, '').trim();
          if (search.length > 3) {
            var headerLabel = plainMath(header[0] || '').toLowerCase().replace(/[^a-z ]/g, '').trim();
            headerSource = headerLabel.indexOf(search) >= 0 || search.indexOf(headerLabel) >= 0;
            if (!headerSource) row = rows.find(function (cells) {
              var rowLabel = plainMath(cells[0]).toLowerCase().replace(/[^a-z ]/g, '').trim();
              return rowLabel.indexOf(search) >= 0 || search.indexOf(rowLabel) >= 0;
            });
          }
        }
      }
      if (!headerSource && !row && /\bextension\b/.test(axis.source)) {
        var lengthRow = rows.find(function (cells) { return /\blength\b/i.test(plainMath(cells[0])); });
        if (lengthRow) {
          var lengths = numbers(lengthRow.slice(1)), initialLength = lengths.find(function (value) { return value != null; });
          values = values.concat(lengths.map(function (value) { return value == null ? null : value - initialLength; }));
          return;
        }
      }
      if (!headerSource && !row) return;
      var cells = headerSource ? header.slice(1) : row.slice(1);
      var current = numbers(cells);
      if (current.every(function (value) { return value == null; }) && /\bextension\b/.test(axis.source)) {
        var lengthRow = rows.find(function (cells) { return /\blength\b/i.test(plainMath(cells[0])); });
        if (lengthRow) {
          var lengths = numbers(lengthRow.slice(1)), initialLength = lengths.find(function (value) { return value != null; });
          current = lengths.map(function (value) { return value == null ? null : value - initialLength; });
        }
      }
      if (current.some(function (value) { return value == null; })) {
        if (/\bcorrected count rate\b/.test(axis.source)) {
          var measured = rows.find(function (cells) { return /\bmeasured count rate\b/i.test(plainMath(cells[0])); });
          var backgroundMatch = /background count rate as\s+(\d+(?:\.\d+)?)/i.exec((multi.stem || []).join(' '));
          if (measured && backgroundMatch) {
            var measuredValues = numbers(measured.slice(1)), background = Number(backgroundMatch[1]);
            current = current.map(function (value, index) { return value == null && measuredValues[index] != null ? measuredValues[index] - background : value; });
          }
        } else if (/^f$/.test(axis.symbol || '')) {
          var mass = rows.find(function (cells) { return /Δm/i.test(plainMath(cells[0])); });
          if (mass) {
            var masses = numbers(mass.slice(1));
            current = current.map(function (value, index) { return value == null && masses[index] != null ? masses[index] * 10 : value; });
          }
        } else if (/^r$/.test(axis.symbol || '')) {
          var voltage = rows.find(function (cells) { return labelHasSymbol(cells[0], 'v'); });
          var currentRow = rows.find(function (cells) { return labelHasSymbol(cells[0], 'i'); });
          if (voltage && currentRow) {
            var volts = numbers(voltage.slice(1)), amps = numbers(currentRow.slice(1));
            current = current.map(function (value, index) { return value == null && amps[index] ? volts[index] / amps[index] : value; });
          }
        }
      }
      current.forEach(function (rawValue) {
        if (rawValue == null) { values.push(null); return; }
        var value = rawValue;
        if (axis.transform === 'sin') value = Math.sin(value * Math.PI / 180);
        else if (axis.transform === 'inverse') value = 1 / value;
        else if (axis.transform === 'inverse-square') value = 1 / (value * value);
        values.push(Number.isFinite(value) ? value : null);
      });
    });
    return values;
  }

  function niceAxis(values) {
    var low = Math.min.apply(Math, values), high = Math.max.apply(Math, values);
    if (low === high) { low -= 1; high += 1; }
    var rough = (high - low) / 5, magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
    var factor = rough / magnitude, step = (factor <= 1 ? 1 : factor <= 2 ? 2 : factor <= 5 ? 5 : 10) * magnitude;
    var min = Math.floor(low / step) * step, max = Math.ceil(high / step) * step;
    if (min === max) max += step;
    return { min: min, max: max, step: step };
  }

  function graphConfig(multi, part) {
    var question = plainMath(part.q), xMatch = /against\s+(.+?)\s*\(x-axis\)/i.exec(question);
    var yMatch = /graph of\s+(.+?)\s*\(y-axis\)/i.exec(question);
    if (!xMatch || !yMatch) return null;
    var xAxis = axisDefinition(xMatch[1]), yAxis = axisDefinition(yMatch[1]);
    var tables = (multi.stemBlocks || []).filter(function (block) { return block.type === 'table'; });
    var xValues = sourceValues(tables, xAxis, multi), yValues = sourceValues(tables, yAxis, multi);
    var points = [];
    for (var i = 0; i < Math.min(xValues.length, yValues.length); i++) {
      if (xValues[i] != null && yValues[i] != null) points.push({ x: xValues[i], y: yValues[i] });
    }
    if (points.length < 2) return null;
    return {
      xLabel: plainMath(xMatch[1]).trim(), yLabel: plainMath(yMatch[1]).trim(),
      points: points, x: niceAxis(points.map(function (point) { return point.x; })),
      y: niceAxis(points.map(function (point) { return point.y; })),
    };
  }

  function graphXY(config, x, y) {
    var left = 62, top = 18, width = 546, height = 322;
    return {
      x: left + (x - config.x.min) / (config.x.max - config.x.min) * width,
      y: top + height - (y - config.y.min) / (config.y.max - config.y.min) * height,
    };
  }

  function graphHTML(multi, part, saved) {
    var config = graphConfig(multi, part);
    if (!config) return '<p class="graph-unavailable">Interactive graph axes could not be determined from the question table. Use the grid image below and self-mark the graph.</p>' +
      imageHTML(part.img, 'Printable graph grid');
    var state = saved.graph || { points: [] };
    var graphId = 'graph-' + part.id;
    var xTicks = [], yTicks = [], i;
    for (i = 0; i <= 5; i++) {
      xTicks.push(config.x.min + (config.x.max - config.x.min) * i / 5);
      yTicks.push(config.y.min + (config.y.max - config.y.min) * i / 5);
    }
    var grid = xTicks.map(function (value) {
      var x = graphXY(config, value, config.y.min).x;
      return '<line class="graph-gridline" x1="' + x + '" y1="18" x2="' + x + '" y2="340"/>' +
        '<text class="graph-tick" x="' + x + '" y="360">' + Number(value.toPrecision(3)) + '</text>';
    }).join('') + yTicks.map(function (value) {
      var y = graphXY(config, config.x.min, value).y;
      return '<line class="graph-gridline" x1="62" y1="' + y + '" x2="608" y2="' + y + '"/>' +
        '<text class="graph-tick" x="53" y="' + (y + 4) + '" text-anchor="end">' + Number(value.toPrecision(3)) + '</text>';
    }).join('');
    var labels = '<text class="graph-axis-label" x="335" y="400" text-anchor="middle">' + esc(config.xLabel) + '</text>' +
      '<text class="graph-axis-label" x="16" y="180" text-anchor="middle" transform="rotate(-90 16 180)">' + esc(config.yLabel) + '</text>';
    var overlay = '<g class="graph-overlay"></g>';
    var encoded = esc(JSON.stringify(config));
    return '<section class="graph-widget' + (state.paperMode ? ' paper-mode' : '') + '" data-graph-widget="' + esc(part.id) + '">' +
      '<p>Tap the grid to plot the table values: <b class="graph-plotted">' + (state.points || []).length + ' / ' + config.points.length + '</b> points plotted.</p>' +
      '<svg class="interactive-graph" viewBox="0 0 640 420" role="img" aria-label="Interactive graph grid for ' + esc(config.yLabel) + ' against ' + esc(config.xLabel) + '"' +
      ' data-graph-svg="' + esc(part.id) + '" data-config="' + encoded + '">' +
      '<rect class="graph-paper" x="0" y="0" width="640" height="420"/>' + grid +
      '<line class="graph-axis" x1="62" y1="18" x2="62" y2="340"/><line class="graph-axis" x1="62" y1="340" x2="608" y2="340"/>' +
      '<rect class="graph-hit" data-graph-hit="' + esc(part.id) + '" x="62" y="18" width="546" height="322"/>' +
      labels + overlay + '</svg>' +
      '<div class="graph-actions"><button class="btn ghost" type="button" data-graph-line="' + esc(part.id) + '">Set best-fit line</button>' +
      '<button class="btn ghost" type="button" data-graph-triangle="' + esc(part.id) + '"' + (state.line ? '' : ' disabled') + '>Show gradient triangle</button>' +
      '<button class="btn ghost" type="button" data-graph-clear="' + esc(part.id) + '">Clear graph</button></div>' +
      '<button class="btn ghost graph-paper-toggle" type="button" data-graph-paper="' + esc(part.id) + '">' +
      (state.paperMode ? 'Return to interactive graph' : 'I’ll do this on paper') + '</button>' +
      '<div class="graph-coordinate-controls"><label for="' + graphId + '-x">x coordinate (' + esc(config.xLabel) + ')</label>' +
      '<input id="' + graphId + '-x" type="number" step="any" data-graph-coordinate="x" aria-label="x coordinate for plotted point">' +
      '<label for="' + graphId + '-y">y coordinate (' + esc(config.yLabel) + ')</label>' +
      '<input id="' + graphId + '-y" type="number" step="any" data-graph-coordinate="y" aria-label="y coordinate for plotted point">' +
      '<button class="btn ghost" type="button" data-graph-add-point="' + esc(part.id) + '">Plot coordinates</button></div>' +
      '<p class="graph-status" role="status" aria-live="polite">' + (state.lineMode ? 'Tap two points on the grid to set the line.' : state.line ? 'Drag the line handles to adjust the best-fit line.' : 'Plot the points, then set a best-fit line.') + '</p>' +
      '<p class="graph-gradient" aria-live="polite">' + (state.line ? 'Gradient: ' + (state.gradient == null ? '—' : Number(state.gradient.toPrecision(4))) : '') + '</p>' +
      '<div class="print-graph">' + imageHTML(part.img, 'Printable graph grid') + '</div></section>';
  }

  function drawGraph(svg, config, state) {
    var group = svg.querySelector('.graph-overlay');
    if (!group) return;
    group.innerHTML = '';
    var ns = 'http://www.w3.org/2000/svg';
    function element(name, attrs) {
      var node = document.createElementNS(ns, name);
      Object.keys(attrs).forEach(function (key) { node.setAttribute(key, attrs[key]); });
      group.appendChild(node);
      return node;
    }
    (state.points || []).forEach(function (point, index) {
      var position = graphXY(config, point.x, point.y);
      element('circle', { class: 'graph-point', cx: position.x, cy: position.y, r: 6, 'aria-label': 'Plotted point ' + (index + 1) });
    });
    if (state.line) {
      var a = graphXY(config, state.line[0].x, state.line[0].y), b = graphXY(config, state.line[1].x, state.line[1].y);
      element('line', { class: 'best-fit-line', x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      [a, b].forEach(function (position, index) {
        element('circle', { class: 'graph-handle', cx: position.x, cy: position.y, r: 9, tabindex: 0,
          role: 'slider', 'aria-label': 'Best-fit line handle ' + (index + 1),
          'aria-valuetext': Number(state.line[index].x.toPrecision(4)) + ', ' + Number(state.line[index].y.toPrecision(4)),
          'data-graph-handle': String(index) });
      });
      if (state.triangle) {
        element('path', { class: 'gradient-triangle', d: 'M ' + a.x + ' ' + a.y + ' L ' + b.x + ' ' + a.y + ' L ' + b.x + ' ' + b.y + ' Z' });
        var dxLabel = element('text', { class: 'graph-triangle-label', x: (a.x + b.x) / 2, y: a.y + 18, 'text-anchor': 'middle' });
        dxLabel.textContent = 'Δx';
        var dyLabel = element('text', { class: 'graph-triangle-label', x: b.x - 8, y: (a.y + b.y) / 2, 'text-anchor': 'end' });
        dyLabel.textContent = 'Δy';
      }
    }
    var count = svg.closest('.graph-widget').querySelector('.graph-plotted');
    if (count) count.textContent = (state.points || []).length + ' / ' + config.points.length;
    var status = svg.closest('.graph-widget').querySelector('.graph-status');
    if (status) status.textContent = state.lineMode ? 'Tap two points on the grid to set the line.' : state.line ? 'Drag the line handles to adjust the best-fit line.' : 'Plot the points, then set a best-fit line.';
    var gradient = svg.closest('.graph-widget').querySelector('.graph-gradient');
    if (gradient && state.line) {
      var deltaX = state.line[1].x - state.line[0].x, deltaY = state.line[1].y - state.line[0].y;
      gradient.textContent = deltaX
        ? 'Gradient = Δy / Δx = ' + Number(deltaY.toPrecision(4)) + ' / ' + Number(deltaX.toPrecision(4)) +
          ' = ' + Number(state.gradient.toPrecision(4))
        : 'Gradient undefined: Δx is zero.';
    } else if (gradient) gradient.textContent = '';
  }

  function questionHTML(item, label, showHint, lessonId, behavior) {
    behavior = behavior || {};
    var controlId = 'answer-' + item.id;
    var lesson = lessonState(lessonId), saved = lesson && lesson.i ? lesson.i[item.id] || {} : {};
    var answer = saved.ans || '', disabled = !!saved.right ||
      ((behavior.mockPaper === 'P02' || behavior.mockPaper === 'P01') && behavior.mockSubmitted);
    var marks = Number(item.marks || 1), dots = Math.max(1, Math.min(3, Number(item.level) || 1));
    var input = item.options && item.options.length
      ? '<fieldset class="answer-options"><legend class="sr">Choose an answer</legend>' + item.options.map(function (option, i) {
        var optionId = controlId + '-' + i, value = String.fromCharCode(65 + i);
        return '<label for="' + optionId + '"><input id="' + optionId + '" type="radio" name="' + controlId + '" value="' + value + '"' +
          (answer === value ? ' checked' : '') + (disabled ? ' disabled' : '') + '><span>' + value + '.</span> ' + md(option) + '</label>';
      }).join('') + '</fieldset>'
      : '<label class="answer-label" for="' + controlId + '">Your answer</label><textarea id="' + controlId + '" rows="' +
        Math.max(2, Math.min(6, Number(item.lines) || 3)) + '"' + (disabled ? ' disabled' : '') + '>' + esc(answer) + '</textarea>' +
        keypadHTML(controlId, disabled);
    var feedback = '';
    if (saved.selfSubmitted && !behavior.mockPaper) {
      var score = Number(saved.score || 0), earned = Number(saved.xpEarned || 0);
      feedback = '<div class="feedback ' + (saved.right ? 'correct' : 'self-result') + '">' +
        (saved.right ? '✓ Full marks — ' : 'Self-mark recorded — ') + score + ' / ' + marks + ' marks. +' + earned + ' XP.</div>';
    } else if (saved.checked && !behavior.mockPaper) {
      feedback = saved.right
        ? '<div class="feedback correct">✓ Correct — +' + Number(saved.xpEarned || 0) + ' XP.</div>'
        : '<div class="feedback incorrect">Not quite — try again.' + (Number(saved.tries) >= 2 ? ' The model solution is shown below.' : '') + '</div>';
    }
    var actions = '';
    if (item.kind === 'self') {
      var shown = !!saved.schemeShown || (behavior.mockPaper === 'P02' && behavior.mockSubmitted);
      var points = selfMarkPoints(item);
      var ticks = saved.ticks || [];
      var pointsHTML = points.map(function (point, i) {
        var pointMarks = Number(point.marks || 1);
        return '<label class="mark-point"><input type="checkbox" data-mark-index="' + i + '"' +
          (ticks.indexOf(i) >= 0 ? ' checked' : '') + (saved.right ? ' disabled' : '') + '><span><b>' + pointMarks +
          ' mark' + (pointMarks === 1 ? '' : 's') + ':</b> ' + md(point.text) + '</span></label>';
      }).join('');
      actions = (shown
        ? '<div class="mark-scheme"><p>Tick the mark points you earned; each point’s mark value is shown.</p>' + pointsHTML +
          '<p class="self-score" aria-live="polite">' + selfMarks(item, ticks) + ' / ' + marks + ' marks selected</p>' +
          '<button class="btn" type="button" data-self-mark="' + esc(item.id) + '"' + (behavior.mockPaper === 'P02' && !behavior.mockSubmitted ? ' disabled' : '') + '>Save self-mark</button></div>'
        : behavior.mockPaper === 'P02' && !behavior.mockSubmitted
          ? '<p class="mock-locked-note">The mark scheme opens after you submit the paper.</p>'
          : '<button class="btn ghost" type="button" data-show-scheme="' + esc(item.id) + '">Show mark scheme</button>');
    } else {
      actions = behavior.mockPaper === 'P01'
        ? ''
        : '<button class="btn" type="button" data-check-item="' + esc(item.id) + '"' + (disabled ? ' disabled' : '') + '>Check answer</button>';
    }
    var hint = showHint && item.hint
      ? '<details class="hint"' + (saved.hint ? ' open' : '') + ' data-hint-cost="' + (item.section === 'practice' ? '2' : '0') + '">' +
        '<summary>Hint' + (item.section === 'practice' ? ' · 2 XP in Practice' : '') + '</summary>' +
        (saved.hint && item.section === 'practice' ? '<p class="hint-cost">' + (Number(saved.hintCost || 0) ? Number(saved.hintCost) + ' XP spent.' : 'No XP available to deduct; this hint was free.') + '</p>' : '') +
        '<p>' + md(item.hint.text) + '</p></details>' : '';
    var solution = '';
    if (item.kind === 'mcq' && saved.checked && !behavior.mockPaper) {
      solution += '<div class="solution"><strong>Explanation</strong><p>' + md(item.explanation || '') + '</p></div>';
    }
    if (behavior.mockPaper === 'P01' && behavior.mockSubmitted) {
      var isCorrect = String(saved.ans || '').toUpperCase() === String(item.answer || '').toUpperCase();
      solution += '<div class="feedback ' + (isCorrect ? 'correct' : 'incorrect') + '">' +
        (isCorrect ? '✓ Correct.' : 'Incorrect. Correct answer: ' + esc(item.answer) + '.') + '</div>' +
        '<div class="solution"><strong>Explanation</strong><p>' + md(item.explanation || '') + '</p></div>';
    }
    if (item.kind !== 'self' && item.kind !== 'mcq' && (saved.right || Number(saved.tries) >= 2)) {
      solution += '<details class="solution"' + (saved.right ? '' : ' open') + '><summary>Model solution</summary><p>' + md(item.scheme || '') + '</p></details>';
    }
    if (item.kind === 'mcq' && Number(saved.tries) >= 2 && !saved.right) {
      solution += '<details class="solution" open><summary>Model solution</summary><p>' + md(item.scheme || '') + '</p></details>';
    }
    return '<article class="question-card" data-item="' + esc(item.id) + '" data-item-kind="' + esc(item.kind) + '">' +
      '<div class="question-head"><span class="q-number">' + esc(label) + '</span><span class="q-marks">' + marks + ' mark' +
      (marks === 1 ? '' : 's') + '</span><span class="level" role="img" aria-label="Level ' + dots + ' of 3">' +
      '<span aria-hidden="true">' + '●'.repeat(dots) + '<span class="level-off">' + '●'.repeat(3 - dots) + '</span></span></span></div>' +
      '<div class="question-prompt">' + md(item.q) + '</div>' + blocksHTML(item.blocks, lessonId) + (item.grid ? '' : imageHTML(item.img, '')) +
      input + actions + '<div class="feedback-slot" role="status" aria-live="polite">' + feedback + '</div>' + solution +
      (behavior.mockPaper ? '' : hint) + '</article>';
  }

  function questionList(items, prefix, showHint, lessonId) {
    return (items || []).map(function (item, i) { return questionHTML(item, prefix + (i + 1), showHint, lessonId); }).join('');
  }

  function multiHTML(question, lessonId, behavior) {
    var lesson = lessonState(lessonId) || {}, itemState = lesson.i || {};
    var earned = question.parts.reduce(function (sum, part) {
      var saved = itemState[part.id];
      return sum + (saved && saved.selfSubmitted ? Number(saved.score || 0) : 0);
    }, 0);
    var parts = question.parts.map(function (part) {
      var saved = itemState[part.id] || {};
      var graph = part.grid ? graphHTML(question, part, saved) : '';
      return '<section class="multi-part" data-multi-part="' + esc(part.id) + '">' + graph +
        questionHTML(part, part.label, false, lessonId, behavior) + '</section>';
    }).join('');
    return '<article class="structured-question" data-structured="' + esc(question.id) + '">' +
      (question.title ? '<h3>' + md(question.title) + '</h3>' : '') +
      '<div class="structured-stem">' + (question.stem || []).map(function (line) { return '<p>' + md(line) + '</p>'; }).join('') +
      blocksHTML(question.stemBlocks, lessonId) + '</div>' +
      '<p class="multi-total">Self-mark total: <b data-multi-score>' + earned + ' / ' + Number(question.total || 0) + '</b> marks</p>' +
      parts + '</article>';
  }

  function finishHTML(lessonId, st) {
    return '<section class="finish-card"><div><span class="block-label">Show your teacher</span>' +
      '<h2>' + (st.finished ? 'Lesson complete' : 'Finish & show your teacher') + '</h2>' +
      '<p>' + (st.finished ? 'Your progress is saved on this device. You can revisit any part of this lesson.' : 'Take a moment to say how today went. Your progress saves on this device.') + '</p></div>' +
      '<form id="finish-form"><fieldset class="feelings"><legend>How do you feel about today?</legend>' +
      [['can', 'I can do this'], ['nearly', 'Nearly there'], ['help', 'I need help']].map(function (x) {
        return '<label><input type="radio" name="feel" value="' + x[0] + '"' + (st.feel === x[0] ? ' checked' : '') + '><span>' + x[1] + '</span></label>';
      }).join('') + '</fieldset><label class="answer-label" for="teacher-question">My question for my teacher</label>' +
      '<textarea id="teacher-question" rows="3" maxlength="1000">' + esc(st.question || '') + '</textarea>' +
      '<button class="btn" type="submit">' + (st.finished ? 'Update lesson reflection' : 'Finish this day') + '</button>' +
      '<p class="finish-status" role="status" aria-live="polite"></p></form></section>';
  }

  function logHTML(lessonId) {
    var meta = LESSON[lessonId], rows = S.log && S.log[meta.book] || [];
    var body = rows.map(function (entry, i) {
      return '<tr><td><label class="sr" for="log-year-' + i + '">Year</label><input id="log-year-' + i + '" data-log-index="' + i + '" data-log-field="year" value="' + esc(entry.year || '') + '" inputmode="numeric"></td>' +
        '<td><label class="sr" for="log-question-' + i + '">Question</label><input id="log-question-' + i + '" data-log-index="' + i + '" data-log-field="question" value="' + esc(entry.question || '') + '"></td>' +
        '<td><label class="sr" for="log-topic-' + i + '">Topic</label><input id="log-topic-' + i + '" data-log-index="' + i + '" data-log-field="topic" value="' + esc(entry.topic || '') + '"></td>' +
        '<td><label class="sr" for="log-score-' + i + '">Score</label><input id="log-score-' + i + '" data-log-index="' + i + '" data-log-field="score" value="' + esc(entry.score || '') + '" inputmode="decimal"></td>' +
        '<td><label class="sr" for="log-total-' + i + '">Marks available</label><input id="log-total-' + i + '" data-log-index="' + i + '" data-log-field="outOf" value="' + esc(entry.outOf || '') + '" inputmode="decimal"></td>' +
        '<td><button class="btn ghost log-remove" type="button" data-remove-log="' + i + '" aria-label="Remove log row ' + (i + 1) + '">Remove</button></td></tr>';
    }).join('');
    return '<section class="past-log"><h2>Past Paper Log</h2><p>Record a real past-paper question you practise from your booklet.</p>' +
      '<div class="table-wrap" role="region" aria-label="Past Paper Log" tabindex="0"><table class="lesson-table"><thead><tr><th scope="col">Year</th><th scope="col">Question</th><th scope="col">Topic</th><th scope="col">Score</th><th scope="col">Out of</th><th scope="col">Action</th></tr></thead>' +
      '<tbody>' + body + '</tbody></table></div><button class="btn ghost" type="button" data-add-log="' + esc(meta.book) + '">Add log entry</button></section>';
  }

  function checkLessonHTML(lesson, lessonId) {
    var mcq = (lesson.mcq || []).map(function (item, i) { return questionHTML(item, 'MCQ ' + (i + 1), false, lessonId); }).join('');
    var structured = (lesson.structured || []).map(function (question) { return multiHTML(question, lessonId); }).join('');
    var watchOut = (lesson.watchOut || []).length
      ? '<aside class="block-warn"><strong>Watch out</strong><ul>' + lesson.watchOut.map(function (text) { return '<li>' + md(text) + '</li>'; }).join('') + '</ul></aside>' : '';
    return '<div id="lessonbody" data-loaded="true"><section class="exam-intro"><p>Work through the Paper 01 multiple-choice and Paper 02 structured questions. Check answers after you have tried them.</p>' +
      watchOut + '</section>' +
      (mcq ? '<section class="lesson-section"><header class="lesson-section-head"><div><span class="block-label">Paper 01</span><h2>Multiple choice</h2></div><p>Choose one answer, then check it.</p></header><div class="lesson-section-body">' + mcq + '</div></section>' : '') +
      (structured ? '<section class="lesson-section"><header class="lesson-section-head"><div><span class="block-label">Paper 02</span><h2>Structured questions</h2></div><p>Write your response, then compare it with the mark scheme and self-mark.</p></header><div class="lesson-section-body">' + structured + '</div></section>' : '') +
      finishHTML(lessonId, lessonState(lessonId) || {}) + '</div>';
  }

  function pastLessonHTML(lesson, lessonId) {
    var questions = (lesson.questions || []).map(function (question) { return multiHTML(question, lessonId); }).join('');
    return '<div id="lessonbody" data-loaded="true"><section class="exam-intro"><p>Practise the original CSEC-style questions. Show each mark scheme after attempting the part, then tick the marks you earned.</p></section>' +
      questions + logHTML(lessonId) + finishHTML(lessonId, lessonState(lessonId) || {}) + '</div>';
  }

  function mockState(lessonId) {
    var state = lessonState(lessonId);
    if (!state) {
      state = { i: {}, started: false, finished: false };
      S.l[lessonId] = state;
    }
    if (!state.mock) state.mock = { answers: {} };
    if (!state.mock.answers) state.mock.answers = {};
    if (!state.i) state.i = {};
    return state.mock;
  }

  function mockRemaining(mock, lesson) {
    if (!mock.startedAt) return Number(lesson.minutes || 0) * 60;
    return Math.ceil((new Date(mock.startedAt).getTime() + Number(lesson.minutes || 0) * 60000 - Date.now()) / 1000);
  }

  function clockText(seconds) {
    var n = Math.max(0, Math.abs(seconds)), hours = Math.floor(n / 3600);
    var minutes = Math.floor((n % 3600) / 60), rest = n % 60;
    var clock = (hours ? String(hours).padStart(2, '0') + ':' : '') +
      String(minutes).padStart(2, '0') + ':' + String(rest).padStart(2, '0');
    return seconds < 0 ? '−' + clock : clock;
  }

  function mockResults(lesson, state) {
    if (lesson.paper === 'P01') {
      var bySection = {}, score = 0, answered = 0;
      (lesson.mcq || []).forEach(function (item) {
        var saved = state.i && state.i[item.id], correct = saved && String(saved.ans || '').toUpperCase() === String(item.answer || '').toUpperCase();
        var section = item.section || '?';
        if (!bySection[section]) bySection[section] = { score: 0, total: 0, revise: new Set() };
        bySection[section].total++;
        if (item.revise) bySection[section].revise.add(item.revise);
        if (saved && saved.ans) answered++;
        if (correct) { score++; bySection[section].score++; }
      });
      return { score: score, total: Number(lesson.total || lesson.mcq.length), answered: answered, sections: bySection };
    }
    var marks = 0, total = 0, marked = 0;
    (lesson.questions || []).forEach(function (question) {
      (question.parts || []).forEach(function (part) {
        total += Number(part.marks || 1);
        var saved = state.i && state.i[part.id];
        if (saved && saved.selfSubmitted) { marked++; marks += Number(saved.score || 0); }
      });
    });
    return { score: marks, total: Number(lesson.total || total), answered: marked, parts: marked, partTotal: (lesson.questions || []).reduce(function (n, q) { return n + q.parts.length; }, 0) };
  }

  function p01AnswerGrid(lesson, state, submitted) {
    var nav = (lesson.mcq || []).map(function (item, index) {
      var answer = state.i && state.i[item.id] && state.i[item.id].ans;
      var letters = ['A', 'B', 'C', 'D'].map(function (letter) {
        return '<button type="button" class="mock-bubble' + (answer === letter ? ' selected' : '') + '"' +
          ' data-mock-choice-for="' + esc(item.id) + '" data-mock-choice="' + letter + '"' +
          ' aria-label="Question ' + (index + 1) + ', choose ' + letter + '" aria-pressed="' + (answer === letter) + '"' +
          (submitted ? ' disabled' : '') + '>' + letter + '</button>';
      }).join('');
      return '<div class="mock-answer-row"><button type="button" class="mock-grid-cell' + (answer ? ' answered' : '') + '"' +
        ' data-mock-jump="' + esc(item.id) + '" aria-label="Go to question ' + (index + 1) +
        (answer ? ', answered ' + answer : ', unanswered') + '">' + (index + 1) + '</button>' + letters + '</div>';
    }).join('');
    return '<section class="mock-answer-grid" aria-label="Paper 01 answer grid"><h2>Answer grid</h2>' + nav + '</section>';
  }

  function p01ResultsHTML(lesson, result) {
    var rows = Object.keys(result.sections).sort().map(function (section) {
      var data = result.sections[section];
      var links = Array.from(data.revise).map(function (bookId) {
        return BOOK[bookId] ? '<a href="#/book/' + esc(bookId) + '">' + esc(BOOK[bookId].title) + '</a>' : '';
      }).filter(Boolean).join(', ');
      return '<tr><th scope="row">Section ' + esc(section) + '</th><td>' + data.score + ' / ' + data.total + '</td><td>' + (links || 'Review your notes') + '</td></tr>';
    }).join('');
    return '<section class="mock-results" data-mock-results><h2>Paper 01 results</h2>' +
      '<p class="mock-total">' + result.score + ' / ' + result.total + ' correct · ' + result.answered + ' / ' + result.total + ' answered</p>' +
      '<div class="table-wrap" role="region" aria-label="Scores and revision links" tabindex="0"><table class="lesson-table">' +
      '<thead><tr><th scope="col">Section</th><th scope="col">Score</th><th scope="col">What to revise</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p>Review the explanations below, then use the section links to choose your next revision topic.</p></section>';
  }

  function p02ResultsHTML(lesson, result) {
    if (result.parts < result.partTotal) {
      return '<section class="mock-results mock-results-pending"><h2>Self-mark your paper</h2><p>You have marked ' +
        result.parts + ' of ' + result.partTotal + ' parts. The total and grade guide appear when every part has been marked.</p>' +
        '<p class="mock-total">' + result.score + ' / ' + result.total + ' marks recorded so far</p></section>';
    }
    var grade = lesson.grades.find(function (band) { return result.score >= band.min && result.score <= band.max; });
    return '<section class="mock-results" data-mock-results><h2>Paper 02 results</h2>' +
      '<p class="mock-total">' + result.score + ' / ' + result.total + ' marks</p>' +
      (grade ? '<p><strong>Grade-guide band ' + esc(grade.grade) + '</strong> · ' + md(grade.todo) + '</p>' : '') +
      '<p>Use your mark breakdown to pick the next topic to practise with your teacher.</p></section>';
  }

  function mockLessonHTML(lesson, lessonId) {
    var st = lessonState(lessonId) || {}, mock = st.mock || { answers: {} };
    var submitted = !!mock.submittedAt, started = !!mock.startedAt, remaining = started ? mockRemaining(mock, lesson) : lesson.minutes * 60;
    if (!started) {
      return '<div id="lessonbody" data-loaded="true"><section class="mock-start"><span class="block-label">' + esc(lesson.paper === 'P01' ? 'Paper 01 · Multiple choice' : 'Paper 02 · Structured') + '</span>' +
        '<h2>' + md(lesson.title) + '</h2><p><strong>Time allowed:</strong> ' + Number(lesson.minutes) + ' minutes · <strong>Total:</strong> ' + Number(lesson.total) + ' marks</p>' +
        '<div class="mock-rules">' + blocksHTML(lesson.rules || [], lessonId) + '</div>' +
        '<button class="btn" type="button" data-mock-start="' + esc(lessonId) + '">Start timer and begin</button></section></div>';
    }
    var timer = '<div class="mock-timerbar" role="region" aria-label="Mock examination timer">' +
      '<strong>' + esc(lesson.paper) + ' timer</strong><output class="mock-timer" data-mock-timer aria-live="off">' + clockText(remaining) + '</output>' +
      '<span class="mock-timer-status" data-mock-timer-status>' + (submitted ? 'Submitted' : remaining <= 0 ? (mock.overTime ? 'Overtime · continue working' : 'Time is up') : remaining <= 900 ? '15 minutes or less' : 'In progress') + '</span>' +
      (!submitted ? '<button class="btn mock-submit" type="button" data-mock-submit="' + esc(lessonId) + '">Submit paper</button>' : '') +
      '</div>' +
      (!submitted && remaining <= 0 && !mock.overTime
        ? '<section class="mock-timeup" role="alert"><h2>Time is up</h2><p>Submit now, or keep working and mark this attempt as over time.</p>' +
          '<button class="btn" type="button" data-mock-submit="' + esc(lessonId) + '">Submit now</button>' +
          '<button class="btn ghost" type="button" data-mock-overtime="' + esc(lessonId) + '">Keep going (over time)</button></section>'
        : !submitted && remaining > 0 && remaining <= 900
          ? '<p class="mock-warning" role="status">15-minute warning: plan your remaining answers.</p>' : '');
    var questions;
    var result = submitted ? mockResults(lesson, st) : null;
    if (lesson.paper === 'P01') {
      questions = p01AnswerGrid(lesson, st, submitted) + (submitted ? p01ResultsHTML(lesson, result) : '') +
        (lesson.mcq || []).map(function (item, i) {
          return questionHTML(item, 'Question ' + (i + 1), false, lessonId,
            { mockPaper: 'P01', mockStarted: started, mockSubmitted: submitted });
        }).join('');
    } else {
      questions = submitted ? p02ResultsHTML(lesson, result) : '';
      questions += (lesson.questions || []).map(function (question) {
        return multiHTML(question, lessonId, { mockPaper: 'P02', mockStarted: started, mockSubmitted: submitted });
      }).join('');
    }
    return '<div id="lessonbody" data-loaded="true" class="mock-active" data-mock-paper="' + esc(lesson.paper) + '">' +
      timer + questions + '</div>';
  }

  function fullLessonData(id) {
    var meta = LESSON[id], book = meta && (window.WB_BOOK || {})[meta.book];
    return book && book.lessons.find(function (lesson) { return lesson.id === id; });
  }

  function findQuestion(lesson, id) {
    if (!lesson) return null;
    var groups = [lesson.warmup, lesson.tryit, lesson.practice, lesson.exit];
    for (var i = 0; i < groups.length; i++) {
      var found = (groups[i] || []).find(function (item) { return item.id === id; });
      if (found) return found;
    }
    var collections = [lesson.mcq, lesson.structured, lesson.questions];
    for (var j = 0; j < collections.length; j++) {
      for (var k = 0; k < (collections[j] || []).length; k++) {
        var parent = collections[j][k];
        if (parent.id === id) return parent;
        var part = (parent.parts || []).find(function (item) { return item.id === id; });
        if (part) return part;
      }
    }
    return null;
  }

  function exitResults(lesson, state) {
    var result = { score: 0, total: 0, attempted: 0 };
    (lesson.exit || []).forEach(function (item) {
      var saved = state.i && state.i[item.id];
      result.total += Number(item.marks || 1);
      if (item.kind === 'self') {
        if (saved && saved.selfSubmitted) {
          result.attempted++;
          result.score += Number(saved.score || 0);
        }
      } else if (saved && saved.checked) {
        result.attempted++;
        if (saved.right) result.score += Number(item.marks || 1);
      }
    });
    return result;
  }

  function starsForExit(lesson, state) {
    var result = exitResults(lesson, state);
    if (!result.attempted || !result.total) return 0;
    if (result.score >= result.total) return 3;
    if (result.score / result.total >= 0.8) return 2;
    return 1;
  }

  function recordMistake(lessonId, item) {
    if (S.mistakes.some(function (mistake) { return mistake.itemId === item.id; })) return;
    var meta = LESSON[lessonId];
    S.mistakes.push({
      lessonId: lessonId, itemId: item.id, when: new Date().toISOString(),
      question: item.q, lessonTitle: meta ? meta.title : 'Physics lesson',
    });
  }

  function lessonSection(title, minutes, blurb, content, cls) {
    return '<section class="lesson-section ' + (cls || '') + '"><header class="lesson-section-head">' +
      '<div><span class="block-label">' + esc(minutes) + '</span><h2>' + esc(title) + '</h2></div>' +
      '<p>' + esc(blurb) + '</p></header><div class="lesson-section-body">' +
      (content || '<p class="empty-note">Nothing to show here yet.</p>') + '</div></section>';
  }

  function beginLesson(id) {
    if (!S.l[id]) {
      S.l[id] = { started: new Date().toISOString(), finished: false, secs: 0, feel: '', question: '', i: {} };
      save();
    }
    if (!S.l[id].i) S.l[id].i = {};
  }
  var activeLessonId = null, activeLessonAt = 0, mockTimerInterval = null;
  function stopActiveLesson() {
    if (!activeLessonId) return;
    var st = lessonState(activeLessonId);
    if (st) {
      st.secs = Number(st.secs || 0) + Math.max(0, Math.round((Date.now() - activeLessonAt) / 1000));
      save();
    }
    activeLessonId = null;
    activeLessonAt = 0;
  }

  function unitLessonHTML(l) {
    blockHTML.nextFill = 0;
    var st = lessonState(l.id) || {};
    var quick = l.quickStart && l.quickStart.length
      ? '<details class="quick-start"><summary>Quick start · refresh what you already know</summary>' + blocksHTML(l.quickStart, l.id) + '</details>' : '';
    var vocab = (l.words || []).length
      ? '<section class="vocab"><h2>Words to know <span>· tap to open</span></h2><div class="vocab-chips">' +
        l.words.map(function (word, i) { return '<details class="vocab-chip"><summary>' + md(word.term) + '</summary><p>' + md(word.def) + '</p></details>'; }).join('') +
        '</div></section>' : '';
    var learn = blocksHTML((l.learn && l.learn.notes) || [], l.id) +
      ((l.learn && l.learn.examples) || []).map(exampleHTML).join('');
    var content = lessonSection('Warm-up', '5 min', 'Wake up what you already know.', quick + questionList(l.warmup, 'W', false, l.id), 'warm-section') +
      lessonSection('Learn', '10 min', 'Read, explore the diagrams and follow each worked example.', learn, 'learn-section') +
      lessonSection('Try it with help', '5 min', 'Have a go. Open a hint if you get stuck.', questionList(l.tryit, 'T', true, l.id), 'try-section') +
      lessonSection('Practice', '10 min', 'Work through the questions. They get harder as you go.', questionList(l.practice, 'P', true, l.id), 'practice-section') +
      lessonSection('Exit check', '3 min', 'Show what you can do without hints.', questionList(l.exit, 'E', false, l.id), 'exit-section');
    var goals = (l.goals || []).map(function (goal) {
      return '<li><code>' + esc(goal.code) + '</code><span>' + md(goal.text) + '</span></li>';
    }).join('');
    return '<div class="lesson-goal"><span class="block-label">Today’s goal · I can…</span><ul>' + goals + '</ul></div>' +
      vocab + content + finishHTML(l.id, st);
  }

  function lessonPage(id) {
    var l = LESSON[id];
    if (!l) return notFound();
    var b = BOOK[l.book], sec = SECTIONS[b.section];
    var bookData = (window.WB_BOOK || {})[b.id];
    var lessonData = bookData && bookData.lessons.find(function (x) { return x.id === id; });
    var i = LESSONS.indexOf(l), prev = LESSONS[i - 1], next = LESSONS[i + 1];
    var head = '<p class="crumb"><a href="#/book/' + b.id + '">' + (sec.id === 'X' ? 'Exam prep' : 'Section ' + sec.id) + ' · ' + esc(lessonLabel(l)) + '</a></p>' +
      '<div class="lesson-head"><h1 tabindex="-1">Lesson ' + l.n + ' · ' + md(l.title) + '</h1></div>';
    var body;
    if (!S.name) {
      body = '<section class="card"><h2 style="font-size:22px">Before you start</h2>' +
        '<p>Enter your name before starting so your teacher can see your work.</p>' +
        '<form class="namebox" id="gateform"><label for="gate-name">Your name</label>' +
        '<input id="gate-name" type="text" autocomplete="name" required aria-required="true" placeholder="Type your name">' +
        '<button class="btn" type="submit">Start lesson</button></form></section>';
    } else {
      if (bookErrors[b.id]) {
        body = '<section class="card" id="lessonbody" role="alert"><h2>Lesson content could not be loaded</h2><p>' + esc(bookErrors[b.id].message) + '</p><button class="btn" type="button" data-retry-book="' + esc(b.id) + '">Try again</button></section>';
      } else if (!bookData) {
        body = '<section class="card" id="lessonbody" aria-live="polite"><p class="tiny">Loading lesson content…</p></section>';
      } else if (!lessonData) {
        body = '<section class="card" id="lessonbody" role="alert"><p>Lesson data is missing for ' + esc(id) + '.</p></section>';
      } else if (l.kind === 'unit') {
        body = '<div id="lessonbody" data-loaded="true">' + unitLessonHTML(lessonData) + '</div>';
      } else if (l.kind === 'check') {
        body = checkLessonHTML(lessonData, id);
      } else if (l.kind === 'past') {
        body = pastLessonHTML(lessonData, id);
      } else if (l.kind === 'mock') {
        body = mockLessonHTML(lessonData, id);
      } else {
        body = '<section class="card" id="lessonbody"><p class="tiny">This lesson type will be available in a later build phase.</p></section>';
      }
    }
    var pager = '<nav class="pager" aria-label="Lessons">' +
      (prev ? '<a class="prev" href="#/lesson/' + prev.id + '"><small>Previous</small>' + md(prev.title) + '</a>' : '<span></span>') +
      (next ? '<a class="next" href="#/lesson/' + next.id + '"><small>Next</small>' + md(next.title) + '</a>' : '') + '</nav>';
    return '<main id="main" class="' + sec.color + '">' + head + body + pager + '</main>';
  }
  function bindLesson() {
    var f = document.getElementById('gateform');
    if (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = document.getElementById('gate-name').value;
        if (!v.trim()) { document.getElementById('gate-name').setAttribute('aria-invalid', 'true'); document.getElementById('gate-name').focus(); return; }
        saveName(v); render();
      });
    }
    var lessonBody = document.getElementById('lessonbody');
    if (lessonBody) {
      var lessonId = route().id;
      var initialLessonState = lessonState(lessonId);
      if (initialLessonState && !initialLessonState.i) initialLessonState.i = {};
      var mockLesson = fullLessonData(lessonId);
      if (mockLesson && mockLesson.kind === 'mock' && initialLessonState && initialLessonState.mock && !initialLessonState.mock.submittedAt) {
        var tickingMock = initialLessonState.mock;
        function updateMockClock() {
          var remaining = mockRemaining(tickingMock, mockLesson);
          var output = lessonBody.querySelector('[data-mock-timer]'), status = lessonBody.querySelector('[data-mock-timer-status]');
          if (!output || !status) return;
          output.textContent = clockText(remaining);
          status.textContent = remaining <= 0 ? (tickingMock.overTime ? 'Overtime · continue working' : 'Time is up') :
            remaining <= 900 ? '15 minutes or less' : 'In progress';
          if (remaining <= 900 && remaining > 0 && !lessonBody.querySelector('.mock-warning')) {
            output.closest('.mock-timerbar').insertAdjacentHTML('afterend',
              '<p class="mock-warning" role="status">15-minute warning: plan your remaining answers.</p>');
          }
          if (remaining <= 0 && !tickingMock.overTime && !lessonBody.querySelector('.mock-timeup')) {
            output.closest('.mock-timerbar').insertAdjacentHTML('afterend',
              '<section class="mock-timeup" role="alert"><h2>Time is up</h2><p>Submit now, or keep working and mark this attempt as over time.</p>' +
              '<button class="btn" type="button" data-mock-submit="' + esc(lessonId) + '">Submit now</button>' +
              '<button class="btn ghost" type="button" data-mock-overtime="' + esc(lessonId) + '">Keep going (over time)</button></section>');
          }
        }
        if (typeof mockTimerInterval !== 'undefined' && mockTimerInterval) clearInterval(mockTimerInterval);
        updateMockClock();
        mockTimerInterval = setInterval(updateMockClock, 1000);
      }
      var graphDrag = null;
      function storedItemState(itemId) {
        var st = lessonState(lessonId);
        if (!st.i) st.i = {};
        if (!st.i[itemId]) st.i[itemId] = { tries: 0, right: false, xp: 0 };
        return st.i[itemId];
      }
      function graphPoint(svg, event) {
        var bounds = svg.getBoundingClientRect(), config = JSON.parse(svg.getAttribute('data-config'));
        var px = Math.max(62, Math.min(608, (event.clientX - bounds.left) / bounds.width * 640));
        var py = Math.max(18, Math.min(340, (event.clientY - bounds.top) / bounds.height * 420));
        return {
          x: config.x.min + (px - 62) / 546 * (config.x.max - config.x.min),
          y: config.y.min + (340 - py) / 322 * (config.y.max - config.y.min),
        };
      }
      function setGraphPoint(svg, point, index) {
        var item = storedItemState(svg.getAttribute('data-graph-svg'));
        if (!item.graph) item.graph = { points: [] };
        if (index == null) item.graph.points.push(point);
        else item.graph.line[index] = point;
        if (item.graph.line && item.graph.line.length === 2) {
          var run = item.graph.line[1].x - item.graph.line[0].x;
          item.graph.gradient = run ? (item.graph.line[1].y - item.graph.line[0].y) / run : null;
        }
        save();
        drawGraph(svg, JSON.parse(svg.getAttribute('data-config')), item.graph);
      }
      function refreshMultiTotals() {
        var lesson = fullLessonData(lessonId), state = lessonState(lessonId);
        if (!lesson || !state) return;
        lessonBody.querySelectorAll('[data-structured]').forEach(function (element) {
          var question = findQuestion(lesson, element.getAttribute('data-structured'));
          if (!question) return;
          var score = question.parts.reduce(function (sum, part) {
            var saved = state.i && state.i[part.id];
            return sum + (saved && saved.selfSubmitted ? Number(saved.score || 0) : 0);
          }, 0);
          var node = element.querySelector('[data-multi-score]');
          if (node) node.textContent = score + ' / ' + Number(question.total || 0);
        });
      }
      lessonBody.querySelectorAll('[data-graph-svg]').forEach(function (svg) {
        var item = lessonState(lessonId).i[svg.getAttribute('data-graph-svg')];
        if (item && item.graph) drawGraph(svg, JSON.parse(svg.getAttribute('data-config')), item.graph);
      });
      function showQuestionMessage(card, className, text) {
        var slot = card.querySelector('.feedback-slot');
        if (!slot) return;
        slot.className = 'feedback-slot' + (className ? ' ' + className : '');
        slot.textContent = text;
      }
      function saveAnswer(e) {
        var fillKey = e.target.getAttribute('data-fill-key');
        if (fillKey) {
          var lesson = lessonState(lessonId);
          if (lesson) {
            if (!lesson.fills) lesson.fills = {};
            lesson.fills[fillKey] = e.target.value;
            save();
          }
          return;
        }
        if (e.target.hasAttribute('data-mark-index')) return;
        var card = e.target.closest('.question-card');
        if (!card) return;
        var st = lessonState(lessonId);
        if (!st) return;
        if (!st.i) st.i = {};
        var itemId = card.getAttribute('data-item');
        if (!st.i[itemId]) st.i[itemId] = { tries: 0, right: false, xp: 0 };
        st.i[itemId].ans = e.target.value;
        if (st.i[itemId].checked && !st.i[itemId].right) st.i[itemId].checked = false;
        if (card.getAttribute('data-item-kind') === 'self') st.i[itemId].selfSubmitted = false;
        save();
        if (st.mock && LESSON[lessonId].kind === 'mock' && fullLessonData(lessonId).paper === 'P01') {
          var gridCell = Array.prototype.find.call(lessonBody.querySelectorAll('[data-mock-jump]'), function (cell) {
            return cell.getAttribute('data-mock-jump') === itemId;
          });
          if (gridCell) {
            gridCell.classList.add('answered');
            gridCell.setAttribute('aria-label', gridCell.textContent.trim() + ', answered');
          }
          lessonBody.querySelectorAll('[data-mock-choice-for]').forEach(function (bubble) {
            if (bubble.getAttribute('data-mock-choice-for') !== itemId) return;
            var selected = bubble.getAttribute('data-mock-choice') === e.target.value;
            bubble.classList.toggle('selected', selected);
            bubble.setAttribute('aria-pressed', String(selected));
          });
        }
        showQuestionMessage(card, '', '');
        if (Number(st.i[itemId].tries) < 2) {
          card.querySelectorAll('.solution').forEach(function (solution) { solution.remove(); });
        }
        refreshMultiTotals();
      }
      lessonBody.addEventListener('input', saveAnswer);
      lessonBody.addEventListener('change', saveAnswer);
      lessonBody.addEventListener('change', function (e) {
        if (!e.target.hasAttribute('data-mark-index')) return;
        var card = e.target.closest('.question-card'), st = lessonState(lessonId);
        if (!card || !st) return;
        var item = findQuestion(fullLessonData(lessonId), card.getAttribute('data-item'));
        if (!item) return;
        var ticks = Array.prototype.map.call(card.querySelectorAll('[data-mark-index]:checked'), function (input) {
          return Number(input.getAttribute('data-mark-index'));
        });
        var saved = storedItemState(item.id);
        saved.ticks = ticks;
        saved.selfSubmitted = false;
        var score = card.querySelector('.self-score');
        if (score) score.textContent = selfMarks(item, ticks) + ' / ' + Number(item.marks || 1) + ' marks selected';
        showQuestionMessage(card, '', '');
        save();
        refreshMultiTotals();
      });
      lessonBody.addEventListener('click', function (e) {
        var target = e.target.closest('button');
        var startMock = target && target.getAttribute('data-mock-start');
        if (startMock) {
          var startState = mockState(startMock);
          if (!startState.startedAt) startState.startedAt = new Date().toISOString();
          save(); render(); return;
        }
        var submitMock = target && target.getAttribute('data-mock-submit');
        if (submitMock) {
          var submitState = mockState(submitMock);
          if (submitState.submittedAt) return;
          submitState.submittedAt = new Date().toISOString();
          var submittedLesson = fullLessonData(submitMock);
          if (submittedLesson.paper === 'P01') {
            var paperOneResult = mockResults(submittedLesson, lessonState(submitMock));
            submitState.final = { score: paperOneResult.score, total: paperOneResult.total, answered: paperOneResult.answered, sectionScores: {} };
            Object.keys(paperOneResult.sections).forEach(function (key) {
              submitState.final.sectionScores[key] = {
                score: paperOneResult.sections[key].score,
                total: paperOneResult.sections[key].total,
              };
            });
          }
          save(); render(); return;
        }
        var overtimeMock = target && target.getAttribute('data-mock-overtime');
        if (overtimeMock) {
          mockState(overtimeMock).overTime = true;
          save(); render(); return;
        }
        var jumpToMockQuestion = target && target.getAttribute('data-mock-jump');
        if (jumpToMockQuestion) {
          var destination = lessonBody.querySelector('[data-item="' + jumpToMockQuestion + '"]');
          if (destination) {
            destination.scrollIntoView({ behavior: 'smooth', block: 'start' });
            var firstControl = destination.querySelector('input[type="radio"]');
            if (firstControl) firstControl.focus({ preventScroll: true });
          }
          return;
        }
        var mockChoice = target && target.getAttribute('data-mock-choice');
        if (mockChoice) {
          var choiceCard = lessonBody.querySelector('[data-item="' + target.getAttribute('data-mock-choice-for') + '"]');
          var choiceInput = choiceCard && choiceCard.querySelector('input[type="radio"][value="' + mockChoice + '"]');
          if (choiceInput && !choiceInput.disabled) {
            choiceInput.checked = true;
            choiceInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
          return;
        }
        var addLog = e.target.closest('[data-add-log]');
        if (addLog) {
          if (!S.log) S.log = {};
          var bookId = addLog.getAttribute('data-add-log');
          if (!S.log[bookId]) S.log[bookId] = [];
          S.log[bookId].push({ year: '', question: '', topic: '', score: '', outOf: '' });
          save(); render(); return;
        }
        var removeLog = e.target.closest('[data-remove-log]');
        if (removeLog) {
          var book = BOOK[LESSON[lessonId].book];
          if (S.log && S.log[book.id]) S.log[book.id].splice(Number(removeLog.getAttribute('data-remove-log')), 1);
          save(); render(); return;
        }
        var addGraphPoint = target && target.getAttribute('data-graph-add-point');
        if (addGraphPoint) {
          var pointSvg = lessonBody.querySelector('[data-graph-svg="' + addGraphPoint + '"]');
          var widget = target.closest('.graph-widget'), graphConfigData = JSON.parse(pointSvg.getAttribute('data-config'));
          var xInput = widget.querySelector('[data-graph-coordinate="x"]'), yInput = widget.querySelector('[data-graph-coordinate="y"]');
          var xValue = Number(xInput.value), yValue = Number(yInput.value);
          var status = widget.querySelector('.graph-status');
          if (!xInput.value || !yInput.value || !Number.isFinite(xValue) || !Number.isFinite(yValue) ||
            xValue < graphConfigData.x.min || xValue > graphConfigData.x.max || yValue < graphConfigData.y.min || yValue > graphConfigData.y.max) {
            status.textContent = 'Enter finite coordinates within the displayed axis ranges.';
            (!xInput.value ? xInput : !yInput.value ? yInput : xInput).focus();
            return;
          }
          var pointState = storedItemState(addGraphPoint);
          if (!pointState.graph) pointState.graph = { points: [] };
          if (pointState.graph.points.length >= graphConfigData.points.length) {
            status.textContent = 'All table points have been plotted. Clear the graph to start again.';
            return;
          }
          pointState.graph.points.push({ x: xValue, y: yValue });
          save(); drawGraph(pointSvg, graphConfigData, pointState.graph);
          return;
        }
        var graphButton = target && (target.getAttribute('data-graph-line') || target.getAttribute('data-graph-triangle') || target.getAttribute('data-graph-clear'));
        var graphPaperButton = target && target.getAttribute('data-graph-paper');
        if (graphPaperButton) {
          var paperState = storedItemState(graphPaperButton);
          if (!paperState.graph) paperState.graph = { points: [] };
          paperState.graph.paperMode = !paperState.graph.paperMode;
          save(); render(); return;
        }
        if (graphButton) {
          var graphId = graphButton, graphSvg = lessonBody.querySelector('[data-graph-svg="' + graphId + '"]');
          if (!graphSvg) return;
          var graphState = storedItemState(graphId).graph || { points: [] };
          if (target.hasAttribute('data-graph-line')) {
            graphState.lineMode = true; graphState.pendingLine = null;
          } else if (target.hasAttribute('data-graph-triangle')) {
            graphState.triangle = !graphState.triangle;
          } else {
            graphState = { points: [] };
          }
          storedItemState(graphId).graph = graphState;
          save(); drawGraph(graphSvg, JSON.parse(graphSvg.getAttribute('data-config')), graphState);
          var triangleButton = lessonBody.querySelector('[data-graph-triangle="' + graphId + '"]');
          if (triangleButton) triangleButton.disabled = !graphState.line;
          return;
        }
        var graphHit = e.target.closest('[data-graph-hit]');
        if (graphHit) {
          var svg = graphHit.closest('svg'), partId = graphHit.getAttribute('data-graph-hit');
          var config = JSON.parse(svg.getAttribute('data-config')), savedGraph = storedItemState(partId);
          if (!savedGraph.graph) savedGraph.graph = { points: [] };
          var graph = savedGraph.graph, point = graphPoint(svg, e);
          if (graph.lineMode) {
            if (!graph.pendingLine) graph.pendingLine = point;
            else {
              graph.line = [graph.pendingLine, point]; graph.pendingLine = null; graph.lineMode = false;
              var run = point.x - graph.line[0].x;
              graph.gradient = run ? (point.y - graph.line[0].y) / run : null;
            }
          } else if (graph.points.length < config.points.length) graph.points.push(point);
          save(); drawGraph(svg, config, graph);
          var triangle = lessonBody.querySelector('[data-graph-triangle="' + partId + '"]');
          if (triangle) triangle.disabled = !graph.line;
          return;
        }
        if (!target) return;
        var card = target.closest('.question-card');
        if (!card) return;
        var st = lessonState(lessonId);
        if (!st) return;
        var item = findQuestion(fullLessonData(lessonId), card.getAttribute('data-item'));
        if (!item) return;
        if (target.hasAttribute('data-keypad-for')) {
          var control = document.getElementById(target.getAttribute('data-keypad-for'));
          if (!control || control.disabled) return;
          var start = control.selectionStart == null ? control.value.length : control.selectionStart;
          var end = control.selectionEnd == null ? start : control.selectionEnd;
          control.setRangeText(target.getAttribute('data-keypad-value'), start, end, 'end');
          control.focus();
          control.dispatchEvent(new Event('input', { bubbles: true }));
          return;
        }
        if (target.hasAttribute('data-show-scheme')) {
          if (!st.i) st.i = {};
          if (!st.i[item.id]) st.i[item.id] = { tries: 0, right: false, xp: 0 };
          st.i[item.id].schemeShown = true;
          save(); render();
          return;
        }
        if (target.hasAttribute('data-self-mark')) {
          var answer = card.querySelector('textarea');
          if (answer && !answer.value.trim()) {
            showQuestionMessage(card, 'needs-answer', 'Write your response before saving your self-mark.');
            answer.focus();
            return;
          }
          var saved = st.i[item.id] || { tries: 0, right: false, xp: 0 };
          var score = selfMarks(item, saved.ticks || []);
          var mockMode = !!(st.mock && st.mock.submittedAt);
          var targetXP = mockMode ? 0 : Math.min(10, 2 + 3 * score);
          var priorXP = Number(saved.xp || 0);
          var earned = Math.max(0, targetXP - priorXP);
          saved.tries = Number(saved.tries || 0) + 1;
          saved.score = score;
          saved.right = score >= Number(item.marks || 1);
          saved.selfSubmitted = true;
          saved.xpEarned = earned;
          saved.xp = Math.max(priorXP, targetXP);
          st.i[item.id] = saved;
          if (!mockMode) {
            S.xp += earned;
            if (!saved.right) recordMistake(lessonId, item);
          }
          if (mockMode) {
            var mockData = fullLessonData(lessonId), resultData = mockResults(mockData, st);
            if (resultData.parts === resultData.partTotal) st.mock.final = { score: resultData.score, total: resultData.total };
          }
          save(); render();
          return;
        }
        if (target.hasAttribute('data-check-item')) {
          var control = item.options && item.options.length
            ? card.querySelector('input[type="radio"]:checked') : card.querySelector('textarea');
          var typed = control ? control.value.trim() : '';
          if (!typed) {
            showQuestionMessage(card, 'needs-answer', 'Choose or write an answer before checking.');
            if (control) control.focus();
            return;
          }
          var current = st.i[item.id] || { tries: 0, right: false, xp: 0 };
          if (current.right) return;
          var result;
          if (item.kind === 'mcq') {
            result = { ok: typed.toUpperCase() === String(item.answer || '').toUpperCase() };
          } else if (item.kind === 'num') {
            result = window.WBC.checkNumber(typed, item.num || {});
          } else if (item.kind === 'short') {
            result = window.WBC.checkShort(typed, item.accept || []);
          } else {
            throw new Error('Unsupported auto-check question kind: ' + item.kind);
          }
          var previousTries = Number(current.tries || 0);
          current.tries = previousTries + 1;
          current.ans = typed;
          current.checked = true;
          current.right = !!result.ok;
          current.xpEarned = current.right ? (previousTries === 0 ? 10 : 5) : 0;
          current.xp = Number(current.xp || 0) + current.xpEarned;
          st.i[item.id] = current;
          S.xp += current.xpEarned;
          if (!current.right) recordMistake(lessonId, item);
          save(); render();
        }
      });
      lessonBody.addEventListener('input', function (e) {
        if (!e.target.hasAttribute('data-log-index')) return;
        var meta = LESSON[lessonId], log = S.log && S.log[meta.book], entry = log && log[Number(e.target.getAttribute('data-log-index'))];
        if (!entry) return;
        entry[e.target.getAttribute('data-log-field')] = e.target.value;
        save();
      });
      lessonBody.addEventListener('pointerdown', function (e) {
        var handle = e.target.closest('[data-graph-handle]');
        if (!handle) return;
        var svg = handle.closest('svg'), index = Number(handle.getAttribute('data-graph-handle'));
        graphDrag = { svg: svg, index: index };
        if (svg.setPointerCapture) svg.setPointerCapture(e.pointerId);
        e.preventDefault();
      });
      lessonBody.addEventListener('pointermove', function (e) {
        if (!graphDrag) return;
        setGraphPoint(graphDrag.svg, graphPoint(graphDrag.svg, e), graphDrag.index);
      });
      lessonBody.addEventListener('pointerup', function () { graphDrag = null; });
      lessonBody.addEventListener('keydown', function (e) {
        var handle = e.target.closest('[data-graph-handle]');
        if (!handle || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
        var svg = handle.closest('svg'), config = JSON.parse(svg.getAttribute('data-config'));
        var partId = svg.getAttribute('data-graph-svg'), index = Number(handle.getAttribute('data-graph-handle'));
        var graph = storedItemState(partId).graph;
        var point = graph.line[index], dx = (config.x.max - config.x.min) / 50, dy = (config.y.max - config.y.min) / 50;
        if (e.key === 'ArrowLeft') point.x -= dx;
        if (e.key === 'ArrowRight') point.x += dx;
        if (e.key === 'ArrowUp') point.y += dy;
        if (e.key === 'ArrowDown') point.y -= dy;
        point.x = Math.max(config.x.min, Math.min(config.x.max, point.x));
        point.y = Math.max(config.y.min, Math.min(config.y.max, point.y));
        graph.triangle = false;
        setGraphPoint(svg, point, index);
        e.preventDefault();
      });
      lessonBody.querySelectorAll('details.hint').forEach(function (hint) {
        hint.addEventListener('toggle', function () {
          if (!hint.open) return;
          var card = hint.closest('.question-card'), st = lessonState(lessonId);
          if (!card || !st) return;
          var item = findQuestion(fullLessonData(lessonId), card.getAttribute('data-item'));
          if (!item) return;
          if (!st.i) st.i = {};
          if (!st.i[item.id]) st.i[item.id] = { tries: 0, right: false, xp: 0 };
          var saved = st.i[item.id];
          if (saved.hint) return;
          saved.hint = true;
          saved.hintCost = item.section === 'practice' ? Math.min(2, S.xp) : 0;
          S.xp -= saved.hintCost;
          save(); render();
        });
      });
    }
    var finish = document.getElementById('finish-form');
    if (finish) {
      finish.addEventListener('submit', function (e) {
        e.preventDefault();
        var id = route().id, st = lessonState(id);
        if (!st) return;
        if (!st.finished) {
          st.finished = true;
          st.finishedAt = new Date().toISOString();
        }
        var lessonData = fullLessonData(id);
        if (lessonData) st.stars = starsForExit(lessonData, st);
        var feeling = finish.querySelector('input[name="feel"]:checked');
        st.feel = feeling ? feeling.value : '';
        st.question = document.getElementById('teacher-question').value.trim();
        save();
        render();
        var status = document.querySelector('.finish-status');
        if (status) status.textContent = 'Lesson reflection saved.';
      });
    }
    document.querySelectorAll('[data-stepper]').forEach(function (button) {
      button.addEventListener('click', function () {
        var example = button.closest('.example');
        var hidden = example.querySelector('.example-step[hidden]');
        if (hidden) {
          hidden.hidden = false;
          if (!example.querySelector('.example-step[hidden]')) button.textContent = 'Show worked answer';
          return;
        }
        example.querySelector('.example-answer').hidden = false;
        button.hidden = true;
      });
    });
  }

  function notFound() {
    return '<main id="main"><section class="card"><h1 tabindex="-1" style="font-size:28px">Page not found</h1><p><a href="#/">Back to Home</a></p></section></main>';
  }
  function mistakesPage() {
    var mistakes = S.mistakes.slice().reverse();
    var content = mistakes.length ? mistakes.map(function (mistake) {
      return '<article class="mistake-card"><div><span class="block-label">' + esc(mistake.lessonTitle || 'Physics lesson') + '</span>' +
        '<p>' + md(mistake.question || 'Question text unavailable.') + '</p><small>' + esc(mistake.itemId) + '</small></div>' +
        '<div class="mistake-actions"><a class="btn ghost" href="#/lesson/' + esc(mistake.lessonId) + '">Review lesson</a>' +
        '<button class="btn ghost" type="button" data-remove-mistake="' + esc(mistake.itemId) + '">Remove</button></div></article>';
    }).join('') : '<p class="empty-note">No questions in your Mistake Log yet. Questions you get wrong or self-mark below full marks will appear here.</p>';
    return '<main id="main"><section class="card mistakes-page"><h1 tabindex="-1" style="font-size:28px">My Mistake Log</h1>' +
      '<p>Review questions to strengthen your understanding. This log is saved on this device.</p>' +
      content + '<p><a href="#/">Back to Home</a></p></section></main>';
  }
  function teacherPage() {
    return '<main id="main"><section class="card"><h1 tabindex="-1" style="font-size:28px">Teacher summary</h1><p class="tiny">Coming in Phase 7.</p><p><a href="#/">Back to Home</a></p></section></main>';
  }

  // ---------- book data (lazy, one file per book) ----------
  var loading = {};
  var bookErrors = {};
  function loadBook(id) {
    if ((window.WB_BOOK || {})[id]) return Promise.resolve(window.WB_BOOK[id]);
    if (loading[id]) return loading[id];
    loading[id] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'data/books/' + id + '.js';
      s.onload = function () {
        var book = (window.WB_BOOK || {})[id];
        if (!book) {
          delete loading[id];
          reject(new Error('Loaded the script for ' + id + ' but it did not register book data.'));
          return;
        }
        delete bookErrors[id];
        resolve(book);
      };
      s.onerror = function () {
        delete loading[id];
        reject(new Error('Could not load lesson data for ' + id + '. Check your connection or try again.'));
      };
      document.head.appendChild(s);
    });
    return loading[id];
  }

  // ---------- router ----------
  function route() {
    var h = location.hash.replace(/^#\/?/, '');
    var m;
    if (!h) return { view: 'home' };
    if ((m = /^book\/([\w]+)$/.exec(h))) return { view: 'book', id: m[1] };
    if ((m = /^lesson\/([\w.]+)$/.exec(h))) return { view: 'lesson', id: m[1] };
    if (h === 'teacher') return { view: 'teacher' };
    if (h === 'mistakes') return { view: 'mistakes' };
    return { view: '404' };
  }

  var app = document.getElementById('app');
  var lastView = '';
  function render() {
    if (mockTimerInterval) { clearInterval(mockTimerInterval); mockTimerInterval = null; }
    var r = route();
    var currentLesson = r.view === 'lesson' && S.name && LESSON[r.id] && LESSON[r.id].kind !== 'mock' && !isDone(r.id) ? r.id : null;
    if (currentLesson !== activeLessonId) {
      stopActiveLesson();
      if (currentLesson) {
        beginLesson(currentLesson);
        activeLessonId = currentLesson;
        activeLessonAt = Date.now();
      }
    }
    var html = r.view === 'home' ? home() : r.view === 'book' ? bookPage(r.id) : r.view === 'lesson' ? lessonPage(r.id) : r.view === 'teacher' ? teacherPage() : r.view === 'mistakes' ? mistakesPage() : notFound();
    app.innerHTML = topbar() + html + footer();
    document.getElementById('themebtn').addEventListener('click', toggleTheme);
    document.querySelectorAll('[data-retry-book]').forEach(function (button) {
      button.addEventListener('click', function () {
        delete bookErrors[button.getAttribute('data-retry-book')];
        render();
      });
    });
    document.querySelectorAll('[data-remove-mistake]').forEach(function (button) {
      button.addEventListener('click', function () {
        var itemId = button.getAttribute('data-remove-mistake');
        S.mistakes = S.mistakes.filter(function (mistake) { return mistake.itemId !== itemId; });
        save(); render();
      });
    });
    if (r.view === 'home') bindHome();
    if (r.view === 'lesson') bindLesson();
    WBD.typeset(app);
    var key = location.hash;
    if (key !== lastView) {
      lastView = key;
      window.scrollTo(0, 0);
      var h1 = app.querySelector('h1');
      if (h1 && r.view !== 'home') h1.focus({ preventScroll: true });
    }
    document.title = (r.view === 'home' ? '' : (app.querySelector('h1') || {}).textContent + ' · ') + 'CSEC Physics 2027';
    // book data for book / lesson pages
    var need = r.view === 'book' ? r.id : r.view === 'lesson' && LESSON[r.id] ? LESSON[r.id].book : null;
    if (need && !(window.WB_BOOK || {})[need] && !bookErrors[need]) {
      loadBook(need).then(render, function (error) {
        bookErrors[need] = error;
        render();
      });
    }
  }

  window.addEventListener('hashchange', render);
  window.addEventListener('pagehide', stopActiveLesson);
  window.addEventListener('scroll', function () {
    var t = document.getElementById('topbar');
    if (t) t.classList.toggle('scrolled', window.scrollY > 4);
  }, { passive: true });
  if (window.matchMedia) {
    var mq = matchMedia('(prefers-color-scheme: dark)');
    (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(function () { if (!S.theme) render(); });
  }
  applyTheme();
  render();

  // for tests / later phases
  window.WBAPP = { state: function () { return S; }, save: save, render: render, loadBook: loadBook, KEY: KEY };
})();
