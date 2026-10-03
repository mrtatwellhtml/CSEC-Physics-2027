import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function createScript() {
  const sheets = new Map();
  class Sheet {
    constructor(name) { this.name = name; this.rows = []; this.frozen = 0; }
    getLastRow() { return this.rows.length; }
    appendRow(row) { this.rows.push(row); }
    setFrozenRows(count) { this.frozen = count; }
    getRange(startRow, startColumn, rowCount, columnCount) {
      return { getDisplayValues: () => this.rows.slice(startRow - 1, startRow - 1 + rowCount)
        .map(row => row.slice(startColumn - 1, startColumn - 1 + columnCount).map(String)) };
    }
  }
  const spreadsheet = {
    getSheetByName: name => sheets.get(name) || null,
    insertSheet(name) { const sheet = new Sheet(name); sheets.set(name, sheet); return sheet; },
  };
  class TextOutput {
    constructor(content) { this.content = content; }
    setMimeType(type) { this.mimeType = type; return this; }
    getContent() { return this.content; }
  }
  const context = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => spreadsheet,
      newTextOutput: content => new TextOutput(content),
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: content => new TextOutput(content),
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    console: { error() {} },
    Date,
    JSON,
    Math,
    Number,
    String,
    Array,
  };
  const source = fs.readFileSync(path.join(ROOT, 'apps-script/Physics_Responses.gs'), 'utf8');
  vm.runInNewContext(source, context, { filename: 'Physics_Responses.gs' });
  return { context, sheets };
}

const payload = overrides => ({
  type: 'lesson',
  submissionId: 'test-123',
  name: 'Student',
  lessonId: 'week01.1.1',
  lessonTitle: 'Measurement',
  book: 'week01',
  section: 'A',
  right: 1,
  total: 8,
  exitRight: 0,
  exitTotal: 0,
  selfMarks: 0,
  selfTotal: 0,
  xp: 10,
  stars: 0,
  secs: 125,
  answers: [{ id: 'p1', ans: 'answer', right: true, ticks: [] }],
  ...overrides,
});

function post(context, body) {
  const response = context.doPost({ postData: { contents: JSON.stringify(body) } });
  return JSON.parse(response.getContent());
}

test('Apps Script endpoint creates response sheets, records submissions and deduplicates retries', () => {
  const { context, sheets } = createScript();
  assert.match(context.doGet().getContent(), /endpoint ready/i);
  assert.deepEqual(post(context, payload()), { ok: true });
  assert.deepEqual(post(context, payload()), { ok: true, duplicate: true });
  const responses = sheets.get('Responses');
  assert.equal(responses.rows.length, 2);
  assert.equal(responses.rows[0][0], 'Submission ID');
  assert.equal(responses.rows[1][0], 'test-123');
  assert.equal(responses.rows[1][18], 2.08);
  assert.equal(responses.frozen, 1);
});

test('mock records use the Mocks sheet and spreadsheet text cannot inject formulas', () => {
  const { context, sheets } = createScript();
  const result = post(context, payload({
    type: 'mock',
    paper: 'P01',
    name: '=IMPORTXML("https://example.test","//x")',
    sectionScores: { A: { score: 1, total: 16 } },
    score: 1,
    mockTotal: 60,
  }));
  assert.deepEqual(result, { ok: true });
  assert.equal(sheets.has('Responses'), false);
  const row = sheets.get('Mocks').rows[1];
  assert.equal(row[3], "'=IMPORTXML(\"https://example.test\",\"//x\")");
  assert.equal(JSON.parse(row[22]).A.score, 1);
});

test('invalid submissions return explicit errors without writing a row', () => {
  const { context, sheets } = createScript();
  assert.match(post(context, payload({ name: '' })).error, /Student name/);
  assert.match(post(context, payload({ answers: Array(201).fill({}) })).error, /200 items/);
  assert.equal(sheets.size, 0);
});
