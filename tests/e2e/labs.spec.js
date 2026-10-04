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
  // every step is typeset with KaTeX; the TeX source is kept on each equation
  await expect(page.locator('#steps .katex').first()).toBeVisible();
  const tex = await page.locator('#steps .tex[data-tex]').evaluateAll(els => els.map(e => e.getAttribute('data-tex')).join(' | '));
  expect(tex).toContain(String.raw`x=F\div k`);
  expect(tex).toContain(String.raw`x=6\div 40`);
  expect(tex).toContain(String.raw`\boldsymbol{0.150\,\mathrm{m}}`);
  await expect(page.locator('#steps')).toContainText('✓');
  await expect(page.locator('#steps .katex-error')).toHaveCount(0);
});

test('maths help marks answers and shows full solutions', async ({ page }) => {
  await page.goto('/labs/maths.html#rearrange');
  const box = page.locator('[data-practice="rearrange"]');
  // the options are typeset equations; try them until the right one is marked correct
  await expect(box.locator('.qopts button .katex').first()).toBeVisible();
  for (let i = 0; i < 4 && !(await box.locator('.qfb.ok').count()); i++) await box.locator('.qopts button').nth(i).click();
  await expect(box.locator('.qfb.ok')).toBeVisible();
  await expect(box.locator('.mathbox .katex').first()).toBeVisible();
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

test('lab maths is typeset: no plain-text equations in Show the maths, no KaTeX errors', async ({ page }) => {
  for (const id of ['thermometer', 'hookes-law', 'transformer', 'lenses', 'half-life']) {
    await page.goto('/labs/' + id + '.html');
    await expect(page.locator('.mathbox .katex').first()).toBeVisible();
    expect(await page.locator('.katex-error').count(), id).toBe(0);
    // a working line that still contains "=" as plain text would mean an equation was missed
    const plainEq = await page.locator('.mathbox .work').evaluateAll(ws => ws.filter(w => {
      const t = [...w.childNodes].filter(n => n.nodeType === 3).map(n => n.nodeValue).join('');
      return /[A-Za-z0-9]\s*=\s*[A-Za-z0-9(]/.test(t);
    }).length);
    expect(plainEq, id).toBe(0);
  }
});

