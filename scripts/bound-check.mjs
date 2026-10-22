// D's gate bound: perceptual 0 on every shot, plus max channel delta and the pixels above delta 2.
// Usage: node bound-check.mjs <aDir> <bDir>
import fs from 'node:fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
const [a, b] = process.argv.slice(2);
let bad = false;
for (const name of fs.readdirSync(a).filter((f) => f.endsWith('.png')).sort()) {
  const A = PNG.sync.read(fs.readFileSync(`${a}/${name}`)), B = PNG.sync.read(fs.readFileSync(`${b}/${name}`));
  if (A.width !== B.width || A.height !== B.height) { console.log(`${name}\tSIZE MISMATCH`); bad = true; continue; }
  const perceptual = pixelmatch(A.data, B.data, null, A.width, A.height, { threshold: 0.1 });
  let exact = 0, max = 0, over2 = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < A.height; y++) for (let x = 0; x < A.width; x++) {
    const i = (y * A.width + x) * 4;
    const d = Math.max(...[0, 1, 2, 3].map((c) => Math.abs(A.data[i + c] - B.data[i + c])));
    if (!d) continue;
    exact++; max = Math.max(max, d);
    if (d > 2) { over2++; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  }
  if (perceptual) bad = true;
  console.log(`${name}\texact=${exact}\tperceptual=${perceptual}\tmax-delta=${max}\tpx-delta>2=${over2}${over2 ? ` bbox ${x0},${y0}-${x1},${y1}` : ''}`);
}
process.exit(bad ? 1 : 0);
