// Runs tools/tex.mjs over every student-facing string in all 17 books, renders each equation with
// KaTeX (throwOnError) and writes tools/katex-preview.html (not deployed) for eyeballing.
// Usage: node tools/tex-audit.mjs [folder]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { formulaToTeX, markMath, whereToMarked, OPEN, CLOSE } from './tex.mjs';
import { BOOKS } from './books.mjs';

const require = createRequire(import.meta.url);
const katex = require('katex');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const only = process.argv[2];
const TUTOR = new Set(['tutor_session_plan', 'tutor_notes', 'past_paper_suggestions']);
const SKIP_KEYS = new Set(['path', 'img', 'type', 'code', 'date', 'week', 'label', 'file_prefix', 'widths']);

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mdLite = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\^([^^\s][^^]*?)\^/g, '<sup>$1</sup>')
  .replace(/~([^~\s][^~]*?)~/g, '<sub>$1</sub>').replace(/\n/g, '<br>');
const render = tex => katex.renderToString(tex, { throwOnError: true, strict: 'ignore', output: 'html' });

const stats = { formulas: 0, formulaTeX: 0, where: 0, prose: 0, proseWithMath: 0, spans: 0, failures: 0 };
const fails = [];
const rows = { formula: [], where: [], prose: [] };

function renderMarked(marked, ctx) {
  // split on ⟪tex⟫, render maths, md-lite the rest
  let html = '', ok = true;
  const parts = marked.split(new RegExp(`${OPEN}([\\s\\S]*?)${CLOSE}`));
  parts.forEach((p, i) => {
    if (i % 2 === 0) { html += mdLite(p); return; }
    stats.spans++;
    try { html += render(p); } catch (e) { ok = false; stats.failures++; fails.push({ ctx, tex: p, err: e.message }); html += `<mark>${esc(p)}</mark>`; }
  });
  return { html, ok };
}

function walk(o, key, ctx) {
  if (typeof o === 'string') {
    if (SKIP_KEYS.has(key) || !o.trim()) return;
    if (key === 'formula') {
      stats.formulas++;
      const tex = formulaToTeX(o);
      let html;
      if (tex) {
        stats.formulaTeX++;
        try { html = render(tex); } catch (e) { stats.failures++; fails.push({ ctx, tex, err: e.message }); html = `<mark>${esc(tex)}</mark>`; }
      } else html = mdLite(o);
      rows.formula.push({ ctx, raw: o, html, tex });
      return;
    }
    if (key === 'where') {
      stats.where++;
      const m = whereToMarked(o);
      rows.where.push({ ctx, raw: o, ...renderMarked(m, ctx), tex: m });
      return;
    }
    stats.prose++;
    const m = markMath(o);
    if (m.includes(OPEN)) { stats.proseWithMath++; rows.prose.push({ ctx, raw: o, ...renderMarked(m, ctx), tex: m }); }
    return;
  }
  if (Array.isArray(o)) { o.forEach((x, i) => walk(x, key, `${ctx}[${i}]`)); return; }
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) if (!TUTOR.has(k)) walk(v, k, `${ctx}.${k}`);
}

for (const b of BOOKS) {
  if (only && b.folder !== only) continue;
  const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'source/wb/weeks', b.folder, 'content.json'), 'utf8'));
  walk(c, '', b.folder);
}

const css = '../node_modules/katex/dist/katex.min.css';
const table = (title, list) => `<h2>${title} (${list.length})</h2><table><tr><th>where</th><th>source text</th><th>rendered</th></tr>${
  list.map(r => `<tr><td class=ctx>${esc(r.ctx)}</td><td class=raw>${esc(r.raw)}</td><td>${r.html}</td></tr>`).join('')}</table>`;
fs.writeFileSync(path.join(ROOT, 'tools/katex-preview.html'), `<!doctype html><meta charset=utf-8><title>KaTeX preview</title>
<link rel=stylesheet href="${css}"><style>body{font:15px/1.5 system-ui;margin:16px}table{border-collapse:collapse;width:100%}
td,th{border:1px solid #ddd;padding:6px 8px;vertical-align:top;text-align:left}.ctx{font:11px monospace;color:#888;width:14%}
.raw{font:12px monospace;color:#555;width:36%}mark{background:#fdd}</style>
<h1>KaTeX preview</h1><p>${Object.entries(stats).map(([k, v]) => `${k}: <b>${v}</b>`).join(' · ')}</p>
${table('Formula boxes &amp; cards', rows.formula)}${table('“Where” lines', rows.where)}${table('Prose with equations', rows.prose)}`);

console.log(stats);
if (fails.length) { console.log('KaTeX failures:'); for (const f of fails.slice(0, 40)) console.log(' ', f.ctx, '|', f.tex, '|', f.err.slice(0, 90)); }
process.exitCode = fails.length ? 1 : 0;
