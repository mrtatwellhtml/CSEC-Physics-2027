/* WBD — markup + maths helpers (PLAN.md §2, §5.1, §5.5).
   md(s)        workbook text → safe HTML: **bold**, *italic*, __underline__, ^sup^, ~sub~, newlines,
                and ⟪tex⟫ equations → <span class="tex"> placeholders.
   texHTML(t)   one TeX formula → placeholder span (for formula boxes / cards).
   typeset(el)  render every placeholder inside el with KaTeX (lazy-loads KaTeX the first time). */
(function () {
  'use strict';

  var KATEX_BASE = 'assets/vendor/katex/';
  var OPEN = '⟪', CLOSE = '⟫';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // While KaTeX loads (or if it fails), show a readable approximation of the TeX.
  var FALLBACK = [
    [/\\(?:t|d)?frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2'], [/\\sqrt\{([^{}]*)\}/g, '√($1)'],
    [/\\boldsymbol\{([^{}]*)\}/g, '$1'], [/\\(?:mathrm|text)\{([^{}]*)\}/g, '$1'],
    [/\\times/g, '×'], [/\\div/g, '÷'], [/\\pm/g, '±'], [/\\approx/g, '≈'], [/\\propto/g, '∝'], [/\\rightarrow/g, '→'],
    [/\\leftrightarrow/g, '↔'], [/\\neq/g, '≠'], [/\\geq/g, '≥'], [/\\leq/g, '≤'], [/\\cdot/g, '·'], [/\\circ/g, '°'],
    [/\\Delta/g, 'Δ'], [/\\theta/g, 'θ'], [/\\lambda/g, 'λ'], [/\\rho/g, 'ρ'], [/\\pi/g, 'π'], [/\\mu/g, 'μ'],
    [/\\Omega/g, 'Ω'], [/\\alpha/g, 'α'], [/\\beta/g, 'β'], [/\\gamma/g, 'γ'], [/\\Sigma/g, 'Σ'], [/\\(sin|cos|tan|log|ln)/g, '$1'],
    [/\\[,;:! ]|\\q?quad/g, ' '], [/\\([%$&#])/g, '$1'], [/\{\}/g, ''],
    [/\^\{([^{}]*)\}/g, '^$1'], [/_\{([^{}]*)\}/g, '_$1'], [/[{}]/g, ''],
  ];
  function texFallback(t) {
    var s = t;
    for (var k = 0; k < 3; k++) FALLBACK.forEach(function (r) { s = s.replace(r[0], r[1]); });
    return s;
  }

  function texHTML(tex, display) {
    return '<span class="tex pending' + (display ? ' display' : '') + '" data-tex="' + esc(tex) + '">' + esc(texFallback(tex)) + '</span>';
  }

  function inline(s) {
    // s is already HTML-escaped; apply the light markup.
    return s
      .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+?)__/g, '<u>$1</u>')
      .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/\^([^\s^][^^]*?)\^/g, '<sup>$1</sup>')
      .replace(/~([^\s~][^~]*?)~/g, '<sub>$1</sub>')
      .replace(/\n/g, '<br>');
  }

  // Workbook text → HTML. Equations are cut out first so their TeX is never touched by the markup rules.
  function md(s) {
    if (s == null) return '';
    s = String(s);
    var parts = s.split(new RegExp(OPEN + '([\\s\\S]*?)' + CLOSE));
    var maths = [], text = '';
    for (var i = 0; i < parts.length; i++) {
      if (i % 2) { text += '\u0000' + maths.length + '\u0000'; maths.push(parts[i]); }
      else text += parts[i];
    }
    var html = inline(esc(text));
    return html.replace(/\u0000(\d+)\u0000/g, function (_, n) { return texHTML(maths[+n]); });
  }

  // ---------- KaTeX, loaded once on demand ----------
  var katexPromise = null;
  function loadKatex() {
    if (window.katex) return Promise.resolve(window.katex);
    if (katexPromise) return katexPromise;
    katexPromise = new Promise(function (resolve, reject) {
      var css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = KATEX_BASE + 'katex.min.css';
      document.head.appendChild(css);
      var js = document.createElement('script');
      js.src = KATEX_BASE + 'katex.min.js'; js.async = true;
      js.onload = function () { resolve(window.katex); };
      js.onerror = function () { katexPromise = null; reject(new Error('KaTeX failed to load')); };
      document.head.appendChild(js);
    });
    return katexPromise;
  }

  function typeset(root) {
    root = root || document;
    var nodes = root.querySelectorAll('.tex.pending');
    if (!nodes.length) return Promise.resolve(0);
    return loadKatex().then(function (katex) {
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        try {
          katex.render(el.getAttribute('data-tex'), el, { throwOnError: false, strict: 'ignore', output: 'htmlAndMathml',
            displayMode: el.classList.contains('display') });
        } catch (e) { /* keep the fallback text */ }
        el.classList.remove('pending');
      }
      return nodes.length;
    }, function () { return 0; });
  }

  window.WBD = { esc: esc, md: md, texHTML: texHTML, typeset: typeset, loadKatex: loadKatex, texFallback: texFallback };
})();
