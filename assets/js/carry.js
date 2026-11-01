/* Progress carried over from the workbook's old address (GitHub Pages, retired 2026-11-01).
   The old address now serves moved/index.html, which reads this workbook's saved progress there
   and opens this page with it in the address fragment (#carry=…), which is never sent to a server.

   Runs in <head>, before app.js reads the saved state. Carried data is accepted only when the
   student arrives from the old address; it is rebuilt as plain data with size limits, then
   merged so that nothing already saved here is lost. The same data carried twice changes nothing. */
(function () {
  'use strict';
  var OLD = 'https://mrtatwellhtml.github.io/';
  var KEY = 'csec-phys-2027-v1', LKEY = 'csec-phys-2027-labs', DONE = 'csec-phys-2027-carried';
  var QKEY = 'smon-v1-queue', SITE = 'csec-physics-workbook';
  var m = /^#carry=([A-Za-z0-9_-]+)(?:&to=([^&#]*))?$/.exec(location.hash);
  if (!m) return;

  var to = target(m[2]);
  // Take the data out of the address at once: it never stays in history, bookmarks or a shared link.
  try { history.replaceState(null, '', location.pathname + location.search + (to.charAt(0) === '#' ? to : '#/')); } catch (e) { /* ignore */ }

  if (document.referrer.indexOf(OLD) === 0 && m[1].length <= 2800000) {
    try { merge(JSON.parse(decode(m[1])), m[1]); } catch (e) { /* unreadable: keep what is saved here */ }
  }
  if (to && to.charAt(0) !== '#') location.replace(to);

  // Only a lab page or a #/route inside this workbook; anything else opens the home page.
  function target(raw) {
    var t = '';
    try { t = decodeURIComponent(raw || ''); } catch (e) { return ''; }
    return /^#\/[\w.\/-]{0,200}$/.test(t) || /^labs\/[a-z0-9-]+\.html(\?from=[\w.]{1,80})?$/.test(t) ? t : '';
  }
  function decode(b64) {
    var bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function read(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function obj(v) { return v && typeof v === 'object' && !Array.isArray(v) ? v : null; }
  function num(v) { var n = Number(v); return isFinite(n) && n > 0 ? n : 0; }
  function str(v, n) { return typeof v === 'string' ? v.slice(0, n) : ''; }

  // Plain JSON only: no prototype keys, bounded depth, length and count.
  function clean(v, depth) {
    if (v === null || typeof v === 'boolean') return v;
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    if (typeof v === 'string') return v.slice(0, 5000);
    if (depth > 8 || typeof v !== 'object') return null;
    if (Array.isArray(v)) return v.slice(0, 2000).map(function (x) { return clean(x, depth + 1); });
    var out = {};
    Object.keys(v).slice(0, 2000).forEach(function (k) {
      if (k.length <= 120 && !/^(__proto__|constructor|prototype)$/.test(k)) out[k] = clean(v[k], depth + 1);
    });
    return out;
  }

  // The workbook state in the shape app.js expects (freshState), with numbers where it prints numbers.
  function shape(s) {
    s = obj(s) || {};
    var l = obj(s.l) || {}, log = obj(s.log) || {}, streak = obj(s.streak) || {};
    Object.keys(l).forEach(function (id) {
      var st = obj(l[id]);
      if (!st) { delete l[id]; return; }
      if ('stars' in st) st.stars = num(st.stars);
      if ('secs' in st) st.secs = num(st.secs);
      if (st.i !== undefined && !obj(st.i)) st.i = {};
    });
    Object.keys(log).forEach(function (b) { log[b] = Array.isArray(log[b]) ? log[b].filter(obj) : []; });
    return {
      v: 1, name: str(s.name, 60), theme: s.theme === 'light' || s.theme === 'dark' ? s.theme : '', xp: num(s.xp),
      streak: { last: str(streak.last, 10), n: Math.floor(num(streak.n)) }, l: l, log: log,
      mistakes: (Array.isArray(s.mistakes) ? s.mistakes : []).filter(function (x) { return obj(x) && typeof x.itemId === 'string'; }),
      mistakeNotes: str(s.mistakeNotes, 5000),
      queue: (Array.isArray(s.queue) ? s.queue : []).filter(function (x) { return obj(x) && typeof x.id === 'string'; }),
    };
  }

  function answered(st) { return st && obj(st.i) ? Object.keys(st.i).length : 0; }
  function better(a, b) {
    if (!a) return b;
    if (!b || !!a.finished !== !!b.finished) return a.finished || !b ? a : b;
    return answered(b) > answered(a) ? b : a;
  }
  function byId(list, extra, id) {
    var seen = {};
    list.forEach(function (x) { seen[id(x)] = 1; });
    extra.forEach(function (x) { if (!seen[id(x)]) { seen[id(x)] = 1; list.push(x); } });
    return list;
  }

  function merge(payload, raw) {
    var p = obj(clean(payload, 0));
    if (!p || p.v !== 1) return;
    var hash = 0;
    for (var i = 0; i < raw.length; i++) hash = (hash * 31 + raw.charCodeAt(i)) | 0;
    var done = read(DONE);
    if (Array.isArray(done) && done.indexOf(hash) >= 0) return;

    var old = obj(p.state) && p.state.v === 1 ? shape(p.state) : null;
    if (old) {
      var here = read(KEY), s = obj(here) && here.v === 1 ? shape(here) : null;
      if (!s) s = old;
      else {
        Object.keys(old.l).forEach(function (id) { s.l[id] = better(s.l[id], old.l[id]); });
        Object.keys(old.log).forEach(function (b) { if (!s.log[b] || old.log[b].length > s.log[b].length) s.log[b] = old.log[b]; });
        byId(s.mistakes, old.mistakes, function (x) { return x.itemId; });
        byId(s.queue, old.queue, function (x) { return x.id; });
        s.name = s.name || old.name;
        s.theme = s.theme || old.theme;
        s.xp = Math.max(s.xp, old.xp);
        if (old.streak.last > s.streak.last) s.streak = old.streak;
        if (old.mistakeNotes && s.mistakeNotes.indexOf(old.mistakeNotes) < 0) s.mistakeNotes = (s.mistakeNotes ? s.mistakeNotes + '\n\n' : '') + old.mistakeNotes;
        s.mistakeNotes = s.mistakeNotes.slice(0, 5000);
        if (here) Object.keys(here).forEach(function (k) { if (!(k in s)) s[k] = here[k]; });
      }
      write(KEY, s);
    }

    var labs = obj(p.labs);
    if (labs) {
      var mine = obj(read(LKEY)) || {};
      Object.keys(labs).forEach(function (id) {
        var o = obj(labs[id]);
        if (!o) return;
        var h = obj(mine[id]) || {}, tasks = {};
        [].concat(Array.isArray(h.tasks) ? h.tasks : [], Array.isArray(o.tasks) ? o.tasks : []).forEach(function (n) {
          if (typeof n === 'number' && n >= 0 && n < 1000) tasks[n] = 1;
        });
        Object.keys(o).forEach(function (k) { if (!(k in h)) h[k] = o[k]; });
        h.tasks = Object.keys(tasks).map(Number).sort(function (a, b) { return a - b; });
        if (h.total !== undefined || o.total !== undefined) h.total = Math.max(num(h.total), num(o.total));
        mine[id] = h;
      });
      write(LKEY, mine);
    }

    // Activity the old address had not yet sent to the teacher's Student Monitor (it was offline).
    var queue = Array.isArray(p.queue) ? p.queue.filter(function (r) { return obj(r) && typeof r.id === 'string' && obj(r.doc) && r.doc.site === SITE; }) : [];
    if (queue.length) write(QKEY, byId(Array.isArray(read(QKEY)) ? read(QKEY) : [], queue, function (r) { return r && r.id; }).slice(-300));

    write(DONE, (Array.isArray(done) ? done : []).concat(hash).slice(-20));
    window.WB_CARRIED = { lessons: old ? Object.keys(old.l).length : 0, labs: labs ? Object.keys(labs).length : 0 };
  }
})();
