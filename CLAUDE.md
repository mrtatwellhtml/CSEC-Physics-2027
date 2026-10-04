# CSEC Physics 2027 website — instructions for Claude

- **PLAN.md is the spec for this repo and overrides the parent folder's CLAUDE.md.** That file describes the older single-topic pages (IBM Plex, teal), not this site.
- Build phase by phase (PLAN.md §13). Stop after each phase, show the tutor, and wait for an OK.
- Keep **HANDOVER.md** up to date after every session: status line, phase tracker, open items and session log.
- `source/` is git-ignored on purpose (it contains tutor-only notes). Never commit it, and never edit it. Fixes go in `tools/overrides.json`.
- Equations: use KaTeX via `tools/tex.mjs` (PLAN.md §5.5). Run `npm test` before every commit.
- Labs, Maths help and Formula coach live in `labs/` (PLAN.md §16). New labs use the kit in `labs/lab.js` + `labs/lab.css` and must be added to `labs/registry.js`; `tests/unit/labs.test.mjs` checks every lab, support entry and coach link resolves.
- Plain-language support text is in `data/support.js` (authored, separate from the converted books). Keep `**bold**` balanced and avoid `^`/`~` (they are markup).

