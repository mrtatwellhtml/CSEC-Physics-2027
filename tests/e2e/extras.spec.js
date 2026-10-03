const { test, expect } = require('@playwright/test');

const KEY = 'csec-phys-2027-v1';

async function openFresh(page, hash = '/') {
  await page.goto('/');
  await page.evaluate(key => localStorage.removeItem(key), KEY);
  await page.reload();
  await page.locator('#stu-name').fill('Extras Test');
  await page.goto(`/#${hash}`);
}

test('Formula cards load from all books and filter by section and search', async ({ page }) => {
  await openFresh(page, '/formulas');
  await expect(page.locator('#formula-search')).toBeVisible();
  await expect(page.locator('.formula-entry').first()).toBeVisible();
  const initialCount = await page.locator('.formula-entry:not([hidden])').count();
  expect(initialCount).toBeGreaterThan(100);

  await page.locator('#formula-filter').selectOption('A');
  const sectionIds = await page.locator('.formula-entry:not([hidden])').evaluateAll(nodes => nodes.map(node => node.dataset.section));
  expect(sectionIds.length).toBeGreaterThan(0);
  expect(new Set(sectionIds)).toEqual(new Set(['A']));
  await page.locator('#formula-search').fill('F=ma');
  await expect(page.locator('.formula-entry:not([hidden])')).toHaveCount(1);
  await expect(page.locator('.formula-entry:not([hidden])')).toContainText('force');

  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.topbar')).toBeHidden();
  await expect(page.locator('.formula-entry:not([hidden])')).toBeVisible();
});

test('Key words are searchable and report an empty match clearly', async ({ page }) => {
  await openFresh(page, '/keywords');
  await expect(page.locator('.keyword-entry').first()).toBeVisible();
  expect(await page.locator('.keyword-entry:not([hidden])').count()).toBeGreaterThan(100);
  await page.locator('#keyword-search').fill('hypothesis');
  expect(await page.locator('.keyword-entry:not([hidden])').count()).toBeGreaterThan(0);
  await expect(page.locator('.keyword-entry:not([hidden])').filter({ hasText: 'testable prediction' })).toHaveCount(1);
  await page.locator('#keyword-search').fill('zznotaword');
  await expect(page.locator('.keyword-entry:not([hidden])')).toHaveCount(0);
  await expect(page.locator('.reference-empty')).toBeVisible();
});

test('Mistake Log keeps free revision notes in saved progress', async ({ page }) => {
  await openFresh(page, '/mistakes');
  await page.locator('#mistake-notes').fill('Revisit forces and practise rearranging equations.');
  await page.reload();
  await expect(page.locator('#mistake-notes')).toHaveValue('Revisit forces and practise rearranging equations.');
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.mistakeNotes).toBe('Revisit forces and practise rearranging equations.');
});

test('Teacher summary shows progress; progress export can be restored and invalid files are reported', async ({ page }) => {
  await openFresh(page, '/lesson/week01.1.1');
  await page.locator('#finish-form input[value="nearly"]').check();
  await page.locator('#teacher-question').fill('Review significant figures next time.');
  await page.locator('#finish-form button[type="submit"]').click();
  await page.goto('/#/teacher');
  await expect(page.locator('.teacher-table')).toBeVisible();
  const lessonRow = page.locator('.teacher-table tbody tr', { has: page.locator('a[href="#/lesson/week01.1.1"]') });
  await expect(lessonRow).toContainText('Complete');
  await expect(lessonRow).toContainText('Review significant figures next time.');
  await expect(page.locator('.teacher-table tbody tr')).toHaveCount(123);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('[data-export-state]').click(),
  ]);
  const exported = JSON.parse(require('fs').readFileSync(await download.path(), 'utf8'));
  expect(exported.name).toBe('Extras Test');
  expect(exported.l['week01.1.1'].question).toBe('Review significant figures next time.');

  exported.name = 'Restored Student';
  exported.xp = 23;
  await page.locator('#import-state-file').setInputFiles({
    name: 'progress.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(exported)),
  });
  await page.locator('#import-state-form button[type="submit"]').click();
  await expect(page.locator('.teacher-page')).toContainText('Restored Student');
  await expect(page.locator('.teacher-page')).toContainText('XP: 23');
  let saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.name).toBe('Restored Student');
  expect(saved.l['week01.1.1'].question).toBe('Review significant figures next time.');

  await page.locator('#import-state-file').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{broken'),
  });
  await page.locator('#import-state-form button[type="submit"]').click();
  await expect(page.locator('.import-status')).toContainText('not valid JSON');
  saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.name).toBe('Restored Student');
});
