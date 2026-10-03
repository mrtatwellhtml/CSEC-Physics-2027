const { test, expect } = require('@playwright/test');

const KEY = 'csec-phys-2027-v1';

async function enterName(page) {
  await page.goto('/');
  await page.locator('#stu-name').fill('Renderer Test');
}

test('Book 1 and Book 9 unit lessons render equations, blocks and images', async ({ page }) => {
  await enterName(page);
  const ids = await page.evaluate(() => window.WB_INDEX.books
    .filter(book => ['week01', 'week09'].includes(book.id))
    .flatMap(book => book.lessons.filter(lesson => /^week(01|09)\.\d+\.\d+$/.test(lesson.id)).map(lesson => lesson.id)));

  expect(ids).toHaveLength(11);
  for (const id of ids) {
    await page.goto(`/#/lesson/${id}`);
    await expect(page.locator('#lessonbody[data-loaded="true"]')).toBeVisible();
    await expect(page.locator('.lesson-section')).toHaveCount(5);
    await expect(page.locator('.lesson-goal')).toBeVisible();
    await page.waitForFunction(() => !document.querySelector('#lessonbody .tex.pending'));
    await expect(page.locator('#lessonbody .katex-error')).toHaveCount(0);
    const visibleText = await page.locator('#lessonbody').evaluate(element => {
      const clone = element.cloneNode(true);
      clone.querySelectorAll('.katex-mathml').forEach(mathml => mathml.remove());
      return clone.innerText;
    });
    expect(visibleText).not.toMatch(/⟪|⟫|\*\*|\^[^\s^]+\^|~[^\s~]+~/);

    const imageResults = await page.locator('#lessonbody img').evaluateAll(async images => {
      images.forEach(image => { image.loading = 'eager'; });
      await Promise.all(images.map(image => image.decode()));
      return images.map(image => image.naturalWidth > 0 && image.naturalHeight > 0);
    });
    expect(imageResults.every(Boolean)).toBe(true);
  }

  const blockTypes = await page.evaluate(() => ['week01', 'week09'].flatMap(id => {
    const book = window.WB_BOOK[id];
    return book.lessons.filter(lesson => /^week(01|09)\.\d+\.\d+$/.test(lesson.id)).flatMap(lesson => [
      ...(lesson.quickStart || []), ...(lesson.learn.notes || []),
      ...(lesson.warmup || []).flatMap(item => item.blocks || []),
      ...(lesson.tryit || []).flatMap(item => item.blocks || []),
      ...(lesson.practice || []).flatMap(item => item.blocks || []),
      ...(lesson.exit || []).flatMap(item => item.blocks || []),
    ].map(block => block.type));
  }));
  for (const type of ['h', 'p', 'bullets', 'steps', 'def', 'formula', 'tip', 'warn', 'remember', 'img', 'table', 'fill']) {
    expect(blockTypes).toContain(type);
  }
});

test('worked examples reveal one step at a time and vocabulary chips open', async ({ page }) => {
  await enterName(page);
  await page.goto('/#/lesson/week01.1.1');
  await expect(page.locator('#lessonbody[data-loaded="true"]')).toBeVisible();
  const example = page.locator('.example').first();
  await expect(example.locator('.example-step').first()).toBeVisible();
  await expect(example.locator('.example-step').nth(1)).toBeHidden();
  await example.locator('[data-stepper]').click();
  await expect(example.locator('.example-step').nth(1)).toBeVisible();
  const stepCount = await example.locator('.example-step').count();
  for (let i = 1; i < stepCount; i++) await example.locator('[data-stepper]').click();
  await expect(example.locator('.example-answer')).toBeVisible();
  await page.locator('.vocab-chip summary').first().click();
  await expect(page.locator('.vocab-chip').first()).toHaveAttribute('open', '');
});

test('answers survive rerender and finishing records lesson progress and reflection', async ({ page }) => {
  await enterName(page);
  await page.goto('/#/lesson/week09.9.1');
  await expect(page.locator('#lessonbody[data-loaded="true"]')).toBeVisible();
  await page.locator('.quick-start summary').click();
  await page.locator('.block-fill textarea').first().fill('t = d / v');
  const answer = page.locator('.question-card textarea').first();
  await answer.fill('A current is the rate of flow of charge.');
  await page.locator('#themebtn').click();
  await expect(page.locator('.question-card textarea').first()).toHaveValue('A current is the rate of flow of charge.');
  await expect(page.locator('.block-fill textarea').first()).toHaveValue('t = d / v');
  await page.reload();
  await expect(page.locator('#lessonbody[data-loaded="true"]')).toBeVisible();
  await expect(page.locator('.question-card textarea').first()).toHaveValue('A current is the rate of flow of charge.');
  await page.locator('.quick-start summary').click();
  await expect(page.locator('.block-fill textarea').first()).toHaveValue('t = d / v');
  await page.locator('input[name="feel"][value="nearly"]').check();
  await page.locator('#teacher-question').fill('Can we practise another current calculation?');
  await page.locator('#finish-form button[type="submit"]').click();
  await expect(page.locator('.finish-card h2')).toHaveText('Lesson complete');
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.l['week09.9.1'].finished).toBe(true);
  expect(saved.l['week09.9.1'].feel).toBe('nearly');
  expect(saved.l['week09.9.1'].question).toBe('Can we practise another current calculation?');
  expect(saved.l['week09.9.1'].i['week09.9.1.w1'].ans).toBe('A current is the rate of flow of charge.');
  await page.goto('/');
  await expect(page.locator('.ring-t b')).toHaveText('1');
});

test('lesson layout fits a 360px viewport and tables scroll within their own region', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await enterName(page);
  await page.goto('/#/lesson/week09.9.1');
  await expect(page.locator('#lessonbody[data-loaded="true"]')).toBeVisible();
  await expect(page.locator('.lesson-section')).toHaveCount(5);
  const sizes = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    table: document.querySelector('.table-wrap') && document.querySelector('.table-wrap').clientWidth,
  }));
  expect(sizes.document).toBeLessThanOrEqual(sizes.viewport);
  expect(sizes.table).toBeGreaterThan(0);
});

test('book-data load errors are shown and can be retried', async ({ page }) => {
  await enterName(page);
  await page.route('**/data/books/week09.js', route => route.abort());
  await page.goto('/#/lesson/week09.9.1');
  await expect(page.locator('#lessonbody[role="alert"]')).toContainText('Could not load lesson data');
  await page.unroute('**/data/books/week09.js');
  await page.locator('[data-retry-book="week09"]').click();
  await expect(page.locator('#lessonbody[data-loaded="true"]')).toBeVisible();
});
