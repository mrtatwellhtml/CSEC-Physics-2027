const { test, expect } = require('@playwright/test');

const KEY = 'csec-phys-2027-v1';

test('every converted lesson renders without browser errors, broken images or horizontal overflow', async ({ page }) => {
  test.setTimeout(180000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  await page.evaluate(key => localStorage.removeItem(key), KEY);
  await page.reload();
  await page.locator('#stu-name').fill('QA Student');
  const lessonIds = await page.evaluate(() =>
    window.WB_INDEX.books.flatMap(book => book.lessons.map(lesson => lesson.id)));
  expect(lessonIds).toHaveLength(123);

  for (const id of lessonIds) {
    await page.evaluate(lessonId => { location.hash = `#/lesson/${lessonId}`; }, id);
    await expect(page.locator('#lessonbody[data-loaded="true"]'), `${id} should render`).toBeVisible();
    const state = await page.evaluate(async () => {
      const images = [...document.querySelectorAll('#lessonbody img')];
      images.forEach(image => { image.loading = 'eager'; });
      await Promise.all(images.map(image => image.decode().catch(() => undefined)));
      return {
        brokenImages: images.filter(image => !image.naturalWidth).map(image => image.currentSrc || image.src),
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        texMarkers: document.querySelectorAll('#lessonbody .tex.pending').length,
        katexErrors: document.querySelectorAll('#lessonbody .katex-error').length,
      };
    });
    expect(state.brokenImages, `${id} should have working images`).toEqual([]);
    expect(state.scrollWidth, `${id} should fit at 360 px`).toBeLessThanOrEqual(state.clientWidth);
    expect(state.texMarkers, `${id} should typeset all equations`).toBe(0);
    expect(state.katexErrors, `${id} should have no KaTeX errors`).toBe(0);
  }
  expect(errors).toEqual([]);
});

test('teacher companion page is unlinked and marked noindex', async ({ page }) => {
  await page.goto('/teacher.html');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
  await expect(page.getByRole('link', { name: 'Teacher summary' })).toHaveAttribute('href', 'index.html#/teacher');
  await expect(page.locator('body')).toContainText(/does not protect private information/i);
});
