# Build and deployment

The student workbook is a static site. Its GitHub Pages artifact contains only `index.html`, `teacher.html`, `config.js`, `assets/`, `data/`, `img/` and `labs/` (the interactive labs, Maths help and Formula coach); it excludes source workbooks, test code and build tools.

## First-time GitHub Pages setup

The workflow attempts to initialize GitHub Pages with **GitHub Actions** as its source. Push to `main`, or run **Actions → Build and deploy workbook → Run workflow** on `main`. The `quality` job installs Chromium, runs the unit and desktop/mobile browser tests, checks JavaScript syntax and deploys the static site. The Pages URL appears in the completed workflow and under **Settings → Pages**.

If repository or organization permissions prevent automatic initialization, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**, then rerun the workflow.

Later pushes to `main` automatically test and deploy the site. Pull requests do not deploy. The workflow checks out only committed files; the tutor-only `source/` directory is ignored and is not required to serve the generated student data.

## Teacher submissions (optional)

By default, `config.js` has an empty endpoint and student data stays in that browser. To enable the teacher submission feature, follow [apps-script/README.md](./apps-script/README.md), paste the deployed `/exec` URL into `config.js`, and push the change. The URL is public, not an authentication secret. If no response spreadsheet and authorized teacher access are ready, leave the endpoint blank.

Do not store a Google password, API key, private workbook, student record or tutor-only answer key in this public repository. The `teacher.html` companion is unlinked and marked `noindex`, but that is not access control.
