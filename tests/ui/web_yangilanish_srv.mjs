/* Yangilanish testi uchun: web build papkalaridan statik beradi (/__ctl?v=B — papkani almashtiradi), /api — haqiqiy serverga. */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const [,, port, apiPort, ...dirs] = process.argv;
const V = Object.fromEntries(dirs.map(d => d.split('='))); let cur = Object.keys(V)[0];
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/__ctl') { cur = u.searchParams.get('v'); res.end(cur); return; }
  if (u.pathname.startsWith('/api')) {
    const p = http.request({ host: '127.0.0.1', port: apiPort, path: req.url, method: req.method, headers: req.headers }, r => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
    p.on('error', () => { res.statusCode = 502; res.end(); }); req.pipe(p); return;
  }
  let f = path.join(V[cur], decodeURIComponent(u.pathname === '/' ? '/index.html' : u.pathname));
  if (!f.startsWith(V[cur]) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; res.end('yo\'q'); return; }
  res.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' });
  fs.createReadStream(f).pipe(res);
}).listen(+port, '127.0.0.1');
