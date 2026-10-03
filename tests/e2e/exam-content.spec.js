const { test, expect } = require('@playwright/test');

const KEY = 'csec-phys-2027-v1';

async function openFreshLesson(page, lessonId) {
  await page.goto('/');
  await page.evaluate(key => localStorage.removeItem(key), KEY);
  await page.reload();
  await page.locator('#stu-name').fill('Exam Content Test');
  await page.goto(`/#/lesson/${lessonId}`);
  await expect(page.locator('#lessonbody[data-loaded="true"]')).toBeVisible();
}

test('Book Check renders MCQs and structured questions with saved self-mark totals', async ({ page }) => {
  await openFreshLesson(page, 'week01.check');
  await expect(page.locator('.question-card[data-item-kind="mcq"]')).toHaveCount(12);
  await expect(page.locator('.structured-question')).toHaveCount(2);

  const part = page.locator('[data-item="week01.check.s1.a"]');
  await part.locator('textarea').fill('Independent variable and controlled length.');
  await part.locator('[data-show-scheme]').click();
  await part.locator('[data-mark-index="0"]').check();
  await part.locator('[data-self-mark]').click();
  await expect(page.locator('[data-structured="week01.check.s1"] [data-multi-score]')).toHaveText('1 / 12');

  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.l['week01.check'].i['week01.check.s1.a'].score).toBe(1);
});

test('Past-paper data-analysis graph supports plotting, adjustable best-fit line, gradient and saved marks', async ({ page }) => {
  await openFreshLesson(page, 'week01.past');
  const graph = page.locator('[data-graph-widget="week01.past.q1.a"]');
  await expect(graph).toBeVisible();
  await expect(graph.locator('.graph-plotted')).toHaveText('0 / 7');

  const grid = graph.locator('[data-graph-hit]');
  async function tapAt(x, y) {
    const box = await grid.boundingBox();
    await grid.click({ position: { x: box.width * x, y: box.height * y } });
  }
  await tapAt(0.15, 0.8);
  await tapAt(0.3, 0.7);
  await tapAt(0.45, 0.6);
  await expect(graph.locator('.graph-point')).toHaveCount(3);
  await expect(graph.locator('.graph-plotted')).toHaveText('3 / 7');
  await graph.locator('[data-graph-coordinate="x"]').fill('3');
  await graph.locator('[data-graph-coordinate="y"]').fill('4');
  await graph.locator('[data-graph-add-point]').click();
  await expect(graph.locator('.graph-plotted')).toHaveText('4 / 7');

  await graph.locator('[data-graph-line]').click();
  await tapAt(0.12, 0.85);
  await tapAt(0.85, 0.2);
  await expect(graph.locator('.best-fit-line')).toHaveCount(1);
  await expect(graph.locator('[data-graph-triangle]')).toBeEnabled();
  await graph.locator('[data-graph-triangle]').click();
  await expect(graph.locator('.gradient-triangle')).toHaveCount(1);
  const gradient = await graph.locator('.graph-gradient').textContent();
  expect(gradient).toMatch(/Gradient = Δy \/ Δx = -?\d/);
  await expect(graph.locator('.graph-triangle-label')).toHaveCount(2);
  await graph.locator('[data-graph-handle="0"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(graph.locator('.gradient-triangle')).toHaveCount(0);
  await graph.locator('[data-graph-triangle]').click();
  await expect(graph.locator('.gradient-triangle')).toHaveCount(1);

  const part = page.locator('[data-item="week01.past.q1.a"]');
  await part.locator('textarea').fill('I plotted the data and drew a best-fit line.');
  await part.locator('[data-show-scheme]').click();
  await part.locator('[data-mark-index="0"]').check();
  await part.locator('[data-self-mark]').click();
  await expect(page.locator('[data-structured="week01.past.q1"] [data-multi-score]')).toHaveText('2 / 25');

  await page.locator('[data-add-log="week01"]').click();
  await page.locator('[data-log-field="year"]').fill('2024');
  await page.locator('[data-log-field="question"]').fill('Paper 2, Question 1');
  await page.locator('[data-log-field="topic"]').fill('Measurement');
  await page.locator('[data-log-field="score"]').fill('16');
  await page.locator('[data-log-field="outOf"]').fill('25');
  let saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.log.week01[0]).toEqual({
    year: '2024', question: 'Paper 2, Question 1', topic: 'Measurement', score: '16', outOf: '25',
  });
  expect(saved.l['week01.past'].i['week01.past.q1.a'].graph.points).toHaveLength(4);

  await page.reload();
  await expect(page.locator('#lessonbody[data-loaded="true"]')).toBeVisible();
  await expect(page.locator('[data-graph-widget="week01.past.q1.a"] .graph-point')).toHaveCount(4);
  await expect(page.locator('[data-graph-widget="week01.past.q1.a"] .gradient-triangle')).toHaveCount(1);
  await expect(page.locator('[data-log-field="question"]')).toHaveValue('Paper 2, Question 1');
  saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.l['week01.past'].i['week01.past.q1.a'].score).toBe(2);

  const restoredGraph = page.locator('[data-graph-widget="week01.past.q1.a"]');
  await restoredGraph.locator('[data-graph-paper]').click();
  await expect(restoredGraph.locator('.interactive-graph')).toBeHidden();
  await expect(restoredGraph.locator('.print-graph img')).toBeVisible();
  await restoredGraph.locator('[data-graph-paper]').click();
  await expect(restoredGraph.locator('.interactive-graph')).toBeVisible();
});

test('Past Paper Log entries can be added and removed', async ({ page }) => {
  await openFreshLesson(page, 'week01.past');
  await page.locator('[data-add-log="week01"]').click();
  await page.locator('[data-log-field="year"]').fill('2023');
  await page.locator('[data-remove-log="0"]').click();
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.log.week01).toHaveLength(0);
});

test('all converted data-analysis lessons provide an interactive, responsive graph', async ({ page }) => {
  const ids = [
    'es01.past', 'week01.past', 'week02.past', 'week03.past', 'week04.past',
    'week05.past', 'week07.past', 'week08.past', 'week09.past', 'week10.past',
    'week11.past', 'week12.past', 'week15.past',
  ];
  await openFreshLesson(page, ids[0]);
  for (const id of ids) {
    await page.goto(`/#/lesson/${id}`);
    await expect(page.locator('#lessonbody[data-loaded="true"]')).toBeVisible();
    const graph = page.locator('.graph-widget');
    await expect(graph, `${id} should have a table-derived interactive graph`).toHaveCount(1);
    await expect(graph.locator('.interactive-graph')).toBeVisible();
    const sizes = await page.evaluate(() => ({ client: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }));
    expect(sizes.page, `${id} should fit the current viewport`).toBeLessThanOrEqual(sizes.client);
  }
});

test('every Book Check and Past-paper lesson opens with converted questions', async ({ page }) => {
  await openFreshLesson(page, 'week01.check');
  const ids = await page.evaluate(() => window.WB_INDEX.books.flatMap(book =>
    book.lessons.filter(lesson => lesson.kind === 'check' || lesson.kind === 'past').map(lesson => lesson.id)));
  expect(ids.length).toBeGreaterThan(20);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const id of ids) {
    await page.goto(`/#/lesson/${id}`);
    await expect(page.locator('#lessonbody[data-loaded="true"]'), `${id} should render`).toBeVisible();
    await expect(page.locator('.question-card').first()).toBeVisible();
    await expect(page.locator('#lessonbody')).not.toContainText('available in a later build phase');
  }
  expect(errors).toEqual([]);
});
