// Phase 0 sanity checks on the extracted source. WBC tests are added in Phase 4.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const WEEKS = path.join(ROOT, 'source', 'wb', 'weeks');
const sourceTest = fs.existsSync(WEEKS) ? test : test.skip;
const FOLDERS = ['week01', 'week02', 'week03', 'week04', 'week05', 'week06', 'week07', 'week08',
  'es01', 'week09', 'week10', 'week11', 'week12', 'week13', 'week14', 'week15', 'week16'];

sourceTest('all 17 books have a parseable content.json with units', () => {
  for (const f of FOLDERS) {
    const c = JSON.parse(fs.readFileSync(path.join(WEEKS, f, 'content.json'), 'utf8'));
    assert.ok(c.title, `${f} has a title`);
    assert.ok(Array.isArray(c.units) && c.units.length > 0, `${f} has units`);
  }
});

sourceTest('every img path referenced in content.json exists', () => {
  const missing = [];
  for (const f of FOLDERS) {
    const raw = fs.readFileSync(path.join(WEEKS, f, 'content.json'), 'utf8');
    for (const m of raw.matchAll(/"(img\/[^"]+\.png)"/g)) {
      if (!fs.existsSync(path.join(WEEKS, f, m[1]))) missing.push(`${f}/${m[1]}`);
    }
  }
  assert.deepEqual(missing, []);
});
