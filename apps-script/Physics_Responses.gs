const RESPONSE_HEADERS = [
  'Submission ID', 'Received At', 'Type', 'Name', 'Lesson ID', 'Lesson', 'Book', 'Section',
  'Right', 'Total', 'Exit Right', 'Exit Total', 'Self Marks', 'Self Total', 'XP', 'Stars',
  'Feeling', 'Teacher Question', 'Time (min)', 'Over Time', 'Mock Score', 'Mock Total',
  'Section Scores JSON', 'Answers JSON',
];

function doGet() {
  return ContentService.createTextOutput('CSEC Physics response endpoint ready.');
}

function doPost(event) {
  try {
    if (!event || !event.postData || typeof event.postData.contents !== 'string') {
      throw new Error('Request body is missing.');
    }
    const payload = JSON.parse(event.postData.contents);
    validatePayload_(payload);
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) throw new Error('Attach this script to the response spreadsheet before deployment.');

    const sheet = getResponseSheet_(spreadsheet, payload.type === 'mock' ? 'Mocks' : 'Responses');
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        const ids = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
        if (ids.some(row => row[0] === payload.submissionId)) {
          return jsonResponse_({ ok: true, duplicate: true });
        }
      }
      const seconds = finiteNumber_(payload.secs);
      const row = [
        payload.submissionId,
        new Date(),
        payload.type,
        safeCell_(payload.name),
        safeCell_(payload.lessonId),
        safeCell_(payload.lessonTitle),
        safeCell_(payload.book || ''),
        safeCell_(payload.section || ''),
        finiteNumber_(payload.right),
        finiteNumber_(payload.total),
        finiteNumber_(payload.exitRight),
        finiteNumber_(payload.exitTotal),
        finiteNumber_(payload.selfMarks),
        finiteNumber_(payload.selfTotal),
        finiteNumber_(payload.xp),
        finiteNumber_(payload.stars),
        safeCell_(payload.feel || ''),
        safeCell_(payload.question || ''),
        Math.round(seconds / 60 * 100) / 100,
        payload.overTime === true,
        payload.type === 'mock' ? finiteNumber_(payload.score) : '',
        payload.type === 'mock' ? finiteNumber_(payload.mockTotal) : '',
        payload.type === 'mock' ? JSON.stringify(payload.sectionScores || {}) : '',
        JSON.stringify(payload.answers),
      ];
      sheet.appendRow(row);
    } finally {
      lock.releaseLock();
    }
    return jsonResponse_({ ok: true });
  } catch (error) {
    console.error(error);
    return jsonResponse_({ ok: false, error: String(error && error.message || error) });
  }
}

function validatePayload_(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Payload must be a JSON object.');
  if (!['lesson', 'mock'].includes(payload.type)) throw new Error('Submission type must be lesson or mock.');
  if (typeof payload.submissionId !== 'string' || !payload.submissionId || payload.submissionId.length > 128) {
    throw new Error('Submission ID is missing or invalid.');
  }
  if (typeof payload.name !== 'string' || !payload.name.trim() || payload.name.length > 60) {
    throw new Error('Student name is missing or invalid.');
  }
  if (typeof payload.lessonId !== 'string' || !payload.lessonId || payload.lessonId.length > 100) {
    throw new Error('Lesson ID is missing or invalid.');
  }
  if (typeof payload.lessonTitle !== 'string' || payload.lessonTitle.length > 300) {
    throw new Error('Lesson title is invalid.');
  }
  if (!Array.isArray(payload.answers) || payload.answers.length > 200) {
    throw new Error('Answers must be an array of no more than 200 items.');
  }
  if (payload.type === 'mock' && !['P01', 'P02'].includes(payload.paper)) {
    throw new Error('Mock paper must be P01 or P02.');
  }
  const serialized = JSON.stringify(payload.answers);
  if (serialized.length > 40000) throw new Error('Answers are too large to store in one spreadsheet cell.');
}

function getResponseSheet_(spreadsheet, name) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(RESPONSE_HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function finiteNumber_(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function safeCell_(value) {
  const text = String(value == null ? '' : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonResponse_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
