const { test, expect } = require('@playwright/test');

const KEY = 'csec-phys-2027-v1';
const ENDPOINT = 'https://teacher.test/exec';

async function openNamedLesson(page, endpoint, lessonId = 'week01.1.1') {
  if (endpoint) {
    await page.route('**/config.js', route => route.fulfill({
      contentType: 'text/javascript',
      body: `window.WB_CONFIG = { endpoint: "${ENDPOINT}" };`,
    }));
  }
  await page.goto('/');
  await page.evaluate(key => localStorage.removeItem(key), KEY);
  await page.reload();
  await page.locator('#stu-name').fill('Submission Test');
  await page.goto(`/#/lesson/${lessonId}`);
  if (lessonId.endsWith('.mock')) await expect(page.locator('#lessonbody[data-loaded="true"]')).toBeVisible();
  else await expect(page.locator('#finish-form')).toBeVisible();
}

test('blank endpoint keeps lesson reflections local and reports the local-only mode', async ({ page }) => {
  await openNamedLesson(page);
  await page.locator('#finish-form input[value="can"]').check();
  await page.locator('#teacher-question').fill('Review vectors.');
  await page.locator('#finish-form button[type="submit"]').click();
  await expect(page.locator('#submission-status')).toContainText('No teacher endpoint is configured');
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.l['week01.1.1'].finished).toBe(true);
  expect(saved.l['week01.1.1'].question).toBe('Review vectors.');
  expect(saved.queue).toHaveLength(0);
});

test('lesson finish sends the expected payload and clears the queue after network success', async ({ page }) => {
  let payload;
  await page.route(ENDPOINT, async route => {
    payload = JSON.parse(route.request().postData());
    await route.fulfill({ status: 200, body: '{"ok":true}' });
  });
  await openNamedLesson(page, true);
  await page.locator('#finish-form input[value="help"]').check();
  await page.locator('#teacher-question').fill('Please help with significant figures.');
  await page.locator('#finish-form button[type="submit"]').click();
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)).queue.length, KEY)).toBe(0);
  await expect(page.locator('#submission-status')).toContainText('Submission sent');
  expect(payload).toMatchObject({
    type: 'lesson',
    name: 'Submission Test',
    lessonId: 'week01.1.1',
    book: 'week01',
    section: 'A',
    feel: 'help',
    question: 'Please help with significant figures.',
  });
  expect(payload.answers).toHaveLength(8);
  expect(payload.submissionId).toBeTruthy();
});

test('network failure is retained and retried on the next visit', async ({ page }) => {
  let requests = 0;
  await page.route(ENDPOINT, async route => {
    requests++;
    if (requests === 1) {
      await route.abort('internetdisconnected');
      return;
    }
    await route.fulfill({ status: 200, body: '{"ok":true}' });
  });
  await openNamedLesson(page, true);
  await page.locator('#finish-form button[type="submit"]').click();
  await expect(page.locator('#submission-status')).toContainText('will retry on the next visit');
  let saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.queue).toHaveLength(1);
  expect(saved.queue[0].attempts).toBe(1);

  await page.reload();
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)).queue.length, KEY)).toBe(0);
  expect(requests).toBe(2);
});

test('mock submission includes the result and paper section breakdown', async ({ page }) => {
  let payload;
  await page.route(ENDPOINT, async route => {
    payload = JSON.parse(route.request().postData());
    await route.fulfill({ status: 200, body: '{"ok":true}' });
  });
  await openNamedLesson(page, true, 'week16.mock');
  await page.locator('[data-mock-start="week16.mock"]').click();
  const question = page.locator('.question-card').first();
  const itemId = await question.getAttribute('data-item');
  const answer = await page.evaluate(id =>
    window.WB_BOOK.week16.lessons.find(lesson => lesson.id === 'week16.mock').mcq.find(item => item.id === id).answer, itemId);
  await page.locator(`[data-mock-choice-for="${itemId}"][data-mock-choice="${answer}"]`).click();
  await page.locator('[data-mock-submit="week16.mock"]').first().click();
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)).queue.length, KEY)).toBe(0);
  expect(payload).toMatchObject({
    type: 'mock',
    paper: 'P01',
    lessonId: 'week16.mock',
    score: 1,
    mockTotal: 60,
  });
  expect(payload.sectionScores).toHaveProperty('A');
  expect(payload.answers).toHaveLength(60);
});
