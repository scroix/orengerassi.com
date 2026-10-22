// Pixel-diff every PNG in <a> against the same name in <b>. Exits 1 on any difference.
// Usage: node diff.mjs <a> <b> <outdir>
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const [a, b, outdir] = process.argv.slice(2);
fs.mkdirSync(outdir, { recursive: true });
const names = fs.readdirSync(a).filter((f) => f.endsWith('.png')).sort();
if (!names.length) { console.log('INCONCLUSIVE: no PNGs in', a); process.exit(2); }
let failed = false;
for (const name of names) {
  if (!fs.existsSync(path.join(b, name))) { console.log(`${name}\tMISSING in ${b}`); failed = true; continue; }
  const A = PNG.sync.read(fs.readFileSync(path.join(a, name)));
  const B = PNG.sync.read(fs.readFileSync(path.join(b, name)));
  if (A.width !== B.width || A.height !== B.height) {
    console.log(`${name}\tSIZE ${A.width}x${A.height} vs ${B.width}x${B.height}`); failed = true; continue;
  }
  const out = new PNG({ width: A.width, height: A.height });
  const exact = pixelmatch(A.data, B.data, out.data, A.width, A.height, { threshold: 0, includeAA: true });
  const perceptual = pixelmatch(A.data, B.data, null, A.width, A.height, { threshold: 0.1 });
  if (exact) fs.writeFileSync(path.join(outdir, name), PNG.sync.write(out));
  console.log(`${name}\t${A.width}x${A.height}\texact-diff-px=${exact}\tperceptual-diff-px=${perceptual}`);
  if (exact) failed = true;
}
process.exit(failed ? 1 : 0);
