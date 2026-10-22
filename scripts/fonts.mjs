// Report which font faces actually render glyphs, per computed family and weight, with every section open.
// Usage: node fonts.mjs <url>
import { launch, VIEWPORTS } from './lib.mjs';

const [url] = process.argv.slice(2);
const browser = await launch();
const page = await browser.newPage({ viewport: VIEWPORTS['1280'] });
await page.goto(url, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
for (const t of ['Who?', 'What?', 'Why?']) await page.getByText(t, { exact: true }).click();
await page.waitForTimeout(1500);
const cdp = await page.context().newCDPSession(page);
await cdp.send('DOM.enable');
await cdp.send('CSS.enable');
const { root } = await cdp.send('DOM.getDocument', { depth: -1, pierce: true });
const totals = new Map();
async function walk(node) {
  if (node.nodeType === 1) {
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId: node.nodeId });
    if (fonts.length) {
      const { computedStyle } = await cdp.send('CSS.getComputedStyleForNode', { nodeId: node.nodeId });
      const get = (n) => computedStyle.find((p) => p.name === n)?.value;
      for (const f of fonts) {
        const key = `${f.familyName} (${f.postScriptName}, custom=${f.isCustomFont}) <- css ${get('font-family')} weight ${get('font-weight')} style ${get('font-style')}`;
        totals.set(key, (totals.get(key) || 0) + f.glyphCount);
      }
    }
  }
  for (const c of node.children || []) await walk(c);
  if (node.contentDocument) await walk(node.contentDocument);
}
await walk(root);
for (const [k, v] of [...totals].sort((a, b) => b[1] - a[1])) console.log(String(v).padStart(6), k);
const faces = await page.evaluate(() => [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.style} ${f.status} ${f.unicodeRange}`));
console.log('\nFontFaceSet:\n' + faces.join('\n'));
await browser.close();
