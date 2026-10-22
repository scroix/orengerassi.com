// Phone emulation: tap Who? open, tap it closed, then read the button's fill. A filled closed button looks open.
import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto(process.argv[2]);
await p.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
const s = p.locator('summary', { hasText: 'Who?' });
await s.tap(); await p.waitForTimeout(1500);
await s.tap(); await p.waitForTimeout(1500);
console.log(await s.evaluate((e) => `after tap-open then tap-close: open=${e.parentElement.open} background=${getComputedStyle(e).backgroundColor} hover=${e.matches(':hover')}`));
await b.close();
