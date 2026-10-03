const { test, expect } = require('@playwright/test');

const KEY = 'csec-phys-2027-v1';

async function openFreshMock(page, lessonId) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.evaluate(key => localStorage.removeItem(key), KEY);
  await page.reload();
  await page.locator('#stu-name').fill('Exam Mode Test');
  await page.goto(`/#/lesson/${lessonId}`);
  await expect(page.locator('#lessonbody[data-loaded="true"]')).toBeVisible();
  return errors;
}

test('Paper 01 persists answers and timer, warns at 15 minutes, handles overtime and scores by section', async ({ page }) => {
  const errors = await openFreshMock(page, 'week16.mock');
  await expect(page.locator('.mock-start')).toContainText('75 minutes');
  await expect(page.locator('.mock-start .mock-rules')).toBeVisible();
  await page.locator('[data-mock-start="week16.mock"]').click();
  await expect(page.locator('.mock-timer')).toHaveText(/01:14:\d\d/);
  await expect(page.locator('.question-card')).toHaveCount(60);
  await expect(page.locator('.solution, .feedback')).toHaveCount(0);
  await expect(page.locator('.mock-grid-cell')).toHaveCount(60);
  await expect(page.locator('.mock-bubble')).toHaveCount(240);
  await page.setViewportSize({ width: 360, height: 800 });
  const width = await page.evaluate(() => ({ client: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }));
  expect(width.page).toBeLessThanOrEqual(width.client);

  const firstQuestion = page.locator('.question-card').first();
  const firstItemId = await firstQuestion.getAttribute('data-item');
  const correctChoice = await page.evaluate(itemId => {
    const item = window.WB_BOOK.week16.lessons.find(lesson => lesson.id === 'week16.mock').mcq.find(question => question.id === itemId);
    return item.answer;
  }, firstItemId);
  await page.locator(`[data-mock-choice-for="${firstItemId}"][data-mock-choice="${correctChoice}"]`).click();
  await expect(firstQuestion.locator(`input[value="${correctChoice}"]`)).toBeChecked();
  await expect(page.locator('.mock-grid-cell').first()).toHaveClass(/answered/);
  let saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  const startedAt = saved.l['week16.mock'].mock.startedAt;
  expect(saved.l['week16.mock'].i[firstItemId].ans).toBe(correctChoice);

  const minutes = await page.evaluate(() => window.WB_BOOK.week16.lessons.find(lesson => lesson.id === 'week16.mock').minutes);
  await page.evaluate(({ key, id, minutesForWarning }) => {
    const state = JSON.parse(localStorage.getItem(key));
    state.l[id].mock.startedAt = new Date(Date.now() - (minutesForWarning * 60000 - 14 * 60000)).toISOString();
    localStorage.setItem(key, JSON.stringify(state));
  }, { key: KEY, id: 'week16.mock', started: startedAt, minutesForWarning: minutes });
  await page.reload();
  await expect(page.locator('.mock-warning')).toBeVisible();
  await expect(page.locator(`.question-card[data-item="${firstItemId}"] input[value="${correctChoice}"]`)).toBeChecked();
  await expect(page.locator(`[data-mock-choice-for="${firstItemId}"][data-mock-choice="${correctChoice}"]`)).toHaveAttribute('aria-pressed', 'true');

  await page.evaluate(({ key, id, duration }) => {
    const state = JSON.parse(localStorage.getItem(key));
    state.l[id].mock.startedAt = new Date(Date.now() - duration * 60000 - 1000).toISOString();
    localStorage.setItem(key, JSON.stringify(state));
  }, { key: KEY, id: 'week16.mock', duration: minutes });
  await page.reload();
  await expect(page.locator('.mock-timeup')).toBeVisible();
  await page.locator('[data-mock-overtime="week16.mock"]').click();
  saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.l['week16.mock'].mock.overTime).toBe(true);
  await expect(page.locator('.mock-timer-status')).toContainText('Overtime');

  await page.locator('[data-mock-submit="week16.mock"]').first().click();
  await expect(page.locator('[data-mock-results]')).toContainText('1 / 60 correct');
  await expect(page.locator('[data-mock-results] .lesson-table tbody tr')).toHaveCount(5);
  await expect(page.locator('[data-mock-results] a').first()).toBeVisible();
  await expect(firstQuestion.locator('input[type="radio"]:checked')).toBeDisabled();
  await expect(firstQuestion.locator('.solution')).toBeVisible();
  saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.l['week16.mock'].mock.final.score).toBe(1);
  expect(saved.l['week16.mock'].mock.final.sectionScores).toHaveProperty('A');
  expect(errors).toEqual([]);
});

test('Paper 02 hides mark schemes until submission and awards a saved grade after self-marking every part', async ({ page }) => {
  const errors = await openFreshMock(page, 'week13.mock');
  await page.locator('[data-mock-start="week13.mock"]').click();
  const parts = page.locator('.question-card[data-item-kind="self"]');
  const count = await parts.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index++) {
    await parts.nth(index).locator('textarea').fill(`My response to part ${index + 1}.`);
  }
  await expect(page.locator('.mark-point')).toHaveCount(0);
  await expect(page.locator('.mock-locked-note')).toHaveCount(count);
  let saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.l['week13.mock'].mock.startedAt).toBeTruthy();
  expect(Object.keys(saved.l['week13.mock'].i).length).toBe(count);

  await page.reload();
  await expect(page.locator('.question-card[data-item-kind="self"] textarea').first()).toHaveValue('My response to part 1.');
  await page.locator('[data-mock-submit="week13.mock"]').click();
  await expect(page.locator('.mock-results-pending')).toContainText(`0 of ${count} parts`);
  await expect(page.locator('.mark-point').first()).toBeVisible();
  await expect(page.locator('.question-card[data-item-kind="self"] textarea').first()).toBeDisabled();

  for (let index = 0; index < count; index++) {
    const card = page.locator('.question-card[data-item-kind="self"]').nth(index);
    const markPoints = card.locator('[data-mark-index]');
    for (let point = 0; point < await markPoints.count(); point++) {
      await markPoints.nth(point).check({ force: true });
    }
    await card.locator('[data-self-mark]').click();
  }
  await expect(page.locator('[data-mock-results]')).toContainText('/ 100 marks');
  await expect(page.locator('[data-mock-results]')).toContainText('Grade-guide band');
  saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.l['week13.mock'].mock.final.total).toBe(100);
  expect(saved.l['week13.mock'].mock.final.score).toBe(100);
  expect(errors).toEqual([]);
});
