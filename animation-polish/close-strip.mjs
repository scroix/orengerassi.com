// Frames of "Who?" closing at fixed animation times, with Chrome's animation clock slowed 20x, old site above new.
import sharp from 'sharp';
import { chromium } from 'playwright';
const [oldUrl, newUrl, out] = process.argv.slice(2);
const times = [0, 100, 200, 300, 450, 600, 750];
const RATE = 0.05;
const b = await chromium.launch({ channel: 'chrome' });
const rows = [];
for (const url of [oldUrl, newUrl]) {
  const p = await b.newPage({ viewport: { width: 1280, height: 1100 } });
  await p.goto(url);
  await p.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
  await p.evaluate(() => document.querySelector('summary').click());
  await p.waitForTimeout(1200);
  await p.mouse.move(5, 5);
  const box = await p.evaluate(() => { const r = document.querySelector('details').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  const clip = { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: box.height + 16 };
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Animation.enable');
  await cdp.send('Animation.setPlaybackRate', { playbackRate: RATE });
  const t0 = Date.now();
  await p.evaluate(() => document.querySelector('summary').click());
  const frames = [];
  for (const t of times) {
    const wait = t / RATE - (Date.now() - t0);
    if (wait > 0) await p.waitForTimeout(wait);
    frames.push(await sharp(await p.screenshot({ clip })).resize({ width: 300 }).png().toBuffer());
  }
  rows.push(frames);
  await p.close();
}
await b.close();
const meta = await sharp(rows[0][0]).metadata();
const W = meta.width, H = meta.height, gap = 12, label = 28;
const composites = [];
rows.forEach((frames, r) => frames.forEach((f, i) => composites.push({ input: f, left: i * (W + gap), top: label + r * (H + gap + label) })));
times.forEach((t, i) => [0, 1].forEach((r) => composites.push({ input: Buffer.from(`<svg width="${W}" height="${label}"><text x="2" y="20" font-family="Helvetica" font-size="16" fill="#bbb">${r ? 'new' : 'old'} ${t} ms</text></svg>`), left: i * (W + gap), top: r * (H + gap + label) })));
await sharp({ create: { width: times.length * (W + gap) - gap, height: 2 * (H + label) + gap, channels: 3, background: '#1e1e1e' } }).composite(composites).png().toFile(out);
console.log(out);
