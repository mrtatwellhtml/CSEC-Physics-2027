# HANDOVER — CSEC Physics Ultimate Workbook (1-to-1 student, January 2027)

*Live document — update after every build session.* Last updated: 3 Oct 2026. **Status: ALL 17 BOOKS BUILT & SAVED. Website: Phase 0 (Setup) done + KaTeX equation pipeline added (tutor request) — waiting for tutor OK before Phase 1 (Converter).**

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
- Word .docx; separate tutor key; Navy/Steel/Teal, Calibri/Cambria, US Letter.
- Past papers: copyrighted → ORIGINAL CSEC-style questions + a Past Paper Log for real questions from his booklet.

## Website
- **Repo (local):** `D:\School Work (Pictures)\2026-2027 Mathematics\Fifth Form Physics\CSEC-Physics-2027\` (git, branch `main`, no remote yet). Kept in its own subfolder so it doesn't mix with the older single-topic pages (vectors.html etc.) in `Fifth Form Physics\`.
- **Plan:** `PLAN.md` in the repo root (copy of `CSEC_Physics_Website_PLAN.md`). Build phase by phase and stop after each one for the tutor's OK.
- Decisions: new GitHub Pages repo (e.g. mrtatwellhtml/CSEC-Physics-2027); copy layout + design tokens of the tutor's Foundation site (mrtatwellhtml.github.io/Lower-School-Mathematics-2029/foundation — vanilla JS SPA, window.WB data, WBD/WBC helpers, hash router, localStorage, Apps Script endpoint in config.js); **syllabus order A→E** then exam prep; **submissions ON** via Google Apps Script with name gate.
- **Equations: KaTeX (tutor request, 3 Oct).** `tools/tex.mjs` turns the books' ^sup^/~sub~/Unicode maths into TeX: whole formulas (formula boxes/cards), symbol side of "where" lines, and equation spans detected inside sentences (stored as `⟪tex⟫`). KaTeX 0.16 self-hosted in `assets/vendor/katex/` (76 KB gz JS, woff2 fonts), lazy-loaded only on pages with maths. Audit: 281 formulas + ~3,600 inline equations across all 17 books, **0 KaTeX failures**, no words lost. PLAN.md §3/§5.5/§13/§14 amended.
- Approach: converter `tools/convert.mjs` turns each content.json into site data (unit = lesson with Warm-up/Learn/Try/Practice/Exit; plus Book check + Past-paper lessons per book). Auto-check MCQ / numeric / short text; everything else self-marked by mark points split on "(1)". Mocks in timed exam mode. Tutor-only content kept out of student pages (separate teacher.html). 9 phases, review after each.

### Website phase tracker
| Phase | Status | Notes |
|---|---|---|
| 0 Setup | ✅ Done 3 Oct | Repo, folders, `source/` extracted, npm, Playwright (Chromium), `npm run convert` (inventory only), `npm test` (2 unit + 1 e2e, green) |
| ↳ KaTeX pipeline | ✅ Done 3 Oct | `tools/tex.mjs`, `tools/tex-audit.mjs` → `tools/katex-preview.html`, `tests/unit/tex.test.mjs` (7 tests). Renderer hook (`WBD.md()` → `katex.render`) lands in Phase 3 |
| 1 Converter | ⏳ Next | Will call tex.mjs on every string |
| 2 Shell + design | — | |
| 3 Lesson renderer | — | |
| 4 Questions | — | |
| 5 Exam content | — | |
| 6 Exam mode | — | |
| 7 Extras | — | |
| 8 Submissions | — | |
| 9 QA + deploy | — | |

### Website commands (run in the repo folder)
- `npm run convert`: content.json → site data (Phase 0: prints an inventory of all 17 books)
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
- Confirm Paper 032 applicability and which sections class covers before January (decides the two "gap topic" sessions).
- Website: decide whether `source/` (16 MB, includes tutor_notes / session plans) is committed or git-ignored. **If the GitHub repo is public, committing it publishes the tutor-only content.** Currently git-ignored (not committed) until decided.
- Website: create the GitHub repo + remote (the `gh` CLI is not installed on this PC, so create it on github.com, or install `gh`).
- Deploy Apps Script and paste /exec URL into config.js (Phase 8).

## Session log
1. 1 Oct — action plan; engine; Week 1 pilot; weeks 2–6; re-sequenced D-first → Electrostatics book.
2. 2 Oct — weeks 7–10 (S2, S3); final wave dispatched.
3. 3 Oct — S4, S5, Mock1, FinalPrep, P01Drill (verified), Mock2 built & saved; source backup saved; action plan doc updated to D-first schedule. Website build plan written after inspecting the Foundation site.
4. 3 Oct (VS Code) — Website **Phase 0 Setup** done: repo `CSEC-Physics-2027/` created, PLAN.md copied in, source extracted (17 books, 240 PNGs; totals match the table above), npm + Playwright installed, inventory converter + smoke tests green. Committed.
5. 3 Oct (VS Code) — Tutor asked for proper equation rendering with KaTeX. Built `tools/tex.mjs` (markup → TeX: units upright, variables italic, fractions/roots/nuclides, bold answers, mark-scheme (1) kept outside maths), audit page + 7 unit tests (all equations in all 17 books render), KaTeX self-hosted, PLAN.md amended (§5.5). Committed.
