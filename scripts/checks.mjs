// Independent checks of the branch: head tags, JSON-LD, preview PNG, reduced motion, heading outline, portrait geometry.
// Usage: node checks.mjs <after-url> <before-url> <worktree>
import fs from 'node:fs';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const [url, beforeUrl, wt] = process.argv.slice(2);
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`); if (!ok) failures++; };
const browser = await chromium.launch({ channel: 'chrome' });

const page = await browser.newPage();
await page.goto(url);
const head = await page.evaluate(() => {
  const meta = (k) => document.querySelector(`meta[property="${k}"], meta[name="${k}"]`)?.content;
  return {
    lang: document.documentElement.lang,
    canonical: document.querySelector('link[rel=canonical]')?.href,
    og: Object.fromEntries(['og:type', 'og:url', 'og:title', 'og:description', 'og:image', 'og:image:width', 'og:image:height', 'og:image:alt', 'twitter:card'].map((k) => [k, meta(k)])),
    description: meta('description'),
    ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent),
    scripts: document.querySelectorAll('script:not([type="application/ld+json"])').length,
    headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => Number(h.tagName[1])),
    svg: { role: document.querySelector('svg')?.getAttribute('role'), label: document.querySelector('svg')?.getAttribute('aria-label') },
    hrefs: [...document.querySelectorAll('a')].map((a) => a.getAttribute('href')),
    labelsInLinks: document.querySelectorAll('a label').length,
    details: document.querySelectorAll('details > summary').length,
    checkboxes: document.querySelectorAll('input').length,
    external: [...document.querySelectorAll('link[href^="http"]:not([rel=canonical]), script[src], img[src^="http"]')].map((e) => e.href || e.src),
  };
});
check(head.lang === 'en', `lang=${head.lang}`);
check(head.canonical === 'https://orengerassi.com/', `canonical=${head.canonical}`);
const want = { 'og:type': 'website', 'og:url': 'https://orengerassi.com/', 'og:title': 'Oren Gerassi', 'og:image': 'https://orengerassi.com/preview.png', 'og:image:width': '1200', 'og:image:height': '630', 'og:image:alt': 'Line drawing of Oren Gerassi', 'twitter:card': 'summary_large_image' };
for (const [k, v] of Object.entries(want)) check(head.og[k] === v, `${k}=${head.og[k]}`);
check(head.og['og:description'] === head.description && !/\s\.$/.test(head.description), `og:description matches meta description: ${JSON.stringify(head.og['og:description'])}`);
check(head.scripts === 0, `no executable scripts (${head.scripts})`);
check(head.ld.length === 1, `one JSON-LD block (${head.ld.length})`);
const ld = head.ld.length ? JSON.parse(head.ld[0]) : {};
check(JSON.stringify(Object.keys(ld).sort()) === JSON.stringify(['@context', '@type', 'name', 'sameAs', 'url']), `JSON-LD keys ${Object.keys(ld)}`);
check(ld['@type'] === 'Person' && ld.name === 'Oren Gerassi' && ld.url === 'https://orengerassi.com/' && JSON.stringify(ld.sameAs) === '["https://borcho.com/"]', `JSON-LD values ${JSON.stringify(ld)}`);
check(head.headings[0] === 1 && head.headings.filter((h) => h === 1).length === 1 && head.headings.every((h, i) => i === 0 || h <= head.headings[i - 1] + 1), `heading outline ${head.headings.join('')}`);
check(head.svg.role === 'img' && head.svg.label === 'Line drawing of Oren Gerassi', `svg ${JSON.stringify(head.svg)}`);
check(head.hrefs.includes('mailto:oren.gerassi@gmail.com') && head.labelsInLinks === 0, `footer links ${JSON.stringify(head.hrefs)}`);
check(head.details === 3 && head.checkboxes === 0, `details=${head.details} inputs=${head.checkboxes}`);
check(head.external.length === 0, `no third-party requests in markup ${JSON.stringify(head.external)}`);
if (!fs.existsSync(`${wt}/preview.png`)) check(false, 'preview.png missing');
else {
  const png = PNG.sync.read(fs.readFileSync(`${wt}/preview.png`));
  check(png.width === 1200 && png.height === 630, `preview.png ${png.width}x${png.height}, ${fs.statSync(`${wt}/preview.png`).size} bytes`);
}
await page.close();

for (const reducedMotion of ['reduce', 'no-preference']) {
  const ctx = await browser.newContext({ reducedMotion });
  const p = await ctx.newPage();
  await p.goto(url);
  const onLoad = await p.evaluate(() => document.getAnimations().map((a) => a.animationName || a.transitionProperty));
  await p.getByText('What?', { exact: true }).click();
  await p.waitForTimeout(100);
  const onOpen = await p.evaluate(() => document.getAnimations().map((a) => a.animationName || a.transitionProperty));
  const midOpen = await p.evaluate(() => { const d = document.querySelectorAll('details')[1]; return d ? getComputedStyle(d, '::details-content').maxHeight : 'no details'; });
  const mid = parseFloat(midOpen);
  if (reducedMotion === 'reduce') check(onLoad.length === 0 && onOpen.length === 0 && mid === 15000, `reduced motion: animations on load ${JSON.stringify(onLoad)}, on open ${JSON.stringify(onOpen)}, ::details-content max-height 100ms after open ${midOpen}`);
  else check(onLoad.length > 0 && mid > 0 && mid < 15000, `full motion: on load ${JSON.stringify([...new Set(onLoad)])}, ::details-content max-height 100ms after open ${midOpen} (mid-slide)`);
  await ctx.close();
}

const geo = async (u) => {
  const p = await browser.newPage();
  await p.goto(u);
  const r = await p.evaluate(() => [...document.querySelectorAll('#external-squiggle g path')].map((e) => { const b = e.getBBox(); return [b.x, b.y, b.width, b.height, e.getTotalLength(), e.getAttribute('d').length]; }));
  await p.close();
  return r;
};
const [a, b] = [await geo(beforeUrl), await geo(url)];
const aLive = a;
check(aLive.length === b.length, `portrait path count ${aLive.length} -> ${b.length}`);
let maxBox = 0, maxLen = 0;
const edges = (x) => [x[0], x[1], x[0] + x[2], x[1] + x[3]];
aLive.forEach((x, i) => { const [ea, eb] = [edges(x), edges(b[i])]; for (let k = 0; k < 4; k++) maxBox = Math.max(maxBox, Math.abs(ea[k] - eb[k])); maxLen = Math.max(maxLen, Math.abs(x[4] - b[i][4]) / x[4]); });
const bytes = (r) => r.reduce((n, x) => n + x[5], 0);
console.log(`INFO portrait max bbox edge shift ${maxBox.toFixed(3)} viewBox units; max path length change ${(maxLen * 100).toFixed(3)}%; path data ${bytes(a)} -> ${bytes(b)} bytes (pixel diff is the pass criterion)`);

await browser.close();
console.log(failures ? `${failures} FAILED` : 'ALL PASS');
process.exit(failures ? 1 : 0);
