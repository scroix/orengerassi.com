// Entrance: opacity and rise of header, article, footer over time; press scale and hover timing on the Who? button.
import { chromium, webkit, firefox } from 'playwright';
const [url] = process.argv.slice(2);
for (const [name, launch] of Object.entries({ chrome: () => chromium.launch({ channel: 'chrome' }), webkit: () => webkit.launch(), firefox: () => firefox.launch() })) {
  const b = await launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto(url, { waitUntil: 'commit' });
  const series = await p.evaluate(() => new Promise((res) => {
    const els = ['header', 'article', 'footer'].map((s) => document.querySelector(s)), out = [], t0 = performance.now(), marks = [0, 100, 200, 300, 500, 800, 1100, 1400];
    requestAnimationFrame(function f() {
      const t = performance.now() - t0;
      if (t >= marks[out.length]) out.push(`${marks[out.length]}ms ` + els.map((e) => { const c = getComputedStyle(e); return `${(+c.opacity).toFixed(2)}/${c.translate === 'none' ? '0' : c.translate.split(' ')[1] || c.translate}`; }).join(' '));
      out.length < marks.length ? requestAnimationFrame(f) : res(out);
    });
  }));
  console.log(`${name} entrance (opacity/rise for header article footer):\n  ` + series.join('\n  '));
  await p.waitForTimeout(3500);
  const s = p.locator('summary', { hasText: 'Who?' });
  const box = await s.boundingBox();
  await p.mouse.move(box.x + 20, box.y + 20); await p.mouse.down(); await p.waitForTimeout(200);
  const pressed = await s.evaluate((e) => getComputedStyle(e).scale);
  await p.mouse.up(); await p.waitForTimeout(400);
  await p.mouse.move(5, 5); await p.waitForTimeout(60);
  const out60 = await s.evaluate((e) => getComputedStyle(e).backgroundColor);
  await p.waitForTimeout(300);
  const out360 = await s.evaluate((e) => getComputedStyle(e).backgroundColor);
  console.log(`  press scale ${pressed}; after click the section is ${await s.evaluate((e) => e.parentElement.open ? 'open' : 'closed')}; open fill after leaving: +60ms ${out60}, +360ms ${out360}`);
  await b.close();
}
