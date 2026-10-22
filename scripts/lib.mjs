import { chromium } from 'playwright';

export const VIEWPORTS = {
  '1280': { width: 1280, height: 800 },
  '390': { width: 390, height: 844 },
};
export const STATES = { collapsed: null, who: 'Who?', what: 'What?', why: 'Why?' };

export async function launch() {
  return chromium.launch({ channel: 'chrome' });
}

// Load the page in a given state and settle every animation and transition to its end.
export async function open(browser, url, vp, state, { reducedMotion = 'no-preference' } = {}) {
  const context = await browser.newContext({ viewport: VIEWPORTS[vp], deviceScaleFactor: 1, reducedMotion });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  if (STATES[state]) {
    await page.getByText(STATES[state], { exact: true }).click();
    await page.mouse.move(0, 0);
  }
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  return { context, page };
}
