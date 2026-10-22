// Tab through the page and list each focused element, whether it is visible, and whether Enter opens a section.
import { chromium } from 'playwright';
const [url] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto(url);
const seen = [];
for (let i = 0; i < 8; i++) {
  await p.keyboard.press('Tab');
  const f = await p.evaluate(() => {
    const e = document.activeElement;
    if (!e || e === document.body) return null;
    const r = e.getBoundingClientRect();
    return `${e.tagName.toLowerCase()} "${e.textContent.trim().slice(0, 30)}" ${r.width * r.height > 0 && e.checkVisibility({ contentVisibilityAuto: true, opacityProperty: false }) && !e.closest('[style*="max-height: 0"]') ? 'visible' : 'HIDDEN'} ${r.height}px`;
  });
  if (!f || seen.includes(f)) break;
  seen.push(f);
}
console.log(seen.join('\n'));
await p.focus('summary').catch(() => {});
const opened = await p.evaluate(() => !!document.querySelector('summary'));
if (opened) { await p.keyboard.press('Enter'); console.log('Enter on first summary -> open =', await p.evaluate(() => document.querySelector('details').open)); }
await b.close();
