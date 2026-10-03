// Workbook markup → KaTeX TeX.
//
// The books store maths as plain Unicode with light markup: ^sup^, ~sub~, **bold**, × ÷ − √ ½ Δ θ …
// This module turns that into TeX so the site can typeset it with KaTeX.
//
//   formulaToTeX(s)  whole string is a formula (formula boxes, formula cards). Returns TeX or null
//                    when the string has no maths in it (then show it as normal text).
//   markMath(s)      prose: finds the equation spans inside a sentence and replaces each with
//                    ⟪tex⟫. Everything else is left untouched for WBD.md() to format.
//   whereToMarked(s) a formula "where" line ("F = force in newtons (N)"): symbol side → ⟪tex⟫.
//
// The converter checks every ⟪tex⟫ with KaTeX at build time; anything that fails to render
// falls back to the original text and is listed in the QA report.

export const OPEN = '⟪', CLOSE = '⟫';

const GREEK = { 'Δ': '\\Delta ', 'θ': '\\theta ', 'λ': '\\lambda ', 'ρ': '\\rho ', 'π': '\\pi ', 'μ': '\\mu ',
  'Ω': '\\Omega ', 'α': '\\alpha ', 'β': '\\beta ', 'γ': '\\gamma ', 'Σ': '\\Sigma ', 'ω': '\\omega ', 'φ': '\\phi ',
  'η': '\\eta ', 'ε': '\\varepsilon ', 'σ': '\\sigma ', 'τ': '\\tau ' };
const OPS = { '=': '=', '+': '+', '−': '-', '×': '\\times ', '÷': '\\div ', '/': '/', '±': '\\pm ', '≈': '\\approx ',
  '∝': '\\propto ', '≠': '\\neq ', '≥': '\\geq ', '≤': '\\leq ', '→': '\\rightarrow ', '↔': '\\leftrightarrow ',
  '≫': '\\gg ', '·': '\\cdot ', '<': '<', '>': '>', '-': '-' };
// Operators that make a span count as an equation (→ and / alone do not).
const ANCHOR_OPS = new Set(['=', '×', '÷', '±', '≈', '∝', '≠', '≥', '≤', '+', '−', '-']);
const FRACS = { '½': '\\tfrac{1}{2}', '¼': '\\tfrac{1}{4}', '¾': '\\tfrac{3}{4}' };
const USUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '−', 'ˣ': 'x', 'ⁿ': 'n' };
const USUB = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4' };
const FUNCS = new Set(['sin', 'cos', 'tan', 'log', 'ln']);
const UNITS = new Set(['m', 's', 'kg', 'g', 'mg', 'N', 'J', 'W', 'Pa', 'kPa', 'V', 'A', 'C', 'K', 'Hz', 'kHz', 'MHz',
  'GHz', 'cm', 'mm', 'km', 'nm', 'min', 'h', 'hr', 'hrs', 'kWh', 'kJ', 'MJ', 'kW', 'MW', 'mA', 'kV', 'mV', 'ms',
  'l', 'L', 'ml', 'mL', 'eV', 'dB', 'Bq', 'kN', 'T', 'day', 'days', 'years', 'y', 'mins', 'yr', 's.', 'atm', 'mol',
  'Ω', 'kΩ', 'MΩ', 'μA', 'μs', 'μm', 'μF', 'F', 'Wb', 'cents', 'units', 'unit', 'kgm']);
// Short English words that are never algebra.
const STOP = new Set(('of in is to the and or per so at by on for if as it be no not one two any all are was has had its ' +
  'out off can may use add get put set new old few how why who yes but nor than then also each both into from with only ' +
  'same when what this that does done will must just very more most less like up do we he she his her him you our us ' +
  'my me an see own way top end big low raw hot wet dry let say too via are got lot far ago sum max min net air oil gas ice sun car box ray sea ion tap cup pin bar rod').split(' '));
// Multi-letter units that are never algebra, wherever they appear.
const SURE_UNITS = new Set(['kg', 'Pa', 'kPa', 'Hz', 'kHz', 'MHz', 'GHz', 'cm', 'mm', 'km', 'nm', 'kWh', 'kJ', 'MJ',
  'kW', 'MW', 'mA', 'kV', 'mV', 'eV', 'dB', 'Bq', 'kN', 'kΩ', 'MΩ', 'μA', 'μs', 'μm', 'μF', 'Wb', 'mol']);

// ---------- tokenizer ----------
const RE = new RegExp([
  '(?<mark>\\((?:\\d|½)\\)(?=[\\s.,;]|$))',          // mark-scheme "(1)"
  '(?<label>(?<![\\w)])\\((?:[a-h]|i{1,3}|iv|vi?)\\)(?=\\s|$))', // part label "(a)", "(iii)"
  '(?<bold>\\*\\*)',
  '(?<sup>\\^[^^\\s][^^]*?\\^)',                   // ^...^
  '(?<sub>~[^~\\s][^~]*?~)',                       // ~...~
  '(?<usup>[⁰¹²³⁴⁵⁶⁷⁸⁹⁻ˣⁿ]+)',
  '(?<usub>[₀₁₂₃₄]+)',
  '(?<abbr>(?:[A-Za-z]\\.){2,})',                  // e.m.f.  p.d.
  '(?<num>\\d{1,3}(?: \\d{3})+(?![\\d.])|\\d+(?:\\.\\d+)?)',
  '(?<usym>[kM]Ω|μ[AsmF])',                        // kΩ MΩ μA … (one unit token)
  '(?<word>[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[\'’][A-Za-z]+)*)', // (À-ÿ would include × and ÷)
  '(?<greek>[ΔθλρπμΩαβγΣωφηεστ])',
  '(?<deg>°[CF]?)',
  '(?<frac>[½¼¾])',
  '(?<sqrt>√)',
  '(?<op>[=+−×÷/±≈∝≠≥≤→↔≫·<>]| - )',
  '(?<open>[(\\[])', '(?<close>[)\\]])',
  '(?<ws>\\s+)',
  '(?<pct>%)', '(?<dollar>\\$)',
  '(?<other>[\\s\\S])',
].join('|'), 'gu');

export function tokenize(s) {
  const out = [];
  for (const m of s.matchAll(RE)) {
    const type = Object.keys(m.groups).find(k => m.groups[k] !== undefined);
    out.push({ type, v: m[0] });
  }
  markUnits(out);
  return out;
}

const isScript = t => t && /^(sup|sub|usup|usub)$/.test(t.type);
const unitCandidate = t => (t.type === 'word' || t.type === 'usym' || (t.type === 'greek' && t.v === 'Ω')) && UNITS.has(t.v);

function markUnits(out) {
  // Previous significant token (skipping spaces/bold), and the base under any scripts.
  const prevSig = i => { let j = i - 1; while (j >= 0 && (out[j].type === 'ws' || out[j].type === 'bold')) j--; return j; };
  const baseOf = j => { while (j >= 0 && isScript(out[j])) j--; return j; };
  for (let i = 0; i < out.length; i++) {
    const t = out[i];
    if (t.type === 'usym' || (unitCandidate(t) && SURE_UNITS.has(t.v))) { t.unit = true; continue; }
    if (!unitCandidate(t)) continue;
    const j = prevSig(i), prev = out[j], base = out[baseOf(j)];
    // after a number (or 10^n^, or °), after another unit, or after "/" that follows a unit
    if (prev && (prev.type === 'num' || prev.type === 'deg' || prev.unit
        || (isScript(prev) && base && (base.unit || base.type === 'num'))
        || (prev.type === 'op' && prev.v === '/' && out[baseOf(j - 1)] && out[baseOf(j - 1)].unit))) t.unit = true;
  }
  // Runs of single-letter unit candidates with no number ("W = J s^−1^", "N m^−2^"): units when the
  // run has 2+ candidates and at least one carries a negative power or sits next to a sure unit.
  for (let i = 0; i < out.length; i++) {
    if (!unitCandidate(out[i]) || out[i].unit) continue;
    const run = [i]; let k = i;
    for (;;) {
      let n = k + 1; while (n < out.length && isScript(out[n])) n++;
      if (out[n] && out[n].type === 'ws' && out[n].v === ' ' && out[n + 1] && (unitCandidate(out[n + 1]) || out[n + 1].unit)) { k = n + 1; run.push(k); }
      else break;
    }
    const negPow = run.some(r => isScript(out[r + 1]) && /^[\^]?[−-]|^⁻/.test(out[r + 1].v.replace(/^\^/, '')));
    if (run.length >= 2 && (negPow || run.some(r => out[r].unit))) run.forEach(r => { out[r].unit = true; });
    i = k;
  }
  // A ";"-separated statement that is purely about units ("N = kg m s^−2^", "J = N m = kg m^2^ s^−2^"):
  // if every letter operand is a unit candidate and the statement has a sure unit, they are all units.
  let s0 = 0;
  for (let i = 0; i <= out.length; i++) {
    if (i < out.length && !(out[i].type === 'other' && out[i].v === ';')) continue;
    const seg = out.slice(s0, i);
    const letters = seg.filter(t => t.type === 'word' || t.type === 'usym' || t.type === 'greek');
    if (!seg.some(t => t.type === 'num') && seg.some(t => t.unit && (SURE_UNITS.has(t.v) || t.type === 'usym'))
        && letters.length && letters.every(t => t.unit || unitCandidate(t) || isWordText(t))
        && !letters.some(t => isWordText(t))) letters.forEach(t => { t.unit = true; });
    s0 = i + 1;
  }
}

const isWordText = t => t.type === 'word' && !t.unit && !FUNCS.has(t.v) && (t.v.length > 3 || STOP.has(t.v.toLowerCase()) || /[À-ÖØ-öø-ÿ'’]/.test(t.v));
const isOperand = t => t.type === 'num' || t.type === 'greek' || t.type === 'frac' || t.type === 'sqrt' || t.unit
  || (t.type === 'word' && !isWordText(t));

// ---------- TeX emission ----------
const escText = s => s.replace(/[\\{}$%&#_^~]/g, c => ({ '\\': '\\backslash ', '^': '\\^{}', '~': '\\~{}' }[c] || '\\' + c));

function scriptTeX(inner) {
  // inner of ^..^ or ~..~ (already without markers)
  if (/^[A-Za-z]{2,}$/.test(inner)) return `\\text{${inner}}`;
  if (/^[A-Za-z]$/.test(inner)) return inner;
  return toTeX(tokenize(inner), { inScript: true });
}

function toTeX(toks, opt = {}) {
  let out = '', text = '', bold = !!opt.bold, prevMath = false, needBase = true;
  const flushText = () => { if (text) { out += `\\text{${escText(text)}}`; text = ''; prevMath = true; needBase = false; } };
  const emit = s => { flushText(); out += s; prevMath = true; };
  let boldBuf = null;
  const startBold = () => { flushText(); boldBuf = out; out = ''; };
  const endBold = () => { flushText(); out = boldBuf + (out ? `\\boldsymbol{${out}}` : ''); boldBuf = null; };
  if (bold) startBold();
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i], next = toks[i + 1];
    switch (t.type) {
      case 'bold': (boldBuf === null ? startBold : endBold)(); needBase = true; break;
      case 'ws': {
        if (text) { text += ' '; break; }
        const nx = toks.slice(i + 1).find(x => x.type !== 'ws');
        if (nx && isWordText(nx) && out) { text = ' '; break; }
        // a wide gap separates two statements; not next to an operator or after ";"
        if (/ {2,}/.test(t.v) && !opt.inScript && out && !/(\\quad|[=+\-<>]|\\[a-z]+arrow|\\times|\\div|\\pm)\s*$/.test(out)
            && !(nx && (nx.type === 'op' || nx.type === 'sqrt'))) emit('\\qquad ');
        // keep the space in "2.7 × 10^5^ Pa (2.67 × 10^5^)" — math mode would swallow it
        else if (nx && nx.type === 'open' && out && !/(\\quad|[=+\-<>(]|\\[a-z]+arrow|\\times|\\div|\\pm|\\cdot)\s*$/.test(out)
            && !opt.inScript) emit('\\ ');
        needBase = true; break;
      }
      case 'word': case 'abbr':
        if (t.type === 'abbr' || isWordText(t)) {
          if (!text && out && prevMath && toks[i - 1] && toks[i - 1].type === 'ws') text = ' ';
          text += t.v; break;
        }
        if (t.unit) { emit(`${prevUnitSep(toks, i)}\\mathrm{${unitTeX(t.v)}}`); }
        else if (FUNCS.has(t.v)) emit(`\\${t.v} `);
        else emit(t.v);
        needBase = false; break;
      case 'usym': emit(`${prevUnitSep(toks, i)}\\mathrm{${unitTeX(t.v)}}`); needBase = false; break;
      case 'greek':
        if (t.unit) emit(`${prevUnitSep(toks, i)}\\Omega `); else emit(GREEK[t.v]);
        needBase = false; break;
      case 'num': emit(t.v.replace(/ /g, '\\,')); needBase = false; break;
      case 'sup': case 'sub': case 'usup': case 'usub': {
        const inner = t.type === 'sup' || t.type === 'sub' ? t.v.slice(1, -1)
          : [...t.v].map(c => USUP[c] || USUB[c]).join('');
        const mark = t.type === 'sup' || t.type === 'usup' ? '^' : '_';
        if (text) flushText();
        if (needBase) out += '{}';
        out += `${mark}{${scriptTeX(inner)}}`; prevMath = true;
        // a ~sub~ straight after a ^sup^ (nuclide notation ^A^~Z~X) shares the same base
        needBase = false;
        break;
      }
      case 'deg': emit(t.v === '°' ? '^{\\circ}' : `${prevUnitSep(toks, i)}{}^{\\circ}\\mathrm{${t.v[1]}}`); needBase = false; break;
      case 'frac': emit(FRACS[t.v]); needBase = false; break;
      case 'sqrt': {
        if (next && next.type === 'open') {
          let depth = 0, j = i + 1;
          for (; j < toks.length; j++) {
            if (toks[j].type === 'open') depth++;
            if (toks[j].type === 'close' && --depth === 0) break;
          }
          emit(`\\sqrt{${toTeX(toks.slice(i + 2, j), opt)}}`); i = j;
        } else if (next) {
          // √ applies to the next operand (with its scripts)
          let j = i + 1; const grp = [toks[j]];
          while (toks[j + 1] && /^(sup|sub|usup|usub)$/.test(toks[j + 1].type)) grp.push(toks[++j]);
          emit(`\\sqrt{${toTeX(grp, opt)}}`); i = j;
        } else emit('\\surd ');
        needBase = false; break;
      }
      case 'op': emit(OPS[t.v.trim()] ?? escText(t.v)); needBase = true; break;
      case 'open': emit(t.v === '[' ? '[' : '('); needBase = true; break;
      case 'close': emit(t.v); needBase = false; break;
      case 'pct': emit('\\%'); needBase = false; break;
      case 'dollar': emit('\\$'); needBase = false; break;
      case 'mark': if (!text && out) text = ' '; text += t.v; break;
      default:
        if (t.v === ';' && !opt.inScript) { emit(';\\quad '); needBase = true; break; }
        if (/^[,:.!?'’"“”]$/.test(t.v)) { if (text) text += t.v; else emit(t.v === ',' ? ',\\ ' : t.v === ':' ? '{:}\\ ' : escText(t.v)); needBase = true; break; }
        text += t.v; needBase = false;
    }
  }
  flushText();
  if (boldBuf !== null) endBold();
  return out.replace(/\s+/g, ' ').trim();
}

function unitTeX(u) {
  return u.replace(/Ω/g, '\\Omega').replace(/μ/g, '\\mu ');
}
function prevUnitSep(toks, i) {
  // thin space between a number and its unit, or between two units
  let j = i - 1; while (j >= 0 && toks[j].type === 'bold') j--;
  if (!toks[j] || toks[j].type !== 'ws') return '';
  let k = j - 1; while (k >= 0 && toks[k].type === 'bold') k--;
  const p = toks[k];
  return p && (p.type === 'num' || p.unit || p.type === 'deg' || p.type === 'pct' || p.type === 'frac' || isScript(p)
    || (p.type === 'word' && !isWordText(p)) || p.type === 'greek' || p.type === 'close') ? '\\,' : '';
}

// ---------- public API ----------
const hasAnchor = toks => toks.some(t => (t.type === 'op' && ANCHOR_OPS.has(t.v.trim())) || t.type === 'sqrt');

export function formulaToTeX(s) {
  const toks = tokenize(s);
  const mathy = toks.some(t => (t.type === 'op' && t.v.trim() !== '→') || t.type === 'sup' || t.type === 'sub'
    || t.type === 'usup' || t.type === 'sqrt' || t.type === 'greek' || t.type === 'frac');
  if (!mathy || !toks.some(isOperand)) return null;
  return toTeX(toks);
}

// Token kinds allowed inside an equation span in prose.
const inSpan = t => t.type === 'num' || t.type === 'greek' || t.type === 'frac' || t.type === 'sqrt' || t.type === 'op'
  || t.type === 'sup' || t.type === 'sub' || t.type === 'usup' || t.type === 'usub' || t.type === 'deg' || t.type === 'pct'
  || t.type === 'dollar' || t.type === 'open' || t.type === 'close' || t.type === 'bold' || t.type === 'ws'
  || t.type === 'usym' || (t.type === 'word' && !isWordText(t));

export function markMath(s) {
  if (!s || typeof s !== 'string') return s;
  const toks = tokenize(s);
  const res = [];
  let i = 0, bold = false;
  while (i < toks.length) {
    if (!inSpan(toks[i]) || toks[i].type === 'ws' || toks[i].type === 'bold') {
      if (toks[i].type === 'bold') bold = !bold;
      res.push(toks[i].v); i++; continue;
    }
    let j = i;
    while (j + 1 < toks.length && inSpan(toks[j + 1])) j++;
    let a = i, b = j;
    const depth = () => toks.slice(a, b + 1).reduce((d, t) => d + (t.type === 'open') - (t.type === 'close'), 0);
    // Trim the edges until stable: spaces, dangling operators (a leading "=" or "−" may stay),
    // unmatched brackets, and an article "A"/"a" in front of a number ("A 3.0 × 10^8^ m s^−1^ wave").
    for (let changed = true; changed && a <= b;) {
      changed = false;
      const ta = toks[a], tb = toks[b];
      if (tb.type === 'ws' || tb.type === 'op' || (tb.type === 'open') || (tb.type === 'close' && depth() < 0)) { b--; changed = true; continue; }
      if (ta.type === 'ws' || (ta.type === 'op' && !/^[=−]$/.test(ta.v.trim())) || ta.type === 'close' || (ta.type === 'open' && depth() > 0)) { a++; changed = true; continue; }
      if (ta.type === 'word' && /^[Aa]$/.test(ta.v) && toks[a + 1] && toks[a + 1].type === 'ws' && toks[a + 2] && toks[a + 2].type === 'num') { a++; changed = true; }
    }
    if (a > b) { for (let k = i; k <= j; k++) { if (toks[k].type === 'bold') bold = !bold; res.push(toks[k].v); } i = j + 1; continue; }
    // a bold marker on the trailing edge belongs inside only if one opened inside the span
    while (b > a && toks[b].type === 'bold' && !toks.slice(a, b).some(t => t.type === 'bold')) b--;
    while (a < b && toks[a].type === 'bold' && !toks.slice(a + 1, b + 1).some(t => t.type === 'bold')) a++;
    const span = toks.slice(a, b + 1);
    // An equation needs an anchor operator and something to operate on. A lone sign ("+1", "−2")
    // is not an equation unless something else in the span is (two operands, or √).
    const operands = span.filter(isOperand).length;
    const strongAnchor = span.some(t => (t.type === 'op' && ANCHOR_OPS.has(t.v.trim()) && !/^[+−-]$/.test(t.v.trim())) || t.type === 'sqrt');
    const ok = span.length > 0 && depth() === 0 && hasAnchor(span) && operands >= 1 && (strongAnchor || operands >= 2);
    for (let k = i; k < a; k++) { if (toks[k].type === 'bold') bold = !bold; res.push(toks[k].v); }
    if (ok) {
      const nb = span.filter(t => t.type === 'bold').length;
      const endBold = nb % 2 ? !bold : bold;
      const tex = toTeX(span, { bold });
      res.push((bold ? '**' : '') + OPEN + tex + CLOSE + (endBold ? '**' : ''));
      bold = endBold;
    } else {
      for (const t of span) { if (t.type === 'bold') bold = !bold; res.push(t.v); }
    }
    for (let k = b + 1; k <= j; k++) { if (toks[k].type === 'bold') bold = !bold; res.push(toks[k].v); }
    i = j + 1;
  }
  return res.join('').replace(/\*\*\*\*/g, '');
}

export function whereToMarked(s) {
  const m = /^(\s*)([^=]{1,14}?)(\s*=\s+)([\s\S]*)$/.exec(s);
  if (m && !/[A-Za-z]{4,}|:/.test(m[2])) {
    const lhs = toTeX(tokenize(m[2].trim()));
    if (lhs) return `${m[1]}${OPEN}${lhs}${CLOSE}${m[3]}${markMath(m[4])}`;
  }
  return markMath(s);
}
