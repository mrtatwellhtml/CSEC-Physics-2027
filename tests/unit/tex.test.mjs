// tools/tex.mjs: workbook markup → KaTeX TeX.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { formulaToTeX, markMath, whereToMarked, OPEN, CLOSE } from '../../tools/tex.mjs';
import { BOOKS } from '../../tools/books.mjs';

const require = createRequire(import.meta.url);
const katex = require('katex');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const sourceTest = fs.existsSync(path.join(ROOT, 'source/wb/weeks')) ? test : test.skip;
const spans = s => [...s.matchAll(new RegExp(`${OPEN}([\\s\\S]*?)${CLOSE}`, 'g'))].map(m => m[1]);

test('formulas: scripts, fractions, roots, Greek, nuclides', () => {
  assert.equal(formulaToTeX('E~k~ = ½ m v^2^'), 'E_{k}=\\tfrac{1}{2}mv^{2}');
  assert.equal(formulaToTeX('R = √(a^2^ + b^2^)'), 'R=\\sqrt{a^{2}+b^{2}}');
  assert.equal(formulaToTeX('P = ρgh'), 'P=\\rho gh');
  assert.equal(formulaToTeX('^A^~Z~X  →  ^A^~Z+1~Y  +  ^0^~−1~e'), '{}^{A}_{Z}X\\rightarrow {}^{A}_{Z+1}Y+{}^{0}_{-1}e');
  assert.equal(formulaToTeX('1 ÷ f = 1 ÷ u + 1 ÷ v;  m = v ÷ u'), '1\\div f=1\\div u+1\\div v;\\quad m=v\\div u');
});

test('formulas: units upright, variables italic', () => {
  // W here is the watt (a unit statement), so it is upright too
  assert.equal(formulaToTeX('W = J s^−1^ = kg m^2^ s^−3^'), '\\mathrm{W}=\\mathrm{J}\\,\\mathrm{s}^{-1}=\\mathrm{kg}\\,\\mathrm{m}^{2}\\,\\mathrm{s}^{-3}');
  assert.equal(formulaToTeX('kg m s^−1^ = N s'), '\\mathrm{kg}\\,\\mathrm{m}\\,\\mathrm{s}^{-1}=\\mathrm{N}\\,\\mathrm{s}');
  assert.equal(formulaToTeX('W = m g'), 'W=mg');
  assert.equal(formulaToTeX('A = 2 cm × 3 cm'), 'A=2\\,\\mathrm{cm}\\times 3\\,\\mathrm{cm}');
  assert.equal(formulaToTeX('E = P t;  1 kWh = 3.6 × 10^6^ J'), 'E=Pt;\\quad 1\\,\\mathrm{kWh}=3.6\\times 10^{6}\\,\\mathrm{J}');
});

test('formulas with no maths stay as text', () => {
  assert.equal(formulaToTeX('AND: both 1 → 1; OR: any 1 → 1; NOT: inverts'), null);
});

test('prose: equation spans found, words left alone', () => {
  assert.equal(markMath('a = (v − u)/t = (20 − 0) ÷ 10 = **2.0 m s^−2^**'),
    '⟪a=(v-u)/t=(20-0)\\div 10=\\boldsymbol{2.0\\,\\mathrm{m}\\,\\mathrm{s}^{-2}}⟫');
  assert.equal(markMath('the e.m.f. is 12 V and I = 2 A'), 'the e.m.f. is 12 V and ⟪I=2\\,\\mathrm{A}⟫');
  assert.equal(markMath('T = 28.4 ÷ 20 (1) = 1.42 s (1).'), '⟪T=28.4\\div 20⟫ (1) ⟪=1.42\\,\\mathrm{s}⟫ (1).');
  assert.equal(markMath('(d) 6 × 1.5 = 9 min'), '(d) ⟪6\\times 1.5=9\\,\\mathrm{min}⟫');
  assert.equal(markMath('Taller trace = louder.'), 'Taller trace = louder.');
  assert.equal(markMath('Solar panels give no CO~2~ while working'), 'Solar panels give no CO~2~ while working');
  assert.equal(markMath('speed = 3.0 × 10⁸ m s⁻¹ in a vacuum'), 'speed ⟪=3.0\\times 10^{8}\\,\\mathrm{m}\\,\\mathrm{s}^{-1}⟫ in a vacuum');
});

test('prose: bold regions stay balanced around equations', () => {
  const m = markMath('So **work done against gravity = mg × h**. This work');
  assert.equal(m, 'So **work done against gravity **⟪\\boldsymbol{=mg\\times h}⟫. This work');
  assert.equal((m.replace(/⟪[\s\S]*?⟫/g, '').match(/\*\*/g) || []).length % 2, 0);
});

test('where lines: symbol side typeset', () => {
  assert.equal(whereToMarked('F = force in newtons (N)'), '⟪F⟫ = force in newtons (N)');
  assert.equal(whereToMarked('V~p~ = primary voltage (V)'), '⟪V_{p}⟫ = primary voltage (V)');
});

sourceTest('every equation in all 17 books renders in KaTeX and no words are lost', () => {
  const TUTOR = new Set(['tutor_session_plan', 'tutor_notes', 'past_paper_suggestions']);
  const SKIP = new Set(['path', 'img', 'type', 'code', 'date', 'week', 'label', 'file_prefix', 'widths']);
  const bad = [], lost = [];
  let n = 0;
  const check = (tex, ctx) => {
    n++;
    try { katex.renderToString(tex, { throwOnError: true, strict: 'ignore' }); } catch (e) { bad.push(`${ctx}: ${tex}`); }
  };
  const walk = (o, key, ctx) => {
    if (typeof o === 'string') {
      if (SKIP.has(key) || !o.trim()) return;
      if (key === 'formula') { const t = formulaToTeX(o); if (t) check(t, ctx); return; }
      const m = key === 'where' ? whereToMarked(o) : markMath(o);
      spans(m).forEach(t => check(t, ctx));
      // every word of 4+ letters must survive (outside the maths, or inside \text{})
      for (const w of o.match(/[A-Za-z]{4,}/g) || []) if (!m.includes(w)) lost.push(`${ctx}: "${w}" in ${o}`);
      return;
    }
    if (Array.isArray(o)) o.forEach((x, i) => walk(x, key, `${ctx}[${i}]`));
    else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (!TUTOR.has(k)) walk(v, k, `${ctx}.${k}`);
  };
  for (const b of BOOKS) walk(JSON.parse(fs.readFileSync(path.join(ROOT, 'source/wb/weeks', b.folder, 'content.json'), 'utf8')), '', b.folder);
  assert.ok(n > 3000, `expected 3000+ equations, got ${n}`);
  assert.deepEqual(bad.slice(0, 10), []);
  assert.deepEqual(lost.slice(0, 10), []);
});
