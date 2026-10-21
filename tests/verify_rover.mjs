/* Rover (Biesse) CNC dasturi — tests/verify_rover.mjs
 * app/js/engine/post/rover.js sexning HAQIQIY .ncc/.tap fayllariga mosligi: grammatika (G0/G1, modal, CRLF), xavfsiz Z30, park, chuqurlik = qalinlik, o'tishlar (16→1, 26→3, 38→5),
 * har detal konturi = detal + asbob radiusi, hammasi list ichida; eksport tugmasi ZIP beradi. Sex fayllari (Smart3D_toplam_2026-10-16, maxfiy) bo'lmasa — shu qism o'tkazib yuboriladi.
 * Ishlatish: node tests/verify_rover.mjs */
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
const { checkProject } = await import('./giblab_check.mjs');
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


const nestVaraqlar = Object.entries(res.nest.by_material).flatMap(([mat, m]) => m.sheets.map(s => ({ mat, s })));
const { roverProgramlar, roverOtishlar } = await import('../app/js/engine/post/rover.js');
const SEX = ['', '../Smart3D/'].map(d => join(ROOT, d + 'Smart3D_toplam_2026-10-16/01_buyurtma_fayllari/03_cnc')).find(existsSync) || join(ROOT, 'Smart3D_toplam_2026-10-16/01_buyurtma_fayllari/03_cnc');
const NCC_RE = /^(G[01])?(X-?\d+\.\d{3})?(Y-?\d+\.\d{3})?(Z-?\d+\.\d{3})?(F\d+)?$/;

/* ── 1) o'tishlar qoidasi: sexdagi haqiqiy chuqurliklar ── */
console.log('\n[1] O\'tishlar (sex fayllaridagi chuqurliklar bilan)');
ok('16 mm — bitta o\'tish Z-16', JSON.stringify(roverOtishlar(16)) === '[16]');
ok('26 mm — 3 o\'tish (8,667 / 17,333 / 26) — 1070x600_oval_chap_orqa.ncc', JSON.stringify(roverOtishlar(26)) === '[8.667,17.333,26]');
ok('38 mm — 5 o\'tish (7,6 qadam) — Begzod_aka_5225_stalesh.ncc', JSON.stringify(roverOtishlar(38)) === '[7.6,15.2,22.8,30.4,38]');

/* ── 2) bizning dastur: tuzilma ── */
const nestOld = res.nest;
for (const uslub of ['ncc', 'tap']) {
  const pr = roverProgramlar(nestOld, res.cutlists, { uslub, toolDia: 6 });
  console.log('\n[2' + (uslub === 'ncc' ? 'a' : 'b') + '] ' + uslub.toUpperCase() + ' — ' + pr.length + ' dastur');
  ok(uslub + ': har list uchun bitta dastur (' + nestVaraqlarSoni() + ')', pr.length === nestVaraqlarSoni(), pr.length);
  ok(uslub + ': fayl nomi .' + uslub + ' bilan tugaydi, takrorlanmaydi', pr.every(p => p.nom.endsWith('.' + uslub)) && new Set(pr.map(p => p.nom)).size === pr.length);
  ok(uslub + ': qator oxiri CRLF (sexdagidek), LF yolg\'iz yo\'q', pr.every(p => p.matn.endsWith('\r\n') && !/[^\r]\n/.test(p.matn)));
  const barcha = pr.flatMap(p => p.matn.split('\r\n').filter(Boolean));
  const buzuq = barcha.filter(l => !(NCC_RE.test(l) || /^(T1M6|M30|G0Z[\d.]+|G0X[\d.]+Y[\d.]+S\d+M3|G0X[\d.]+Y[\d.]+(Z[\d.]+)?|G0X0Y0)$/.test(l) || /^G[01][XYZ][-\d.]+(Y[-\d.]+)?(Z[-\d.]+)?F[\d.]+$/.test(l)));
  ok(uslub + ': hamma qator sex fayllari grammatikasida (faqat G0/G1, izoh yo\'q)', !buzuq.length, buzuq.slice(0, 3).join(' | '));
  ok(uslub + ': yoy (G2/G3), M3/M5 sarlavha izohi va "%" yo\'q ' + (uslub === 'ncc' ? '(.ncc da M-kodlar umuman yo\'q)' : ''),
    !pr.some(p => /G[23]\b|%|\(|;/.test(p.matn)) && (uslub !== 'tap' || pr.every(p => /^T1M6\r\nG0Z50\.000\r\nG0X100\.000Y2800\.000S15000M3\r\n/.test(p.matn) && /G0X0Y0\r\nM30\r\n$/.test(p.matn))) && (uslub !== 'ncc' || !pr.some(p => /M\d/.test(p.matn))));
  ok(uslub + ': oxirida park X100 Y2800 Z50', pr.every(p => p.matn.includes('G0X100.000Y2800.000Z50.000')));
  ok(uslub + ': xavfsiz balandlik Z30; modal — G1 dan keyingi qatorlarda G/F yo\'q', pr.every(p => /G0X[\d.]+Y[\d.]+Z30\.000/.test(p.matn)) && pr.every(p => !/G1[XY][^\r]*\r\nG1[XY]/.test(p.matn)));
  /* chuqurlik = qalinlik; o'tishlar soni */
  let hammaChuqur = true, oSon = true;
  for (const p of pr) {
    const zlar = [...new Set((p.matn.match(/Z-[\d.]+/g) || []).map(z => -parseFloat(z.slice(1))))].sort((a, b) => a - b);
    const kut = roverOtishlar(p.qalinlik);
    if (JSON.stringify(zlar.map(x => Math.abs(x))) !== JSON.stringify(kut)) hammaChuqur = false;
    const plunge = (p.matn.match(/G1Z-/g) || []).length;
    if (plunge !== p.detal * kut.length) oSon = false;
  }
  ok(uslub + ': chuqurlik = plita qalinligi (HDF 3, LDSP/MDF 16) — o\'tishlar roverOtishlar bilan teng', hammaChuqur);
  ok(uslub + ': tushishlar soni = detallar × o\'tishlar', oSon);
  /* har detal konturi: bbox = detal + asbob radiusi (3 mm), Rover X = list eni, Y = uzunligi */
  let konturOk = true, sigdi = true, jami = 0;
  for (const p of pr) {
    const sheet = nestVaraqlar.find(v => v.mat === p.material && v.s.no === p.varaq).s;
    const satr = p.matn.split('\r\n'); let X = null, Y = null; const konturlar = []; let cur = null;
    for (const l of satr) {
      const gx = /X(-?[\d.]+)/.exec(l), gy = /Y(-?[\d.]+)/.exec(l), gz = /Z(-?[\d.]+)/.exec(l);
      if (/^G0X[\d.]+Y[\d.]+Z30\.000/.test(l)) { cur = { xs: [], ys: [] }; konturlar.push(cur); X = +gx[1]; Y = +gy[1]; cur.xs.push(X); cur.ys.push(Y); continue; }
      if (!cur) continue;
      if (/^G0Z30/.test(l) || /^G0X100/.test(l)) { cur = null; continue; }
      if (gx) { X = +gx[1]; cur.xs.push(X); } if (gy) { Y = +gy[1]; cur.ys.push(Y); }
    }
    jami += konturlar.length;
    for (const part of sheet.parts) {
      const len = part.rotated ? part.width : part.length, wid = part.rotated ? part.length : part.width;
      const kutBox = [part.y - 3, part.x - 3, part.y + wid + 3, part.x + len + 3];   // [Xmin, Ymin, Xmax, Ymax] Rover koordinatasida
      if (!konturlar.some(k => Math.abs(Math.min(...k.xs) - kutBox[0]) < .01 && Math.abs(Math.min(...k.ys) - kutBox[1]) < .01 && Math.abs(Math.max(...k.xs) - kutBox[2]) < .01 && Math.abs(Math.max(...k.ys) - kutBox[3]) < .01)) konturOk = false;
    }
    for (const k of konturlar) if (Math.min(...k.xs) < -3.01 || Math.min(...k.ys) < -3.01 || Math.max(...k.xs) > sheet.width + 3.01 || Math.max(...k.ys) > sheet.length + 3.01) sigdi = false;
  }
  ok(uslub + ': har detal konturi = detal ± asbob radiusi 3 mm (' + jami + ' kontur)', konturOk && jami === nestDetallarSoni());
  ok(uslub + ': hamma kontur list ichida (X ≤ eni, Y ≤ uzunligi)', sigdi);
}

/* ── 3) tap: to'liq dastur (T1M6 … M30), ish tezligi F6300, tushish F2520 ── */
console.log('\n[3] .tap tezliklari');
{
  const t0 = roverProgramlar(nestOld, res.cutlists, { uslub: 'tap' })[0].matn;
  ok('.tap: tushish F2520.0, ish F6300.0 (abrazes.tap dagidek)', /G1Z-\d+\.\d{3}F2520\.0\r\n/.test(t0) && /G1[XY][\d.]+(Y[\d.]+)?F6300\.0\r\n/.test(t0));
}

/* ── 4) eksport tugmalari ── */
console.log('\n[4] Eksport tugmalari (ZIP)');
{
  const chiq2 = new Map();
  setDownloadHandler((fn, content) => { chiq2.set(fn, content); });
  const c2 = { opt: undefined, sel: undefined, doc, H, res, name: 'Sinov', matCode: 'LDSP16', fasadCode: 'MDF16', sheet: null, nestCfg, toast: () => {}, logo: '', fail: (e) => { throw e; }, xatoK: (k, e) => { throw e; } };
  await eksport.rover(c2); await eksport.roverTap(c2);
  for (const [fn, ext] of [['Sinov-rover-ncc.zip', 'ncc'], ['Sinov-rover-tap.zip', 'tap']]) {
    const z = chiq2.get(fn); const b = z && z.arrayBuffer ? Buffer.from(await z.arrayBuffer()) : null;
    ok(fn + ': ZIP (PK), ichida ' + nestVaraqlarSoni() + ' ta .' + ext + ' fayl', !!b && b[0] === 0x50 && b[1] === 0x4b && (b.toString('latin1').match(new RegExp('\\.' + ext, 'g')) || []).length >= nestVaraqlarSoni());
  }
}

/* ── 5) haqiqiy sex fayllari bilan grammatika ── */
console.log('\n[5] Sex fayllari (haqiqiy)');
if (!existsSync(SEX)) skip('Smart3D_toplam_2026-10-16 yo\'q — .ncc/.tap solishtirish');
else {
  const nccLar = readdirSync(join(SEX, 'ncc')).filter(f => f.toLowerCase().endsWith('.ncc'));
  let bad = 0, crlf = 0, jami = 0;
  for (const f of nccLar) {
    const t0 = readFileSync(join(SEX, 'ncc', f), 'latin1'); jami++;
    if (t0.endsWith('\r\n') && !/[^\r]\n/.test(t0)) crlf++;
    if (t0.split('\r\n').filter(Boolean).some(l => !NCC_RE.test(l))) bad++;
  }
  ok('sexdagi ' + jami + ' ta .ncc: hammasi bitta grammatikada (G0/G1 + X/Y/Z/F) — bizning tekshiruvchi bilan', bad === 0, bad + ' ta fayl mos kelmadi');
  ok('sexdagi .ncc fayllarning hammasi CRLF', crlf === jami);
  const bizNcc = roverProgramlar(nestOld, res.cutlists, { uslub: 'ncc' }).flatMap(p => p.matn.split('\r\n').filter(Boolean));
  ok('bizning .ncc ham xuddi shu grammatikada', bizNcc.every(l => NCC_RE.test(l)));
  const tapLar = readdirSync(join(SEX, 'tap_rover')).filter(f => f.toLowerCase().endsWith('.tap'));
  ok('sexdagi .tap: T1M6 bilan boshlanadi, M30 bilan tugaydi, tushish F2520.0 / ish F6300.0', tapLar.every(f => { const t0 = readFileSync(join(SEX, 'tap_rover', f), 'latin1'); return t0.startsWith('T1M6\r\n') && /M30\r\n$/.test(t0); }));
}
function nestVaraqlarSoni() { return Object.values(res.nest.by_material).reduce((a, m) => a + m.sheets.length, 0); }
function nestDetallarSoni() { return Object.values(res.nest.by_material).reduce((a, m) => a + m.sheets.reduce((s, x) => s + x.parts.length, 0), 0); }
console.log('\n' + (fail ? '❌' : '✅') + ' verify_rover: ' + pass + ' o\'tdi, ' + fail + ' xato');
process.exit(fail ? 1 : 0);
