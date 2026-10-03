/* WBC — answer checking. Shared by the browser (window.WBC) and Node (module.exports):
   the converter uses parseNumber() to read the mark-scheme values, and the site uses the same
   code to read what the student typed, so both sides agree on what a number is. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WBC = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-', '⁺': '+' };

  // Normalise symbols people type in different ways: minus signs, ×, spaces, superscripts.
  function norm(s) {
    return String(s == null ? '' : s)
      .replace(/[−‒–—﹣－]/g, '-')        // − – — → -
      .replace(/[×✕✖⨯·]/g, 'x').replace(/\*/g, 'x')
      .replace(/÷/g, '/')
      .replace(/≤/g, '<=').replace(/≥/g, '>=')
      .replace(/[   ]/g, ' ')                          // odd spaces
      .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g, function (m) { return '^' + m.split('').map(function (c) { return SUP[c]; }).join(''); })
      .replace(/\^([^\s^]+)\^/g, '^$1')                                // workbook ^sup^ markup
      .replace(/~([^\s~]+)~/g, '$1')
      .trim();
  }

  function sigFigs(digits) {
    // digits: mantissa as typed, e.g. "0.0250", "1200", "3.0"
    var d = digits.replace(/^[-+]/, '').replace(/\s|,/g, '');
    if (d.indexOf('.') >= 0) return d.replace('.', '').replace(/^0+/, '').length || 1;
    return d.replace(/^0+/, '').replace(/0+$/, '').length || 1;
  }
  function decimals(digits) { var i = digits.indexOf('.'); return i < 0 ? 0 : digits.length - i - 1; }

  // Read ONE number from a string. Accepts: 1.42 · −2.5 · 1 200 · 1,200 · $31.35 · 45% · 1/2 · 2½
  // 3.0×10^10 · 3.0 x 10^10 · 3 × 10¹⁰ · 3.0e10 · 3.0E-5 · 10^6. Trailing units are ignored.
  // Returns {value, sf, dp, text} or null.
  var NUM = /^([-+]?)\s*\$?\s*(\d{1,3}(?:[ ,]\d{3})+(?:\.\d+)?|\d*\.?\d+)/;
  function parseNumber(input) {
    var s = norm(input);
    if (!s) return null;
    // a bare power of ten: "10^6"
    var p10 = /^([-+]?)10\s*\^\s*\(?([-+]?\d+)\)?/.exec(s);
    if (p10) return { value: (p10[1] === '-' ? -1 : 1) * Math.pow(10, +p10[2]), sf: 1, dp: 0, text: p10[0] };
    // fraction a/b (only when both sides are plain numbers)
    var fr = /^([-+]?)\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)(?![\d.])/.exec(s);
    if (fr && !/^\s*(x|e)\s*\d/i.test(s.slice(fr[0].length))) {
      var v = +fr[2] / +fr[3];
      return { value: fr[1] === '-' ? -v : v, sf: 3, dp: 3, text: fr[0], fraction: true };
    }
    var m = NUM.exec(s);
    if (!m) return null;
    var mant = m[2], rest = s.slice(m[0].length);
    var value = parseFloat(mant.replace(/[ ,]/g, ''));
    // mixed number with ½: "2½"
    if (/^½/.test(rest)) { value += 0.5; rest = rest.slice(1); }
    var exp = 0, used = m[0];
    var sci = /^\s*(?:x|X)\s*10\s*\^\s*\(?([-+]?\d+)\)?/.exec(rest) || /^\s*[eE]([-+]?\d+)/.exec(rest);
    if (sci) { exp = +sci[1]; used += sci[0]; }
    if (m[1] === '-') value = -value;
    value = value * Math.pow(10, exp);
    // tidy floating error (e.g. 0.1*3)
    value = +value.toPrecision(12);
    return { value: value, sf: sigFigs(mant), dp: decimals(mant.replace(/[ ,]/g, '')), text: used };
  }

  // Is `typed` within tolerance of the expected value? tol: {pct, abs, min, max}
  function checkNumber(typed, expect) {
    var got = parseNumber(typed);
    if (!got) return { ok: false, reason: 'nonumber' };
    var v = got.value, ok;
    if (expect.min != null && expect.max != null) ok = v >= expect.min - 1e-12 && v <= expect.max + 1e-12;
    else {
      var tol = Math.max(Math.abs(expect.value) * (expect.pct == null ? 0.02 : expect.pct), expect.abs || 0);
      ok = Math.abs(v - expect.value) <= tol + 1e-12;
    }
    if (!ok && expect.alt) ok = expect.alt.some(function (a) { return Math.abs(v - a) <= Math.abs(a) * 0.02 + 1e-12; });
    // a sign slip on a magnitude-only answer ("recoil speed")
    if (!ok && expect.signFree) ok = checkNumber(String(-v), { value: expect.value, pct: expect.pct, abs: expect.abs }).ok;
    return { ok: ok, value: v };
  }

  function editDistance(a, b) {
    if (a === b) return 0;
    var m = a.length, n = b.length, prev = [], cur, i, j;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur = [i];
      for (j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }

  // Short text: lower-case, drop articles and punctuation, simple plural.
  function normWords(s) {
    return norm(s).toLowerCase().replace(/\.(?=[a-z])/g, '').replace(/[.,;:!?'"()]/g, ' ').replace(/\b(the|a|an)\b/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function singular(w) { return w.length > 3 ? w.replace(/(es|s)$/, '') : w; }
  function checkShort(typed, accept) {
    var t = normWords(typed);
    if (!t) return { ok: false };
    var ts = t.split(' ').map(singular).join(' ');
    for (var i = 0; i < accept.length; i++) {
      var a = normWords(accept[i]), as = a.split(' ').map(singular).join(' ');
      if (t === a || ts === as) return { ok: true };
      if (as.length >= 5 && editDistance(ts, as) <= 1) return { ok: true, spelling: true };
    }
    return { ok: false };
  }

  return { norm: norm, parseNumber: parseNumber, checkNumber: checkNumber, checkShort: checkShort,
    editDistance: editDistance, normWords: normWords, sigFigs: sigFigs };
});
