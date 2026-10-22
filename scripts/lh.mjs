// Run Lighthouse N times per form factor, print every run and the median, keep the median run's reports.
// Usage: node lh.mjs <url> <outdir> [runs=5]
import fs from 'node:fs';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';

const [url, outdir, runsArg] = process.argv.slice(2);
const runs = Number(runsArg || 5);
const cats = ['performance', 'accessibility', 'best-practices', 'seo'];
fs.mkdirSync(outdir, { recursive: true });
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

for (const [ff, config] of [['mobile', undefined], ['desktop', desktopConfig]]) {
  const results = [];
  for (let i = 0; i < runs; i++) {
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new'] });
    const r = await lighthouse(url, { port: chrome.port, output: ['json', 'html'], onlyCategories: cats }, config);
    await chrome.kill();
    const scores = Object.fromEntries(cats.map((c) => [c, Math.round(r.lhr.categories[c].score * 100)]));
    const a = r.lhr.audits;
    results.push({ scores, report: r.report, lcp: a['largest-contentful-paint'].numericValue, fcp: a['first-contentful-paint'].numericValue, bytes: a['total-byte-weight'].numericValue });
    console.log(`${ff} run ${i + 1}: ${JSON.stringify(scores)} FCP=${Math.round(results.at(-1).fcp)}ms LCP=${Math.round(results.at(-1).lcp)}ms bytes=${results.at(-1).bytes}`);
  }
  const perfMedian = median(results.map((x) => x.scores.performance));
  const pick = results.find((x) => x.scores.performance === perfMedian);
  fs.writeFileSync(`${outdir}/lighthouse-${ff}.json`, pick.report[0]);
  fs.writeFileSync(`${outdir}/lighthouse-${ff}.html`, pick.report[1]);
  const med = Object.fromEntries(cats.map((c) => [c, median(results.map((x) => x.scores[c]))]));
  const spread = (k) => `${Math.round(Math.min(...results.map((x) => x[k])))}-${Math.round(Math.max(...results.map((x) => x[k])))}`;
  console.log(`${ff} MEDIAN ${JSON.stringify(med)} FCP ${spread('fcp')}ms LCP ${spread('lcp')}ms (n=${runs})`);
}
