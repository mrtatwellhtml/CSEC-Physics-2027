# PLAN — CSEC Physics 2027 Interactive Workbook Website

> Paste this file into the repo root as `PLAN.md` and tell Claude Code:
> **"Read PLAN.md and build the site phase by phase. Stop after each phase, show me, and wait for my OK."**

---

## 0. Goal

Turn the 17 finished CSEC Physics workbooks (Word books built from JSON) into **one interactive, mobile-friendly website**. One student uses it to prepare for CSEC Physics, January 2027: **Paper 02 on Tue 5 Jan 2027, Paper 01 on Mon 25 Jan 2027**. He previously failed the subject, so everything must be plain, short and encouraging.

- **Design and behaviour:** copy the look and feel of my existing site **https://mrtatwellhtml.github.io/Lower-School-Mathematics-2029/foundation/**. It is my own site, so open it in a browser and reuse its patterns. Details are in §2.
- **Hosting:** a **new GitHub Pages repo**, e.g. `mrtatwellhtml/CSEC-Physics-2027`. A static site with no backend, except the optional Google Apps Script endpoint (§9).
- **Order:** **syllabus order A → E**, then exam preparation (§4).
- **Submissions:** **on**. There is a name gate, and his answers, feelings and questions are posted to a Google Sheet through Apps Script, the same as the Foundation site.

---

## 1. Inputs (the content already exists — do NOT rewrite the physics)

1. In the repo, create `source/` and extract into it the archive
   `D:\School Work (Pictures)\2026-2027 Mathematics\5th form Physics (Claude)\_build_source\workbook_build_source.tar.gz`
   (`tar -xzf workbook_build_source.tar.gz -C source`). This gives `source/wb/`:
   - `source/wb/weeks/<folder>/content.json`: all text, questions, answers and mark schemes for one book
   - `source/wb/weeks/<folder>/img/*.png`: the diagrams that book uses (about 240 PNGs, 13 MB in total)
   - `source/wb/engine/AGENT_BRIEF.md`: **read this first.** It documents the content.json schema.
   - `source/wb/engine/syllabus_and_map.md`: every CSEC objective code (A1.1 … E3.13)
2. Treat `content.json` as the **single source of truth**. Never edit the physics or the answers by hand. If a fix is needed, make it in a converter override file (§5.4).

### Folder → book map (site order)

| Order | Section | Folder | Book title | label in JSON |
|---|---|---|---|---|
| 1 | A Mechanics | week01 | Scientific Method, Measurement & Graph Skills | — |
| 2 | A | week02 | Vectors, Forces, Moments & Hooke's Law | — |
| 3 | A | week03 | Motion & Newton's Laws | — |
| 4 | A | week04 | Energy, Power & Hydrostatics | — |
| 5 | B Thermal | week05 | Heat, Temperature & Thermal Measurements | — |
| 6 | B | week06 | Gas Laws, Heat Transfer & Checkpoint Test | — |
| 7 | C Waves & Optics | week07 | Waves, Sound & the EM Spectrum | — |
| 8 | C | week08 | Light, Reflection, Refraction & Lenses | — |
| 9 | D Electricity & Magnetism | es01 | Electrostatics | 1-to-1 Session 1 |
| 10 | D | week09 | Current Electricity & Circuits | 1-to-1 Session 2 |
| 11 | D | week10 | Mains, Electronics, Magnetism & the Motor Effect | 1-to-1 Session 3 |
| 12 | D | week11 | Electromagnetic Induction & Transformers | 1-to-1 Session 4 |
| 13 | E Atom | week12 | The Physics of the Atom | 1-to-1 Session 5 |
| 14 | Exam prep | week14 | Final Paper 02 Prep | Final Prep |
| 15 | Exam prep | week13 | Mock Paper 02 (full exam) | Mock Exam 1 |
| 16 | Exam prep | week15 | Paper 01 MCQ Drill + Paper 032 skills | Paper 01 Drill |
| 17 | Exam prep | week16 | Mock Paper 01 (60 MCQs) | Mock Exam 2 |

Content totals: 91 units, 284 worked examples, 862 practice questions, 282 MCQs, 42 structured questions and 36 past-paper-style questions.

---

## 2. Reference design (taken from the Foundation site — match it)

**Tech pattern used there:** one `index.html` that holds the app, a `config.js` (`window.WB_CONFIG = { endpoint: "" }`), and data loaded as `window.WB = [...]`. It uses three small IIFE modules:
- `WBD`: diagram and markup helpers. `md()` handles `**bold**`, fractions and newlines.
- `WBC`: answer checking. It normalises minus signs, ×, ≤ and so on, and parses numbers, fractions, units, `$` and thousands commas.
- The app module: state, router and render.

The router uses hashes (`#day1`). State is saved in `localStorage` under one versioned key.

**Design tokens (light):**
```css
:root{
  --bg:#F3F4F8;--surface:#FFFFFF;--surface-2:#F7F8FB;--ink:#12141C;--muted:#5C6273;--line:#E3E6EE;
  --accent:#2F5BFF;--accent-ink:#FFFFFF;--accent-soft:#E8EDFF;--pop:#FF6B35;--pop-soft:#FFEDE4;
  --ok:#0E9F6E;--ok-bg:#E3F6EE;--no:#E0474C;--no-bg:#FDECEC;--hint-bg:#FFF5DC;
  --t0:#64748B;--t1:#FF6B35;--t2:#2F5BFF;--t3:#0E9F6E;--t4:#8B5CF6;--t5:#E11D48;--t6:#0891B2;--t7:#D97706;--t8:#4F46E5;
  --shadow:0 1px 2px #12141c0d,0 6px 24px #12141c0f;--shadow-2:0 2px 4px #12141c14,0 14px 40px #12141c1f;
  --r:18px;--r-sm:12px;
  --f-display:'Bricolage Grotesque','Segoe UI Variable Display','Segoe UI',system-ui,sans-serif;
  --f-body:'Atkinson Hyperlegible','Segoe UI',system-ui,-apple-system,Roboto,Arial,sans-serif;
  --f-mono:'DM Mono',ui-monospace,Consolas,monospace;
}
```
**Dark** (`[data-theme="dark"]`, toggled by the moon button and saved):
```css
--bg:#0D0F14;--surface:#161921;--surface-2:#1D212B;--ink:#EDEFF5;--muted:#9BA2B4;--line:#2A2F3B;
--accent:#7D98FF;--accent-ink:#0D0F14;--accent-soft:#1E2847;--pop:#FF8A5C;--pop-soft:#3A2218;
--ok:#3DD68C;--ok-bg:#12301F;--no:#FF6B6E;--no-bg:#3A1A1C;--hint-bg:#352D19;
--t0:#94A3B8;--t1:#FF8A5C;--t2:#7D98FF;--t3:#3DD68C;--t4:#A78BFA;--t5:#FB7185;--t6:#22D3EE;--t7:#FBBF24;--t8:#818CF8;
```
**Fonts** (Google Fonts): Atkinson Hyperlegible (body), Bricolage Grotesque (display), DM Mono (numbers).

**Layout to reproduce:**
- **Top bar:** a logo tile ("P27") with the site name on the left. On the right are an XP chip (⚡), a stars chip (★) and a dark-mode toggle.
- **Home hero card:** a big "Hi there / Hi {name}" greeting and a one-line promise. It has a **"Your name"** input (the name gate), a **progress ring** ("0 of N lessons") and a big accent **START HERE / Continue** button that leads to the next lesson.
- **Three stat tiles:** XP earned · Stars · Questions right.
- **"How each lesson works" chips:** numbered pills with minutes, e.g. 1 Warm-up 5m · 2 Learn 10m · 3 Try it with help 5m · 4 Practice 10m · 5 Exit check 3m · 6 Show your teacher.
- **Topic groups:** a coloured dot (t0–t8), the topic name, the syllabus code and an `x/y` count. Under each is a grid of **lesson cards** showing a number, title and status ("Not started" / "In progress" / ✓). Checkpoint or review cards carry a **CHECK** tag.
- **Lesson page:**
  - A breadcrumb ("Section A · Book 2"), the day number and the title.
  - A **TODAY'S GOAL** "I can…" box.
  - **WORDS TO KNOW · TAP TO OPEN** vocabulary chips.
  - Numbered section cards (Warm-up / Learn / Try it / Practice / Exit check), each with a minute badge and a one-line blurb.
  - Each item is numbered (W1, T1, 1, E1) with a **level dots** badge (●/●●/●●●), an Answer input, **Check** and **Hint** buttons, and a symbol keypad row (×, ÷, −, ², ³, √, π, θ, λ, ρ, Ω, μ, Δ, °, ⁻¹, ×10ⁿ).
  - A final **"Finish & show your teacher"** card. It shows questions right, the exit-check score, "How do you feel about today?" (I can do this / Nearly there / I need help), a "My question for my teacher" box and a **Finish this day** button.
  - Prev/next lesson links at the bottom.
- **Footer:** "Teacher summary" link · "Your work saves on this device only."

---

## 3. Tech decisions

- **Plain HTML, CSS and vanilla JS** (ES2019, no framework), like the reference. The only build step is a Node converter (`tools/convert.mjs`).
- **Files:**
```
/index.html            app shell (top bar, #app, #printarea)
/config.js             window.WB_CONFIG = { endpoint: "" }
/assets/css/app.css    tokens + components
/assets/js/wbd.js      markup + diagram helpers (md(), sup/sub, tables, images)
/assets/js/wbc.js      answer checking (shared with Node tests via module.exports)
/assets/js/app.js      state, router, renderers, XP, submissions
/data/index.js         window.WB_INDEX = [...]   (books, units → lessons, light metadata only)
/data/books/<id>.js    window.WB_BOOK['<id>'] = {...} (full lesson data, lazy-loaded per book)
/img/<folder>/<name>.webp   converted diagrams (keep PNG fallback)
/tools/convert.mjs     content.json → data/*.js
/tools/overrides.json  manual fixes to auto-checking (see §5.4)
/tools/report.html     converter QA report (not deployed)
/apps-script/Physics_Responses.gs
/tests/*.spec.js       Playwright tests
```
- Lazy-load `data/books/<id>.js` when a book is opened, so the first load stays small.
- Keep one `localStorage` key, `csec-phys-2027-v1`, wrapped in try/catch (§8).
- No external JS libraries. Draw any extra graphs as inline SVG with `WBD`.

---

## 4. Information architecture

- **Home** groups books by **section** in syllabus order. Each section has a colour:
  - A Mechanics = t1
  - B Thermal = t7
  - C Waves & Optics = t6
  - D Electricity & Magnetism = t2
  - E Atom = t5
  - Exam Prep = t4
- Each **book** becomes a topic group (heading, objective codes, `x/y` progress). Its **lessons** are:
  1. one lesson per **unit** (`units[]`), so a book has 2–7 lessons;
  2. a **"Book check"** lesson (CHECK tag). It contains the book's `exam_mcq` (Paper 01 style) plus `exam_structured` (Paper 02 style).
  3. a **"Past-paper practice"** lesson (CHECK tag). It contains `past_paper[]` and the Past Paper Log, which is an editable table saved in state.
- **Exam Prep group:** Final Prep, Mock Paper 02, P01 Drill and Mock Paper 01. Both mocks run in **Exam mode** (§6.4).
- **Extra pages** (in the top-bar menu):
  - **Formula cards:** every `formula_card` merged, filterable by section.
  - **Key words:** every `glossary` merged, searchable.
  - **My mistake log:** the questions he got wrong, auto-collected, plus free notes.
  - **Countdown:** days to Paper 02 and Paper 01.
  - **Teacher summary:** per-lesson scores, feelings, questions and time spent, with a print button.
- Lessons are numbered globally (Lesson 1…N) and also show their book and unit id ("Book 2 · Unit 2.3").

---

## 5. Content conversion (`tools/convert.mjs`)

### 5.1 Mapping content.json → lesson

| content.json | Site |
|---|---|
| `title`, `subtitle`, `section`, `intro` | Book header card |
| `objectives[]` | Book objective list + "I can…" goals (use the objectives matching `unit.objectives`) |
| `prior_knowledge[]` | "Quick start" block at the top of the book's first lesson |
| `unit.notes[]` (blocks) | **Learn** section |
| `unit.worked_examples[]` | **Learn** section as step-by-step example cards. Steps are revealed one at a time with a "Next step" button. |
| `unit.practice[]` first 2 items | **Try it with help** (hint shown, model answer available after 1 try) |
| `unit.practice[]` remaining items except the last 2 | **Practice**, levelled ●/●●/●●● by position (first third, middle third, last third) or by `marks` (1, 2–3, 4+) |
| `unit.practice[]` last 2 | **Exit check** (no hints) |
| previous lesson's practice (2–3 random 1-mark items) + book `recall_quiz` | **Warm-up** |
| `glossary[]` terms that appear in the unit text | **Words to know** chips |
| `common_mistakes[]` | "Watch out" boxes in the Book check lesson |
| `formula_card[]`, `glossary[]` | Formula cards and Key words pages |
| `exam_mcq[]` | Book check, Paper 01 part: MCQ with explanation shown after answering |
| `exam_structured[]`, `past_paper[]` | Book check / Past-paper lesson: multi-part questions (§6.3) |
| `past_paper_suggestions[]`, `tutor_session_plan`, `tutor_notes` | **Do NOT ship to the student site.** Put them in a separate `teacher.html` (unlinked, `noindex`). |

**Block types to render:** `h`, `p`, `bullets`, `steps`, `def` (Key definition box), `formula` (formula box with "where" lines), `tip` (green, Exam tip), `warn` (red, Common mistake), `remember` (amber), `img` (figure + caption), `table`, `fill` (inline input, self-checked), `lines` (textarea), `pagebreak` (ignore).

**Inline markup:** `**bold**`, `*italic*`, `^sup^`, `~sub~`, `__underline__`. Convert it to HTML in `WBD.md()`. Keep the Unicode symbols. Never use LaTeX.

### 5.2 Auto-checking (this is the hard part — do it carefully)

The `answer` fields are mark-scheme text such as `"T = 28.4 ÷ 20 (1) = 1.42 s (1)."`. Classify each question as follows:

1. **MCQ:** has `options` + `answer` letter, so it is auto-marked.
2. **Numeric:** the question asks to *calculate/find/determine/how many/what is the …* and the answer ends in one number (+ unit). Extract that final number, its unit and its significant figures. Accept ±2 % (or ±1 in the last given digit). Ignore the unit in checking but show it in the solution. Accept `3.0e10`, `3.0×10^10`, `3.0 x 10^10` and `3 × 10¹⁰`.
3. **Short text:** a 1-mark answer of 1–3 words (e.g. "Electron (1)."). Build an `accept[]` list from the words before `(1)` and simple variants (case, plural, "the"). Spelling within edit distance 1 is accepted.
4. **Self-mark (default for everything else):** the student writes or types an answer, presses **"Show mark scheme"**, and the mark scheme appears split into **mark points**. Split the answer on each `(1)`, `(2)` or "1 each". Each mark point is a checkbox, and he ticks the points he got. Score = ticked marks / `marks`. This is how CSEC is marked, so explain it on screen ("Tick each point you made — 1 point = 1 mark").

`blanks` (fill-the-gap) items: make "Try it with help" items into blanks only where the worked steps allow it. If that is not safe, keep them as self-mark with the hint visible.

### 5.3 Converter QA report

`tools/report.html` lists every question with its classification, the extracted answer and the original mark scheme. Flag low-confidence items in amber. **Show me the counts per type and 20 random numeric items before going further.**

### 5.4 Overrides

`tools/overrides.json` is keyed by `<folder>:<unit>:<index>`. Use it to force a type, a correct value, a tolerance or accept-words. The converter applies it last. Never edit `source/`.

---

## 6. Question UI behaviour

### 6.1 Single questions
- **Check:**
  - Right → green box with ✓ and "+10 XP". Show the model solution, collapsed.
  - Wrong → red box with "Not quite — try again". After 2 wrong tries, show the full solution and give 0 XP. Add the question to the Mistake Log.
- **XP:** 10 for right first time, 5 for right after a retry, 2 for completing a self-marked item honestly (plus 3 per mark ticked, capped at 10).
- **Stars:** 1–3 per lesson from the exit check: 3 = all right, 2 = ≥ 50 %, 1 = attempted.
- **Hint** button only when `hint` exists, or when the converter generated one from the first step of a related worked example. A hint does not reduce XP in Try it, but costs 2 XP in Practice.
- **Symbol keypad** under focused inputs. It inserts at the cursor: × ÷ − ² ³ √ π θ λ ρ Ω μ Δ ° ⁻¹ ×10ⁿ.

### 6.2 Worked examples
A card with the question first and a **"Show step"** button that reveals one step at a time, then the boxed answer. "Hide steps" collapses it again.

### 6.3 Multi-part structured questions
- The stem (and any table or image) appears once, then parts (a), (b)… each with its marks badge, an answer textarea and "Show mark scheme" (self-mark ticks).
- A running total shows "x / total".
- For **data-analysis** questions (graph grids):
  - Render an **interactive SVG graph grid**: he taps to plot points, drags a ruler for the best-fit line, and draws a gradient triangle with a readout of Δy/Δx.
  - The axes are set by the converter from the data table (choose a "nice" scale using more than half the grid).
  - Also offer **"I'll do this on paper"**, which shows the printable grid image and goes straight to self-mark.

### 6.4 Exam mode (Mock Paper 02 and Mock Paper 01)
- A start screen gives the rules (from `prior_knowledge`), the time allowed and a **Start timer** button. The countdown is sticky; there is a 15-minute warning, and time-up offers "submit / keep going but mark as over time".
- **No answers, hints or mark schemes until Submit.** After Submit:
  - Mock Paper 01: auto-marks the 60 items, shows a score by section using the question→topic table in the week16 unit, and gives "What to revise" links to the matching books.
  - Mock Paper 02: opens self-mark mode for all 38 parts, then shows the total /100 and the grade-guide band.
- The answer grid from week16 becomes clickable A/B/C/D bubbles.

---

## 7. Gamification and motivation (keep it light)
- XP and stars in the top bar, a progress ring on Home and a **streak** (days in a row with one or more lessons finished).
- A **countdown** chip: "94 days to Paper 02". Compute it from today's date to 2027-01-05 09:00 and 2027-01-25 09:00 (America/Port_of_Spain).
- Celebration on lesson finish: a small confetti burst in CSS or canvas, about 1 s, respecting `prefers-reduced-motion`.

---

## 8. State
```js
// localStorage['csec-phys-2027-v1']
{ v:1, name:'', theme:'light', xp:0, streak:{last:'2026-10-03', n:0},
  l: { '<lessonId>': { started, finished, secs, feel:'can|nearly|help', question:'',
        i: { '<itemId>': { tries, right, xp, ans, ticks:[0,1,1], hint:true } } } },
  log: { '<bookId>': [ {year,question,topic,score,outOf} ] },   // Past Paper Log
  mistakes: [ {lessonId,itemId,when} ] }
```
- Item ids must be **stable**: `<folder>.<unitId>.<kind><index>` (e.g. `week02.2.3.p4`), so re-running the converter keeps progress.
- **Export / import progress** (JSON download and upload) on the Teacher summary page, for when he changes device.

---

## 9. Submissions (Google Apps Script → Sheet), same pattern as Foundation
- `config.js`: `window.WB_CONFIG = { endpoint: "" }`. When it is empty, nothing is sent and everything else still works.
- **Name gate:** before starting any lesson, he must enter his name, which is remembered on the device (message: "Enter your name before starting so your teacher can see your work").
- **On "Finish this day"**, POST with `fetch(endpoint, {method:'POST', mode:'no-cors', body: JSON.stringify(payload)})`, using `text/plain` to avoid a CORS preflight. The payload is:
  `{ name, lessonId, lessonTitle, book, section, finishedAt, secs, right, total, exitRight, exitTotal, selfMarks, selfTotal, xp, stars, feel, question, answers:[{id,q,ans,right,ticks}] }`
  - Queue failed sends in state and retry on the next load.
  - Also send on Mock submit, with `type:'mock'` and the section breakdown.
- `apps-script/Physics_Responses.gs`:
  - `doPost(e)` appends one row per submission to a sheet named **Responses**, with columns Timestamp · Name · Lesson · Book · Section · Right/Total · Exit · Self-marks · XP · Stars · Feeling · Question · Time (min) · Answers JSON.
  - It also writes a sheet named **Mocks**.
  - `doGet` returns "OK" for testing.
  - Add a README with the deploy steps: Extensions → Apps Script → paste → Deploy as Web app, execute as Me, access Anyone → copy the `/exec` URL into config.js.
- Show the privacy line in the footer: "Your name and answers are sent to your teacher."

---

## 10. Images
- Copy every PNG used by `img` blocks, question `img` fields and worked-example images into `/img/<folder>/`. Also make a WebP copy (`sharp` or `cwebp`) at max width 1400 px, and use `<picture>` with a PNG fallback.
- Use `loading="lazy"`, width and height attributes, and alt text from `caption` (or the question text).
- The PNGs have white backgrounds. In dark mode, put figures on a white rounded "paper" panel so they stay readable. Do not invert them.
- Graph-paper PNGs (`graph_paper.png`): replace them with the interactive SVG grid (§6.3) and keep the PNG for the print view.

---

## 11. Print view
Keep a `#printarea` like the reference site. "Print this lesson" renders a clean black-on-white version (notes, questions with answer lines, no answers) for paper homework. Use `@media print` rules.

## 12. Accessibility and mobile
- Mobile first (he will mostly use a phone), and fine at 360 px wide.
- Tap targets of 44 px or more and visible focus states, with labels on every input.
- Contrast WCAG AA in both themes.
- Hash routing must work with the browser back button. `#/book/week02` and `#/lesson/week02.2.3` must deep-link.
- No horizontal scroll. Tables scroll inside their own wrapper.

---

## 13. Build phases (stop after each one for my review)

| Phase | Deliverable | Done when |
|---|---|---|
| **0 Setup** | Repo, folders, `source/` extracted, `npm init`, Playwright installed, `.gitignore` (ignore `source/` if I say so, since it is 13 MB) | `npm run convert` and `npm test` exist |
| **1 Converter** | `tools/convert.mjs`, `data/index.js`, `data/books/*.js`, `tools/report.html` | All 17 books convert. Type counts and 20 numeric samples shown to me. Item ids are stable on re-run. |
| **2 Shell + design** | `index.html`, `app.css` tokens, top bar, dark mode, Home with sections and lesson cards, name gate, stat tiles, progress ring, countdown | Home matches the Foundation layout on desktop and at 375 px |
| **3 Lesson renderer** | All block types, worked-example stepper, vocab chips, Warm-up/Learn/Try/Practice/Exit sections, Finish card | Lessons from Book 1 and Book 9 render with every image and no raw `**`, `^` or `~` |
| **4 Questions** | MCQ, numeric, short-text, self-mark ticks, hints, keypad, XP and stars, Mistake Log | Unit tests for `WBC` pass (numbers, standard form, units, minus signs, fractions) |
| **5 Exam content** | Book check and Past-paper lessons, multi-part questions, interactive graph grid, Past Paper Log table | A data-analysis question can be plotted, fitted and self-marked |
| **6 Exam mode** | Timed mocks, locked answers, submit, section breakdown, revise links | A full Mock Paper 01 can be completed and scored |
| **7 Extras** | Formula cards, Key words, Teacher summary, export/import, print view, `teacher.html` | All pages reachable from the menu |
| **8 Submissions** | `config.js`, POST + retry queue, `Physics_Responses.gs` + README | A test POST lands in a test Sheet (I'll deploy the script) |
| **9 QA + deploy** | Playwright tests, Lighthouse pass, GitHub Pages enabled | All tests green. Live URL works on my phone. |

---

## 14. Tests (Playwright + Node)
- `wbc.test`: numbers like `1.42`, `1.42 s`, `3.0×10^10`, `3e10`, `−2.5`, `1/2`, `$31.35` and `1 200`, plus tolerance edges.
- Every lesson in `data/index.js` opens without console errors (loop through all of them).
- No rendered text contains `**`, `^` or `~` (scan `#app` innerText).
- Every `<img>` loads (naturalWidth > 0).
- The name gate blocks lesson start until a name is entered.
- XP is +10 on a right first try and +5 after a retry. State survives a reload.
- A mock locks its answers until submit, and the timer counts down.
- Mobile viewport 375×812 has no horizontal overflow on Home, a lesson or a mock.

## 15. Rules for Claude Code
- **Do not change the physics content, answers or numbers.** Only restructure and display them. Put any correction in `overrides.json` with a comment, and list it for me.
- Do not reproduce real CXC past-paper questions. The `past_paper` items are original and that is intended.
- Keep tutor-only content (`tutor_session_plan`, `tutor_notes`, `past_paper_suggestions`) out of the student pages.
- Keep it fast. The first load (index + Home) must be under 300 KB before images.
- Commit after each phase with a clear message. Ask me before deleting anything.
