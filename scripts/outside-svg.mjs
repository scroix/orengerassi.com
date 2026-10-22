// Count differing pixels (exact, includeAA) outside the portrait svg's bounding box, per shot. Exits 1 if any are outside.
// Usage: node outside-svg.mjs <aDir> <bDir> <url-of-b>
import fs from 'node:fs';
import { PNG } from 'pngjs';
import { launch, open, VIEWPORTS, STATES } from './lib.mjs';

const [a, b, url] = process.argv.slice(2);
const browser = await launch();
let outsideTotal = 0;
for (const vp of Object.keys(VIEWPORTS)) {
  for (const state of Object.keys(STATES)) {
    const name = `${vp}-${state}.png`;
    const { context, page } = await open(browser, url, vp, state);
    const r = await page.evaluate(() => { const q = document.querySelector('svg').getBoundingClientRect(); return { x: q.left + scrollX, y: q.top + scrollY, w: q.width, h: q.height }; });
    await context.close();
    const A = PNG.sync.read(fs.readFileSync(`${a}/${name}`)), B = PNG.sync.read(fs.readFileSync(`${b}/${name}`));
    const x0 = Math.floor(r.x), y0 = Math.floor(r.y), x1 = Math.ceil(r.x + r.w), y1 = Math.ceil(r.y + r.h);
    let inside = 0, outside = 0;
    for (let y = 0; y < A.height; y++) for (let x = 0; x < A.width; x++) {
      const i = (y * A.width + x) * 4;
      if (A.data[i] === B.data[i] && A.data[i + 1] === B.data[i + 1] && A.data[i + 2] === B.data[i + 2] && A.data[i + 3] === B.data[i + 3]) continue;
      if (x >= x0 && x < x1 && y >= y0 && y < y1) inside++; else outside++;
    }
    outsideTotal += outside;
    console.log(`${name}\tsvg box x${x0}-${x1} y${y0}-${y1} (${x1 - x0}x${y1 - y0})\tdiff inside=${inside} outside=${outside}`);
  }
}
console.log(`outside total: ${outsideTotal}`);
await browser.close();
process.exit(outsideTotal ? 1 : 0);
