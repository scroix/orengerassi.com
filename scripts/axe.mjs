// Run axe-core against every width x state. Exits 1 on any serious or critical violation.
// Usage: node axe.mjs <url> <out.json>
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { launch, open, VIEWPORTS, STATES } from './lib.mjs';

const require = createRequire(import.meta.url);
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const [url, outFile] = process.argv.slice(2);
const browser = await launch();
const report = {};
let blocking = 0;
for (const vp of Object.keys(VIEWPORTS)) {
  for (const state of Object.keys(STATES)) {
    const { context, page } = await open(browser, url, vp, state);
    await page.addScriptTag({ content: axeSource });
    const res = await page.evaluate(() => window.axe.run(document, { resultTypes: ['violations'] }));
    const version = await page.evaluate(() => window.axe.version);
    report[`${vp}-${state}`] = res.violations;
    for (const v of res.violations) {
      if (v.impact === 'serious' || v.impact === 'critical') blocking++;
      const targets = v.nodes.map((n) => `${n.target.join(' ')}${n.any[0]?.data?.contrastRatio ? ` (${n.any[0].data.contrastRatio}:1 ${n.any[0].data.fgColor} on ${n.any[0].data.bgColor}, ${n.any[0].data.fontSize} ${n.any[0].data.fontWeight})` : ''}`);
      console.log(`${vp}-${state}\t${v.impact}\t${v.id}\t${targets.join(' | ')}`);
    }
    if (!res.violations.length) console.log(`${vp}-${state}\tclean (axe ${version})`);
    await context.close();
  }
}
fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
console.log(`serious+critical violations: ${blocking}`);
await browser.close();
process.exit(blocking ? 1 : 0);
