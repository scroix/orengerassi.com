// Click a section open, then closed, sampling the details element's height every frame. Reports when motion starts and ends.
import { chromium, webkit, firefox } from 'playwright';
const [url, section = 'Who?'] = process.argv.slice(2);
const engines = { chrome: () => chromium.launch({ channel: 'chrome' }), webkit: () => webkit.launch(), firefox: () => firefox.launch() };
const sample = (label) => new Promise((res) => {
  const d = [...document.querySelectorAll('summary')].find((s) => s.textContent === label).parentElement;
  const sum = d.querySelector('summary'), out = [[-1, Math.round(d.getBoundingClientRect().height), Math.round(sum.getBoundingClientRect().height)]];
  const t0 = performance.now();
  sum.click();
  requestAnimationFrame(function f() { out.push([Math.round(performance.now() - t0), Math.round(d.getBoundingClientRect().height), Math.round(sum.getBoundingClientRect().height)]); performance.now() - t0 < 1100 ? requestAnimationFrame(f) : res(out); });
});
const summarize = (s) => {
  const h0 = s[0][1], h1 = s.at(-1)[1], dir = Math.sign(h1 - h0);
  const moved = s.find(([, h]) => (h - h0) * dir >= 2);
  const done = s.find(([, h]) => Math.abs(h - h1) <= 1);
  const btn = [...new Set(s.map((x) => x[2]))].join('/');
  return `${h0}px to ${h1}px, first visible move ${moved ? moved[0] : '-'}ms, settled ${done ? done[0] : '-'}ms, button heights ${btn}px`;
};
for (const [name, launch] of Object.entries(engines)) {
  const b = await launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(url);
  await p.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
  const open = await p.evaluate(sample, section);
  await p.waitForTimeout(300);
  const close = await p.evaluate(sample, section);
  console.log(`${name.padEnd(7)} ${section} open: ${summarize(open)} | close: ${summarize(close)}`);
  await b.close();
}
