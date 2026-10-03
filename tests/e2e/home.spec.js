// Phase 2: shell, Home, name gate, theme, routing, mobile layout (PLAN.md §2, §12, §14).
const { test, expect } = require('@playwright/test');

const KEY = 'csec-phys-2027-v1';
function watchErrors(page) {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errors.push(m.text()); });
  return errors;
}
const noOverflow = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test('home renders sections in syllabus order with every lesson card', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(page.locator('h1.hello')).toHaveText('Hi there');
  const labels = await page.locator('.section-h .sl').allTextContents();
  expect(labels).toEqual(['Section A', 'Section B', 'Section C', 'Section D', 'Section E', 'Exam prep']);
  const total = await page.evaluate(() => window.WB_INDEX.books.reduce((n, b) => n + b.lessons.length, 0));
  await expect(page.locator('.daycard')).toHaveCount(total);
  await expect(page.locator('.ring-t span')).toHaveText(`of ${total} lessons`);
  await expect(page.locator('.cta strong')).toContainText('Lesson 1');
  await expect(page.locator('.stats .stat')).toHaveCount(3);
  for (const t of await page.locator('.cd b').allTextContents()) expect(Number(t)).toBeGreaterThanOrEqual(0);
  expect(errors).toEqual([]);
});

test('name gate: no lesson starts without a name, and the name is remembered', async ({ page }) => {
  await page.goto('/');
  await page.locator('.cta').click();
  await expect(page).not.toHaveURL(/#\/lesson\//);
  await expect(page.locator('.name-gate')).toBeVisible();
  await expect(page.locator('#stu-name')).toBeFocused();
  // a deep link to a lesson shows the gate form instead of the lesson
  await page.goto('/#/lesson/week02.2.3');
  await expect(page.locator('#gateform')).toBeVisible();
  await expect(page.locator('#lessonbody')).toHaveCount(0);
  await page.locator('#gate-name').fill('Test Student');
  await page.locator('#gateform button').click();
  await expect(page.locator('#lessonbody')).toBeVisible();
  await page.goto('/');
  await expect(page.locator('h1.hello')).toContainText('Test Student');
  await page.reload();
  await expect(page.locator('#stu-name')).toHaveValue('Test Student');
});

test('dark mode toggle is saved', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.locator('#themebtn').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const saved = await page.evaluate(k => JSON.parse(localStorage.getItem(k)).theme, KEY);
  expect(saved).toBe('dark');
});

test('deep links and the back button work', async ({ page }) => {
  await page.goto('/#/book/week02');
  await expect(page.locator('h1')).toContainText('Vectors, Forces');
  await expect(page.locator('.objs li').first()).toBeVisible();   // book data lazy-loaded
  await page.locator('a.daycard').first().click();
  await expect(page).toHaveURL(/#\/lesson\/week02\.2\.1$/);
  await page.goBack();
  await expect(page).toHaveURL(/#\/book\/week02$/);
  await page.goto('/#/nope');
  await expect(page.locator('h1')).toHaveText('Page not found');
});

test('first load (shell + Home data) is under 300 KB before images and fonts', async ({ page }) => {
  let bytes = 0;
  page.on('response', async r => {
    if (/fonts\.(googleapis|gstatic)|\.(png|webp)$/.test(r.url())) return;
    try { bytes += (await r.body()).length; } catch (e) { /* ignore */ }
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(bytes).toBeLessThan(300 * 1024);
});

test('no horizontal scroll on Home, a book and a lesson', async ({ page }) => {
  for (const h of ['/', '/#/book/week08', '/#/lesson/week08.8.4']) {
    await page.goto(h);
    await page.waitForTimeout(300);
    expect(await noOverflow(page)).toBeLessThanOrEqual(0);
  }
});
