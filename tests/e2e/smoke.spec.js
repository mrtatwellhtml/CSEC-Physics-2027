// Phase 0 smoke test: the static server serves the app shell.
// The full suite from PLAN.md §14 is added as the phases land.
const { test, expect } = require('@playwright/test');

test('home page loads', async ({ page }) => {
  const res = await page.goto('/');
  expect(res.status()).toBe(200);
  await expect(page).toHaveTitle(/CSEC Physics/);
});
