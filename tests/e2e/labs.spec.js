// Interactive labs, maths help, formula coach, and the lesson support layer (labs/*, data/support.js).
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const KEY = 'csec-phys-2027-v1';
const LABS = fs.readdirSync(path.join(__dirname, '..', '..', 'labs')).filter(f => f.endsWith('.html')).map(f => f.replace('.html', ''));

function watchErrors(page) {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errors.push(m.text()); });
  return errors;
}
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
async function named(page) {
  await page.goto('/');
  await page.evaluate(k => localStorage.setItem(k, JSON.stringify({ v: 1, name: 'Test Student' })), KEY);
}

test('every lab page loads, survives every control being used, and fits the screen', async ({ page }) => {
  test.setTimeout(240000);
  for (const id of LABS) {
    const errors = watchErrors(page);
    await page.goto('/labs/' + id + '.html');
    await expect(page.locator('h1')).toBeVisible();
    await page.evaluate(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      for (const r of document.querySelectorAll('input[type=range]')) for (const v of [r.max, r.min]) { r.value = v; r.dispatchEvent(new Event('input', { bubbles: true })); }
      for (const b of document.querySelectorAll('button')) { if (!b.disabled && !b.classList.contains('lab-theme')) { b.click(); await sleep(2); } }
      for (const f of document.querySelectorAll('form')) { const i = f.querySelector('input'); if (i) i.value = '5'; f.requestSubmit(); }
    });
    await page.waitForTimeout(300);
    expect(await overflow(page), id + ' overflows horizontally').toBeLessThanOrEqual(0);
    expect(errors, id + ' had errors').toEqual([]);
  }
});

test('a unit lesson shows plain-language support, maths help, a lab and a recap', async ({ page }) => {
  const errors = watchErrors(page);
  await named(page);
  await page.goto('/#/lesson/week02.2.5');
  await page.reload();
  await expect(page.locator('.simple-words')).toContainText('extension');
  await expect(page.locator('.maths-chips a')).toHaveCount(4);
  await expect(page.locator('.recap li').first()).toBeVisible();
  await expect(page.locator('.block-formula .coach-link')).toHaveAttribute('href', 'labs/formula-coach.html?from=week02.2.5#hooke');
  const lab = page.locator('.lab-card').first();
  await expect(lab).toHaveAttribute('href', 'labs/hookes-law.html?from=week02.2.5');
  await lab.click();
  await expect(page.locator('h1')).toHaveText("Hooke's Law Spring Lab");
  // the lab sends the student back to the same lesson
  await page.locator('.back-lesson').click();
  await expect(page).toHaveURL(/#\/lesson\/week02\.2\.5$/);
  await expect(page.locator('.simple-words')).toBeVisible();
  expect(errors).toEqual([]);
});

test('lab tasks tick themselves and stay ticked after a reload', async ({ page }) => {
  await page.goto('/labs/hookes-law.html');
  await expect(page.locator('.tasks .prog')).toHaveText('0 of 6 done');
  await page.getByRole('button', { name: '+ Add 100 g mass' }).click();
  await page.getByRole('button', { name: 'Record reading' }).click();
  await expect(page.locator('.tasks .prog')).toHaveText('1 of 6 done');
  await expect(page.locator('#table tbody tr')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.tasks .prog')).toHaveText('1 of 6 done');
  await page.goto('/labs/index.html');
  await expect(page.locator('.hub-card', { hasText: "Hooke's Law" })).toContainText('1 of 6 tasks done');
});

test('labs follow the workbook theme and do not disturb saved progress', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(k => localStorage.setItem(k, JSON.stringify({ v: 1, name: 'Ana', xp: 40, theme: 'dark' })), KEY);
  await page.goto('/labs/circuits.html');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('#lab-theme').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const saved = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  expect(saved).toMatchObject({ name: 'Ana', xp: 40, theme: 'light' });
});

test('formula coach rearranges, substitutes and checks', async ({ page }) => {
  await page.goto('/labs/formula-coach.html#hooke');
  await page.getByRole('button', { name: 'x (extension)' }).click();
  await page.locator('input[data-v="F"]').fill('6');
  await page.locator('input[data-v="k"]').fill('40');
  await page.getByRole('button', { name: 'Solve step by step' }).click();
  await expect(page.locator('#steps')).toContainText('x = F ÷ k');
  await expect(page.locator('#steps')).toContainText('x = 6 ÷ 40');
  await expect(page.locator('#steps')).toContainText('0.150 m');
  await expect(page.locator('#steps')).toContainText('✓');
});

test('maths help marks answers and shows full solutions', async ({ page }) => {
  await page.goto('/labs/maths.html#rearrange');
  const box = page.locator('[data-practice="rearrange"]');
  // find the right option from the worked solution, then answer
  await box.getByRole('button', { name: 'Show solution' }).click();
  const answer = (await box.locator('.mathbox li').last().locator('b').textContent()).trim();
  await box.locator('.qopts button', { hasText: answer }).click();
  await expect(box.locator('.qfb.ok')).toBeVisible();
  const units = page.locator('[data-practice="units"]');
  await units.locator('input').fill('nonsense');
  await units.getByRole('button', { name: 'Check' }).click();
  await expect(units.locator('.qfb.no')).toContainText('Type a number');
});

test('home links to labs and tools; book pages list their labs', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.tools-strip a')).toHaveCount(3);
  await expect(page.getByRole('navigation', { name: 'Study tools' }).getByRole('link', { name: 'Labs' })).toHaveAttribute('href', 'labs/index.html');
  await page.goto('/#/book/week09');
  await expect(page.locator('.lab-card')).toHaveCount(3);
});
