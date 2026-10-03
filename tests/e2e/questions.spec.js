const { test, expect } = require('@playwright/test');

const KEY = 'csec-phys-2027-v1';

async function openFreshLesson(page, lessonId) {
  await page.goto('/');
  await page.evaluate(key => localStorage.removeItem(key), KEY);
  await page.reload();
  await page.locator('#stu-name').fill('Question Test');
  await page.goto(`/#/lesson/${lessonId}`);
  await expect(page.locator('#lessonbody[data-loaded="true"]')).toBeVisible();
}

async function saveSelfMark(card, indexes) {
  await card.locator('textarea').fill('My response for checking.');
  await card.locator('[data-show-scheme]').click();
  for (const index of indexes) await card.locator(`[data-mark-index="${index}"]`).check();
  await card.locator('[data-self-mark]').click();
}

test('MCQ retries award XP once, reveal the solution and persist/remove mistakes', async ({ page }) => {
  await openFreshLesson(page, 'week06.6.7');
  const card = page.locator('[data-item="week06.6.7.p1"]');

  await card.locator('input[value="D"]').check();
  await card.locator('[data-check-item]').click();
  await expect(card.locator('.feedback')).toContainText('Not quite');
  await page.goto('/#/mistakes');
  await expect(page.locator('.mistake-card')).toHaveCount(1);
  await expect(page.locator('.mistake-card')).toContainText('week06.6.7.p1');
  const width = await page.evaluate(() => ({ client: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }));
  expect(width.page).toBeLessThanOrEqual(width.client);

  await page.goto('/#/lesson/week06.6.7');
  await expect(page.locator('#lessonbody[data-loaded="true"]')).toBeVisible();
  const retryCard = page.locator('[data-item="week06.6.7.p1"]');
  await retryCard.locator('input[value="A"]').check();
  await retryCard.locator('[data-check-item]').click();
  await expect(retryCard.locator('details.solution summary', { hasText: 'Model solution' })).toBeVisible();

  await retryCard.locator('input[value="C"]').check();
  await retryCard.locator('[data-check-item]').click();
  await expect(retryCard.locator('.feedback')).toContainText('Correct');
  let saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.xp).toBe(5);
  expect(saved.l['week06.6.7'].i['week06.6.7.p1'].tries).toBe(3);
  expect(saved.l['week06.6.7'].i['week06.6.7.p1'].right).toBe(true);
  expect(saved.mistakes).toHaveLength(1);

  await page.reload();
  await expect(page.locator('#lessonbody[data-loaded="true"]')).toBeVisible();
  await expect(page.locator('[data-item="week06.6.7.p1"] .feedback')).toContainText('+5 XP');
  saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.xp).toBe(5);
  await page.goto('/#/mistakes');
  await page.locator('[data-remove-mistake="week06.6.7.p1"]').click();
  saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.mistakes).toHaveLength(0);
});

test('short and numeric checks use shared WBC checkers; keypad inserts at the cursor', async ({ page }) => {
  await openFreshLesson(page, 'es01.1.1');
  const short = page.locator('[data-item="es01.1.1.p1"]');
  await short.locator('textarea').fill('electron');
  await short.locator('[data-check-item]').click();
  await expect(short.locator('.feedback')).toContainText('Correct');

  await page.goto('/#/lesson/week01.1.2');
  await expect(page.locator('#lessonbody[data-loaded="true"]')).toBeVisible();
  const numeric = page.locator('[data-item="week01.1.2.p4"]');
  const answer = numeric.locator('textarea');
  await answer.fill('9');
  await answer.evaluate(input => input.setSelectionRange(1, 1));
  await numeric.getByRole('button', { name: '×10ⁿ' }).click();
  await expect(answer).toHaveValue('9×10^');
  await answer.fill('9.9');
  await numeric.locator('[data-check-item]').click();
  await expect(numeric.locator('.feedback')).toContainText('Correct');
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.xp).toBe(20);
});

test('self-mark XP is capped, Practice hints deduct at most available XP, and state survives reload', async ({ page }) => {
  await openFreshLesson(page, 'es01.1.1');
  const card = page.locator('[data-item="es01.1.1.p3"]');
  await saveSelfMark(card, [0, 1]);
  let saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.xp).toBe(8);
  expect(saved.l['es01.1.1'].i['es01.1.1.p3'].score).toBe(2);
  expect(saved.mistakes).toHaveLength(1);

  await card.locator('details.hint summary').click();
  await expect(card.locator('.hint-cost')).toHaveText('2 XP spent.');
  saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.xp).toBe(6);

  await page.reload();
  await expect(page.locator('#lessonbody[data-loaded="true"]')).toBeVisible();
  const restored = page.locator('[data-item="es01.1.1.p3"]');
  await expect(restored.locator('details.hint')).toHaveAttribute('open', '');
  await expect(restored.locator('.hint-cost')).toHaveText('2 XP spent.');
  await restored.locator('[data-mark-index="2"]').check();
  await restored.locator('[data-self-mark]').click();
  saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.xp).toBe(8);
  expect(saved.l['es01.1.1'].i['es01.1.1.p3'].xp).toBe(10);
  await restored.locator('[data-self-mark]').click();
  saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.xp).toBe(8);
  expect(saved.l['es01.1.1'].i['es01.1.1.p3'].xp).toBe(10);
  await restored.locator('[data-mark-index="2"]').uncheck();
  await restored.locator('[data-self-mark]').click();
  saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.xp).toBe(8);
  expect(saved.l['es01.1.1'].i['es01.1.1.p3'].xp).toBe(10);
  await restored.locator('[data-mark-index="2"]').check();
  await restored.locator('[data-self-mark]').click();
  saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.xp).toBe(8);
});

test('Practice hints remain available when the learner has no XP', async ({ page }) => {
  await openFreshLesson(page, 'es01.1.1');
  const card = page.locator('[data-item="es01.1.1.p3"]');
  await card.locator('details.hint summary').click();
  await expect(card.locator('.hint-cost')).toHaveText('No XP available to deduct; this hint was free.');
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.xp).toBe(0);
  expect(saved.l['es01.1.1'].i['es01.1.1.p3'].hintCost).toBe(0);
});

test('exit-check stars use the agreed 80% threshold and unanswered checks earn zero', async ({ page }) => {
  await openFreshLesson(page, 'es01.1.1');
  const finish = page.locator('#finish-form button[type="submit"]');
  await finish.click();
  let saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.l['es01.1.1'].stars).toBe(0);

  await saveSelfMark(page.locator('[data-item="es01.1.1.p7"]'), [0, 1]);
  await saveSelfMark(page.locator('[data-item="es01.1.1.p8"]'), [0]);
  await finish.click();
  saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.l['es01.1.1'].stars).toBe(1);

  const finalQuestion = page.locator('[data-item="es01.1.1.p8"]');
  await finalQuestion.locator('[data-mark-index="1"]').check();
  await finalQuestion.locator('[data-self-mark]').click();
  await finish.click();
  saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.l['es01.1.1'].stars).toBe(2);

  await finalQuestion.locator('[data-mark-index="2"]').check();
  await finalQuestion.locator('[data-self-mark]').click();
  await finish.click();
  saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.l['es01.1.1'].stars).toBe(3);
});
