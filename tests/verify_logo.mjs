/* Bittada logosi hujjatlarda (qoidalar 6.3 / S4): fayl, xlsx (media+drawing, zip), hisobot HTML manbasi, photo-render. */
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { buildXLSX } from '../app/js/engine/xlsxexport.js';
import { loadLogo, logoBytes } from '../app/js/engine/logo.js';
let fail = 0;
const ok = (n, c) => { if (!c) { fail++; console.log('XATO:', n); } };
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));

const png = fs.readFileSync(root + 'app/data/rasm/logo-bittada.png');
ok('PNG imzosi', png.subarray(0, 8).toString('hex') === '89504e470d0a1a0a');
ok('500x500', png.readUInt32BE(16) === 500 && png.readUInt32BE(20) === 500);
await loadLogo();
ok('loadLogo baytlari', logoBytes() && logoBytes().length === png.length);

const x = buildXLSX({ logo: logoBytes(), priceRes: { lines: [], total: 0 }, prod: { lines: [], total: 0 } });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'logo-'));
const f = path.join(tmp, 'a.xlsx'); fs.writeFileSync(f, x);
let list = '';
try { list = execFileSync('unzip', ['-l', f]).toString(); execFileSync('unzip', ['-tq', f]); } catch (e) { ok('zip yaroqli', false); }
ok('xl/media/logo-bittada.png', /xl\/media\/logo-bittada\.png/.test(list));
ok('drawing1.xml', /xl\/drawings\/drawing1\.xml/.test(list));
try {
  const get = (n) => execFileSync('unzip', ['-p', f, n]).toString();
  ok('sheet <drawing>', /<drawing r:id="rId1"\/>/.test(get('xl/worksheets/sheet1.xml')));
  ok('content-types', /drawing\+xml/.test(get('\\[Content_Types\\].xml')) && /Extension="png"/.test(get('\\[Content_Types\\].xml')));
  const m = execFileSync('unzip', ['-p', f, 'xl/media/logo-bittada.png']);
  ok('media = logo', Buffer.compare(m, png) === 0);
} catch (e) { ok('xlsx ichi: ' + e.message, false); }
const y = buildXLSX({ priceRes: { lines: [], total: 0 }, prod: { lines: [], total: 0 } });   // logosiz — jim o'tadi
ok('logosiz xlsx', y.byteLength > 1000 && !/drawing1/.test(new TextDecoder().decode(y)));
fs.rmSync(tmp, { recursive: true, force: true });

const src = (p) => fs.readFileSync(root + p, 'utf8');
ok('hisobot (web) <img> logo', /class="bt" src="\$\{logoDataUrl\(\)\}"/.test(src('web/src/services/eksport.js')) && /pgLogo/.test(src('web/src/services/eksport.js')));
ok('hisobot (app) <img> logo', /logoDataUrl\(\)/.test(src('app/js/app.js')) && /pgLogo/.test(src('app/js/app.js')));
ok('photo-render drawImage logo', (src('app/js/engine/photo-render.js').match(/drawImage\(logo/g) || []).length === 2);

console.log(fail ? '❌ verify_logo: ' + fail + ' xato' : '✅ verify_logo: logo fayli, xlsx (media+drawing), hisobot, foto/panorama — OK');
process.exit(fail ? 1 : 0);
