/* web/src ichida obyekt literalida takroriy kalit yo'q (masalan style={{ padding: '16px', …, padding: '20px' }}): vite build "Duplicate key" ogohlantirishi
 * chiqarmaydi va oxirgi qiymat yutadi degan taxmin kod ichida yashirin qolmaydi. esbuild (web/node_modules) yo'q bo'lsa — o'tkaziladi.
 * Ishlatish: node tests/verify_stil_kalit.mjs */
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = fileURLToPath(new URL('../web/', import.meta.url));
let esbuild;
try { esbuild = createRequire(WEB + 'package.json')('esbuild'); } catch (_) { console.log('esbuild yo\'q (web/ da npm install) — o\'tkazildi'); process.exit(0); }
const yomon = []; let fayl = 0;
(function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    if (!/\.(jsx|js)$/.test(n)) continue;
    fayl++;
    const r = esbuild.transformSync(readFileSync(p, 'utf8'), { loader: n.endsWith('.jsx') ? 'jsx' : 'js', sourcefile: p, logLevel: 'silent' });
    for (const w of r.warnings) if (/Duplicate key/.test(w.text)) yomon.push(p.replace(WEB, '') + ':' + w.location.line + ' ' + w.text);
  }
})(join(WEB, 'src'));
if (yomon.length) { console.log('✗ takroriy kalit: ' + yomon.length + ' ta\n  ' + yomon.slice(0, 10).join('\n  ')); process.exit(1); }
console.log('=== HAMMASI OK (' + fayl + ' fayl, takroriy kalit yo\'q) ===');
