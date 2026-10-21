/* Namuna fayllar to'plami: barcha eksport formatlarini BIR namuna loyihadan chiqaradi (haqiqiy eksport kodi, UI tugmalari bilan bir xil).
 * Maqsad — har faylni o'z dasturida (SketchUp, Bazis, GibLab, Rover, Excel, AutoCAD…) ochib ko'rish.
 * Ishlatish: node scripts/format_namuna.mjs <chiqish-papka>   (papka yo'q bo'lsa — yaratiladi) */
import { mkdirSync as _mk, writeFileSync as _wf } from 'node:fs';
import { register, createRequire } from 'node:module';
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };
const skip = (name) => console.log('  · o\'tkazib yuborildi:', name);
const info = (s) => console.log('  ·', s);

/* ── node'da veb-modullarni yuklash: "three"/"pako" web/node_modules dan, *.json — kalitsiz import ── */
process.env.S3D_WEB = join(ROOT, 'web');
register('data:text/javascript,' + encodeURIComponent(`
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
export async function resolve(spec, ctx, next) {
  try { return await next(spec, ctx); }
  catch (e) {
    if (/^[a-z@]/i.test(spec) && !spec.startsWith('node:') && e.code === 'ERR_MODULE_NOT_FOUND')
      return next(spec, { ...ctx, parentURL: pathToFileURL(process.env.S3D_WEB + '/src/x.js').href });
    throw e;
  }
}
export async function load(url, ctx, next) {
  if (url.endsWith('.json') && !(ctx.importAttributes && ctx.importAttributes.type))
    return { format: 'module', shortCircuit: true, source: 'export default ' + readFileSync(new URL(url), 'utf8') };
  return next(url, ctx);
}`), import.meta.url);

const require = createRequire(import.meta.url);
globalThis.SpPrice = require('../app/js/engine/price.js');
const { loadData, createHisob } = await import('../web/src/services/hisob.js');
const C = await import('../app/js/engine/chizish.js');
const { eksport } = await import('../web/src/services/eksport.js');
const { setDownloadHandler } = await import('../app/js/engine/objexport.js');
const { loadLogo } = await import('../app/js/engine/logo.js');
const { stanokModeli } = await import('../app/js/engine/post/smart3d.js');
const { projectOqi } = await import('../app/js/engine/post/project.js');
const { kdtOqi } = await import('../app/js/engine/post/kdt.js');
const { cp1251 } = await import('../app/js/engine/post/xml.js');
const { s3n } = await import('../web/src/shared/design3d/engine.js');
const { project } = await import('../web/src/store/project.js');
const { set: setStore } = await import('../web/src/store/index.js');
await loadLogo();

/* ── yordamchilar ── */
const PY = (() => { try { execFileSync('python3', ['-I', '-c', '1'], { stdio: 'ignore' }); return true; } catch (_) { return false; } })();
const pyHas = (mod) => { try { execFileSync('python3', ['-c', 'import ' + mod], { stdio: 'ignore' }); return true; } catch (_) { return false; } };
const EZDXF = PY && pyHas('ezdxf'), OPENPYXL = PY && pyHas('openpyxl');
const TMP = mkdtempSync(join(tmpdir(), 'eksport-mazmun-'));
process.on('exit', () => { try { rmSync(TMP, { recursive: true, force: true }); } catch (_) { /* yo'q */ } });
/** python kodi (fayl yo'li argv[1] da) → stdout JSON. ezdxf/openpyxl foydalanuvchi sayti paketlarida — -I siz (ular -I bilan ko'rinmaydi) */
function py(code, fayl, ext = '') {
  const f = join(TMP, 'fayl-' + Math.random().toString(36).slice(2) + ext); writeFileSync(f, fayl);
  return JSON.parse(execFileSync('python3', ['-W', 'ignore', '-c', code, f], { encoding: 'utf8', maxBuffer: 1 << 26 }));
}

const DATA = join(ROOT, 'app/data/');
const H = createHisob(await loadData(n => Promise.resolve(JSON.parse(readFileSync(DATA + n, 'utf8')))));
const ch = C.yangiChizma('pastki');
H.catalog['CH-MZ'] = C.chizmaKatalog(ch, 'CH-MZ', 'pastki');
const F = (k) => H.catalog[k];
const doc = { v: 1, room: { outline: [[0, 0], [4000, 0], [4000, 3000], [0, 3000]], wall_height: 2700, wall_thickness: 100, openings: [] },
  placements: [
    { id: 1, frg: 'MC-KP-02', x: 0, y: 0, z: 100, w: 600, d: 450, h: 708, rot: 0 },
    { id: 2, frg: 'MC-KP-10', x: 1500, y: 0, z: 100, w: F('MC-KP-10').w, d: F('MC-KP-10').d, h: F('MC-KP-10').h, rot: 90 },
    { id: 3, frg: 'MC-KU-07', x: 0, y: 150, z: 1450, w: F('MC-KU-07').w, d: F('MC-KU-07').d, h: F('MC-KU-07').h, rot: 0 },
    { id: 4, frg: 'CH-MZ', x: 2000, y: 0, z: 0, w: ch.w, d: ch.d, h: ch.h, rot: 0 },
    { id: 5, frg: 'SP-K-001', x: 2800, y: 0, z: 0, w: F('SP-K-001').w, d: F('SP-K-001').d, h: F('SP-K-001').h, rot: 0 }] };
const nestCfg = Object.assign({}, H.nestDefaults); delete nestCfg._meta;
const res = H.recalc(doc, { materialCode: 'LDSP16', fasadCode: 'MDF16', nestCfg });
const NS = res.nest.summary, PR = res.priceRes;
const panelSoni = res.cutlists.reduce((a, cl) => a + cl.parts.reduce((s, p) => s + (+p.qty || 1), 0), 0);


const OUT = process.argv[2] || join(ROOT, 'format-namuna');
_mk(OUT, { recursive: true });
const yozildi = [];
setDownloadHandler(async (fn, content) => {
  let b;
  if (content && typeof content.arrayBuffer === 'function') b = Buffer.from(await content.arrayBuffer());
  else if (content instanceof Uint8Array) b = Buffer.from(content);
  else b = Buffer.from(String(content), 'utf8');
  _wf(join(OUT, fn), b); yozildi.push([fn, b.length]);
});
const c = { opt: undefined, sel: undefined, doc, H, res, name: 'Namuna-oshxona', matCode: 'LDSP16', fasadCode: 'MDF16', sheet: null, nestCfg,
  toast: () => {}, logo: '', fail: (e) => { throw e; }, xatoK: (k, e) => { throw e; } };
globalThis.window = { open: () => { const d = { html: '' }; oynalar2.push(d); return { document: { write: (h) => { d.html += h; }, close() {} } }; } };
const oynalar2 = [];
for (const k of ['excel', 'cutlist', 'smetaCsv', 'loyiha', 'objButun', 'objRangButun', 'skpButun', 'daeButun', 'glb', 'teshiklar', 'giblab', 'giblabBazis', 'kdt', 'xnc', 'dxf', 'gcode', 'rover', 'roverTap', 'ptp', 'nc', 'kesimReja', 'bpj', 'b3d', 'hisobot']) {
  try { await eksport[k](c); } catch (e) { console.log('  ✗', k, String(e.message).split('\n')[0]); }
}
if (oynalar2[0]) { _wf(join(OUT, 'Namuna-oshxona-hisobot.html'), oynalar2[0].html); yozildi.push(['Namuna-oshxona-hisobot.html', oynalar2[0].html.length]); }
await new Promise(r => setTimeout(r, 1500));
console.log(yozildi.map(([n, b]) => '  ' + n.padEnd(46) + String(Math.round(b / 1024)).padStart(6) + ' KB').join('\n'));
console.log('\n' + yozildi.length + ' fayl → ' + OUT);
process.exit(0);
