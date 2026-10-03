// content.json → site data.
// Phase 0: inventory only (checks every book in the map exists and parses, prints counts).
// Phase 1 replaces the body with the full converter (data/index.js, data/books/*.js, tools/report.html).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEEKS = path.join(ROOT, 'source', 'wb', 'weeks');

// Site order (PLAN.md §1). section: A–E or X (exam prep).
export const BOOKS = [
  { folder: 'week01', section: 'A' }, { folder: 'week02', section: 'A' },
  { folder: 'week03', section: 'A' }, { folder: 'week04', section: 'A' },
  { folder: 'week05', section: 'B' }, { folder: 'week06', section: 'B' },
  { folder: 'week07', section: 'C' }, { folder: 'week08', section: 'C' },
  { folder: 'es01', section: 'D' }, { folder: 'week09', section: 'D' },
  { folder: 'week10', section: 'D' }, { folder: 'week11', section: 'D' },
  { folder: 'week12', section: 'E' },
  { folder: 'week14', section: 'X' }, { folder: 'week13', section: 'X' },
  { folder: 'week15', section: 'X' }, { folder: 'week16', section: 'X' },
];

if (!fs.existsSync(WEEKS)) {
  console.error(`Missing ${WEEKS}. Extract workbook_build_source.tar.gz into source/ first (PLAN.md §1).`);
  process.exit(1);
}

const tot = { units: 0, we: 0, practice: 0, mcq: 0, structured: 0, past: 0 };
console.log('#  folder  units  WE  prac  mcq  str  past  title');
BOOKS.forEach((b, i) => {
  const c = JSON.parse(fs.readFileSync(path.join(WEEKS, b.folder, 'content.json'), 'utf8'));
  const units = c.units || [];
  const n = {
    units: units.length,
    we: units.reduce((s, u) => s + (u.worked_examples || []).length, 0),
    practice: units.reduce((s, u) => s + (u.practice || []).length, 0),
    mcq: (c.exam_mcq || []).length,
    structured: (c.exam_structured || []).length,
    past: (c.past_paper || []).length,
  };
  for (const k in tot) tot[k] += n[k];
  console.log([String(i + 1).padStart(2), b.folder.padEnd(6), String(n.units).padStart(5), String(n.we).padStart(3),
    String(n.practice).padStart(5), String(n.mcq).padStart(4), String(n.structured).padStart(4),
    String(n.past).padStart(5), ' ' + c.title].join(' '));
});
console.log(`TOTAL   units ${tot.units} · worked examples ${tot.we} · practice ${tot.practice} · MCQ ${tot.mcq} · structured ${tot.structured} · past-paper ${tot.past}`);
