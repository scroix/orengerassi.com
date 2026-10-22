// Compare the portrait's resting (final drawn) frame between the base commit and the working tree.
// Usage: node final-frame.mjs <index.html> <outdir>   (run inside the worktree; old = BASE commit)
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { launch } from './lib.mjs';

const BASE = 'e975ea9';
const [file, outdir] = process.argv.slice(2);
fs.mkdirSync(outdir, { recursive: true });
const SVG = /<svg id="external-squiggle"[\s\S]*?<\/svg>/;
const oldSvg = execFileSync('git', ['show', `${BASE}:index.html`], { encoding: 'utf8', maxBuffer: 1 << 26 }).match(SVG)[0];
const newSvg = fs.readFileSync(file, 'utf8').match(SVG)[0];
const css = '#external-squiggle g path{fill-opacity:1;stroke-width:1.2;stroke-dasharray:800;stroke-dashoffset:0}';
const CASES = [[300, 1], [300, 2], [300, 3], [666, 2]];
const CELL = 40, MARGIN = 20;
const BUCKETS = [[0, 0], [1, 8], [9, 32], [33, 64], [65, 128], [129, 255]];

const browser = await launch();
const render = async (svg, w, dpr) => {
  const h = Math.ceil((w * 575) / 666);
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  await page.setContent(`<style>body{margin:0;background:#121212}svg{display:block;width:${w}px;height:auto}${css}</style>${svg}`);
  const png = PNG.sync.read(await page.screenshot());
  await page.close();
  return png;
};

for (const [w, dpr] of CASES) {
  const A = await render(oldSvg, w, dpr), B = await render(newSvg, w, dpr);
  const { width: W, height: H } = A;
  const exact = pixelmatch(A.data, B.data, null, W, H, { threshold: 0, includeAA: true });
  const perceptual = pixelmatch(A.data, B.data, null, W, H, { threshold: 0.1 });
  const hist = BUCKETS.map(() => 0);
  const cell = CELL * dpr, cells = new Map();
  const perceptMask = new PNG({ width: W, height: H });
  pixelmatch(A.data, B.data, perceptMask.data, W, H, { threshold: 0.1, diffMask: true });
  let maxDelta = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const d = Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]), Math.abs(A.data[i + 2] - B.data[i + 2]));
    maxDelta = Math.max(maxDelta, d);
    hist[BUCKETS.findIndex(([lo, hi]) => d >= lo && d <= hi)]++;
    if (perceptMask.data[i + 3]) { const k = `${Math.floor(x / cell)},${Math.floor(y / cell)}`; cells.set(k, (cells.get(k) || 0) + 1); }
  }
  const tag = `${w}px@${dpr}x`;
  console.log(`${tag}\t${W}x${H}\texact=${exact}\tperceptual=${perceptual}\tmax channel delta=${maxDelta}`);
  console.log(`  delta histogram (max channel delta: pixels): ${BUCKETS.map(([lo, hi], i) => `${lo === hi ? lo : `${lo}-${hi}`}:${hist[i]}`).join('  ')}`);
  if (!cells.size) { console.log('  no perceptual cells'); continue; }
  const [worst, count] = [...cells].sort((p, q) => q[1] - p[1])[0];
  const [cx, cy] = worst.split(',').map(Number);
  const x0 = Math.max(0, cx * cell - MARGIN * dpr), y0 = Math.max(0, cy * cell - MARGIN * dpr);
  const size = Math.min((CELL + 2 * MARGIN) * dpr, W - x0, H - y0);
  const zoom = Math.max(2, Math.round(480 / size));
  const gap = 10, pw = size * zoom;
  const crop = new PNG({ width: pw * 3 + gap * 2, height: pw });
  for (let y = 0; y < pw; y++) for (let x = 0; x < crop.width; x++) {
    const panel = Math.floor(x / (pw + gap)), px = x - panel * (pw + gap), j = (y * crop.width + x) * 4;
    if (px >= pw) { crop.data.set([60, 60, 60, 255], j); continue; }
    const sx = x0 + Math.floor(px / zoom), sy = y0 + Math.floor(y / zoom), k = (sy * W + sx) * 4;
    if (panel < 2) { crop.data.set((panel === 0 ? A : B).data.subarray(k, k + 4), j); continue; }
    const d = Math.max(Math.abs(A.data[k] - B.data[k]), Math.abs(A.data[k + 1] - B.data[k + 1]), Math.abs(A.data[k + 2] - B.data[k + 2]));
    crop.data.set([Math.min(255, d * 4), 0, 0, 255], j);
  }
  const out = `${outdir}/worst-${tag}.png`;
  fs.writeFileSync(out, PNG.sync.write(crop));
  console.log(`  worst ${CELL}px cell (${cx},${cy}) has ${count} perceptual px; crop device px (${x0},${y0}) ${size}x${size} zoom ${zoom}x -> ${out}  [panels: old | new | delta x4]`);
}
await browser.close();
