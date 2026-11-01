// The GitHub Pages copy was retired on 2026-11-01. Its "moved" page carries each student's progress
// to csec-physics-2027.web.app/study, where assets/js/carry.js merges it. Both addresses are faked
// here with page.route, so the whole move runs end to end without touching the real sites.
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

const KEY = 'csec-phys-2027-v1', LKEY = 'csec-phys-2027-labs', QKEY = 'smon-v1-queue';
const OLD = 'https://mrtatwellhtml.github.io/', OLD_BASE = OLD + 'CSEC-Physics-2027/';
const NEW_BASE = 'https://csec-physics-2027.web.app/study/';
const MOVED = fs.readFileSync(path.join(__dirname, '..', '..', 'moved', 'index.html'), 'utf8');

const carry = payload => Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
const oldState = extra => Object.assign({
  v: 1, name: 'Kai Brown', theme: '', xp: 120, streak: { last: '2026-10-30', n: 3 },
  l: { 'week01.check': { started: '2026-10-01T10:00:00Z', finished: true, secs: 600, feel: '', question: '', i: { 'week01.check.m1': { right: true } } } },
  log: {}, mistakes: [{ lessonId: 'week01.check', itemId: 'week01.check.m2', when: '2026-10-01', question: 'Which unit?', lessonTitle: 'Book Check' }],
  mistakeNotes: 'remember units', queue: [],
}, extra || {});
// The fake new address is not localhost, so the Student Monitor tracker and the Sheet submission
// would be live there: block both, so no test record can ever reach the real data.
test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\/(firestore\.googleapis\.com|script\.google\.com|script\.googleusercontent\.com)\//, route => route.abort());
});
const stored = (page, key) => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), key);

async function fakeHosts(page, baseURL) {
  // The old address serves the moved page at every path, as GitHub Pages will (index.html and 404.html).
  await page.route(OLD + '**', route => route.fulfill({ status: 200, contentType: 'text/html', body: MOVED }));
  await page.route(OLD + '__setup', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>setup</p>' }));
  // The new address serves this repo's files, as the Physics hub's build does.
  await page.route(NEW_BASE + '**', async route => {
    const u = new URL(route.request().url());
    try {
      await route.fulfill({ response: await route.fetch({ url: baseURL + u.pathname.replace(/^\/study\//, '') + u.search }) });
    } catch (e) { /* the page moved on (a redirect) before this file arrived */ }
  });
}

test('the old address moves a student, with their progress, to the lab they asked for', async ({ page, baseURL }) => {
  await fakeHosts(page, baseURL);
  await page.goto(OLD + '__setup');
  await page.evaluate(([k, lk, qk, s]) => {
    localStorage.setItem(k, JSON.stringify(s));
    localStorage.setItem(lk, JSON.stringify({ atom: { tasks: [0, 2], total: 4 } }));
    // The github.io origin is shared with other sites: only this workbook's records may move.
    localStorage.setItem(qk, JSON.stringify([{ id: 'p1', doc: { site: 'csec-physics-workbook' } }, { id: 'a1', doc: { site: 'diligent-add-maths' } }]));
    localStorage.setItem('diligent-am-progress-v2', '{"secret":1}');
  }, [KEY, LKEY, QKEY, oldState()]);

  await page.goto(OLD_BASE + 'labs/atom.html?from=week01.l1', { waitUntil: 'commit' });
  await expect(page).toHaveURL(NEW_BASE + 'labs/atom.html?from=week01.l1', { timeout: 15000 });
  await expect(page.locator('body[data-lab="atom"]')).toBeVisible();

  const saved = await stored(page, KEY);
  expect(saved.name).toBe('Kai Brown');
  expect(saved.l['week01.check'].finished).toBe(true);
  expect((await stored(page, LKEY)).atom.tasks).toEqual([0, 2]);
  const queued = ((await stored(page, QKEY)) || []).map(r => r.id);
  expect(queued).toContain('p1');
  expect(queued).not.toContain('a1');
  expect(await page.evaluate(() => localStorage.getItem('diligent-am-progress-v2'))).toBeNull();

  // Nothing is deleted at the old address.
  await page.goto(OLD + '__setup');
  expect((await stored(page, KEY)).name).toBe('Kai Brown');
});

test('a deep link to a lesson lands on that lesson, and the welcome note shows once', async ({ page, baseURL }) => {
  await fakeHosts(page, baseURL);
  await page.goto(OLD + '__setup');
  await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [KEY, oldState()]);
  await page.goto(OLD_BASE + '#/lesson/week01.check', { waitUntil: 'commit' });
  await expect(page).toHaveURL(NEW_BASE + '#/lesson/week01.check', { timeout: 15000 });
  await expect(page.locator('.carry-note')).toContainText('your progress came with you: 1 lesson');
  await page.locator('.carry-note button').click();
  await expect(page.locator('.carry-note')).toHaveCount(0);
  expect(page.url()).not.toContain('carry=');
});

test('with nothing saved at the old address, the student is simply sent to the new one', async ({ page, baseURL }) => {
  await fakeHosts(page, baseURL);
  await page.goto(OLD_BASE + 'teacher.html', { waitUntil: 'commit' });
  await expect(page).toHaveURL(/^https:\/\/csec-physics-2027\.web\.app\/study\/(#\/)?$/);
  await expect(page.locator('#app')).not.toBeEmpty();
  await expect(page.locator('.carry-note')).toHaveCount(0);
});

test('carried progress merges with progress saved here, and carrying it again changes nothing', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(([k, lk]) => {
    localStorage.setItem(k, JSON.stringify({ v: 1, name: 'Kai', theme: 'dark', xp: 50, streak: { last: '2026-10-31', n: 1 },
      l: { 'week02.check': { started: 'x', finished: false, secs: 5, i: { a: {} } }, 'week01.check': { started: 'x', finished: false, secs: 1, i: {} } },
      log: {}, mistakes: [{ itemId: 'week01.check.m2', lessonId: 'week01.check', question: 'Which unit?' }], mistakeNotes: '', queue: [] }));
    localStorage.setItem(lk, JSON.stringify({ atom: { tasks: [1], total: 4 } }));
  }, [KEY, LKEY]);
  const link = '/#carry=' + carry({ v: 1, state: oldState(), labs: { atom: { tasks: [0, 2], total: 4 } }, queue: [] });
  for (let i = 0; i < 2; i++) {
    await page.goto('about:blank');
    await page.goto(link, { referer: OLD });
    await expect(page.locator('#app')).not.toBeEmpty();
  }
  const saved = await stored(page, KEY);
  expect(saved.name).toBe('Kai');
  expect(saved.theme).toBe('dark');
  expect(saved.xp).toBe(120);
  expect(saved.streak).toEqual({ last: '2026-10-31', n: 1 });
  expect(Object.keys(saved.l).sort()).toEqual(['week01.check', 'week02.check']);
  expect(saved.l['week01.check'].finished).toBe(true);
  expect(saved.mistakes).toHaveLength(1);
  expect(saved.mistakeNotes).toBe('remember units');
  expect((await stored(page, LKEY)).atom.tasks).toEqual([0, 1, 2]);
});

test('carried progress is ignored unless the student comes from the old address', async ({ page }) => {
  for (const referer of [undefined, 'https://evil.example/', 'https://mrtatwellhtml.github.io.evil.example/']) {
    await page.goto('about:blank');
    await page.goto('/#carry=' + carry({ v: 1, state: oldState(), labs: null, queue: [] }), referer ? { referer } : {});
    await expect(page.locator('#app')).not.toBeEmpty();
    expect(new URL(page.url()).hash).toBe('#/');
    expect(JSON.stringify(await stored(page, KEY))).not.toContain('Kai Brown');
  }
  await expect(page.locator('.carry-note')).toHaveCount(0);
});

test('a hostile carry is kept as plain data: no script runs, numbers stay numbers, no prototype pollution', async ({ page }) => {
  const evil = '<img src=x onerror="window.__pwned=1">';
  const l = { 'week01.check': { finished: true, stars: evil, secs: evil, i: 'not an object' } };
  Object.defineProperty(l, '__proto__', { value: { polluted: true }, enumerable: true });
  const state = oldState({ name: evil, xp: evil, streak: { last: evil, n: evil }, l,
    log: { week01: [{ year: evil }, 'x'] },
    mistakes: [{ itemId: evil, lessonId: '"><script>window.__pwned=2</script>', question: evil, lessonTitle: evil }, 'x'] });
  await page.goto('/#carry=' + carry({ v: 1, state, labs: { atom: { tasks: ['<b>', 1, 1e9], total: evil } },
    queue: [{ id: 'x', doc: { site: 'another-site' } }] }), { referer: OLD });
  await expect(page.locator('#app')).not.toBeEmpty();
  await page.goto('/#/mistakes');
  await expect(page.locator('.mistake-card')).toHaveCount(1);
  await page.goto('/#/lesson/week01.check');
  await expect(page.locator('#lessonbody[data-loaded="true"]')).toBeVisible({ timeout: 15000 });
  await page.goto('/#/');
  await expect(page.locator('#app')).toContainText('<img src=x');
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
  expect(await page.evaluate(() => ({}).polluted)).toBeUndefined();

  const saved = await stored(page, KEY);
  expect(saved.xp).toBe(0);
  expect(saved.streak.n).toBe(0);
  expect(saved.l['week01.check'].stars).toBe(0);
  expect(saved.l['week01.check'].i).toEqual({});
  expect(Object.keys(saved.l)).toEqual(['week01.check']);
  expect(saved.log.week01).toHaveLength(1);
  expect((await stored(page, LKEY)).atom).toEqual({ tasks: [1], total: 0 });
  expect(JSON.stringify((await stored(page, QKEY)) || [])).not.toContain('another-site');
});

test('a carry link can only lead inside this workbook', async ({ page }) => {
  const c = carry({ v: 1, state: oldState(), labs: null, queue: [] });
  for (const bad of ['https://evil.example/', '//evil.example/x', 'javascript:alert(1)', 'labs/../../x.html', '#/x"><b>']) {
    await page.goto('about:blank');
    await page.goto('/#carry=' + c + '&to=' + encodeURIComponent(bad), { referer: OLD });
    await expect(page.locator('#app')).not.toBeEmpty();
    expect(new URL(page.url()).hash).toBe('#/');
    expect(new URL(page.url()).pathname).toBe('/');
  }
  await page.goto('about:blank');
  await page.goto('/#carry=' + c + '&to=' + encodeURIComponent('#/formulas'), { referer: OLD });
  await expect(page).toHaveURL(/#\/formulas$/);
});
