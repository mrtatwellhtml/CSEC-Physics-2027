// Question classification (PLAN.md §5.2). Works on the RAW workbook text (before TeX marking).
//   mcq    has options + a letter answer
//   num    asks for one calculated/stated quantity and the mark scheme ends in one number (+ unit)
//   short  1 mark, the answer is 1–3 words
//   self   everything else: the mark scheme is split into mark points the student ticks
// When in doubt we choose self-mark: a wrongly auto-marked question is worse than a self-marked one.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const WBC = require('../assets/js/wbc.js');

// ---------- mark points ----------
// "(1)", "(2)", "(1+1)", "(1+1 unit)", "(3 marks all correct; −1 per error)", "(2: −1 per error)".
// NOT: "(22.1°)", "(1/6)", "(1 mark for every two correct.)", "(2 s)".
const MARK_RE = /\((\d)((?:\s*\+\s*\d)*)(\s*marks?)?((?:\s+(?:unit|for|all|each|if|only|max)\b[^()]*)|(?:\s*[:;]\s*[^()]*))?\)/g;

function markValue(m) {
  if (/\bevery\b|\beach\b/.test(m[0])) return null;
  return [m[1], ...(m[2].match(/\d/g) || [])].reduce((s, d) => s + +d, 0);
}

export function stripMarks(a) {
  return String(a).replace(MARK_RE, (...m) => (markValue(m) == null ? m[0] : ' ')).replace(/\s+/g, ' ').replace(/\s+([.,;])/g, '$1').trim();
}

// Split a mark scheme into points: [{text, marks}]. Each marker closes the text before it.
export function markPoints(answer, marks) {
  const a = String(answer);
  const pts = [];
  let last = 0, m;
  MARK_RE.lastIndex = 0;
  while ((m = MARK_RE.exec(a))) {
    const v = markValue(m);
    if (v == null) continue;
    const text = a.slice(last, m.index).replace(/^[\s;,.]+/, '').replace(/[\s;,]+$/, '').trim();
    if (!text && pts.length) pts[pts.length - 1].marks += v;           // "(1)(1)"
    else pts.push({ text: text || '…', marks: v });
    last = m.index + m[0].length;
  }
  const tail = a.slice(last).replace(/^[\s;,.]+/, '').replace(/[\s.]+$/, '').trim();
  if (!pts.length) {
    // no markers: one point worth the whole question. "(1 each)" / "any two" → the student picks 0…n.
    const p = { text: a.trim(), marks: marks || 1 };
    if (p.marks > 1 && /\b(each|any (two|three|four|2|3|4))\b/i.test(a)) p.each = true;
    return { points: [p], exact: (marks || 1) <= 1 || !!p.each, sum: p.marks };
  }
  if (tail) pts[pts.length - 1].text += (/^[(]/.test(tail) ? ' ' : '. ') + tail;   // trailing note
  const sum = pts.reduce((s, p) => s + p.marks, 0);
  return { points: pts, exact: !marks || sum === marks, sum };
}

// ---------- numeric ----------
const CALC = /\b(calculate|find|determine|work out|how (many|much|long|far|fast|high|deep)|what (is|was|will be) the|convert|estimate|what (current|voltage|force|mass|speed|distance|time))\b/i;
const NOT_CALC = /\b(show that|explain|describe|suggest|why|sketch|draw|plot|complete the table)\b/i;
const multiPart = s => /\(a\)[\s\S]*\(b\)/.test(s) || /\(i\)[\s\S]*\(ii\)/.test(s);

function asksForTwo(q) {
  // "Calculate the period and the frequency", "Find its efficiency and state …"
  const sentences = q.split(/(?<=[.?!])\s+/);
  const s = sentences.find(x => CALC.test(x)) || '';
  const after = s.slice(s.search(CALC));
  // another command: "State what this shows and calculate g", "State the frequency of the a.c. and
  // calculate the period" (abbreviations break sentence splitting, so look at the whole question too)
  if (/\b(state|explain|describe|name|give|suggest|sketch|draw|comment)\b/i.test(s.replace(CALC, ''))) return true;
  if (/(^|[.?!]\s+|\band\s+)(State|Explain|Describe|Name|Give|Suggest|Sketch|Draw|Comment|state|explain|describe|name|give|suggest|sketch|draw|comment)\b/.test(q.replace(CALC, '§'))) return true;
  return /\band\b|\bas well as\b|,\s*(?:and\s+)?(?:its|the)\b/i.test(after.replace(/\([^)]*\)/g, ''));
}

// Is this text just a unit? ("m s^-1", "°C", "J kg^-1 °C^-1", "%", "Ω", "")
function looksLikeUnit(u) {
  const t = u.trim();
  if (!t) return true;
  if (t.length > 16) return false;
  return t.split(/\s+/).every(w => /^(?:°[CF]?|%|[kMmμnc]?Ω|[A-Za-z]{1,4}(?:\^[-+]?\d+)?|°C\^[-+]?\d+|\/[A-Za-z]{1,3}|[A-Za-z]{1,3}\/[A-Za-z]{1,3}(?:\^[-+]?\d+)?)$/.test(w))
    && !/\b(and|the|of|to|so|is|it|no|in|on|at|or)\b/i.test(t);
}

// The mark scheme without the notes that follow it on later lines ("(Alternative: …)",
// "**Common error:** … → 0.01 A"): every line up to the last one that carries a mark.
export function schemeCore(answer) {
  const lines = String(answer).split(/\n/);
  let last = -1;
  lines.forEach((l, i) => { const re = new RegExp(MARK_RE.source, 'g'); let m; while ((m = re.exec(l))) if (markValue(m) != null) last = i; });
  return (last >= 0 ? lines.slice(0, last + 1) : lines.slice(0, 1)).join(' ');
}

// Pull the final answer out of a mark scheme. Returns null when it is not a single quantity.
export function finalQuantity(answer) {
  let s = stripMarks(schemeCore(answer)).replace(/[.\s]+$/, '');
  // ranges given by the mark scheme: "(accept 42–45 N)"
  const acc = /accept\s+([-−]?[\d.]+)\s*(?:[–-]|to)\s*([-−]?[\d.]+)/i.exec(s);
  const clauses = s.split(/;\s*|\.\s+(?=[A-Z(])/).map(x => x.trim()).filter(Boolean);
  const c = clauses[clauses.length - 1];
  if (!c) return null;
  const norm = WBC.norm(c);
  // after the last relation sign
  const rel = Math.max(norm.lastIndexOf('='), norm.lastIndexOf('≈'), norm.lastIndexOf('→'), norm.lastIndexOf(':'));
  let seg = norm.slice(rel + 1).trim();
  // drop a lead-in word ("so", "therefore") or a quantity name with no "=" ("recoil speed 2.0 m/s")
  seg = seg.replace(/^(?:so|therefore|hence|thus)\s+/i, '');
  const num = WBC.parseNumber(seg);
  if (!num) return null;
  let rest = seg.slice(seg.indexOf(num.text) + num.text.length);
  if (seg.slice(0, seg.indexOf(num.text)).replace(/[$\s]/g, '')) return null;   // words before the number
  // unit = up to "(" or "," ; extras = the rest
  const cut = rest.search(/[(,]| -|—/);
  const unit = (cut < 0 ? rest : rest.slice(0, cut)).trim();
  const extras = (cut < 0 ? '' : rest.slice(cut)).trim();
  if (!looksLikeUnit(unit)) return null;
  // extras: only bracketed alternatives / short notes are allowed
  const alt = [];
  let wordy = false;
  for (const p of extras.match(/\(([^)]*)\)/g) || []) {
    const inner = p.slice(1, -1);
    const n = WBC.parseNumber(inner.replace(/^(?:accept|or|i\.e\.|=|≈)\s*/i, ''));
    if (n && !/accept\s/i.test(inner)) alt.push(n.value); else if (!/accept/i.test(inner)) wordy = true;
  }
  const outside = extras.replace(/\([^)]*\)/g, '').replace(/[\s,.;]/g, '');
  if (outside && !/^(negative|positive|backwards?|forwards?|upwards?|downwards?)$/i.test(outside)) return null;
  // earlier values in the same clause with the SAME unit ("= 257 500 Pa ≈ 2.6 × 10^5 Pa"): accept them
  // too. Not "1/T" or other working: the rest must be exactly the final unit.
  for (const part of norm.split(/=|≈/).slice(1, -1)) {
    const p = part.trim(), n = WBC.parseNumber(p);
    if (n && !n.fraction && unit && p.slice(n.text.length).trim() === unit) alt.push(n.value);
  }
  const out = { value: num.value, sf: num.sf, unit: unit.replace(/\^([-+]?\d+)/g, (_, e) => `^${e.replace('-', '−')}^`), alt: [...new Set(alt)].filter(v => v !== num.value) };
  if (acc) { out.min = Math.min(+acc[1].replace('−', '-'), +acc[2].replace('−', '-')); out.max = Math.max(+acc[1].replace('−', '-'), +acc[2].replace('−', '-')); }
  if (outside) out.signFree = true;
  out.wordy = wordy || !!outside;
  return out;
}

// ---------- short text ----------
const EXPLAIN = /\b(explain|why|describe|suggest|how does|how do|compare|distinguish|give a reason|outline|discuss|state and explain|what happens|predict)\b/i;

export function shortAccept(q, answer, marks) {
  if (marks !== 1 || EXPLAIN.test(q) || DEFINE.test(q)) return null;
  let a = stripMarks(schemeCore(answer)).replace(/[.\s]+$/, '').replace(/^\*\*|\*\*$/g, '');
  if (/e\.g\.|\bany\b|such as|or similar|\betc\b|[=→÷×;]|\d/.test(a)) return null;
  a = a.replace(/\*\*/g, '').replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  // a comma list where the question wants several things is not a single short answer
  if (/,/.test(a) && !/\bor\b/i.test(a)) return null;
  const alts = a.split(/\s*\/\s*|\s+or\s+|,\s*(?:or\s+)?/i).map(x => x.trim()).filter(Boolean);
  if (!alts.length || alts.some(x => x.split(/\s+/).length > 3 || x.length > 30)) return null;
  // people: "J. J. Thomson" → also accept "Thomson"
  for (const x of [...alts]) {
    const m = /^(?:[A-Z]\.\s*)+([A-Z][a-z]+)$|^[A-Z][a-z]+\s+([A-Z][a-z]+)$/.exec(x);
    if (m && /\bwho\b/i.test(q)) alts.push(m[1] || m[2]);
  }
  return alts;
}
const DEFINE = /\b(define|what is (a|an)\b|what are\b|what does .* mean|meaning of)\b/i;

// ---------- main ----------
export function letterOf(answer) {
  const m = /^\s*\**\s*\(?([A-D])\)?\s*\**/.exec(String(answer));
  return m ? m[1] : null;
}

export function classify({ q, answer, marks, options }) {
  q = String(q || ''); answer = String(answer || '');
  if (options && options.length) {
    const L = letterOf(answer);
    if (L) return { kind: 'mcq', answer: L, conf: 'high' };
    return { kind: 'self', conf: 'low', why: 'options but no answer letter' };
  }
  const pts = markPoints(answer, marks);
  const self = (why, conf = 'high') => ({ kind: 'self', points: pts.points, conf: pts.exact ? conf : 'low', why: pts.exact ? why : `${why}; mark points sum ${pts.sum ?? '?'} ≠ ${marks}` });

  if (multiPart(q)) return self('multi-part question');
  const fq = finalQuantity(answer);
  const bare = fq && !/[=≈→]/.test(stripMarks(answer)) && stripMarks(answer).replace(/[.\s]+$/, '').length < 24;
  if (fq && !NOT_CALC.test(q) && ((CALC.test(q) && !asksForTwo(q)) || bare)) {
    if (multiPart(answer)) return self('answer has parts (a)/(b)');
    const clauses = stripMarks(answer).split(/;\s*/).filter(c => /[=≈]\s*[-−$]?\d/.test(c));
    const conf = fq.wordy || (clauses.length > 2) ? 'low' : 'high';
    return { kind: 'num', num: fq, points: pts.points, conf, why: bare ? 'answer is a single quantity' : 'calculation with one final value' };
  }
  const acc = shortAccept(q, answer, marks);
  // one-word answers (or a name / a few listed alternatives of one word) are safe to auto-check;
  // longer phrases have too many fair wordings, so they are self-marked.
  if (acc && acc.every(x => x.split(/\s+/).length === 1 || /^[A-Z]/.test(x) && /\bwho\b/i.test(q) || /^[a-z]\.[a-z]\.?$/i.test(x)))
    return { kind: 'short', accept: acc, points: pts.points, conf: 'high', why: 'one-mark word answer' };
  if (acc) return { ...self('short phrase — too many fair wordings to auto-check'), shortCandidate: acc };
  return self(fq ? 'calculation but asks for more than one thing' : 'written answer');
}

export const levelOf = marks => (marks <= 1 ? 1 : marks <= 3 ? 2 : 3);
