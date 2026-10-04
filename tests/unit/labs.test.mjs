// Labs, maths help, formula coach and support data: every link points at something that exists,
// and every formula-coach rearrangement is algebraically consistent.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..', '..');
const ctx = { window: {} };
vm.createContext(ctx);
for (const f of ['data/index.js', 'labs/registry.js', 'labs/formulas.js', 'data/support.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
}
const W = ctx.window;
const lessonIds = new Set(W.WB_INDEX.books.flatMap(b => b.lessons.map(l => l.id)));
const unitIds = new Set(W.WB_INDEX.books.flatMap(b => b.lessons.filter(l => l.kind === 'unit').map(l => l.id)));

test('every lab has a page, a known section and links only to real lessons', () => {
  assert.ok(W.WB_LABS.length >= 30);
  const seen = new Set();
  for (const lab of W.WB_LABS) {
    assert.ok(!seen.has(lab.id), 'duplicate lab ' + lab.id); seen.add(lab.id);
    assert.ok(fs.existsSync(path.join(root, 'labs', lab.id + '.html')), 'missing page for ' + lab.id);
    assert.ok(W.WB_LAB_SECTIONS[lab.section], 'unknown section for ' + lab.id);
    assert.ok(lab.lessons.length > 0, lab.id + ' has no lessons');
    for (const id of lab.lessons) assert.ok(lessonIds.has(id), lab.id + ' links to missing lesson ' + id);
    const html = fs.readFileSync(path.join(root, 'labs', lab.id + '.html'), 'utf8');
    assert.match(html, new RegExp('data-lab="' + lab.id + '"'), lab.id + ' page has the wrong data-lab');
    assert.match(html, /id="lab-top"/); assert.match(html, /id="lab-foot"/);
  }
});

test('every content lesson in Sections A–E has at least one lab', () => {
  const covered = new Set(W.WB_LABS.flatMap(l => l.lessons));
  const content = W.WB_INDEX.books.filter(b => b.section !== 'X').flatMap(b => b.lessons.filter(l => l.kind === 'unit').map(l => l.id));
  // lessons that are history/discussion or a test, where a simulation would not help
  const exempt = new Set(['week04.4.2', 'week06.6.7', 'week08.8.1', 'week08.8.2', 'es01.1.5', 'week09.9.2']);
  const missing = content.filter(id => !covered.has(id) && !exempt.has(id));
  assert.equal(missing.length, 0, 'lessons without a lab: ' + missing.join(', '));
});

test('support entries belong to real unit lessons and link to real maths skills', () => {
  const skills = new Set(W.WB_MATHS.map(m => m.id));
  for (const [id, s] of Object.entries(W.WB_SUPPORT)) {
    assert.ok(unitIds.has(id), 'support for unknown lesson ' + id);
    for (const m of s.maths || []) assert.ok(skills.has(m), id + ' links to unknown maths skill ' + m);
    for (const text of [s.simple || ''].concat(s.recap || [])) {
      assert.equal((text.match(/\*\*/g) || []).length % 2, 0, id + ' has unbalanced ** markup');
      assert.ok(!/[\^~]/.test(text), id + ' uses ^ or ~, which the markup renderer would treat as sup/sub');
    }
  }
  const content = [...unitIds].filter(id => !/^week1[3-6]/.test(id));
  for (const id of content) assert.ok(W.WB_SUPPORT[id] && W.WB_SUPPORT[id].simple, 'no "In simple words" for ' + id);
});

test('maths help has a section for every skill', () => {
  const html = fs.readFileSync(path.join(root, 'labs', 'maths.html'), 'utf8');
  for (const m of W.WB_MATHS) assert.match(html, new RegExp("id: '" + m.id + "'"), 'maths.html has no topic ' + m.id);
});

test('formula coach: ids are unique, coach links resolve, and every rearrangement round-trips', () => {
  const ids = new Set();
  for (const f of W.WB_FORMULAS) { assert.ok(!ids.has(f.id), 'duplicate formula ' + f.id); ids.add(f.id); }
  for (const [, id] of W.WB_COACH) assert.ok(ids.has(id), 'coach map points to missing formula ' + id);
  for (const f of W.WB_FORMULAS) {
    const targets = Object.keys(f.forms);
    // pick values, compute the first target, then solve back for each other target
    const vars = Object.keys(f.vars), v = {};
    vars.forEach((k, i) => { v[k] = f.vars[k][2] != null ? f.vars[k][2] : [3, 2, 5, 7, 11, 13][i]; });
    if (f.id === 'snell') { v.i = 40; v.r = 25; v.n = 1.5; }
    if (f.id === 'critical') { v.n = 1.5; v.c = 40; }
    const main = targets[0], full = { ...v };
    full[main] = f.forms[main][3](v);
    assert.ok(Number.isFinite(full[main]), f.id + ': ' + main + ' is not finite');
    for (const t of targets.slice(1)) {
      const back = f.forms[t][3](full);
      assert.ok(Math.abs(back - full[t]) <= Math.abs(full[t]) * 1e-9 + 1e-9, `${f.id}: solving for ${t} gives ${back}, expected ${full[t]}`);
    }
  }
});

test('assets/js/tex.js is the current browser build of tools/tex.mjs', async () => {
  const { buildTexBrowser } = await import('../../tools/build-tex-browser.mjs');
  const onDisk = fs.readFileSync(path.join(root, 'assets', 'js', 'tex.js'), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(onDisk, buildTexBrowser(), 'run npm run build:tex');
});

test('support text and lab blurbs typeset without KaTeX errors', async () => {
  const katex = (await import('katex')).default;
  const tctx = { window: {} }; vm.createContext(tctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'assets', 'js', 'tex.js'), 'utf8'), tctx);
  const texts = Object.values(W.WB_SUPPORT).flatMap(s => [s.simple || ''].concat(s.recap || [])).concat(W.WB_LABS.map(l => l.blurb));
  let n = 0;
  for (const t of texts) for (const m of tctx.window.TEX.markMath(t).matchAll(/⟪([^⟫]*)⟫/g)) {
    n++; assert.doesNotThrow(() => katex.renderToString(m[1], { throwOnError: true, strict: 'ignore' }), 'bad TeX from: ' + t);
  }
  assert.ok(n > 100, 'expected many equations, found ' + n);
});
