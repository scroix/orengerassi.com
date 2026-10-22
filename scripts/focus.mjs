// Tab to each control and stack clipped screenshots of the focused control into one strip per width.
import fs from 'node:fs';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
const [url, out] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
for (const w of [1280, 390]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  await p.goto(url);
  await p.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
  const tiles = [];
  for (let i = 0; i < 5; i++) {
    await p.keyboard.press('Tab');
    const r = await p.evaluate(() => { const x = document.activeElement.getBoundingClientRect(); return { x: x.x, y: x.y + scrollY, width: x.width, height: x.height }; });
    await p.evaluate((y) => scrollTo(0, Math.max(0, y - 200)), r.y);
    const vr = await p.evaluate(() => { const x = document.activeElement.getBoundingClientRect(); return { x: x.x, y: x.y }; });
    tiles.push(PNG.sync.read(await p.screenshot({ clip: { x: Math.max(0, vr.x - 12), y: vr.y - 12, width: Math.min(w, r.width + 24), height: r.height + 24 } })));
  }
  const W = Math.max(...tiles.map((t) => t.width)), H = tiles.reduce((h, t) => h + t.height, 0);
  const img = new PNG({ width: W, height: H }); img.data.fill(0x12);
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;
  let y = 0;
  for (const t of tiles) { for (let r = 0; r < t.height; r++) t.data.copy(img.data, ((y + r) * W) * 4, r * t.width * 4, (r + 1) * t.width * 4); y += t.height; }
  fs.writeFileSync(`${out}/focus-${w}.png`, PNG.sync.write(img));
  await p.close();
}
await b.close();
