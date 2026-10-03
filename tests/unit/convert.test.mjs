// tools/convert.mjs + tools/classify.mjs (PLAN.md §5, Phase 1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from '../../tools/convert.mjs';
import { classify, finalQuantity, markPoints, schemeCore } from '../../tools/classify.mjs';

const require = createRequire(import.meta.url);
const WBC = require('../../assets/js/wbc.js');
const HAS_SOURCE = fs.existsSync(path.resolve('source/wb/weeks'));
const sourceTest = HAS_SOURCE ? test : test.skip;
const out = HAS_SOURCE ? build() : null;
const json = out ? JSON.stringify(out.books) : '';

sourceTest('all 17 books convert, in syllabus order, with lessons', () => {
  assert.equal(out.books.length, 17);
  assert.deepEqual(out.index.books.map(b => b.section).join(''), 'AAAABBCCDDDDEXXXX');
  for (const b of out.index.books) assert.ok(b.lessons.length >= 3, `${b.id} has lessons`);
});

sourceTest('item and lesson ids are unique and follow <folder>.<unit>.<kind><n>', () => {
  const ids = out.report.map(r => r.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^(week\d\d|es01)\.[\w.]+$/);
  const lessons = out.index.books.flatMap(b => b.lessons.map(l => l.id));
  assert.equal(new Set(lessons).size, lessons.length);
});

sourceTest('ids are stable: a second build gives identical data', () => {
  const again = build();
  assert.equal(JSON.stringify(again.books), json);
  assert.equal(JSON.stringify(again.index), JSON.stringify(out.index));
});

sourceTest('no tutor-only content in the student data', () => {
  assert.doesNotMatch(json, /tutor_session_plan|tutor_notes|past_paper_suggestions/);
});

sourceTest('mocks: Paper 01 has 60 MCQs with topics and revise links; Paper 02 totals 100', () => {
  const p01 = out.books.find(b => b.id === 'week16').lessons.find(l => l.kind === 'mock');
  assert.equal(p01.mcq.length, 60);
  assert.ok(p01.mcq.every(m => m.revise && /^(week\d\d|es01)$/.test(m.revise) && /^[A-E]$/.test(m.section)));
  const p02 = out.books.find(b => b.id === 'week13').lessons.find(l => l.kind === 'mock');
  assert.equal(p02.total, 100);
  assert.equal(p02.minutes, 150);
  assert.ok(p02.grades.length >= 5);
});

sourceTest('every numeric answer appears in the last marked point of its mark scheme', () => {
  const bad = [];
  for (const r of out.report.filter(r => r.kind === 'num' || r.it.autoKind === 'num')) {
    const pts = markPoints(schemeCore(r.answer), r.marks).points;
    const last = WBC.norm(pts.slice(-2).map(p => p.text).join(' '));
    const v = r.it.num.value;
    const found = [...last.matchAll(/[-$]?\d[\d.]*(?:\s?\d{3})*(?:\s*x\s*10\s*\^\s*-?\d+)?/g)]
      .map(m => WBC.parseNumber(m[0])).filter(Boolean).some(n => Math.abs(Math.abs(n.value) - Math.abs(v)) <= Math.abs(v) * 1e-9);
    if (!found) bad.push(`${r.id}: ${v} not in "${last.slice(0, 80)}"`);
  }
  assert.deepEqual(bad, []);
});

test('classifier: worked cases', () => {
  assert.equal(classify({ q: 'Calculate the charge.', answer: 'Q = It = 3.0 × 20 (1) = 60 C (1).', marks: 2 }).num.value, 60);
  assert.equal(finalQuantity('Triangle: ½ × 6 × 12 = 36 m (1).\nTotal = 36 + 120 + 48 = 204 m (1).\n(Alternative: trapezium = 204 m.)').value, 204);
  assert.equal(finalQuantity('I = P ÷ V = 2400 ÷ 240 (1) = 10 A (1).\n**Common error:** not converting kW → 0.01 A.').value, 10);
  assert.equal(finalQuantity('E = ml (1) = 0.050 × 2.3 × 10^6^ = 1.15 × 10^5^ J (1).').value, 115000);
  const r = finalQuantity('Dashed lines drawn (1); e ≈ 5.5 cm (accept 5.3–5.7) (1).');
  assert.deepEqual([r.value, r.min, r.max], [5.5, 5.3, 5.7]);
  assert.equal(classify({ q: 'Calculate the period and the frequency.', answer: 'T = 0.020 s (1); f = 50 Hz (1).', marks: 2 }).kind, 'self');
  assert.equal(classify({ q: 'Name the particle that moves.', answer: 'Electron (1).', marks: 1 }).kind, 'short');
  assert.equal(classify({ q: 'What is an echo?', answer: 'A reflected sound (1).', marks: 1 }).kind, 'self');
  assert.equal(classify({ q: 'Which?', options: ['a', 'b', 'c', 'd'], answer: '**C** — because (1).', marks: 1 }).answer, 'C');
  assert.deepEqual(markPoints('Wool traps air (1); trapped air is a poor conductor (1).', 2).points.map(p => p.marks), [1, 1]);
});

test('WBC.parseNumber reads the formats in the mark schemes', () => {
  const v = s => WBC.parseNumber(s).value;
  assert.equal(v('1.42 s'), 1.42);
  assert.equal(v('3.0×10^10'), 3e10);
  assert.equal(v('3.0 x 10^10'), 3e10);
  assert.equal(v('3 × 10¹⁰'), 3e10);
  assert.equal(v('3e10'), 3e10);
  assert.equal(v('−2.5'), -2.5);
  assert.equal(v('1/2'), 0.5);
  assert.equal(v('$31.35'), 31.35);
  assert.equal(v('1 200'), 1200);
  assert.equal(v('4.0 × 10⁻⁸ C'), 4e-8);
  assert.equal(WBC.parseNumber('3.0').sf, 2);
  assert.equal(WBC.parseNumber('0.0250').sf, 3);
});
