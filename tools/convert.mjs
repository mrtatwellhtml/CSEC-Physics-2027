// content.json (17 books) → site data (PLAN.md §5).
//   data/index.js          window.WB_INDEX  — sections, books, lesson list (light; loaded on Home)
//   data/books/<id>.js     window.WB_BOOK[id] — full lesson data for one book (lazy-loaded)
//   img/<folder>/*.png|webp diagrams (WebP max 1400 px wide, PNG kept as fallback)
//   tools/report.html      QA report: every question, its type, the extracted answer, the mark scheme
//
// Text is passed through tools/tex.mjs so equations arrive as ⟪tex⟫ for KaTeX (PLAN.md §5.5).
// Never edit source/: corrections go in tools/overrides.json (keyed by item id).
//
// Usage: node tools/convert.mjs [--no-images]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BOOKS } from './books.mjs';
import { formulaToTeX, markMath, whereToMarked, unitToTeX } from './tex.mjs';
import { classify, levelOf, letterOf, stripMarks } from './classify.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEEKS = path.join(ROOT, 'source', 'wb', 'weeks');

export const SECTIONS = [
  { id: 'A', name: 'Mechanics', color: 't1' },
  { id: 'B', name: 'Thermal Physics', color: 't7' },
  { id: 'C', name: 'Waves & Optics', color: 't6' },
  { id: 'D', name: 'Electricity & Magnetism', color: 't2' },
  { id: 'E', name: 'The Physics of the Atom', color: 't5' },
  { id: 'X', name: 'Exam Preparation', color: 't4' },
];
export const EXAMS = { P02: '2027-01-05T09:00:00-04:00', P01: '2027-01-25T09:00:00-04:00' };

// Exam books: which content becomes a timed mock, and lesson order around it.
const MOCKS = {
  week13: { paper: 'P02', minutes: 150, from: 'past_paper', order: ['13.2', 'mock', '13.1'] },
  week16: { paper: 'P01', minutes: 75, from: 'exam_mcq', order: ['mock', '16.1', '16.2'] },
};
// "Revise in" names used by the Mock Paper 01 topic table → book folders.
const REVISE = [
  [/^Week (\d)\b/, m => `week0${m[1]}`],
  [/^1-to-1 S1\b/, () => 'es01'], [/^1-to-1 S2\b/, () => 'week09'], [/^1-to-1 S3\b/, () => 'week10'],
  [/^1-to-1 S4\b/, () => 'week11'], [/^1-to-1 S5\b/, () => 'week12'],
];

const TUTOR_ONLY = ['past_paper_suggestions', 'tutor_session_plan', 'tutor_notes'];

// ---------- helpers ----------
const M = s => (typeof s === 'string' ? markMath(s) : s);
const hash = s => parseInt(crypto.createHash('md5').update(s).digest('hex').slice(0, 8), 16);
const partKey = label => String(label || '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'x';
const words = s => new Set(String(s).toLowerCase().match(/[a-zΔθλρ]{4,}/g) || []);

function loadOverrides() {
  const f = path.join(ROOT, 'tools', 'overrides.json');
  if (!fs.existsSync(f)) return {};
  return JSON.parse(fs.readFileSync(f, 'utf8')).items || {};
}

// ---------- images ----------
function makeImages(folder) {
  const used = new Map();   // "img/x.png" → {src, w, h}
  return {
    ref(p, alt) {
      if (!p) return null;
      const name = path.basename(p, '.png');
      const src = `img/${folder}/${name}`;
      if (!used.has(p)) used.set(p, { file: path.join(WEEKS, folder, p), src, name });
      return { src, alt: alt ? stripMarkup(alt) : '', _p: p };
    },
    used,
  };
}
const stripMarkup = s => String(s).replace(/\*\*|__/g, '').replace(/\^([^^]*)\^/g, '$1').replace(/~([^~]*)~/g, '$1').replace(/\*([^*]+)\*/g, '$1');

// ---------- blocks ----------
function block(b, img) {
  switch (b.type) {
    case 'h': case 'p': return { type: b.type, text: M(b.text) };
    case 'bullets': case 'steps': return { type: b.type, items: b.items.map(M) };
    case 'def': return { type: 'def', term: M(b.term), text: M(b.text) };
    case 'formula': {
      const tex = formulaToTeX(b.formula);
      return { type: 'formula', ...(tex ? { tex } : { text: M(b.formula) }), where: (b.where || []).map(whereToMarked), ...(b.label ? { label: b.label } : {}) };
    }
    case 'tip': case 'warn': case 'remember': return { type: b.type, text: M(b.text), ...(b.label ? { label: b.label } : {}) };
    case 'img': return { type: 'img', ...img.ref(b.path, b.caption), caption: M(b.caption || ''), width: b.width };
    case 'table': return { type: 'table', headers: (b.headers || []).map(M), rows: (b.rows || []).map(r => r.map(M)) };
    case 'fill': return { type: 'fill', text: M(b.text), lines: b.lines || 1 };
    case 'lines': return { type: 'lines', n: b.n || 3 };
    case 'pagebreak': return null;
    default: throw new Error(`Unknown block type "${b.type}"`);
  }
}
const blocks = (list, img) => (list || []).map(b => block(b, img)).filter(Boolean);

// ---------- items ----------
const stats = { mcq: 0, num: 0, short: 0, self: 0, low: 0, overridden: 0 };
const reportRows = [];

function item(raw, id, ctx, img, overrides, extra = {}) {
  const marks = raw.marks || 1;
  let c = classify({ q: raw.q, answer: raw.answer, marks, options: raw.options });
  const ov = overrides[id];
  if (ov) {
    stats.overridden++;
    c = applyOverride(c, ov, raw);
  }
  const it = { id, kind: c.kind, q: M(raw.q), marks, level: levelOf(marks) };
  if (raw.img) it.img = img.ref(raw.img, raw.q);
  if (raw.blocks) it.blocks = blocks(raw.blocks, img);
  if (raw.lines != null) it.lines = raw.lines;
  if (raw.options) it.options = raw.options.map(M);
  if (c.kind === 'mcq') {
    it.answer = c.answer;
    it.explanation = M(raw.explanation || String(raw.answer).replace(/^\s*\**\s*\(?[A-D]\)?\s*\**\s*[—–:-]?\s*/, ''));
  } else {
    it.scheme = M(raw.answer);
    it.points = (c.points || []).map(p => ({ text: M(p.text), marks: p.marks, ...(p.each ? { each: true } : {}) }));
  }
  if (c.kind === 'num') {
    const n = c.num;
    it.num = { value: n.value, sf: n.sf, unit: n.unit, unitTex: unitToTeX(n.unit) };
    if (n.alt && n.alt.length) it.num.alt = n.alt;
    if (n.min != null) { it.num.min = n.min; it.num.max = n.max; }
    if (n.signFree) it.num.signFree = true;
    if (c.pct != null) it.num.pct = c.pct;
  }
  if (c.kind === 'short') it.accept = c.accept;
  if (c.conf === 'low') { it.conf = 'low'; stats.low++; }
  Object.assign(it, extra);
  stats[c.kind]++;
  reportRows.push({ id, ctx, kind: c.kind, conf: c.conf, why: ov ? `override: ${ov.note || ''}` : c.why || '', q: raw.q, answer: raw.answer, marks, it });
  return it;
}

function applyOverride(c, ov, raw) {
  const out = { ...c, conf: 'high' };
  if (ov.kind) out.kind = ov.kind;
  if (out.kind === 'num') {
    out.num = { ...(c.num || { sf: 2, unit: '', alt: [] }) };
    for (const k of ['value', 'unit', 'min', 'max', 'alt', 'signFree']) if (ov[k] != null) out.num[k] = ov[k];
    if (ov.pct != null) out.pct = ov.pct;
  }
  if (out.kind === 'short') out.accept = ov.accept || c.accept || c.shortCandidate;
  if (out.kind === 'self' && !out.points) out.points = [{ text: raw.answer, marks: raw.marks || 1 }];
  return out;
}

// Multi-part structured question (exam_structured / past_paper). Parts are self-marked (PLAN.md §6.3).
function multi(raw, id, ctx, img, overrides) {
  const stem = Array.isArray(raw.stem) ? raw.stem : raw.stem ? [raw.stem] : [];
  const seen = new Set();
  const parts = raw.parts.map((p, i) => {
    let k = partKey(p.label); while (seen.has(k)) k += i; seen.add(k);
    const it = item(p, `${id}.${k}`, `${ctx} ${p.label || ''}`, img, overrides, { label: p.label || '' });
    // self-mark every part in a structured question, but keep the extracted value for the report
    if (it.kind !== 'mcq' && it.kind !== 'self' && !(overrides[`${id}.${k}`] || {}).kind) {
      stats[it.kind]--; stats.self++; it.autoKind = it.kind; it.kind = 'self';
      reportRows[reportRows.length - 1].kind = 'self';
      reportRows[reportRows.length - 1].why += ' → self-marked (structured part)';
    }
    if (p.img && /graph_(paper|grid)/.test(p.img)) it.grid = true;
    return it;
  });
  return { id, kind: 'multi', title: M(raw.title || ''), total: raw.total || parts.reduce((s, p) => s + p.marks, 0),
    stem: stem.map(M), stemBlocks: blocks(raw.stemBlocks, img), parts };
}

// ---------- hints from worked examples ----------
function hintFor(rawQ, examples) {
  if (!examples.length) return null;
  const qw = words(rawQ);
  let best = null, bestScore = 0;
  examples.forEach((ex, i) => {
    const ew = words(`${ex.title} ${ex.question}`);
    const inter = [...qw].filter(w => ew.has(w)).length;
    const score = inter / Math.max(1, Math.min(qw.size, ew.size));
    if (score > bestScore) { bestScore = score; best = { ex, i }; }
  });
  if (!best || bestScore < 0.25) return null;
  const s0 = best.ex.steps[0];
  const first = typeof s0 === 'string' ? s0 : `${s0.label ? s0.label + ': ' : ''}${s0.text}`;
  return { text: M(`Look back at Example ${best.i + 1} (${best.ex.title}). Start like this: ${first}`), from: best.i + 1 };
}

// ---------- book ----------
function convertBook(b, n, prevBook, overrides) {
  const c = JSON.parse(fs.readFileSync(path.join(WEEKS, b.folder, 'content.json'), 'utf8'));
  const f = b.folder;
  const img = makeImages(f);
  const mock = MOCKS[f];
  const objectives = (c.objectives || []).map(o => ({ code: o.code, text: M(o.text) }));
  const objText = new Map((c.objectives || []).map(o => [o.code, o.text]));
  const glossary = (c.glossary || []).map(g => ({ term: M(g.term), def: M(g.def), _raw: g.term }));
  const lessons = [];

  // --- unit lessons
  const unitLessons = c.units.map((u, ui) => {
    const lid = `${f}.${u.id}`;
    const examples = (u.worked_examples || []).map((ex, i) => ({
      id: `${lid}.e${i + 1}`, title: M(ex.title), question: M(ex.question),
      ...(ex.img ? { img: img.ref(ex.img, ex.question) } : {}),
      steps: ex.steps.map(s => (typeof s === 'string' ? { label: '', text: M(s) } : { label: M(s.label || ''), text: M(s.text) })),
      answer: M(ex.answer),
    }));
    const prac = u.practice.map((p, i) => ({ raw: p, id: `${lid}.p${i + 1}` }));
    const N = prac.length;
    const nTry = N >= 5 ? 2 : 1, nExit = N >= 5 ? 2 : N >= 2 ? 1 : 0;
    const mk = (p, section) => {
      const it = item(p.raw, p.id, `${f} ${u.id} ${section}`, img, overrides, { section });
      if (section !== 'exit' && (it.kind === 'num' || it.kind === 'self')) {
        const h = hintFor(p.raw.q, u.worked_examples || []);
        if (h) it.hint = h;
      }
      return it;
    };
    const tryit = prac.slice(0, nTry).map(p => mk(p, 'try'));
    const practice = prac.slice(nTry, N - nExit).map(p => mk(p, 'practice'));
    const exit = prac.slice(N - nExit).map(p => mk(p, 'exit'));
    // raw unit text for vocab matching
    const rawText = JSON.stringify([u.notes, u.worked_examples, u.practice]).toLowerCase();
    const vocab = glossary.filter(g => {
      const t = g._raw.toLowerCase().replace(/[()]/g, '').trim();
      return t.length > 2 && new RegExp(`(^|[^a-z])${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(rawText);
    }).map(({ term, def }) => ({ term, def }));
    return {
      id: lid, kind: 'unit', unit: u.id, title: M(u.title), titleText: stripMarkup(u.title),
      goals: u.objectives.filter(o => objText.has(o)).map(o => ({ code: o, text: M(objText.get(o)) })),
      codes: u.objectives, words: vocab,
      learn: { notes: blocks(u.notes, img), examples },
      tryit, practice, exit, _raw: u,
    };
  });

  // --- warm-ups: first lesson ← previous book's recall quiz; others ← previous lesson's short items
  unitLessons.forEach((L, i) => {
    let pool = [];
    if (i === 0 && prevBook && prevBook.recall_quiz) {
      pool = prevBook.recall_quiz.map((r, k) => ({ raw: { q: r.q, answer: r.answer, marks: 1 }, src: `${prevBook._folder}.r${k + 1}` }));
    } else if (i > 0) {
      const prev = unitLessons[i - 1]._raw.practice.map((p, k) => ({ raw: p, src: `${unitLessons[i - 1].id}.p${k + 1}` }));
      const ones = prev.filter(p => (p.raw.marks || 1) === 1 && !p.raw.img && !p.raw.blocks);
      const pick = (ones.length >= 2 ? ones : prev.filter(p => !p.raw.img && !p.raw.blocks).sort((a, b) => a.raw.marks - b.raw.marks).slice(0, 4));
      // deterministic shuffle → stable ids on re-run
      pool = pick.map(p => [hash(L.id + p.src), p]).sort((a, b) => a[0] - b[0]).map(x => x[1]).slice(0, 3);
    }
    L.warmup = pool.map((p, k) => item(p.raw, `${L.id}.w${k + 1}`, `${f} ${L.unit} warm-up`, img, overrides, { section: 'warmup', src: p.src }));
  });
  unitLessons.forEach(L => { delete L._raw; });

  // --- quick start (prior knowledge) on the first lesson, except mock books where it is the exam's rules
  if (!mock && c.prior_knowledge && c.prior_knowledge.length) unitLessons[0].quickStart = blocks(c.prior_knowledge, img);

  // --- book check: Paper 01 MCQs + Paper 02 structured + common mistakes
  const mcqList = mock && mock.from === 'exam_mcq' ? [] : (c.exam_mcq || []);
  const structured = c.exam_structured || [];
  let check = null;
  if (mcqList.length || structured.length) {
    check = {
      id: `${f}.check`, kind: 'check', title: 'Book check', titleText: 'Book check', check: true,
      watchOut: (c.common_mistakes || []).map(M),
      mcq: mcqList.map((m, i) => item({ ...m, marks: 1 }, `${f}.check.m${i + 1}`, `${f} check MCQ`, img, overrides, { section: 'p01' })),
      structured: structured.map((s, i) => multi(s, `${f}.check.s${i + 1}`, `${f} check S${i + 1}`, img, overrides)),
    };
  }

  // --- past-paper practice (or the Paper 02 mock)
  let past = null, mockLesson = null;
  const pp = c.past_paper || [];
  if (mock) {
    const rules = blocks(c.prior_knowledge, img);
    if (mock.from === 'past_paper') {
      const gradeTable = c.units.flatMap(u => u.notes).find(nb => nb.type === 'table' && /grade/i.test((nb.headers || []).join(' ')));
      mockLesson = {
        id: `${f}.mock`, kind: 'mock', paper: mock.paper, minutes: mock.minutes, title: c.title.replace(/\s*\+.*$/, ''), titleText: c.title.replace(/\s*\+.*$/, ''),
        check: true, rules, total: pp.reduce((s, q) => s + (q.total || 0), 0),
        questions: pp.map((q, i) => multi(q, `${f}.mock.q${i + 1}`, `${f} mock Q${i + 1}`, img, overrides)),
        grades: gradeTable ? gradeTable.rows.map(r => {
          const [lo, hi] = String(r[0]).split(/[–-]/).map(Number);
          return { min: lo, max: hi, grade: r[1], todo: M(r[2]) };
        }) : [],
      };
    } else {
      const table = c.units.flatMap(u => u.notes).find(nb => nb.type === 'table' && nb.headers[0] === 'Item');
      const topic = new Map((table ? table.rows : []).map(r => [r[0], { section: r[1], topic: M(r[2]), revise: reviseBook(r[3]) }]));
      mockLesson = {
        id: `${f}.mock`, kind: 'mock', paper: mock.paper, minutes: mock.minutes, title: c.title.replace(/\s*\+.*$/, ''), titleText: c.title.replace(/\s*\+.*$/, ''),
        check: true, rules, total: (c.exam_mcq || []).length,
        mcq: (c.exam_mcq || []).map((m, i) => item({ ...m, marks: 1 }, `${f}.mock.m${i + 1}`, `${f} mock M${i + 1}`, img, overrides,
          { section: 'p01', ...(topic.get(`M${i + 1}`) || {}) })),
      };
    }
  }
  if (pp.length && !(mock && mock.from === 'past_paper')) {
    past = {
      id: `${f}.past`, kind: 'past', title: 'Past-paper practice', titleText: 'Past-paper practice', check: true, log: true,
      questions: pp.map((q, i) => multi(q, `${f}.past.q${i + 1}`, `${f} past Q${i + 1}`, img, overrides)),
    };
  }

  // --- order lessons
  const byId = new Map(unitLessons.map(L => [L.unit, L]));
  if (mock) {
    for (const key of mock.order) lessons.push(key === 'mock' ? mockLesson : byId.get(key));
    for (const L of unitLessons) if (!lessons.includes(L)) lessons.push(L);
  } else lessons.push(...unitLessons);
  if (check) lessons.push(check);
  if (past) lessons.push(past);

  const book = {
    id: f, n, section: b.section, label: c.label || '', title: M(c.title), titleText: c.title, subtitle: M(c.subtitle || ''),
    intro: M(c.intro || ''), objectives, formulaCard: (c.formula_card || []).map(x => ({
      ...(formulaToTeX(x.formula) ? { tex: formulaToTeX(x.formula) } : { text: M(x.formula) }), meaning: M(x.meaning || ''), units: M(x.units || ''),
    })),
    glossary: glossary.map(({ term, def }) => ({ term, def })),
    studyPlan: c.study_plan ? c.study_plan.map(r => r.map(M)) : undefined,
    lessons,
  };
  for (const k of TUTOR_ONLY) if (k in book) throw new Error(`tutor-only field ${k} leaked`);
  return { book, raw: c, img };
}

function reviseBook(s) {
  for (const [re, fn] of REVISE) { const m = re.exec(s || ''); if (m) return fn(m); }
  return null;
}

// ---------- index ----------
function lessonMeta(L, n) {
  const count = L.kind === 'unit' ? L.warmup.length + L.tryit.length + L.practice.length + L.exit.length
    : L.kind === 'check' ? L.mcq.length + L.structured.reduce((s, q) => s + q.parts.length, 0)
    : L.kind === 'past' ? L.questions.reduce((s, q) => s + q.parts.length, 0)
    : (L.mcq ? L.mcq.length : L.questions.reduce((s, q) => s + q.parts.length, 0));
  return { id: L.id, n, kind: L.kind, title: L.titleText, ...(L.unit ? { unit: L.unit } : {}), ...(L.check ? { check: true } : {}),
    ...(L.paper ? { paper: L.paper, minutes: L.minutes } : {}), items: count };
}

// ---------- build (pure: returns everything, writes nothing) ----------
export function build() {
  for (const k in stats) stats[k] = 0;
  reportRows.length = 0;
  const overrides = loadOverrides();
  const out = { books: [], index: null, images: [], report: reportRows, stats };
  let prev = null, lessonN = 0;
  BOOKS.forEach((b, i) => {
    const { book, raw, img } = convertBook(b, i + 1, prev, overrides);
    prev = { ...raw, _folder: b.folder };
    out.books.push(book);
    out.images.push(...img.used.values());
    book.lessons.forEach(L => { L.n = ++lessonN; });
  });
  out.index = {
    version: 1,
    exams: EXAMS,
    sections: SECTIONS,
    books: out.books.map(bk => ({
      id: bk.id, n: bk.n, section: bk.section, label: bk.label, title: bk.titleText, subtitle: stripMarkup(bk.subtitle || ''),
      codes: [...new Set(bk.objectives.map(o => o.code.replace(/\.\d+$/, '')))],
      lessons: bk.lessons.map(L => lessonMeta(L, L.n)),
    })),
  };
  // image sizes are filled in by writeImages(); mark which items reference which image
  const unknown = Object.keys(overrides).filter(k => !reportRows.some(r => r.id === k) && !k.startsWith('_'));
  if (unknown.length) throw new Error(`overrides.json has ids that do not exist: ${unknown.join(', ')}`);
  return out;
}

// ---------- writers ----------
async function writeImages(images, skip) {
  const sizes = {};
  let sharp = null;
  try { sharp = (await import('sharp')).default; } catch { /* PNG only */ }
  for (const im of images) {
    const dir = path.join(ROOT, 'img', path.basename(path.dirname(im.src)));
    fs.mkdirSync(dir, { recursive: true });
    const png = path.join(dir, `${im.name}.png`), webp = path.join(dir, `${im.name}.webp`);
    const srcStat = fs.statSync(im.file);
    if (!fs.existsSync(png) || fs.statSync(png).mtimeMs < srcStat.mtimeMs) fs.copyFileSync(im.file, png);
    let w = 0, h = 0;
    if (sharp) {
      const meta = await sharp(im.file).metadata();
      const scale = Math.min(1, 1400 / meta.width);
      w = Math.round(meta.width * scale); h = Math.round(meta.height * scale);
      if (!skip && (!fs.existsSync(webp) || fs.statSync(webp).mtimeMs < srcStat.mtimeMs)) {
        await sharp(im.file).resize({ width: w }).webp({ quality: 82 }).toFile(webp);
      }
    }
    sizes[im.src] = [w, h];
  }
  return sizes;
}

function addSizes(o, sizes) {
  if (Array.isArray(o)) o.forEach(x => addSizes(x, sizes));
  else if (o && typeof o === 'object') {
    if (typeof o.src === 'string' && o._p) { const s = sizes[o.src]; if (s) { o.w = s[0]; o.h = s[1]; } delete o._p; }
    Object.values(o).forEach(x => addSizes(x, sizes));
  }
}

const js = (name, key, data) => key
  ? `window.${name}=window.${name}||{};window.${name}[${JSON.stringify(key)}]=${JSON.stringify(data)};\n`
  : `window.${name}=${JSON.stringify(data)};\n`;

function writeReport(out) {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const by = {};
  for (const r of out.report) { const b = r.id.split('.')[0]; (by[b] = by[b] || { mcq: 0, num: 0, short: 0, self: 0, low: 0 }); by[b][r.kind]++; if (r.conf === 'low') by[b].low++; }
  const extracted = r => {
    const it = r.it;
    if (r.kind === 'mcq') return `<b>${esc(it.answer)}</b>`;
    if (r.kind === 'num' || it.autoKind === 'num') {
      const n = it.num; if (!n) return '';
      return `<b>${esc(n.value)}</b> ${esc(n.unit)} <small>(${n.sf} s.f.${n.min != null ? `; range ${n.min}–${n.max}` : ''}${n.alt ? `; also ${n.alt.join(', ')}` : ''}${n.signFree ? '; sign-free' : ''})</small>`;
    }
    if (r.kind === 'short' || it.autoKind === 'short') return `accept: ${esc((it.accept || []).join(' | '))}`;
    return `${(it.points || []).length} point(s): ${esc((it.points || []).map(p => p.marks).join('+'))}`;
  };
  const rows = out.report.map(r => `<tr class="${r.kind}${r.conf === 'low' ? ' low' : ''}"><td>${esc(r.id)}</td><td>${r.kind}${r.it.autoKind ? ` <small>(was ${r.it.autoKind})</small>` : ''}</td><td>${r.marks}</td><td>${esc(r.q)}</td><td>${extracted(r)}</td><td class=sch>${esc(r.answer)}</td><td><small>${esc(r.why)}</small></td></tr>`).join('');
  const s = out.stats;
  fs.writeFileSync(path.join(ROOT, 'tools', 'report.html'), `<!doctype html><meta charset=utf-8><title>Converter QA report</title>
<style>body{font:14px/1.45 system-ui;margin:16px}table{border-collapse:collapse;width:100%;margin:12px 0}td,th{border:1px solid #ddd;padding:4px 6px;vertical-align:top;text-align:left}
tr.low td{background:#fff3cd}td.sch{font-size:12px;color:#444}.filters label{margin-right:12px}tr.hide{display:none}small{color:#666}</style>
<h1>Converter QA report</h1><p>Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · items <b>${out.report.length}</b> · MCQ <b>${s.mcq}</b> · numeric <b>${s.num}</b> · short text <b>${s.short}</b> · self-mark <b>${s.self}</b> · low confidence (amber) <b>${s.low}</b> · overrides <b>${s.overridden}</b></p>
<table><tr><th>Book</th><th>MCQ</th><th>numeric</th><th>short</th><th>self</th><th>low conf.</th></tr>${Object.entries(by).map(([b, v]) => `<tr><td>${b}</td><td>${v.mcq}</td><td>${v.num}</td><td>${v.short}</td><td>${v.self}</td><td>${v.low}</td></tr>`).join('')}</table>
<p class=filters>Show: ${['all', 'mcq', 'num', 'short', 'self', 'low'].map(k => `<label><input type=radio name=f value=${k}${k === 'all' ? ' checked' : ''}> ${k}</label>`).join('')}</p>
<table id=t><tr><th>id</th><th>type</th><th>marks</th><th>question</th><th>extracted answer</th><th>mark scheme (source)</th><th>why</th></tr>${rows}</table>
<script>document.querySelectorAll('input[name=f]').forEach(r=>r.onchange=()=>{const v=r.value;document.querySelectorAll('#t tr[class]').forEach(tr=>tr.classList.toggle('hide',!(v==='all'||tr.classList.contains(v))))})</script>`);
}

async function main() {
  if (!fs.existsSync(WEEKS)) {
    console.error(`Missing ${WEEKS}. Extract workbook_build_source.tar.gz into source/ first (PLAN.md §1).`);
    process.exit(1);
  }
  const noImages = process.argv.includes('--no-images');
  const out = build();
  const sizes = await writeImages(out.images, noImages);
  fs.mkdirSync(path.join(ROOT, 'data', 'books'), { recursive: true });
  let total = 0;
  for (const bk of out.books) {
    addSizes(bk, sizes);
    const s = js('WB_BOOK', bk.id, bk);
    fs.writeFileSync(path.join(ROOT, 'data', 'books', `${bk.id}.js`), s);
    total += s.length;
  }
  const idx = js('WB_INDEX', null, out.index);
  fs.writeFileSync(path.join(ROOT, 'data', 'index.js'), idx);
  writeReport(out);

  const s = out.stats;
  const lessons = out.index.books.reduce((a, b) => a + b.lessons.length, 0);
  console.log(`Books ${out.books.length} · lessons ${lessons} · images ${out.images.length} · data/index.js ${(idx.length / 1024).toFixed(1)} KB · books ${(total / 1024).toFixed(0)} KB`);
  console.log(`Items ${out.report.length}: MCQ ${s.mcq} · numeric ${s.num} · short text ${s.short} · self-mark ${s.self} · low confidence ${s.low} · overrides ${s.overridden}`);
  console.log('QA report: tools/report.html');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
