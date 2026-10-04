# HANDOVER — CSEC Physics Ultimate Workbook (1-to-1 student, January 2027)

*Live document — update after every build session.* Last updated: 4 Oct 2026. **Status: ALL 17 BOOKS BUILT & SAVED. Website: Phases 0–9 implemented, tested and pushed for CI deployment. Phase 10 (labs, maths help, formula coach, weak-student support) built, tested, committed and pushed 4 Oct. First Pages run, Pages settings, and live Google Sheet verification still need teacher account setup.**

## Context
- Student: private 1-to-1, previously sat & FAILED CSEC Physics. 1 h/week with tutor, < 4 h/week self-study. Also in tutor's regular Fifth Form class.
- Exams (CXC Jan 2027): **Paper 02 Tue 5 Jan 2027 9:00**; **Paper 01 Mon 25 Jan 2027 9:00**; Paper 032 25 Jan 13:00 (alternate candidates only). T&T MOE: Jan Physics resit-only → likely SBA carried forward. **Tutor to confirm registration slip.**
- Action plan (Claude Doc, updated 3 Oct to D-first session-by-session schedule): https://claude.ai/code/artifact/79e9e071-4bb9-4200-aeec-52de30b21fa9

## 1-to-1 order (assumes weekly Thursdays from 1 Oct)
S1 Electrostatics (1 Oct) → S2 Current & Circuits → S3 Mains/Electronics/Magnetism/Motor → S4 Induction & Transformers → S5 Atom (29 Oct) → Waves → Light → 2 gap topics (Thermal/Mechanics, depends on class) → Measurement & data analysis (3 Dec) → Mock1 review (10 Dec) → Final Prep (17 Dec, 31 Dec) → **P02 5 Jan** → P01 Drill (7, 14 Jan) → Mock2 review (21 Jan) → **P01 25 Jan**.

## Books (all in `D:\School Work (Pictures)\2026-2027 Mathematics\5th form Physics (Claude)\`, each _Student + _TUTOR_KEY .docx)
| File prefix | Title | Objectives | Source folder |
|---|---|---|---|
| 1to1_S01 | Electrostatics | D1 | weeks/es01 |
| 1to1_S02 | Current Electricity & Circuits | D2, D3, D4.1–4.12 | weeks/week09 |
| 1to1_S03 | Mains, Electronics, Magnetism & Motor Effect | D4.13–16, D5, D6, D7.1–7.8 | weeks/week10 |
| 1to1_S04 | Electromagnetic Induction & Transformers | D7.9–7.15 | weeks/week11 |
| 1to1_S05 | The Physics of the Atom | E1–E3 | weeks/week12 |
| Week01 | Scientific Method, Measurement & Graph Skills | A1 | weeks/week01 |
| Week02 | Vectors, Forces, Moments & Hooke's Law | A2, A3 | weeks/week02 |
| Week03 | Motion & Newton's Laws | A4 | weeks/week03 |
| Week04 | Energy, Power & Hydrostatics | A5, A6 | weeks/week04 |
| Week05 | Heat, Temperature & Thermal Measurements | B1, B2.1–2.8, B3 | weeks/week05 |
| Week06 | Gas Laws, Heat Transfer & Checkpoint Test (A & B) | B2.9–2.12, B4 | weeks/week06 |
| Week07 | Waves, Sound & the EM Spectrum | C1–C3 | weeks/week07 |
| Week08 | Light, Reflection, Refraction & Lenses | C4, C5 | weeks/week08 |
| Mock1 | Full original Paper 02 (100 marks) + review | all | weeks/week13 |
| FinalPrep | Paper 02 data analysis, explain toolkit, calc bank, master formula card | all | weeks/week14 |
| P01Drill | MCQ drill by section + MCQ technique + Paper 032 skills | all | weeks/week15 |
| Mock2 | Full original Paper 01 (60 MCQ) + weak-topic map + 18–25 Jan plan | all | weeks/week16 |

Every CSEC Physics specific objective (A–E) is covered. Totals: 91 units, 284 worked examples, 862 practice Qs, 282 MCQs, 42 structured, 36 past-paper-style. Numbers in all keys were python-checked by the building agents.

## Decisions
- Website: `source/` stays OUT of git (tutor, 3 Oct): it holds tutor-only notes. Repo has its own CLAUDE.md saying PLAN.md overrides the parent folder's CLAUDE.md.
- Word .docx; separate tutor key; Navy/Steel/Teal, Calibri/Cambria, US Letter.
- Past papers: copyrighted → ORIGINAL CSEC-style questions + a Past Paper Log for real questions from his booklet.

## Website
- **Repo (local):** `D:\School Work (Pictures)\2026-2027 Mathematics\Fifth Form Physics\CSEC-Physics-2027\` (git, branch `main` → https://github.com/mrtatwellhtml/CSEC-Physics-2027, public). GitHub Actions now builds/tests/deploys Pages from `main`; if its first run requests setup, set **Settings → Pages → Source = GitHub Actions**. The optional response endpoint remains blank until the teacher deploys the Apps Script. Kept in its own subfolder so it doesn't mix with the older single-topic pages (vectors.html etc.) in `Fifth Form Physics\`.
- **Plan:** `PLAN.md` in the repo root (copy of `CSEC_Physics_Website_PLAN.md`). Build phase by phase and stop after each one for the tutor's OK.
- Decisions: new GitHub Pages repo (e.g. mrtatwellhtml/CSEC-Physics-2027); copy layout + design tokens of the tutor's Foundation site (mrtatwellhtml.github.io/Lower-School-Mathematics-2029/foundation — vanilla JS SPA, window.WB data, WBD/WBC helpers, hash router, localStorage, Apps Script endpoint in config.js); **syllabus order A→E** then exam prep; **submissions ON** via Google Apps Script with name gate.
- **Equations: KaTeX (tutor request, 3 Oct).** `tools/tex.mjs` turns the books' ^sup^/~sub~/Unicode maths into TeX: whole formulas (formula boxes/cards), symbol side of "where" lines, and equation spans detected inside sentences (stored as `⟪tex⟫`). KaTeX 0.19.0 self-hosted in `assets/vendor/katex/` (76 KB gz JS, woff2 fonts), lazy-loaded only on pages with maths. Audit: 281 formulas + ~3,600 inline equations across all 17 books, **0 KaTeX failures**, no words lost. PLAN.md §3/§5.5/§13/§14 amended.
- Approach: converter `tools/convert.mjs` turns each content.json into site data (unit = lesson with Warm-up/Learn/Try/Practice/Exit; plus Book check + Past-paper lessons per book). Auto-check MCQ / numeric / short text; everything else self-marked by mark points split on "(1)". Mocks in timed exam mode. Tutor-only content kept out of student pages (separate teacher.html). 9 phases, review after each.

### Website phase tracker
| Phase | Status | Notes |
|---|---|---|
| 0 Setup | ✅ Done 3 Oct | Repo, folders, `source/` extracted, npm, Playwright (Chromium), `npm run convert` (inventory only), `npm test` (2 unit + 1 e2e, green) |
| ↳ KaTeX pipeline | ✅ Done 3 Oct | `tools/tex.mjs`, `tools/tex-audit.mjs` → `tools/katex-preview.html`, `tests/unit/tex.test.mjs` (7 tests). Renderer hook (`WBD.md()` → `katex.render`) lands in Phase 3 |
| 1 Converter | ✅ Done 3 Oct | 17 books → 123 lessons, 240 images (PNG + WebP), `data/index.js` 18 KB, books ~28 KB gz each. 1,596 questions: 367 MCQ · 158 numeric · 7 short text · 1,064 self-mark (72 low-confidence, amber in `tools/report.html`). All 252 numeric values cross-checked against their mark schemes; re-run is byte-identical; 0 tutor-content leaks; 17 unit tests. Decisions in PLAN.md §5.6 |
| 2 Shell + design | ✅ Done 3 Oct | Responsive homepage and book pages, theme toggle, name gate, progress/stats/countdown, hash routing and Phase 2 browser tests |
| 3 Lesson renderer | ✅ Done 3 Oct | Unit lessons: all blocks, KaTeX, images, worked-example stepper, vocabulary, question prompts, finish/reflection card and saved progress; Books 1 + 9 verified on desktop/mobile |
| 4 Questions | ✅ Done 3 Oct | Auto-check, self-mark, XP, hints, keypad, exit stars and Mistake Log |
| 5 Exam content | ✅ Done 3 Oct | Book Checks, structured/Past-paper questions, graphing and Past Paper Log |
| 6 Exam mode | ✅ Done 3 Oct | Timed Paper 01/Paper 02 flows, locked pre-submit answers and keys, reload-safe countdown, 15-minute warning, overtime choice, Paper 01 score-by-section/revision links, Paper 02 self-mark and grade band |
| 7 Extras | ✅ Done 3 Oct | Formula cards, key words, searchable/filterable reference pages, teacher summary, progress JSON export/import, free Mistake Log notes, print styles, unlinked/noindex teacher guidance page |
| 8 Submissions | ✅ Implemented 3 Oct | Optional lesson/mock POST, durable retry queue, Apps Script Responses/Mocks sheets, deduplication, validation and spreadsheet-safe text; live Google Sheet deployment/test awaits teacher account |
| 9 QA + deploy | ✅ Implemented 3 Oct | Desktop/mobile tests sweep all 123 lessons at 360 px and validate images/KaTeX/errors; CI workflow builds only generated student assets and deploys Pages on main; first live run awaits GitHub Pages settings |

| 10 Labs & support | ✅ Done 4 Oct | 37 interactive labs in `labs/` (one or more for every A–E content lesson), labs hub, Maths help (12 skills, endless checked practice), Formula coach (50 formulas, every rearrangement), "In simple words" + "Quick recap" + "Maths you need" for 74 lessons (`data/support.js`), lab cards / coach links in lessons, book pages, Home and Formula cards. See PLAN.md §16 |

### Website commands (run in the repo folder)
- `npm run convert`: content.json → `data/`, `img/`, `tools/report.html` (open the report via `npm run serve` → http://localhost:4173/tools/report.html). `node tools/convert.mjs --no-images` skips WebP re-encoding
- Fix a wrongly-classified question: add its item id to `tools/overrides.json` with a `note`, then re-run convert
- `npm run serve`: local preview at http://localhost:4173/
- `npm run tex:audit`: re-checks every equation; then open http://localhost:4173/tools/katex-preview.html (with `npm run serve` running) to see source vs rendered side by side
- `npm test`: unit tests (`node --test`) then Playwright e2e (desktop + 375 px mobile)

## Build system (books; resume in a new session)
- Backup: `_build_source\workbook_build_source.tar.gz` in the save folder (whole `wb/` tree minus outputs). Extract to /home/claude/wb. **Also extracted into the website repo at `source/wb/`** (do not edit; corrections go in `tools/overrides.json`).
- Engine `engine/build.js` (Node `docx`) reads `weeks/<folder>/content.json` + `img/` (from `diagrams.py`, style `engine/wbstyle.py`) → Student + TUTOR_KEY. Optional `label`, `file_prefix`. `engine/check.sh weeks/weekNN` builds + renders. Many folders generate content.json via helper scripts (c1–c3.py / make.py / gen.py).
- `engine/AGENT_BRIEF.md` = schema + quality bar; `engine/syllabus_and_map.md` = objectives.
- 1-to-1 and exam books are built as WeekNN_* then renamed on save (S02=week09, S03=week10, S04=week11, S05=week12, Mock1=week13, FinalPrep=week14, P01Drill=week15, Mock2=week16).

## Known minor issues
- Some engine page breaks leave near-empty pages; one MCQ image in Mock2 (M41) splits from its options across a page.
- Paper 032 timing in P01Drill came from the syllabus (2 h 10 min); confirm on timetable.

## Open items
- Phase 10 text in `data/support.js` was authored by Claude; tutor reviewed it and corrected the mains voltage to 110/220 V (also applied in the home-electricity and transformer labs).
- The 26 older single-topic pages in the parent `Fifth Form Physics\` folder are superseded by `labs/` (same topics, rebuilt and extended). They were left untouched; delete or archive them only if you want to.
- Confirm Paper 032 applicability and which sections class covers before January (decides the two "gap topic" sessions).
- Git identity on this PC is "CSEC Dev <dev@csec-papers.local>" (global config from another project), so commits show that name. Tutor to decide whether to set a repo-local name/email.
- Deploy Apps Script and paste /exec URL into config.js (Phase 8).

## Session log
1. 1 Oct — action plan; engine; Week 1 pilot; weeks 2–6; re-sequenced D-first → Electrostatics book.
2. 2 Oct — weeks 7–10 (S2, S3); final wave dispatched.
3. 3 Oct — S4, S5, Mock1, FinalPrep, P01Drill (verified), Mock2 built & saved; source backup saved; action plan doc updated to D-first schedule. Website build plan written after inspecting the Foundation site.
4. 3 Oct (VS Code) — Website **Phase 0 Setup** done: repo `CSEC-Physics-2027/` created, PLAN.md copied in, source extracted (17 books, 240 PNGs; totals match the table above), npm + Playwright installed, inventory converter + smoke tests green. Committed.
5. 3 Oct (VS Code) — Tutor asked for proper equation rendering with KaTeX. Built `tools/tex.mjs` (markup → TeX: units upright, variables italic, fractions/roots/nuclides, bold answers, mark-scheme (1) kept outside maths), audit page + 7 unit tests (all equations in all 17 books render), KaTeX self-hosted, PLAN.md amended (§5.5). Committed.
6. 3 Oct — Tutor: keep `source/` out of git; repo CLAUDE.md added. Tutor created GitHub repo; remote added and `main` pushed (40 files, no source/ or tutor content). Commit author set (repo-local) to "Mr. Tatwell <mrtatwellhtml@users.noreply.github.com>".
7. 3 Oct — **Phase 1 Converter**: `tools/convert.mjs` + `tools/classify.mjs` + `assets/js/wbc.js` (shared number parser). Found & fixed while checking: multi-line mark schemes (notes after the scheme), "1/T" being accepted as an answer, "State … and calculate …" questions, ×/÷ in TeX. Showed tutor type counts + 20 numeric samples (all correct). Committed + pushed.
8. 3 Oct (VS Code) — **Phase 2 Shell + design**: responsive app shell and Foundation-inspired Home with all 123 lesson cards in A–E/exam-prep order, progress ring, XP/stars/question stats, exam countdowns, lesson-flow chips, saved name gate, dark-mode toggle and hash-routed book/lesson shells. Added desktop/mobile browser tests; `npm test` passes (17 unit, 12 browser tests), Home loads below 300 KB, and mobile checks show no horizontal overflow. Waiting for tutor review before Phase 3.
9. 3 Oct (VS Code) — **Phase 3 Lesson renderer**: rendered all unit-lesson block types, objectives, vocabulary chips, quick-start recaps, worked examples with step-by-step reveal, question prompts and answer fields, hints, images and KaTeX. Added reflection/completion saving and active lesson-time tracking; made lazy book-data loading wait visibly and report/retry errors. Books 1 + 9 all render on desktop/mobile; every referenced image loads, equations typeset, and 360 px lesson view has no horizontal overflow. `npm test`: 17 unit + 22 desktop/mobile browser tests pass. Book check/past-paper/mock interactions remain for Phases 5–6. Waiting for tutor review before Phase 4.
10. 3 Oct (VS Code) — **Phase 4 Questions**: wired MCQ, numeric and short-text checks to the shared `WBC` checkers; added retry feedback and model solutions after two wrong attempts; added self-mark ticks with XP capped at 10, cursor-aware symbol keypad, once-only Practice hint charges (never below zero), and a local Mistake Log with review/remove actions. Lesson exit stars follow the tutor's decision: **3 for perfect, 2 for ≥80%, 1 for any attempted check below 80%, 0 unanswered**. Added desktop/mobile tests for checking, retries, XP, hint costs, persistence, mistakes, keypad and all star thresholds. `npm test`: 17 unit + 32 desktop/mobile browser tests pass. Phase 5 (exam content) is next, pending tutor review.
11. 3 Oct (VS Code) — **Phase 5 Exam content**: activated every Book Check and Past-paper lesson; added MCQ and multi-part Paper 02 rendering, per-part self-marking with running totals, a saved Past Paper Log, and responsive table-driven SVG graphing with tap-to-plot, coordinate inputs, editable best-fit line, keyboard handles, gradient triangle and print grid. Graph axes/data are inferred from converted tables, including transformed or explicitly derivable columns. Opened every Book Check and Past-paper lesson in browser tests; all 13 data-analysis graphs render and graph interactions persist on desktop/mobile. `npm test`: 17 unit + 42 desktop/mobile browser tests pass. Phase 6 (Exam mode) is next, pending tutor review.
12. 3 Oct (VS Code) — **Phase 6 Exam mode**: added rules/start screens and local persistence for both mock attempts. Paper 01 has a sticky reload-safe timer, 15-minute/time-up flow, clickable A/B/C/D answer grid, auto-score, A–E breakdown, explanations and revision links. Paper 02 locks mark schemes until submission, then enables saved self-marking and shows the total plus grade-guide band when complete; self-mark scores cannot exceed each part’s allocated marks. Desktop/mobile browser tests cover the full Paper 01 and Paper 02 flows, answer secrecy, persistence, warning/overtime, scores and 360 px layout. Phase 7 (Extras) is next, pending tutor review.
13. 3 Oct (VS Code) — **Phases 7–9 Extras, submissions, QA/deploy**: added study-tool navigation; formula cards and searchable key words over all 17 books; per-lesson teacher summary; import/export; revision notes; and print layouts. Added Apps Script endpoint and README, local submission queue with retry on next visit, privacy disclosures and Apps Script/client tests. Added `teacher.html` with noindex deployment/privacy guidance only (no private data), all-123-lesson desktop/mobile QA at 360 px, and a GitHub Pages Actions workflow. Verification: `npm test` passes **20 unit and 66 desktop/mobile browser tests**; every lesson is checked for runtime errors, broken images, equation failures and horizontal overflow. Deployment still depends on first-time GitHub Pages settings; live Google Sheet setup/testing needs the teacher’s account.
14. 4 Oct (VS Code) — **Full audit + Phase 10 (labs and weak-student support)**. Audit: books/lessons strong on notes, examples and questions, but no simulations, no maths support and no plain-language entry point; the 26 older parent-folder sims were unlinked, thin (one slider panel + 1 MCQ) and in the old design. Bugs fixed: (1) **name-gate race**: typing a name while book data loaded was wiped by the re-render, so the "Start lesson" button did nothing (fixed in `render()`); (2) `.block-tip` label used an undefined `--good` colour; (3) low-contrast amber/green/red labels on tinted boxes (new `--ok-ink/--no-ink/--amber-ink` tokens, WCAG AA); (4) Playwright overloaded this PC at >2 workers (23 random timeouts) → `workers: 2` locally; (5) the Pages workflow would not have shipped `labs/`. Built: shared lab kit (`labs/lab.css`, `labs/lab.js`: theme shared with the workbook, back-to-lesson links, guided auto-ticking tasks saved under `csec-phys-2027-labs`, quick checks using WBC), 37 labs, hub, Maths help, Formula coach (`labs/formulas.js` + `WB_COACH` matcher in `labs/registry.js`), `data/support.js` lazy-loaded with book data. Each lab's physics was checked numerically (e.g. KE at bottom = √(2gh), v–t area = d–t, Rutherford scattering ≈ 80/17/3 %, motor stalls upright without commutator, generator e.m.f. ∝ cos θ, diode turn-on ≈ 0.65 V). Tests: `tests/unit/labs.test.mjs` (5) + `tests/e2e/labs.spec.js` (7 × desktop/mobile). Tutor approved (mains = 110/220 V); committed and pushed.
15. 4 Oct (VS Code) — Tutor: lab maths showed as plain monospace text. **All lab equations now typeset with KaTeX** using the same converter as the books: `tools/build-tex-browser.mjs` builds `assets/js/tex.js` (browser copy of `tools/tex.mjs`; `npm run build:tex`; a unit test fails if it is stale). `labs/lab.js` typesets every "Show the maths" step (bold answers kept), plus any equation in other lab text (simple boxes, quick checks, tasks, captions, readouts) as it appears. Lesson "In simple words"/"Quick recap" text and lab-card blurbs are typeset too. Sweep of all 40 lab pages after using every control: 284 distinct equations, 0 KaTeX errors; remaining plain text is word equations ("moment = force × distance") and labels. Fixed on the way: thermometer slider showed "°C" twice, pendulum "T = t ÷ 20 = t ÷ 20 = ?", I–V table header, "R = 0 ÷ 0" at 0 V, half-life powers, diverging-lens negative focal length, the word "Is" being turned into a subscript.

