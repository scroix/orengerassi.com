// Round the portrait's path data to one decimal with svgo convertPathData and write only the d values into the page.
// svgo is lossy, so each run starts from the original path data in the base commit. That keeps the script idempotent
// and keeps the error at a single rounding step (largest measured bbox edge shift: 0.141 viewBox units).
// Usage: node round-paths.mjs [index.html]   (run from inside the worktree)
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { optimize } from 'svgo';

const BASE = 'e975ea9';
const ZERO_AREA = 'M171.2 114.21c.54.54.54.54 0 0z';
const file = process.argv[2] || 'index.html';
const SVG = /<svg id="external-squiggle"[\s\S]*?<\/svg>/;
const D = /(\sd=")([^"]*)(")/g;

const original = execFileSync('git', ['show', `${BASE}:index.html`], { encoding: 'utf8', maxBuffer: 1 << 26 }).match(SVG)[0];
const roundedSvg = optimize(original, {
  multipass: false,
  plugins: [{ name: 'convertPathData', params: { floatPrecision: 1 } }],
}).data;
const sourceD = [...original.matchAll(D)].map((m) => m[2]);
const roundedD = [...roundedSvg.matchAll(D)].map((m) => m[2]);
if (sourceD.length !== roundedD.length) throw new Error(`svgo changed the path count: ${sourceD.length} -> ${roundedD.length}`);
if (sourceD[0] !== ZERO_AREA) throw new Error('expected the zero-area path first in the base commit');
const wanted = roundedD.slice(1);

const html = fs.readFileSync(file, 'utf8');
const svg = html.match(SVG)?.[0];
if (!svg) throw new Error('portrait svg not found');
const current = [...svg.matchAll(D)].length;
if (current !== wanted.length) throw new Error(`page has ${current} paths, base commit has ${wanted.length} after dropping the zero-area one`);

let i = 0;
const out = html.replace(svg, () => svg.replace(D, (_, a, _d, c) => a + wanted[i++] + c));
fs.writeFileSync(file, out);
const bytes = (xs) => xs.reduce((n, d) => n + d.length, 0);
console.log(`${wanted.length} paths, d bytes ${bytes(sourceD.slice(1))} -> ${bytes(wanted)}${out === html ? ' (page unchanged)' : ''}`);
