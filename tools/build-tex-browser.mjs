// Builds assets/js/tex.js — a browser copy of tools/tex.mjs (window.TEX) for text that is written
// at runtime: the labs, Maths help, Formula coach and data/support.js. The converter itself is not
// changed; tests/unit/labs.test.mjs fails if this file is out of date. Run: npm run build:tex
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
export function buildTexBrowser() {
  const src = fs.readFileSync(path.join(root, 'tools', 'tex.mjs'), 'utf8').replace(/\r\n/g, '\n');
  const body = src.replace(/^export /gm, '');
  return '/* GENERATED from tools/tex.mjs by tools/build-tex-browser.mjs. Do not edit; run npm run build:tex. */\n' +
    '(function () {\n\'use strict\';\n' + body +
    '\nwindow.TEX = { markMath: markMath, formulaToTeX: formulaToTeX, unitToTeX: unitToTeX, OPEN: OPEN, CLOSE: CLOSE };\n})();\n';
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  fs.writeFileSync(path.join(root, 'assets', 'js', 'tex.js'), buildTexBrowser());
  console.log('wrote assets/js/tex.js');
}
