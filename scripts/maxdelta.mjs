// Max per-channel delta and the bounding box of changed pixels between two PNG dirs.
import fs from 'node:fs';
import { PNG } from 'pngjs';
const [a, b] = process.argv.slice(2);
for (const n of fs.readdirSync(a).filter((f) => f.endsWith('.png')).sort()) {
  const A = PNG.sync.read(fs.readFileSync(`${a}/${n}`)), B = PNG.sync.read(fs.readFileSync(`${b}/${n}`));
  let max = 0, cnt = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let i = 0; i < A.data.length; i += 4) {
    const d = Math.max(...[0, 1, 2].map((c) => Math.abs(A.data[i + c] - B.data[i + c])));
    if (d) { cnt++; max = Math.max(max, d); const p = i / 4, x = p % A.width, y = Math.floor(p / A.width); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  }
  console.log(`${n}\tchanged=${cnt}\tmax-channel-delta=${max}\tbox=${cnt ? `${x0},${y0}-${x1},${y1}` : '-'}`);
}
