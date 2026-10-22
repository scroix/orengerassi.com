// Bytes for the first view: load the page, open nothing, wait for the network to settle.
import { chromium } from 'playwright';
const [url] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
const cdp = await p.context().newCDPSession(p);
await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
const rows = new Map();
cdp.on('Network.responseReceived', (e) => rows.set(e.requestId, { url: e.response.url }));
cdp.on('Network.loadingFinished', (e) => { const r = rows.get(e.requestId); if (r) r.transfer = e.encodedDataLength; });
await p.goto(url, { waitUntil: 'networkidle' });
let t = 0; for (const r of rows.values()) { t += r.transfer || 0; console.log(String(r.transfer).padStart(7), r.url.slice(0, 100)); }
console.log(`TOTAL requests=${rows.size} transfer=${t}`);
await b.close();
