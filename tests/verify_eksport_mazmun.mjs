/* "Fayllar" bo'limi — .skp dan keyingi fayllarning MAZMUNI (nomi/kengaytmasi emas): tests/ui/web_eksport_format.mjs faqat nomni tekshiradi.
 * Haqiqiy eksport funksiyalari (web/src/services/eksport.js) node'da chaqiriladi, yuklash ushlab olinadi, fayl baytlari tekshiriladi.
 *   DXF            — o'z tahlilchimiz + (bo'lsa) python ezdxf: readfile, audit, $INSUNITS=4, qatlamlar, detal/teshik soni, teshik detal ichida
 *   G-code / NC    — tuzilma (%, G21, G90, M30; Excellon M48/METRIC/T-kodlar), teshiklar konturlar bilan BIR XIL koordinata tizimida,
 *                    NC teshik soni = DXF = G-code = kesim ro'yxati hisobi; PTP/XNC — jadval (CSV) ustunlari qiymatlarga mos
 *   GibLab .project, KDT, Bazis .project — tuzilma (sexdagi GibLab fayli bo'lsa — atribut to'plami), kodlash, detal/teshik soni
 *   Teshiklar JSON — sxema, mm, koordinata detal ichida;  BPJ — UTF-8 JSON, panel soni;  .b3d — yoziladi va o'qiladi
 *   .dae           — XML (python ElementTree), COLLADA 1.4.1, birlik/o'q, har modul detal soni va o'lchami .skp dagi bilan bir xil
 *   GLB            — glTF 2.0 tuzilma, metr, aksessorlar chegarada;  Excel — haqiqiy xlsx (openpyxl), jami = narx paneli, logo, ustama #222
 *   CSV / Hisobot  — BOM, ustunlar, summalar bir xil;  Loyiha fayli — eksport → ochish aylanishi (narx va detallar bir xil)
 * Sex fayllari (Smart3D_toplam_2026-10-16, maxfiy) bo'lmasa — tegishli qism o'tkazib yuboriladi; python/ezdxf/openpyxl yo'q bo'lsa — SKIP.
 * Ishlatish: node tests/verify_eksport_mazmun.mjs */
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

/* eksport kontekst — editor (files/actions.js ctx) bilan bir xil maydonlar; yuklash ushlanadi */
const chiq = new Map(), toasts = [];
setDownloadHandler((fn, content, mime) => { chiq.set(fn.replace(/^Sinov_loyiha/, 'X'), { content, mime }); });
const c = { opt: undefined, sel: undefined, doc, H, res, name: 'Sinov loyiha', matCode: 'LDSP16', fasadCode: 'MDF16', sheet: null, nestCfg,
  toast: (m) => toasts.push(m), logo: '', fail: (e) => { throw e; }, xatoK: (k, e) => { throw e; } };
const oynalar = [];
globalThis.window = { open: () => { const d = { html: '' }; oynalar.push(d); return { document: { write: (h) => { d.html += h; }, close() {} } }; } };
for (const k of ['hisobot', 'glb', 'excel', 'cutlist', 'smetaCsv', 'teshiklar', 'giblab', 'xnc', 'dxf', 'gcode', 'ptp', 'nc', 'kesimReja', 'giblabBazis', 'kdt', 'bpj', 'b3d', 'skp', 'dae']) {
  try { await eksport[k](c); } catch (e) { ok('eksport.' + k + ' xatosiz ishladi', false, e.stack.split('\n').slice(0, 3).join(' | ')); }
}
delete globalThis.window;
const baytlar = async (nom) => {
  const f = chiq.get(nom); if (!f) return null;
  const x = f.content;
  if (x && typeof x.arrayBuffer === 'function') return Buffer.from(await x.arrayBuffer());
  if (x instanceof Uint8Array) return Buffer.from(x);
  return Buffer.from(String(x), 'utf8');
};
const matn = async (nom) => { const b = await baytlar(nom); return b ? b.toString('utf8') : null; };
const BOM = (b) => b && b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF;
const utf8Toza = (b) => { try { new TextDecoder('utf-8', { fatal: true }).decode(b); return true; } catch (_) { return false; } };
const hammasi = [...chiq.keys()];
ok(`barcha tugmalar fayl berdi (${hammasi.length} ta)`, ['X-raskroy.dxf', 'X-kesim.nc', 'X-ptp.csv', 'X-teshik.nc', 'X-xnc.csv', 'X.project', 'X-bazis.project', 'X-kdt.zip', 'X.bpj', 'X.b3d', 'X.dae', 'X.skp',
  'X-model.glb', 'X-smeta.xlsx', 'smart3d-cutlist.csv', 'smart3d-smeta.csv', 'smart3d-holes.json'].every(n => chiq.has(n)), hammasi.join(','));

/* kesim ro'yxatidan mustaqil hisob */
const nestVaraqlar = Object.entries(res.nest.by_material).flatMap(([mat, m]) => m.sheets.map(s => ({ mat, s })));
const nestDetallar = nestVaraqlar.flatMap(({ s }) => s.parts);
/** NC/DXF/G-code teshik soni: kesim ro'yxatidagi yuza teshiklari (torets 'T' va moyka kesimi chiqmaydi); ref'siz yozuv — barcha nusxalarga (nusxa) */
const kutilganTeshik = (() => {
  let n = 0;
  for (const cl of res.cutlists) for (const h of cl.holes || []) {
    if (h.kind === 'cutout' || h.side === 'T' || !(h.dia > 0)) continue;
    const q = Math.max(1, Math.round(+h.qty || 1));
    if (h.ref) n += q; else n += q * nestDetallar.filter(p => p.ref.startsWith(cl.placementId + ':' + h.part + '#')).length;
  }
  return n;
})();

/* ══ 1) DXF ══ */
console.log('\n[1] DXF — raskroy (' + nestVaraqlar.length + ' varaq, ' + nestDetallar.length + ' detal)');
const dxfMatn = await matn('X-raskroy.dxf');
const dxfJuft = (() => { const q = dxfMatn.split(/\r?\n/); const o = []; for (let i = 0; i + 1 < q.length; i += 2) o.push([q[i].trim(), q[i + 1]]); return o; })();
const dxfEnt = []; { let cur = null, bolim = null;
  for (const [k, v] of dxfJuft) {
    if (k === '0' && v === 'SECTION') bolim = '?'; else if (k === '2' && bolim === '?') bolim = v; else if (k === '0' && (v === 'ENDSEC' || v === 'EOF')) { bolim = null; cur = null; }
    if (bolim === 'ENTITIES' && k === '0' && v !== 'SECTION') { cur = { t: v, d: {} }; dxfEnt.push(cur); } else if (cur && bolim === 'ENTITIES') cur.d[k] = v;
  } }
const dxfSon = (t, q) => dxfEnt.filter(e => e.t === t && e.d['8'] === q).length;
ok('DXF: bo\'limlar HEADER, TABLES, ENTITIES, EOF ($INSUNITS=4 mm, $ACADVER)', /SECTION\r?\n2\r?\nHEADER/.test(dxfMatn) && /\$INSUNITS\r?\n70\r?\n4\r?\n/.test(dxfMatn) && /\$ACADVER\r?\n1\r?\nAC1009/.test(dxfMatn)
  && /SECTION\r?\n2\r?\nTABLES/.test(dxfMatn) && /0\r?\nEOF\r?\n$/.test(dxfMatn));
ok(`DXF: detal konturlari ${dxfSon('LINE', 'PART') / 4} ta = kesim ro'yxatidagi detal (${panelSoni}) = nesting (${nestDetallar.length})`, dxfSon('LINE', 'PART') === panelSoni * 4 && nestDetallar.length === panelSoni && NS.placed_count === NS.panel_count);
ok(`DXF: varaq chegarasi ${dxfSon('LINE', 'SHEET') / 4} ta = varaqlar (${nestVaraqlar.length})`, dxfSon('LINE', 'SHEET') === nestVaraqlar.length * 4);
const dxfQat = new Set(dxfEnt.map(e => e.d['8']));
ok(`DXF: ishlatilgan qatlamlar (${[...dxfQat].join(', ')}) TABLES da e'lon qilingan`, [...dxfQat].every(q => new RegExp('LAYER\\r?\\n2\\r?\\n' + q + '\\r?\\n').test(dxfMatn)));
const dxfTeshik = dxfEnt.filter(e => e.t === 'CIRCLE');
ok(`DXF: teshik doiralari ${dxfTeshik.length} = kesim ro'yxatidan hisob (${kutilganTeshik}), diametrlar mm: ${[...new Set(dxfTeshik.map(e => +e.d['40'] * 2))].sort((a, b) => a - b).join('/')}`, dxfTeshik.length === kutilganTeshik && dxfTeshik.every(e => +e.d['40'] * 2 >= 2 && +e.d['40'] * 2 <= 40));
{ /* har teshik o'z detali ichida (Y-yuqoriga) */
  const to = []; const lines = dxfEnt.filter(e => e.t === 'LINE' && e.d['8'] === 'PART');
  for (let i = 0; i < lines.length; i += 4) { const xs = lines.slice(i, i + 4).flatMap(l => [+l.d['10'], +l.d['11']]), ys = lines.slice(i, i + 4).flatMap(l => [+l.d['20'], +l.d['21']]); to.push([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]); }
  const tashqari = dxfTeshik.filter(e => !to.some(r => +e.d['10'] >= r[0] - 0.01 && +e.d['10'] <= r[2] + 0.01 && +e.d['20'] >= r[1] - 0.01 && +e.d['20'] <= r[3] + 0.01));
  ok('DXF: har teshik markazi o\'z detali konturi ichida', tashqari.length === 0, tashqari.length + ' ta tashqarida');
  const birinchi = nestVaraqlar[0].s;
  ok('DXF: 1-varaq o\'lchami mm (uzunlik × eni)', dxfEnt.some(e => e.t === 'LINE' && e.d['8'] === 'SHEET' && +e.d['11'] === birinchi.length && +e.d['21'] === 0));
}
if (EZDXF) {
  const r = py(`import sys,json,ezdxf,collections
doc=ezdxf.readfile(sys.argv[1]); au=doc.audit()
ms=doc.modelspace()
print(json.dumps({'ver':doc.dxfversion,'errors':len(au.errors),'units':doc.header.get('$INSUNITS'),'layers':[l.dxf.name for l in doc.layers],'ents':dict(collections.Counter(e.dxftype()+'/'+e.dxf.layer for e in ms))}))`, dxfMatn);
  ok(`DXF (ezdxf ${r.ver}): readfile + audit — xato ${r.errors}, birlik INSUNITS=${r.units} (4 = mm), qatlamlar ${r.layers.filter(l => l.length > 1 && l !== 'Defpoints').join(',')}`, r.errors === 0 && r.units === 4 && ['SHEET', 'PART', 'HOLES'].every(l => r.layers.includes(l)));
  ok('DXF (ezdxf): LINE/PART va CIRCLE/HOLES soni o\'z tahlilimiz bilan teng', r.ents['LINE/PART'] === panelSoni * 4 && r.ents['CIRCLE/HOLES'] === kutilganTeshik);
} else skip('DXF: ezdxf (python) yo\'q');

/* ══ 2) G-code, NC (Excellon), PTP, XNC ══ */
console.log('\n[2] G-code / NC / PTP / XNC');
const gc = (await matn('X-kesim.nc')).split(/\r?\n/);
ok('G-code: % ... % orasida, G21 (mm), G90 (absolyut), T01 M06, S.. M03, M30 oxirida', gc[0] === '%' && gc.filter(l => l).pop() === '%' && gc.some(l => /^G21;/.test(l)) && gc.some(l => /^G90;/.test(l))
  && gc.some(l => /^T01 M06;/.test(l)) && gc.some(l => /^S\d+ M03;/.test(l)) && gc.some(l => /^M30;/.test(l)) && !gc.some(l => /NaN|undefined|Infinity/.test(l)));
{
  const varaq = []; let joriy = null, rejim = null;
  for (const l of gc) {
    const m0 = /^;=== VARAQ (\d+) \((\w+)\) (\d+)x(\d+)/.exec(l);
    if (m0) { joriy = { no: +m0[1], mat: m0[2], L: +m0[3], W: +m0[4], teshik: [], kontur: [] }; varaq.push(joriy); rejim = null; }
    else if (/BOSQICH 1/.test(l)) rejim = 'h'; else if (/BOSQICH 2a/.test(l)) rejim = 'c2'; else if (/BOSQICH 2:/.test(l)) rejim = 'k';
    else if (/^;--- Detal/.test(l) && joriy) joriy.kontur.push([]);
    const m = /^G[01] X([\d.-]+) Y([\d.-]+)/.exec(l);
    if (m && joriy) { const xy = [+m[1], +m[2]]; if (rejim === 'h' && l.startsWith('G0 ')) joriy.teshik.push(xy); else if (rejim === 'k' && joriy.kontur.length) joriy.kontur[joriy.kontur.length - 1].push(xy); }
  }
  ok(`G-code: ${varaq.length} varaq, ${varaq.reduce((a, v) => a + v.kontur.length, 0)} kontur = detallar (${panelSoni})`, varaq.length === nestVaraqlar.length && varaq.reduce((a, v) => a + v.kontur.length, 0) === panelSoni);
  ok(`G-code: teshik burg'ulash ${varaq.reduce((a, v) => a + v.teshik.length, 0)} = kutilgan (${kutilganTeshik})`, varaq.reduce((a, v) => a + v.teshik.length, 0) === kutilganTeshik);
  const kt = varaq.map(v => v.kontur.map(k => [Math.min(...k.map(p => p[0])), Math.min(...k.map(p => p[1])), Math.max(...k.map(p => p[0])), Math.max(...k.map(p => p[1]))]));
  const tashqari = varaq.reduce((a, v, i) => a + v.teshik.filter(h => !kt[i].some(r => h[0] >= r[0] && h[0] <= r[2] && h[1] >= r[1] && h[1] <= r[3])).length, 0);
  ok('G-code: har teshik o\'z detali konturi ichida (teshik va kontur bir xil Y-yo\'nalishda; oldin ko\'zguda edi)', tashqari === 0, tashqari + ' ta teshik konturdan tashqarida');
  const chegara = varaq.every((v, i) => kt[i].every(r => r[0] >= 0 && r[1] >= 0 && r[2] <= v.L && r[3] <= v.W));
  ok('G-code: barcha kontur varaq chegarasi ichida (mm)', chegara);
}
const nc = (await matn('X-teshik.nc')).split(/\r?\n/);
const ncBosh = nc.indexOf('%');
ok('NC (Excellon): M48 birinchi, METRIC, asboblar T01C.., sarlavha % bilan tugaydi, M30 oxirida', nc[0] === 'M48' && nc.includes('METRIC,TZ') && ncBosh > 0 && nc.slice(0, ncBosh).some(l => /^T01C\d+\.\d+$/.test(l)) && nc.filter(l => l).pop() === 'M30');
{
  const asbob = Object.fromEntries(nc.slice(0, ncBosh).filter(l => /^T\d+C/.test(l)).map(l => [l.slice(0, 3), +l.slice(4)]));
  const koord = nc.slice(ncBosh).filter(l => /^X[\d.-]+Y[\d.-]+/.test(l));
  ok(`NC: teshiklar ${koord.length} = DXF doiralari (${dxfTeshik.length}) = kesim ro'yxatidan (${kutilganTeshik}); asboblar ${Object.values(asbob).join('/')} mm`, koord.length === dxfTeshik.length && koord.length === kutilganTeshik);
  const dxfD = new Set(dxfTeshik.map(e => +e.d['40'] * 2)); ok('NC: asbob diametrlari = DXF teshik diametrlari', Object.values(asbob).length === dxfD.size && Object.values(asbob).every(d => dxfD.has(d)));
  const dastlab = nc.slice(ncBosh).filter(l => /^T\d\d$/.test(l)).every(l => l === 'T00' || asbob[l]);
  ok('NC: ishlatilgan har T-kod sarlavhada e\'lon qilingan', dastlab);
  const xy = koord.map(l => /X([\d.-]+)Y([\d.-]+)/.exec(l).slice(1).map(Number));
  ok('NC: koordinatalar varaq ichida (mm, X ≤ uzunlik, Y ≤ eni)', xy.every(([x, y]) => x >= 0 && y >= 0 && x <= 2900 && y <= 2100));
}
const ptp = (await baytlar('X-ptp.csv')), ptpQ = ptp.toString('utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
const ptpS = ptpQ[0].split(';');
ok('PTP: UTF-8 BOM, ustun sarlavhalari (Boy=uzunlik, Eni=kenglik, Material)', BOM(ptp) && ptpS.join() === 'Varaq,Material,Detal,Ref,X(mm),Y(mm),Boy,Eni,Aylangan,Teshik,Material (detal)');
{
  const q = ptpQ.slice(1).map(l => l.split(';'));
  const ref = Object.fromEntries(nestDetallar.map(p => [p.ref, p]));
  ok(`PTP: ${q.length} qator = detallar; har qatorda ${ptpS.length} ustun`, q.length === panelSoni && q.every(r => r.length === ptpS.length));
  ok('PTP: Boy/Eni/X/Y/material nesting detali bilan bir xil (qiymatlar sarlavhaga mos)', q.every(r => { const p = ref[r[3]]; return p && +r[6] === p.length && +r[7] === p.width && +r[4] === p.x && +r[5] === p.y && r[10] === p.material; }));
}
const xnc = await baytlar('X-xnc.csv'), xncQ = xnc.toString('utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
{
  const bosh = xncQ[0].split(';'), q = xncQ.slice(1).map(l => l.split(';'));
  ok(`XNC CSV: UTF-8 BOM, ${bosh.length} ustun, ${q.length} qator hammasi ${bosh.length} ustunli, soni jami ${q.reduce((a, r) => a + +r[6], 0)} = detallar`, BOM(xnc) && q.every(r => r.length === bosh.length) && q.reduce((a, r) => a + +r[6], 0) === panelSoni);
  const cl = res.cutlists.flatMap(k => k.parts.map(p => [Math.round(p.length), Math.round(p.width)].join('x'))).sort();
  ok('XNC CSV: uzunlik × kenglik kesim ro\'yxati bilan bir xil', q.map(r => r[3] + 'x' + r[4]).sort().join() === cl.join());
}
info('PTP/XNC — jadval (CSV), stanokka kiradigan haqiqiy PTP/XNC fayl emas: tugma izohi shuni va\'da qilmaydi (quyida)');
{ /* tugma ostidagi izohlar (3 til) stanok fayli va'dasini bermasin */
  const L = ['uz', 'ru', 'en'].map(k => JSON.parse(readFileSync(join(ROOT, 'web/src/i18n/' + k + '.json'), 'utf8')));
  const ptpXnc = L.flatMap(l => ['sozlama.st_ptp', 'hujjat.t_ptp', 'sozlama.st_xnc', 'hujjat.t_xnc'].map(k => l[k]));
  ok('PTP/XNC izohlari (uz/ru/en): "stanok/ЧПУ/machine" fayli deb va\'da qilmaydi', ptpXnc.every(s => s && !/станок|stanok|machine|\bчпу\b|cnc/i.test(s.replace(/GibLab/g, ''))), ptpXnc.join(' | '));
}

/* ══ 3) GibLab .project, KDT, Bazis .project ══ */
console.log('\n[3] GibLab .project / Bazis uslubidagi .project / KDT');
const glB = await baytlar('X.project'), glX = glB.toString('utf8');
{
  const ck = checkProject(glX);
  ok('GibLab: UTF-8, XML sarlavha, ildiz <project>, version/currency/uuid', utf8Toza(glB) && /^<\?xml version="1.0" encoding="UTF-8"\?>\s*<project /.test(glX) && /version="\d+"/.test(glX) && /currency="UZS"/.test(glX) && /project\.uuid="[0-9a-f-]{36}"/.test(glX));
  ok(`GibLab: mustaqil tekshiruvchi — render xato 0, ustma-ust 0, joylashtirilmagan 0, o'lcham farqi 0 (${JSON.stringify(ck.summary || ck).slice(0, 110)})`, ck.ok !== false && !(ck.errors && ck.errors.length), JSON.stringify(ck.errors || []).slice(0, 200));
  const parts = (glX.match(/<good typeId="product"[\s\S]*?<\/good>/) || [''])[0].match(/<part /g) || [];
  ok(`GibLab: mahsulot detallari ${parts.length} = kesim ro'yxati (${panelSoni}); varaq ${(glX.match(/<good typeId="sheet"/g) || []).length} xil material, kesim operatsiyalari ${(glX.match(/<operation [^>]*typeId="CS"/g) || []).length}`, parts.length === panelSoni && (glX.match(/<operation [^>]*typeId="CS"/g) || []).length >= 1);
  if (PY) { const r = py('import sys,json,xml.etree.ElementTree as ET\nET.parse(sys.argv[1]);print("true")', glX); ok('GibLab: XML to\'g\'ri (python ElementTree)', r === true); }
}
{ /* sexdagi haqiqiy GibLab .project (GibLab qayta saqlagan, UTF-8) bilan atribut to'plami */
  const TOP = join(ROOT, '..', 'Smart3D', 'Smart3D_toplam_2026-10-16', '01_buyurtma_fayllari', '01_arra');
  const fayl = existsSync(TOP) ? readdirSync(TOP).filter(d => /^\d+_/.test(d)).flatMap(d => readdirSync(join(TOP, d)).filter(f => /_2\.project$/.test(f)).map(f => join(TOP, d, f)))[0] : null;
  if (!fayl) skip('GibLab: sexdagi haqiqiy .project yo\'q (maxfiy papka)');
  else {
    const atr = (s) => { const o = {}; for (const m of s.matchAll(/<(good|operation|material|project|part)((?:\s+[\w.]+="[^"]*")*)\s*\/?>/g)) { const t = (/typeId="([^"]*)"/.exec(m[2]) || [])[1]; const k = m[1] === 'good' || m[1] === 'operation' ? m[1] + ':' + t : m[1]; (o[k] = o[k] || new Set()); for (const a of m[2].matchAll(/([\w.]+)="/g)) o[k].add(a[1]); } return o; };
    const sex = atr(readFileSync(fayl, 'utf8')), biz = atr(glX);
    for (const k of ['project', 'good:sheet', 'good:tool.cutting', 'material', 'operation:CS']) {
      const yoq = [...(sex[k] || [])].filter(a => !(biz[k] || new Set()).has(a) && a.length < 40);
      ok(`GibLab: <${k}> atributlari sexdagi haqiqiy fayldagidek (${(sex[k] || new Set()).size} ta)`, yoq.length === 0, 'yo\'q: ' + yoq.join(','));
    }
    const part = [...(sex['part'] || [])];
    info('GibLab: <part> sexda ' + part.length + ' atribut (name, code, kromka el*), bizda faqat o\'lcham/son — detal nomi va kromka tomoni .project da yo\'q (egasiga savol)');
  }
}
const stm = stanokModeli({ cutlists: res.cutlists, placements: res.placements, catalog: H.catalog, materials: H.materials, nom: 'Sinov loyiha' });
const bzB = await baytlar('X-bazis.project');
{
  const t = bzB.toString('latin1');
  ok('Bazis .project: windows-1251 baytlar, sarlavha <project importBMV="1.84">', /^<\?xml version="1.0" encoding="windows-1251"\?><project importBMV="1\.84">/.test(t) && bzB.includes(cp1251('Фронтальная')) && !bzB.includes(Buffer.from('Фронтальная', 'utf8')));
  const P = projectOqi(bzB.toString('latin1').length ? new TextDecoder('windows-1251').decode(bzB) : '');
  ok(`Bazis .project: qayta o'qilsa ${P.detallar.length} xil detal, ${P.detallar.reduce((a, d) => a + d.soni, 0)} dona = model (${stm.model.detallar.length} / ${stm.model.detallar.reduce((a, d) => a + d.soni, 0)})`, P.detallar.length === stm.model.detallar.length && P.detallar.reduce((a, d) => a + d.soni, 0) === stm.model.detallar.reduce((a, d) => a + d.soni, 0));
}
{
  const zip = join(TMP, 'kdt.zip'); writeFileSync(zip, await baytlar('X-kdt.zip'));
  const nomlar = execFileSync('python3', ['-c', 'import sys,zipfile,json;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;print(json.dumps({n:z.read(n).decode("utf-8") for n in z.namelist()}))', zip], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const fayllar = JSON.parse(nomlar), nom = Object.keys(fayllar);
  const teshikliDetal = stm.model.detallar.filter(d => d.xnc.some(x => x.teshiklar.length)).length;
  ok(`KDT: ZIP butun, ${nom.length} ta .XML, har fayl o'qiladi (detal ${stm.model.detallar.length}, teshikli ${teshikliDetal})`, nom.length > 0 && nom.every(n => /\.XML$/i.test(n)) && nom.length >= teshikliDetal && nom.length <= stm.model.detallar.length * 2);
  let boshqaX = 0, jami = 0, jamiTesh = 0;
  for (const n of nom) { const k = kdtOqi(fayllar[n]); jami++; if (!(k.L >= k.W && k.W > 0 && k.T > 0)) boshqaX++; for (const h of k.teshiklar) { jamiTesh++; if (h.tur === 1 && (h.x < 0 || h.y < 0 || h.x > k.L + 0.01 || h.y > k.W + 0.01)) boshqaX++; } }
  ok(`KDT: uzunlik ≥ kenglik > 0, qalinlik > 0, yuza teshiklari panel ichida (${jamiTesh} teshik)`, boshqaX === 0, boshqaX + ' ta xato');
  const modelTesh = stm.model.detallar.reduce((a, d) => a + d.xnc.reduce((s, x) => s + x.teshiklar.length, 0), 0);
  ok(`KDT: teshiklar jami ${jamiTesh} = stanok modeli (${modelTesh})`, jamiTesh === modelTesh);
  if (PY) { const r = py('import sys,json,xml.etree.ElementTree as ET\nd=json.load(open(sys.argv[1]))\nfor n,t in d.items(): ET.fromstring(t)\nprint(len(d))', JSON.stringify(fayllar)); ok(`KDT: ${r} ta XML — python ElementTree o'qiydi`, r === nom.length); }
}

/* ══ 4) Teshiklar JSON ══ */
console.log('\n[4] Teshiklar (JSON)');
{
  const J = JSON.parse(await matn('smart3d-holes.json'));
  ok('JSON: version, unit=mm, holes[], placements[]', J.version === 1 && J.unit === 'mm' && Array.isArray(J.holes) && J.holes.length > 0 && J.placements.length === doc.placements.length);
  const sx = ['placement', 'fragment', 'part', 'side', 'kind', 'dia', 'depth', 'local_x', 'local_y', 'world', 'size', 'qty', 'rotated'];
  ok(`JSON: har teshikda ${sx.length} maydon (detal, x, y, diametr, chuqurlik, tur…), raqamlar chekli va musbat`, J.holes.every(h => sx.every(k => h[k] !== undefined) && [h.dia, h.depth, h.local_x, h.local_y, h.qty].every(Number.isFinite) && h.dia > 0 && h.depth > 0 && h.local_x >= 0 && h.local_y >= 0 && h.qty >= 1));
  const detal = (h) => { const cl = res.cutlists.find(k => k.placementId === h.placement); return cl && cl.parts.find(p => p.code === h.part); };
  const tekshir = J.holes.filter(h => h.nusxa !== undefined);   // kesim ro'yxatidan (birikma) — koordinata detal burchagidan: x — eni, y — uzunlik
  const tashqari = tekshir.filter(h => { const p = detal(h); return !p || h.local_x > p.width + 0.5 || h.local_y > p.length + 0.5; });
  ok(`JSON: kesim ro'yxatidan olingan ${tekshir.length} teshik koordinatasi detal ichida (0 ≤ x ≤ eni, 0 ≤ y ≤ uzunlik)`, tashqari.length === 0, tashqari.slice(0, 2).map(h => h.part + ' ' + h.local_x + ',' + h.local_y).join(' | '));
  /* detal_teshiklari — kesim ro'yxatidagi HAMMA teshik (NC/DXF/KDT bilan bir xil to'plam) */
  const dt = J.detal_teshiklari || [];
  ok('JSON: detal_teshiklari bor, har yozuvda detal/x/y/dia/depth/side/kind/qty', dt.length > 0 && dt.every(h => ['placement', 'part', 'side', 'kind', 'dia', 'depth', 'x', 'y', 'qty'].every(k => h[k] !== undefined) && [h.dia, h.depth, h.x, h.y, h.qty].every(Number.isFinite)));
  ok(`JSON: yuza teshiklari ${J.jami_yuza_teshigi} = NC/DXF (${kutilganTeshik})`, J.jami_yuza_teshigi === kutilganTeshik, J.jami_yuza_teshigi);
  const tashq = dt.filter(h => { const cl = res.cutlists.find(k => k.placementId === h.placement), p = cl && cl.parts.find(q => q.code === h.part); return !p || h.x < -0.5 || h.y < -0.5 || h.x > p.width + 0.5 || h.y > p.length + 0.5; });
  ok(`JSON: ${dt.length} yozuvning koordinatasi detal ichida (0 ≤ x ≤ eni, 0 ≤ y ≤ uzunlik)`, tashq.length === 0, tashq.slice(0, 2).map(h => h.part + ' ' + h.x + ',' + h.y).join(' | '));
}

/* ══ 5) BPJ, .b3d ══ */
console.log('\n[5] Bazis .bpj / .b3d');
{
  const b = await baytlar('X.bpj');
  ok('BPJ: toza UTF-8 (BOM yo\'q), JSON o\'qiladi', utf8Toza(b) && !BOM(b));
  const j = JSON.parse(b.toString('utf8'));
  ok(`BPJ: bo'limlar (${Object.keys(j).length}) va panel soni ${j.objects.length} = meta.totalPanels (${j.meta.totalPanels}) = kesim ro'yxati (${panelSoni})`, ['version', 'script', 'meta', 'config', 'materials', 'edgeBands', 'furnitures', 'blocks', 'bom', 'objects'].every(k => k in j) && j.objects.length === j.meta.totalPanels && j.objects.length === panelSoni);
  ok('BPJ: har panel o\'lchami musbat, chekli (mm)', j.objects.every(o => o.dimensions && [o.dimensions.dl, o.dimensions.dw, o.dimensions.dp].every(v => Number.isFinite(v) && v > 0)), '');
  const b3 = await baytlar('X.b3d');
  ok(`.b3d: yozildi (${b3.length} bayt); to'liq round-trip — tests/verify_b3d_yoz.mjs`, b3.length > 1000 && b3[0] !== 0x7b);
}

/* ══ 6) .dae va .skp bir xil mazmun ══ */
console.log('\n[6] SketchUp Pro (.dae) ↔ SketchUp (.skp)');
{
  const dae = await matn('X.dae');
  const { parseSkp } = await import('../web/node_modules/openskp/dist/index.mjs');
  const sk = await baytlar('X.skp'); const S = parseSkp(sk.buffer.slice(sk.byteOffset, sk.byteOffset + sk.byteLength));
  ok('.dae: COLLADA 1.4.1, birlik inch (0.0254 m), Z_UP', /<COLLADA [^>]*version="1\.4\.1"/.test(dae) && /<unit name="inch" meter="0\.0254"\/>/.test(dae) && /<up_axis>Z_UP<\/up_axis>/.test(dae));
  let daeDets = null;
  if (PY) {
    daeDets = py(`import sys,json,xml.etree.ElementTree as ET
ns='{http://www.collada.org/2005/11/COLLADASchema}'
r=ET.parse(sys.argv[1]).getroot()
geo={}
for g in r.iter(ns+'geometry'):
    a=[float(x) for x in g.find('.//'+ns+'float_array').text.split()]
    p=[a[i:i+3] for i in range(0,len(a),3)]
    geo[g.get('id')]=sorted(round((max(q[k] for q in p)-min(q[k] for q in p))*25.4,1) for k in range(3))
mods={}
for n in r.find(ns+'library_nodes'):
    ig=[geo[i.get('url')[1:]] for i in n.findall('.//'+ns+'instance_geometry')]
    if n.get('id').startswith('mod'): mods[n.get('name')]=ig
print(json.dumps(mods))`, dae);
    ok('.dae: XML to\'g\'ri (python ElementTree) — ' + Object.keys(daeDets).length + ' modul', Object.keys(daeDets).length === S.root.instances.length);
  } else skip('.dae: python yo\'q — XML o\'qish');
  /* .skp: har modul komponenti — guruhlar (Furnitura qatlamidan tashqari = detal) */
  const defs = S.definitions, skpMod = {};
  for (const inst of S.root.instances) {
    const d = defs.get(inst.refIdx);
    skpMod[d.name] = d.instances.filter(i => i.layer !== 'Furnitura').map(gi => {
      const v = defs.get(gi.refIdx).vertices.map(p => [p.x ?? p[0], p.y ?? p[1], p.z ?? p[2]]);
      return [0, 1, 2].map(k => Math.round((Math.max(...v.map(q => q[k])) - Math.min(...v.map(q => q[k]))) * 25.4 * 10) / 10).sort((x, y) => x - y);
    });
  }
  const eslat = (m) => m.split(' ').slice(0, 1).join();   // "MC-KP-02 MC · 1 polk…" va "MC-KP-02" — kod bo'yicha
  if (daeDets) {
    const dKod = Object.fromEntries(Object.entries(daeDets).map(([n, v]) => [eslat(n), v])), sKod = Object.fromEntries(Object.entries(skpMod).map(([n, v]) => [eslat(n), v]));
    ok(`.dae va .skp: modullar bir xil (${Object.keys(sKod).join(', ')}), har modulda detal soni teng`, Object.keys(sKod).sort().join() === Object.keys(dKod).sort().join() && Object.keys(sKod).every(k => sKod[k].length === dKod[k].length), JSON.stringify(Object.keys(sKod).map(k => [k, sKod[k].length, (dKod[k] || []).length])));
    const farq = Object.keys(sKod).filter(k => JSON.stringify(sKod[k].map(a => a.join('x')).sort()) !== JSON.stringify((dKod[k] || []).map(a => a.join('x')).sort()));
    ok('.dae va .skp: har detal o\'lchami (mm, saralangan) bir xil', farq.length === 0, farq.join(','));
    const jami = Object.values(dKod).reduce((a, v) => a + v.length, 0);
    info(`SketchUp detallari: ${jami} (3D panel manbai; umumiy SP modulda kesim ro'yxatidan 1 ta ko'p — verify_skp.mjs da hujjatlangan)`);
  }
}

/* ══ 7) GLB ══ */
console.log('\n[7] GLB (glTF 2.0)');
{
  const b = await baytlar('X-model.glb'), dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  ok(`GLB: sarlavha glTF, versiya 2, uzunlik ${dv.getUint32(8, true)} = fayl (${b.length})`, b.toString('latin1', 0, 4) === 'glTF' && dv.getUint32(4, true) === 2 && dv.getUint32(8, true) === b.length);
  const jl = dv.getUint32(12, true); const g = JSON.parse(b.toString('utf8', 20, 20 + jl));
  const binO = 20 + jl, binL = dv.getUint32(binO, true);
  ok('GLB: JSON va BIN bo\'laklari 4 baytga tekis, BIN turi', jl % 4 === 0 && binL % 4 === 0 && b.toString('latin1', binO + 4, binO + 8) === 'BIN\0' && binO + 8 + binL === b.length);
  ok(`GLB: asset.version 2.0, ${g.meshes.length} mesh, ${g.nodes.length} tugun, ${g.materials.length} material (${g.materials.map(m => m.name).join(',')}); sahna tugunlari mavjud`, g.asset.version === '2.0' && g.meshes.length > 0 && g.nodes.length >= g.meshes.length && g.scenes[0].nodes.every(i => g.nodes[i]) && g.materials.length > 0);
  ok('GLB: bufferView/accessor chegaradan chiqmaydi, indekslar 3 ga karrali, material indekslari to\'g\'ri', g.bufferViews.every(v => v.byteOffset + v.byteLength <= g.buffers[0].byteLength) && g.accessors.every(a => g.bufferViews[a.bufferView]) && g.meshes.every(m => m.primitives.every(p => (p.indices === undefined || g.accessors[p.indices].count % 3 === 0) && (p.material === undefined || g.materials[p.material]))) && g.buffers[0].byteLength === binL);
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (const m of g.meshes) for (const p of m.primitives) { const a = g.accessors[p.attributes.POSITION]; for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], a.min[k]); mx[k] = Math.max(mx[k], a.max[k]); } }
  ok(`GLB: birlik — metr: xona 4 × 3 m, balandlik 2,7 m (Y-yuqoriga) → X ${mn[0].toFixed(2)}…${mx[0].toFixed(2)}, Y ${mn[1].toFixed(2)}…${mx[1].toFixed(2)}, Z ${mn[2].toFixed(2)}…${mx[2].toFixed(2)}`, mx[0] <= 4.01 && mx[0] >= 3.9 && mx[1] <= 2.71 && mx[1] >= 2.6 && mn[2] >= -3.01 && mn[2] <= -2.9);
}

/* ══ 8) Excel smeta, CSV, Hisobot — summalar bir xil ══ */
console.log('\n[8] Excel smeta / Detallar CSV / Smeta CSV / Hisobot');
const JAMI = PR.total, ustamaPct = res.prod.markupPct;
{
  const xb = await baytlar('X-smeta.xlsx');
  ok('xlsx: ZIP (PK), [Content_Types].xml, xl/workbook.xml, logo (xl/media), chizma', xb[0] === 0x50 && xb[1] === 0x4b && xb.includes(Buffer.from('xl/workbook.xml')) && xb.includes(Buffer.from('xl/media/logo-bittada.png')) && xb.includes(Buffer.from('xl/drawings/drawing1.xml')));
  if (OPENPYXL) {
    const r = py(`import sys,json,openpyxl
wb=openpyxl.load_workbook(sys.argv[1]); ws=wb.active
rows=[[c.value for c in r] for r in ws.iter_rows()]
fm=[c.number_format for r in ws.iter_rows() for c in r if isinstance(c.value,(int,float)) and c.column>=6]
print(json.dumps({'sheets':wb.sheetnames,'images':len(ws._images),'rows':rows,'fmts':sorted(set(fm)),'formulas':sum(1 for r in ws.iter_rows() for c in r if isinstance(c.value,str) and c.value.startswith('='))}))`, xb, '.xlsx');
    const qat = (s) => r.rows.find(x => x.some(v => typeof v === 'string' && v.includes(s)));
    const son = (row) => row.filter(v => typeof v === 'number').pop();
    const b1 = son(qat("1-BO'LIM JAMI")), b2 = son(qat("2-BO'LIM JAMI")), b3 = son(qat("3-BO'LIM JAMI")), b4 = son(qat("4-BO'LIM JAMI"));
    const yakun = son(qat("YAKUNIY SUMMA")), tan = son(qat('Tannarx')), ust = son(qat('Ustama'));
    ok(`Excel (openpyxl): ${r.sheets.length} varaq "${r.sheets[0]}", logo ${r.images} ta`, r.sheets.length === 1 && r.images === 1);
    ok(`Excel: 1-bo'lim jami (${b1}) = yakuniy summa (${yakun}) = narx paneli (${JAMI})`, b1 === JAMI && yakun === JAMI);
    ok(`Excel: tannarx ${tan} = materiallar + furnitura + xizmatlar (${b2 + b3 + b4}); tannarx + ustama = yakuniy`, tan === b2 + b3 + b4 && tan + ust === yakun);
    const plita = res.prod.lines.filter(l => /^Plita/.test(l.group)).reduce((a, l) => a + l.amount, 0), furn = res.prod.lines.filter(l => l.group === 'Furnitura').reduce((a, l) => a + l.amount, 0);
    ok(`Excel: ustama ${ust} = ${Math.round(ustamaPct * 100)}% × (plita ${plita} + furnitura ${furn}) — kromka va xizmatlar ustamasiz (#222)`, Math.abs(ust - Math.round(ustamaPct * (plita + furn))) <= 1, 'kutilgan ' + Math.round(ustamaPct * (plita + furn)));
    ok('Excel: pul katagi raqam formati #,##0 (matn emas), bo\'lim jami raqam', r.fmts.some(f => f.includes('#,##0')) && [b1, b2, b3, b4, yakun].every(Number.isFinite));
  } else skip('Excel: openpyxl yo\'q');
  const cs = await baytlar('smart3d-smeta.csv'), csQ = cs.toString('utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
  ok('Smeta CSV: UTF-8 BOM (Excel "·" va kirillni buzmaydi), ";" ajratgich, 6 ustun', BOM(cs) && csQ.every(l => l.split(';').length === 6));
  const jamiQator = csQ[csQ.length - 1].split(';');
  ok(`Smeta CSV: JAMI (${jamiQator[5]}) = narx paneli (${JAMI}); qatorlar yig'indisi teng`, +jamiQator[5] === JAMI && csQ.slice(1, -1).reduce((a, l) => a + +l.split(';')[5], 0) === JAMI);
  const dc = await baytlar('smart3d-cutlist.csv'), dcQ = dc.toString('utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
  ok(`Detallar CSV: UTF-8 BOM, sarlavha, ${dcQ.length - 1} qator = detallar (${panelSoni}), 5 ustun`, BOM(dc) && dcQ[0] === 'fragment;detail;length_mm;width_mm;material' && dcQ.length - 1 === panelSoni && dcQ.every(l => l.split(';').length === 5));
  const { cutlistCSV, smetaCSV } = await import('../app/js/engine/objexport.js');
  const q1 = cutlistCSV([{ fragment: 'A;B', parts: [{ code: 'x"y', length: 10, width: 5, qty: 2, material: 'M' }] }]).split('\r\n').filter(Boolean);
  ok('CSV: nom ichida ";" va qo\'shtirnoq — qo\'shtirnoqqa olinadi; qty=2 — ikki qator', q1.length === 3 && q1[1] === '"A;B";"x""y";10;5;M' && q1[2] === q1[1]);
  ok('Smeta CSV yordamchisi: ";" bor nom ustunni surmaydi', smetaCSV([{ group: 'g', name: 'a;b', qty: 1, unit: 'dona', unit_price: 5, amount: 5 }], 5).split('\r\n')[1] === 'g;"a;b";1;dona;5;5');
  /* hisobot (PDF uchun HTML chop etish oynasi) */
  const html = oynalar[0] && oynalar[0].html;
  ok('Hisobot: yangi oynada HTML, window.print(), UTF-8 meta, til atributi', !!html && /<!DOCTYPE html>/.test(html) && /<meta charset="utf-8">/.test(html) && /window\.print\(\)/.test(html) && /<html lang="uz">/.test(html));
  ok('Hisobot: Bittada logosi (data:image/png) sahifada va har betda (pgLogo)', /class="bt" src="data:image\/png;base64,/.test(html) && /class="pgLogo" src="data:image\/png;base64,/.test(html));
  const jamiHtml = /JAMI: ([\d\s  ]+) so/.exec(html.replace(/&#39;/g, "'"));
  ok(`Hisobot: JAMI "${jamiHtml && jamiHtml[1].trim()}" = narx paneli (${s3n(JAMI)})`, jamiHtml && jamiHtml[1].trim() === s3n(JAMI).trim());
  ok('Hisobot: loyiha nomi va narx qatorlari (kotirovka) HTML da, belgilar ekranlangan', /<h1>Sinov loyiha<\/h1>/.test(html) && (html.match(/<tr><td>/g) || []).length >= doc.placements.length);
  info('Hisobot "Mijozga" bo\'limida 2-bo\'lim "Ishlab chiqarish xarajati" (plita/furnitura tannarxi) ham chiqadi — mijoz tannarx va ustamani ko\'ra oladi (egasiga savol)');
}

/* ══ 9) Loyiha fayli — eksport → ochish ══ */
console.log('\n[9] Loyiha fayli (round-trip)');
{
  const polka = 'MDF16', orqa = 'HDF3';
  const holat = { client: 'Sinov mijoz', name: 'Sinov loyiha', matCode: 'LDSP16', fasadCode: 'MDF16', polkaCode: polka, orqaCode: orqa, stolCode: null, sheet: null };
  setStore('project', holat);
  project.H = H; project.doc = JSON.parse(JSON.stringify(doc));
  const recalc = (o) => H.recalc(project.doc, { materialCode: o.matCode, fasadCode: o.fasadCode, orqaCode: o.orqaCode, stolCode: o.stolCode, polkaCode: o.polkaCode, sheet: o.sheet, nestCfg });
  const R0 = recalc(holat);
  const c2 = Object.assign({}, c, { doc: project.doc, polkaCode: polka, payload: () => project.payload() });
  const bosh = chiq.size; chiq.delete('smart3d-project.json');
  eksport.loyiha(c2);
  const fayl = JSON.parse(await matn('smart3d-project.json'));
  ok('Loyiha fayli: app=smart3d, v=2, doc va material/fasad/polka/orqa/mijoz (saqlangan loyiha bilan bir xil yuk)', fayl.app === 'smart3d' && fayl.v === 2 && fayl.doc.placements.length === doc.placements.length && fayl.material === 'LDSP16' && fayl.fasad === 'MDF16' && fayl.polka === polka && fayl.orqa === orqa && fayl.client === 'Sinov mijoz', JSON.stringify(Object.keys(fayl)));
  /* ochish (projects/actions.js openFile → project.apply) va qayta hisob */
  setStore('project', { client: '', name: '', matCode: 'X', fasadCode: 'X', polkaCode: null, orqaCode: null, stolCode: null, sheet: null });
  project.doc = null;
  project.apply(JSON.parse(JSON.stringify(fayl)));
  const { get } = await import('../web/src/store/index.js'); const p = get().project;
  const R1 = recalc(p);
  ok('Loyiha fayli: ochilganda material/fasad/polka/orqa/mijoz/nom tiklanadi', p.matCode === 'LDSP16' && p.fasadCode === 'MDF16' && p.polkaCode === polka && p.orqaCode === orqa && p.client === 'Sinov mijoz' && p.name === 'Sinov loyiha');
  ok(`Loyiha fayli: qayta hisob — narx ${R1.priceRes.total} = ${R0.priceRes.total}, detallar ${R1.nest.summary.panel_count} = ${R0.nest.summary.panel_count}, varaqlar ${R1.nest.summary.total_sheets} = ${R0.nest.summary.total_sheets}`, R1.priceRes.total === R0.priceRes.total && R1.nest.summary.panel_count === R0.nest.summary.panel_count && R1.nest.summary.total_sheets === R0.nest.summary.total_sheets);
  void bosh;
  const farqli = H.recalc(project.doc, { materialCode: 'LDSP16', fasadCode: 'MDF16', nestCfg });
  info(`polka/orqa materiali tushib qolsa narx ${farqli.priceRes.total === R0.priceRes.total ? 'o\'zgarmasdi' : 'o\'zgarardi (' + farqli.priceRes.total + ' ≠ ' + R0.priceRes.total + ')'}`);
}

console.log(`\n${fail ? '❌' : '✅'} verify_eksport_mazmun: ${pass} o'tdi, ${fail} xato`);
process.exit(fail ? 1 : 0);
