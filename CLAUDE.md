# CSEC Physics 2027 website — instructions for Claude

- **PLAN.md is the spec for this repo and overrides the parent folder's CLAUDE.md.** That file describes the older single-topic pages (IBM Plex, teal), not this site.
- Build phase by phase (PLAN.md §13). Stop after each phase, show the tutor, and wait for an OK.
- Keep **HANDOVER.md** up to date after every session: status line, phase tracker, open items and session log.
- `source/` is git-ignored on purpose (it contains tutor-only notes). Never commit it, and never edit it. Fixes go in `tools/overrides.json`.
- Equations: use KaTeX via `tools/tex.mjs` (PLAN.md §5.5). Run `npm test` before every commit.
