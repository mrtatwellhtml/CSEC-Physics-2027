/* CSEC Physics 2027 — app: state, router, renderers (PLAN.md §2, §4, §7, §8).
   Phase 2: shell, Home, Book page, name gate, theme, countdown. Lessons render in Phase 3. */
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
    return '<footer class="foot"><a href="#/teacher">Teacher summary</a>' +
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
      (data ? '<p class="intro">' + md(data.intro) + '</p>' : '<p class="intro tiny">Loading…</p>') + objHTML + '</section>' +
      '<section class="topic ' + sec.color + '"><div class="topic-h"><span class="dot" aria-hidden="true"></span><h2 style="font-size:20px">Lessons</h2><span class="tprog">' + doneCount(b.lessons) + '/' + b.lessons.length + '</span></div>' +
      '<div class="daygrid">' + b.lessons.map(lessonCard).join('') + '</div></section></main>';
  }

  // ---------- Lesson page (placeholder until Phase 3) ----------
  function lessonPage(id) {
    var l = LESSON[id];
    if (!l) return notFound();
    var b = BOOK[l.book], sec = SECTIONS[b.section];
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
      body = '<section class="card" id="lessonbody"><p class="tiny">The lesson page arrives in Phase 3. ' + l.items + ' questions are ready for this lesson.</p></section>';
    }
    var pager = '<nav class="pager" aria-label="Lessons">' +
      (prev ? '<a class="prev" href="#/lesson/' + prev.id + '"><small>Previous</small>' + md(prev.title) + '</a>' : '<span></span>') +
      (next ? '<a class="next" href="#/lesson/' + next.id + '"><small>Next</small>' + md(next.title) + '</a>' : '') + '</nav>';
    return '<main id="main" class="' + sec.color + '">' + head + body + pager + '</main>';
  }
  function bindLesson() {
    var f = document.getElementById('gateform');
    if (!f) return;
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = document.getElementById('gate-name').value;
      if (!v.trim()) { document.getElementById('gate-name').setAttribute('aria-invalid', 'true'); document.getElementById('gate-name').focus(); return; }
      saveName(v); render();
    });
  }

  function notFound() {
    return '<main id="main"><section class="card"><h1 tabindex="-1" style="font-size:28px">Page not found</h1><p><a href="#/">Back to Home</a></p></section></main>';
  }
  function teacherPage() {
    return '<main id="main"><section class="card"><h1 tabindex="-1" style="font-size:28px">Teacher summary</h1><p class="tiny">Coming in Phase 7.</p><p><a href="#/">Back to Home</a></p></section></main>';
  }

  // ---------- book data (lazy, one file per book) ----------
  var loading = {};
  function loadBook(id) {
    if ((window.WB_BOOK || {})[id]) return Promise.resolve(window.WB_BOOK[id]);
    if (loading[id]) return loading[id];
    loading[id] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'data/books/' + id + '.js';
      s.onload = function () { resolve(window.WB_BOOK[id]); };
      s.onerror = function () { delete loading[id]; reject(new Error('Could not load ' + id)); };
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
    return { view: '404' };
  }

  var app = document.getElementById('app');
  var lastView = '';
  function render() {
    var r = route();
    var html = r.view === 'home' ? home() : r.view === 'book' ? bookPage(r.id) : r.view === 'lesson' ? lessonPage(r.id) : r.view === 'teacher' ? teacherPage() : notFound();
    app.innerHTML = topbar() + html + footer();
    document.getElementById('themebtn').addEventListener('click', toggleTheme);
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
    if (need && !(window.WB_BOOK || {})[need]) loadBook(need).then(render, function () { /* offline: keep shell */ });
  }

  window.addEventListener('hashchange', render);
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
