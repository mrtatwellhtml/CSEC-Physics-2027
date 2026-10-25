/* Student Monitor tracker, v1. Copy this file unchanged into any site in 2026-2027 Mathematics.
   It sends what a student does to Firestore (project mathlessons-7cc22) so the tutor's monitor
   app can show it. Plain ES2019, no Firebase library, no network until init() is called.

   StudentMonitor.init({
     site: 'csec-chemistry',            // a-z 0-9 -, matches the monitor's sites.js
     name: function () { return S.name; },  // the name the student typed on this site
     autoVisits: false,                 // true: record time on each page / #route (sites without their own hooks)
     askName: false,                    // true: no name box on the site, so show a one-time bar asking for it;
                                        //       `name` may still return a name the site already knows
     onStatus: function (state) {},     // 'sent' | 'queued' | 'failed', for lesson/mock records only
     host: undefined,                   // tests only: 'http://127.0.0.1:8080' for the Firestore emulator
   });
   StudentMonitor.event('lesson', { item, title, group, secs, right, total, score, max, note, detail });
   StudentMonitor.summary({ last, secs, done, total, xp });   // this student's totals on this site

   Records wait in localStorage and are resent until Firestore accepts them; repeats are ignored. */
(function () {
  'use strict';
  if (window.StudentMonitor) return;
  var PROJECT = 'mathlessons-7cc22', API_KEY = 'AIzaSyBM5v36g9_nU7oRhw2UmZZQCqmpat9noMQ';
  var DOCS = 'projects/' + PROJECT + '/databases/(default)/documents';
  var QKEY = 'smon-v1-queue', SIDKEY = 'smon-v1-sid', SUMKEY = 'smon-v1-summary', LASTSUMKEY = 'smon-v1-lastsum', MAXQ = 300;
  var FIELDS = ['item', 'title', 'group', 'secs', 'right', 'total', 'score', 'max', 'note', 'detail'];
  var LIMITS = { item: 120, title: 200, group: 120, note: 1000, detail: 20000 };
  var KINDS = ['open', 'visit', 'lesson', 'mock', 'lab', 'attempt', 'other'];
  var cfg = null, flushing = false, summaryTimer = 0;

  function read(key, fallback) { try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; } }
  function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage blocked */ } }
  function randomId() {
    return window.crypto && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).slice(0, 32);
  }
  function deviceId() { var id = read(SIDKEY, ''); if (!id) { id = randomId().slice(0, 24); write(SIDKEY, id); } return id; }
  // The monitor groups a student by this key across sites: "  Jo  SMITH." and "jo smith" are one person.
  function nameKey(name) { return String(name || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().slice(0, 60); }
  function studentName() { try { return String((cfg && cfg.name && cfg.name()) || '').trim().slice(0, 60); } catch (e) { return ''; } }
  function clip(v, n) { return String(v == null ? '' : v).slice(0, n); }
  function number(v) { var n = Number(v); return isFinite(n) && n > 0 ? n : 0; }

  function value(v) {
    if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    return { stringValue: String(v) };
  }
  function fields(obj) { var out = {}; Object.keys(obj).forEach(function (k) { out[k] = value(obj[k]); }); return out; }

  function event(kind, data) {
    var name = studentName();
    if (!cfg || !name || KINDS.indexOf(kind) < 0) return false;
    data = data || {};
    var doc = { site: cfg.site, sid: deviceId(), student: name, skey: nameKey(name), kind: kind, clientAt: new Date().toISOString() };
    FIELDS.forEach(function (f) {
      var v = data[f];
      if (f === 'detail') {
        v = v == null || v === '' ? '' : typeof v === 'string' ? v : JSON.stringify(v);
        if (v.length > LIMITS.detail && data.detail && typeof data.detail === 'object') {
          var slim = Object.assign({}, data.detail); delete slim.answers; slim.truncated = true; v = JSON.stringify(slim);
        }
      }
      doc[f] = LIMITS[f] ? clip(v, LIMITS[f]) : Math.min(number(v), f === 'secs' ? 86400 : 100000);
    });
    var q = read(QKEY, []);
    q.push({ id: randomId(), doc: doc, tries: 0, loud: kind === 'lesson' || kind === 'mock' });
    if (q.length > MAXQ) q = q.slice(q.length - MAXQ);
    write(QKEY, q);
    flush();
    return true;
  }

  function summary(data) {
    var name = studentName();
    if (!cfg || !name) return;
    // Fields left out keep their last value, so a page-visit update never wipes a site's own "done" count.
    var key = LASTSUMKEY + '-' + cfg.site, prev = read(key, {}), d = {};
    ['last', 'secs', 'done', 'total', 'xp'].forEach(function (k) { d[k] = data && data[k] !== undefined ? data[k] : prev[k]; });
    write(key, d);
    write(SUMKEY, { site: cfg.site, sid: deviceId(), student: name, skey: nameKey(name), last: clip(d.last, 200),
      secs: Math.min(number(d.secs), 10000000), done: Math.min(number(d.done), 100000),
      total: Math.min(number(d.total), 100000), xp: Math.min(number(d.xp), 10000000) });
    clearTimeout(summaryTimer);
    summaryTimer = setTimeout(flush, 1500);
  }

  function commit(write1) {
    return fetch((cfg.host || 'https://firestore.googleapis.com') + '/v1/' + DOCS + ':commit?key=' + API_KEY, {
      method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes: [write1] }),
    }).then(function (res) {
      if (res.ok) return 'ok';
      return res.text().then(function (t) {
        if (res.status === 409 || /ALREADY_EXISTS/.test(t)) return 'ok'; // a retry of something already saved
        if (res.status === 429 || res.status >= 500) throw new Error('Firestore ' + res.status);
        return 'rejected';
      });
    });
  }
  function status(entry, state) { if (entry.loud && cfg && cfg.onStatus) try { cfg.onStatus(state); } catch (e) { /* ignore */ } }

  // A page served from this computer (a preview, a site's own browser tests) never sends to the real database,
  // so test students cannot appear in the monitor. Tests that point `host` at the emulator, or set
  // window.SMON_ALLOW_LOCAL, still send.
  function localPreview() {
    return !cfg.host && !window.SMON_ALLOW_LOCAL && /^(localhost|127\.0\.0\.1|\[::1\]|)$/.test(location.hostname || '');
  }

  function flush() {
    if (flushing || !cfg || (navigator.onLine === false) || localPreview()) return;
    var q = read(QKEY, []), sum = read(SUMKEY, null);
    if (!q.length && !sum) return;
    flushing = true;
    var entry = q[0], job;
    if (entry) {
      job = commit({ update: { name: DOCS + '/monEvents/' + entry.id, fields: fields(entry.doc) },
        currentDocument: { exists: false }, updateTransforms: [{ fieldPath: 'at', setToServerValue: 'REQUEST_TIME' }] });
    } else {
      job = commit({ update: { name: DOCS + '/monStudents/' + sum.site + '_' + sum.sid, fields: fields(sum) },
        updateTransforms: [{ fieldPath: 'lastAt', setToServerValue: 'REQUEST_TIME' }] });
    }
    job.then(function (result) {
      flushing = false;
      if (entry) {
        var rest = read(QKEY, []);
        // Rejected by the rules: try a few visits in case the rules are being updated, then give up on it.
        var drop = result === 'ok' || ++entry.tries >= 5;
        rest = rest.filter(function (e) { return e.id !== entry.id; });
        if (!drop) rest.push(entry);
        write(QKEY, rest);
        status(entry, result === 'ok' ? 'sent' : 'failed');
        if (drop) flush();
      } else {
        var now = read(SUMKEY, null);
        if (now && JSON.stringify(now) === JSON.stringify(sum)) { try { localStorage.removeItem(SUMKEY); } catch (e) { /* ignore */ } }
        if (result === 'ok' && now && JSON.stringify(now) !== JSON.stringify(sum)) flush();
      }
    }, function () {
      flushing = false; // offline or server busy: keep everything for the next try
      if (entry) status(entry, 'queued');
    });
  }

  // Optional: time on each page (or #route) while it is on screen; 15 s or more counts as a visit.
  // Each visit also updates this student's summary, so light sites show up with a running total of minutes.
  var visit = null, SECSKEY = 'smon-v1-secs';
  function visitKey() { return location.pathname + location.hash; }
  function startVisit() {
    if (document.hidden || !studentName()) return;
    var v = visit = { item: visitKey(), title: document.title, at: Date.now() };
    setTimeout(function () { if (visit === v && document.title) v.title = document.title; }, 1500); // single-page apps set the title after routing
  }
  function endVisit() {
    if (!visit) return;
    var secs = Math.round((Date.now() - visit.at) / 1000), v = visit;
    visit = null;
    if (secs < 15) return;
    event('visit', { item: v.item, title: v.title || v.item, secs: secs });
    var total = number(read(SECSKEY, 0)) + secs;
    write(SECSKEY, total);
    summary({ last: 'Worked on: ' + (v.title || v.item), secs: total });
  }

  // Optional, for sites with no name box of their own: a slim bar asks once and keeps the name on this device.
  var NAMEKEY = 'smon-v1-name';
  function nameBar() {
    if (studentName() || document.getElementById('smon-bar')) return;
    try { if (sessionStorage.getItem('smon-v1-later')) return; } catch (e) { /* ignore */ }
    var css = document.createElement('style');
    css.textContent = '#smon-bar,#smon-bar *{box-sizing:border-box}#smon-bar{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:2147483000;width:min(640px,calc(100vw - 24px));' +
      'display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px 12px;border-radius:12px;font:14px/1.35 system-ui,-apple-system,"Segoe UI",sans-serif;' +
      'background:#fff;color:#1d2125;border:1px solid #ced4da;box-shadow:0 6px 24px rgba(0,0,0,.18)}' +
      '#smon-bar label{flex:1 1 100%}#smon-bar small{display:block;color:#5c636a}' +
      '#smon-bar input{flex:1 1 160px;min-width:0;padding:8px 10px;border:1px solid #adb5bd;border-radius:8px;font:inherit;background:#fff;color:inherit}' +
      '#smon-bar button{padding:8px 14px;border-radius:8px;border:1px solid #1c7ed6;background:#1c7ed6;color:#fff;font:inherit;cursor:pointer}' +
      '#smon-bar button.smon-later{background:transparent;color:inherit;border-color:#adb5bd}' +
      '@media (prefers-color-scheme:dark){#smon-bar{background:#1a1e23;color:#e9ecef;border-color:#2f363e}#smon-bar small{color:#a0a8b0}#smon-bar input{background:#111418;border-color:#495057}}' +
      '@media print{#smon-bar{display:none}}';
    var bar = document.createElement('form');
    bar.id = 'smon-bar';
    bar.setAttribute('aria-label', 'Your name for your teacher');
    bar.innerHTML = '<label for="smon-name">Type your name so your teacher can see your work.' +
      '<small>Your name and the pages you open are sent to your teacher.</small></label>' +
      '<input id="smon-name" maxlength="60" autocomplete="name" placeholder="First and last name" required>' +
      '<button type="submit">Save</button><button type="button" class="smon-later">Not now</button>';
    bar.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = bar.querySelector('input').value.trim();
      if (!v) return;
      write(NAMEKEY, v.slice(0, 60));
      bar.remove();
      if (cfg.autoVisits && !visit) startVisit();
    });
    bar.querySelector('.smon-later').addEventListener('click', function () {
      try { sessionStorage.setItem('smon-v1-later', '1'); } catch (e) { /* ignore */ }
      bar.remove();
    });
    document.head.appendChild(css);
    document.body.appendChild(bar);
  }

  function init(options) {
    if (cfg || !options || !/^[a-z0-9-]{2,40}$/.test(options.site || '')) return;
    cfg = options;
    if (cfg.askName) {
      // A name the site already knows wins; otherwise the one typed into the bar.
      var known = cfg.name;
      cfg.name = function () { var n = ''; try { n = known ? known() : ''; } catch (e) { /* ignore */ } return n || read(NAMEKEY, ''); };
    }
    if (cfg.askName) {
      if (document.body) nameBar(); else document.addEventListener('DOMContentLoaded', nameBar);
    }
    window.addEventListener('online', flush);
    document.addEventListener('visibilitychange', function () {
      if (cfg.autoVisits) { if (document.hidden) endVisit(); else startVisit(); }
      if (document.hidden) flush();
    });
    if (cfg.autoVisits) {
      window.addEventListener('hashchange', function () { endVisit(); startVisit(); });
      window.addEventListener('pagehide', endVisit);
      startVisit();
    }
    flush();
  }

  window.StudentMonitor = { init: init, event: event, summary: summary, flush: flush, nameKey: nameKey, name: studentName,
    pending: function () { return read(QKEY, []).length; } };
})();
