// Full-page screenshots of every width x state.
// Usage: node shoot.mjs <url> <outdir> [--reduced]
import fs from 'node:fs';
import { launch, open, VIEWPORTS, STATES } from './lib.mjs';

const [url, outdir] = process.argv.slice(2);
const reducedMotion = process.argv.includes('--reduced') ? 'reduce' : 'no-preference';
fs.mkdirSync(outdir, { recursive: true });
const browser = await launch();
for (const vp of Object.keys(VIEWPORTS)) {
  for (const state of Object.keys(STATES)) {
    const { context, page } = await open(browser, url, vp, state, { reducedMotion });
    const file = `${outdir}/${vp}-${state}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(file);
    await context.close();
  }
}
await browser.close();
