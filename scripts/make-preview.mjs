// Render the shipped portrait's final drawn frame, 560px tall and centred on #121212, to a 1200x630 palette PNG.
// Usage: node make-preview.mjs <index.html> <out.png>
import fs from 'node:fs';
import sharp from 'sharp';
import { launch } from './lib.mjs';
const [file, out] = process.argv.slice(2);
const svg = fs.readFileSync(file, 'utf8').match(/<svg id="external-squiggle"[\s\S]*?<\/svg>/)[0];
const css = fs.readFileSync(file, 'utf8').match(/#external-squiggle g path \{([^}]*)\}/)[1];
const H = 560, W = (H * 666) / 575;
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(`<style>html,body{margin:0;height:100%;background:#121212}body{display:grid;place-items:center}svg{width:${W}px;height:${H}px}#external-squiggle g path{${css}}</style>${svg}`);
const shot = await page.screenshot();
await browser.close();
await sharp(shot).png({ palette: true, colours: 16, effort: 10 }).toFile(out);
console.log(`${out} ${fs.statSync(out).size} bytes`);
