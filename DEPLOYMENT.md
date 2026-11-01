# Build and deployment

**Since 1 Nov 2026 the workbook is published in one place only: https://csec-physics-2027.web.app/study/**, inside the CSEC Physics 2027 hub (Firebase, project `mathlessons-7cc22`). Students' progress is saved per address, so one address means their progress lives in one place.

## Publishing a change

1. Change and test the workbook in this repo (`npm test`), then commit and push to `main`. GitHub Actions runs the same tests.
2. Publish the hub: in `..\..\CSEC Physics 2027`, double-click **Deploy.cmd**. Its build copies this repo's `index.html`, `teacher.html`, `config.js`, `assets/`, `data/`, `img/` and `labs/` into `/study` and adds the hub's look (fonts, `workbook-skin/`, "Hub" links). It stops if any file here has garbled characters, or if a link it changes has moved (`WORKBOOK_LINKS` in its `scripts/build.mjs`).

Nothing else ships: no source workbooks, test code or build tools.

## The old GitHub Pages address

https://mrtatwellhtml.github.io/CSEC-Physics-2027/ is retired. Pushes to `main` still run the tests, then publish only `moved/index.html` (as `index.html` and `404.html`, so every old link, including lab pages and `#/` routes, reaches it). That page:

- reads this workbook's saved progress at the old address (only `csec-phys-2027-v1`, `csec-phys-2027-labs` and this site's unsent Student Monitor records: other sites share the github.io origin);
- opens the new address with it in the fragment (`#carry=…`), which is never sent to a server, and the place the student was going (`&to=labs/….html` or a `#/` route);
- deletes nothing, so the old copy stays on the device as a backup.

At the new address, `assets/js/carry.js` (loaded first) accepts carried progress only when the student arrives from `https://mrtatwellhtml.github.io/`, rebuilds it as plain data with size limits, and merges it with anything already saved there: the better record of each lesson (finished, then more questions answered), every mistake and lab task, the higher XP, the newer streak. The same data carried twice changes nothing. `tests/e2e/move.spec.js` runs the whole move with both addresses faked, plus hostile data and links.

If a student's progress is ever too large for an address (about 1.9 MB), the moved page offers a progress file instead: **Teacher summary → Import progress** at the new address.

## Teacher submissions (optional)

By default, `config.js` has an empty endpoint and student data stays in that browser. To enable the teacher submission feature, follow [apps-script/README.md](./apps-script/README.md), paste the deployed `/exec` URL into `config.js`, push the change, and publish the hub. The URL is public, not an authentication secret. If no response spreadsheet and authorized teacher access are ready, leave the endpoint blank.

Do not store a Google password, API key, private workbook, student record or tutor-only answer key in this public repository. The `teacher.html` companion is unlinked and marked `noindex`, but that is not access control.
