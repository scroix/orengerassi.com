// Page weight with every section open: each response's transfer and decoded size, plus totals.
// Usage: node weight.mjs <url>
import { launch, VIEWPORTS } from './lib.mjs';

const [url] = process.argv.slice(2);
const browser = await launch();
const page = await browser.newPage({ viewport: VIEWPORTS['1280'] });
const cdp = await page.context().newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
const reqs = new Map();
cdp.on('Network.responseReceived', (e) => reqs.set(e.requestId, { url: e.response.url, type: e.type }));
cdp.on('Network.dataReceived', (e) => { const r = reqs.get(e.requestId); if (r) r.decoded = (r.decoded || 0) + e.dataLength; });
cdp.on('Network.loadingFinished', (e) => { const r = reqs.get(e.requestId); if (r) r.transfer = e.encodedDataLength; });
await page.goto(url, { waitUntil: 'networkidle' });
for (const t of ['Who?', 'What?', 'Why?']) await page.getByText(t, { exact: true }).click();
await page.waitForTimeout(2000);
let transfer = 0, decoded = 0;
const hosts = new Set();
for (const r of reqs.values()) {
  transfer += r.transfer || 0; decoded += r.decoded || 0; hosts.add(new URL(r.url).host);
  console.log(`${String(r.transfer).padStart(7)} ${String(r.decoded).padStart(7)} ${r.type.padEnd(10)} ${r.url.slice(0, 110)}`);
}
console.log(`TOTAL requests=${reqs.size} transfer=${transfer} decoded=${decoded} hosts=${[...hosts].join(',')}`);
await browser.close();
