// Static server that gzips text responses the way GitHub Pages does.
// Usage: node serve.mjs <root> <port>
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const [root, port] = process.argv.slice(2);
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/vnd.microsoft.icon',
  '.woff2': 'font/woff2', '.txt': 'text/plain', '.json': 'application/json',
};
const compressible = new Set(['.html', '.css', '.js', '.svg', '.txt', '.json', '.ico']);

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(root, p);
  if (!file.startsWith(path.resolve(root)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('not found'); return;
  }
  const ext = path.extname(file);
  let body = fs.readFileSync(file);
  const headers = { 'content-type': types[ext] || 'application/octet-stream', 'cache-control': 'max-age=600' };
  if (compressible.has(ext) && /gzip/.test(req.headers['accept-encoding'] || '')) {
    body = zlib.gzipSync(body, { level: 6 });
    headers['content-encoding'] = 'gzip';
  }
  headers['content-length'] = body.length;
  res.writeHead(200, headers);
  res.end(body);
}).listen(Number(port), () => console.log(`serving ${root} on http://localhost:${port}/`));
