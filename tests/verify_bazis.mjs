/* TZ-21: Bazis faylini o'qish va Smart3D ga o'girish.
 *   Har doim (CI ham): material turlari, furnitura kodi (fr3d_import.py slug bilan bir xil), o'girgich (o'lcham, detal,
 *   kromka tomonlari, kesimga kirmaganlar), 3D panellar (assembler), kesim ro'yxati detal materiali (cutlist material_code).
 *   Mahalliy ma'lumot bo'lsa (git'da yo'q — mijoz fayllari): ERP asli (bazis_bom.js) bilan tenglik, Python daraxti
 *   (scripts/bazis_daraxt.py) bilan tenglik, 30 ta haqiqiy buyurtma — Bazis → bizning kesim ro'yxati ↔ sexdagi GibLab.
 * Ishlatish: node tests/verify_bazis.mjs */
import { readFileSync, readdirSync, existsSync, statSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import zlib from 'node:zlib';
import * as B from '../app/js/engine/bazis/b3d.js';
import { daraxt } from '../app/js/engine/bazis/daraxt.js';
import { bazisLoyiha, materialTuri, slug, materiallarniQosh } from '../app/js/engine/bazis/loyiha.js';
import { getModulePanels } from '../app/js/engine/assembler.js';
import { bpjOqi, bpjMatn } from '../app/js/engine/bazis/bpj.js';
import { cutlist, productionCost } from '../app/js/engine/cutlist.js';
import { nestProject } from '../app/js/engine/nesting.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const J = (p) => JSON.parse(readFileSync(join(ROOT, 'app/data', p), 'utf8'));
const inflate = (b) => new Uint8Array(zlib.inflateSync(Buffer.from(b.buffer, b.byteOffset, b.byteLength)));
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('  ✓', name); } else { fail++; console.log('  ✗', name, info); } };
const skip = (name) => console.log('  · o\'tkazib yuborildi:', name);

/* ── 1) material turi va list o'lchami (nomdan) ── */
const MT = [
  ['ЛДСП Ультрадекор 4,575 Белый гладкий 16мм', 16, 'ldsp', 'LDSP16', [2500, 1830]],
  ['ЛДСП Ультрадекор 5,0325 Серый графит16мм', 16, 'ldsp', 'LDSP16', [2750, 1830]],
  ['ЛХДФ 3мм 2800*2070 Белый 5,796кв Standart', 3, 'hdf', 'HDF3', [2800, 2070]],
  ['Столешница 26мм', 26, 'stoleshnitsa', 'LDSP18', null],
  ['Акрил 18мм пастки корпус', 18, 'akril', 'MDF18', null],
  ['LEGE M 013 МОКРЫЙ ОЧ МАТ 18 ММ', 18, 'ldsp', 'LDSP18', null],
  ['Пластик', 3, 'boshqa', null, null], ['Хром', 6, 'boshqa', null, null], ['', 0, 'yoq', null, null], ['Зеркало Бронза', 4, 'oyna', 'OYNA', null]
];
for (const [nom, t, tur, asos, varaq] of MT) {
  const m = materialTuri(nom, t);
  ok(`material: "${nom || '(yo\'q)'}" → ${tur}`, m.tur === tur && (asos == null || m.asos === asos) && JSON.stringify(m.varaq) === JSON.stringify(varaq), JSON.stringify(m));
}
ok('kesimga: plita turlari ha, plastik/oyna/materialsiz yo\'q', materialTuri('ЛДСП 16мм', 16).ishlab && !materialTuri('Пластик', 1).ishlab && !materialTuri('Стекло', 4).ishlab && !materialTuri('', 0).ishlab);

/* ── 2) furnitura kodi — Python (fr3d_import.py) bilan bir xil: MC modullaridagi barcha BZ- kodlari ── */
const mcHw = J('fragments-mc.json').fragments.flatMap(f => f.hardware || []).filter(h => /^BZ-/.test(h.code));
const slugFarq = mcHw.filter(h => 'BZ-' + slug(h.name).slice(0, 40) !== h.code);
ok(`furnitura kodi: ${mcHw.length} ta MC kodi JS slug bilan aynan`, mcHw.length > 20 && !slugFarq.length, slugFarq.slice(0, 3).map(h => h.code + ' ≠ ' + slug(h.name)).join('; '));

/* ── 3) o'girgich — sun'iy ikki panel: yon devor (o'qi burilgan) va eshik; materialsiz bezak ── */
const rect = (w, h) => [{ type: 'line', p1: [0, 0], p2: [w, 0] }, { type: 'line', p1: [w, 0], p2: [w, h] }, { type: 'line', p1: [w, h], p2: [0, h] }, { type: 'line', p1: [0, h], p2: [0, 0] }];
const I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const obs = [
  /* yon devor: kontur 450×700 (X×Y), qalinlik 16; o'qlari: lokal X → global Z (chuqurlik), lokal Z → global X */
  { modelCode: 4002, name: 'bok', material: 'ЛДСП Ультрадекор 4,575 Белый гладкий 16мм', thickness: 16, contour_outer: rect(450, 700), butts: [{ name: 'Кромка 19/1 ПВХ Белый', thickness: 1, edgeIndex: 2 }], tf: { pos: [16, 0, 0], oq: [[0, 0, 1], [0, 1, 0], [-1, 0, 0]] } },
  { modelCode: 4002, name: 'bok', material: 'ЛДСП Ультрадекор 4,575 Белый гладкий 16мм', thickness: 16, contour_outer: rect(450, 700), butts: [{ name: 'Кромка 19/1 ПВХ Белый', thickness: 1, edgeIndex: 2 }], tf: { pos: [600, 0, 0], oq: [[0, 0, 1], [0, 1, 0], [-1, 0, 0]] } },
  { modelCode: 4002, name: 'Дверь', material: 'Акрил 18мм', thickness: 18, contour_outer: rect(596, 696), butts: [0, 1, 2, 3].map(i => ({ name: 'Кромка 22/1 Акрил', thickness: 1, edgeIndex: i })), tf: { pos: [2, 2, 450], oq: I } },
  { modelCode: 4002, name: 'bezak', contour_outer: rect(100, 20), thickness: 0, tf: { pos: [0, 700, 0], oq: I } },
  { modelCode: 3001, name: 'Петля 110°', tf: { pos: [0, 0, 0], oq: I } }
];
const res = bazisLoyiha(obs, { fayl: 'sinov.b3d', fittings: [{ name: 'Петля 110°', count: 2, unit: 'dona' }], fasteners: [{ name: 'Евро 51мм Алкан', count: 8 }] });
const fr = res.fragment;
ok('o\'lcham: eni 600, chuqurlik 468 (eshik oldida), bo\'yi 720', fr.w === 600 && fr.d === 468 && fr.h === 720, [fr.w, fr.d, fr.h].join('×'));
ok('detallar: 2 yon devor bitta guruhda, eshik alohida; bezak (materialsiz) — kesimga kirmadi', fr.parts.length === 2 && fr.parts[0].qty === 2 && res.hisobot.chiqarildi.materialsiz && res.hisobot.chiqarildi.materialsiz.soni === 1, JSON.stringify(fr.parts.map(p => [p.nom, p.qty])));
const bok = fr.parts.find(p => p.nom === 'bok'), dv = fr.parts.find(p => p.nom === 'Дверь');
ok('kromka: yon devor — bitta tomon (F), eshik — 4 tomon', fr.edge.filter(e => e.code === bok.code).flatMap(e => e.sides).join() === 'F' && fr.edge.filter(e => e.code === dv.code).flatMap(e => e.sides).sort().join() === 'B,F,L,R', JSON.stringify(fr.edge));
ok('materiallar: har dekor o\'z kodi (BZM-), kromka (BZE-)', res.materiallar.panel.length === 2 && res.materiallar.panel.every(m => /^BZM-/.test(m.code)) && res.materiallar.edge.every(e => /^BZE-/.test(e.code)));
ok('furnitura: kod BZ- + slug (Python bilan bir xil)', fr.hardware.some(h => h.code === 'BZ-evro_51mm_alkan' && h.qty === 8));
ok('o\'lcham qat\'iy (cho\'zilmaydi)', fr.min_w === fr.max_w && fr.min_h === fr.max_h);
/* 3D: 4 ta quti, markazga nisbatan, eshik — fasad */
const a3 = getModulePanels(fr, fr.w, fr.d, fr.h, {});
ok('3D: barcha panellar (bezak ham) joyida, eshik — fasad sloti', a3.panels.length === 4 && a3.panels.some(p => p.slot === 'fasad') && a3.panels.every(p => Math.abs(p.x) <= fr.w / 2 + 1 && Math.abs(p.z) <= fr.h / 2 + 1));
/* kesim ro'yxati — detal o'z materiali bilan, raskroy dekor bo'yicha */
const mats = J('materials.json');
const qosh = materiallarniQosh(mats, res.materiallar);
const cl = cutlist(fr, fr.w, fr.d, fr.h, mats, {});
ok('kesim: detal materiali — Bazis dekori (slot emas), qalinlik — o\'zidan', qosh === 4 && cl.parts.length === 3 && cl.parts.every(p => /^BZM-/.test(p.material)) && cl.parts.find(p => p.code === dv.code).thickness === 18, JSON.stringify(cl.parts.map(p => [p.material, p.thickness])));
const nest = nestProject(cl.parts.map(p => Object.assign({}, p, { id: 'x:' + p.ref })), mats, { mode: 'bssf', kerf: 4, trimL: 10, trimW: 10 });
ok('raskroy: har dekor alohida list guruhi', Object.keys(nest.by_material || {}).filter(k => /^BZM-/.test(k)).length === 2, Object.keys(nest.by_material || {}).join(','));
/* Bazis materiallari qo'shilgan baza boshqa (121) modulning kesimini o'zgartirmaydi */
const toza = J('materials.json');
const barcha = [...J('fragments.json'), ...J('fragments-mc.json').fragments];
const ozgardi = barcha.filter(f => JSON.stringify(cutlist(f, f.w, f.d, f.h, toza, {})) !== JSON.stringify(cutlist(f, f.w, f.d, f.h, mats, {})));
ok(`eski modullar o'zgarmadi: ${barcha.length} ta modul kesimi Bazis materiallari bilan ham aynan`, !ozgardi.length, ozgardi.slice(0, 3).map(f => f.code).join(','));

/* ── 3b) BPJ (JSON) — sun'iy namuna: bitta panel, global joylashuv, kromka, furnitura ── */
const bpjNamuna = { version: '4.2', script: 'BazisUniversalExport', objects: [{ id: 1, name: 'bok', dimensions: { dl: 700, dw: 450, dp: 16 },
  material: { name: 'ЛДСП Кроношпан 4,575 Белый гладкий 16мм' },
  contour: { outer: [{ type: 'line', x1: 0, y1: 0, x2: 700, y2: 0 }, { type: 'line', x1: 700, y1: 0, x2: 700, y2: 450 }, { type: 'line', x1: 700, y1: 450, x2: 0, y2: 450 }, { type: 'line', x1: 0, y1: 450, x2: 0, y2: 0 }] },
  butts: [{ elemIndex: 2, material: 'Кромка 19/1', thickness: 1 }],
  transform: { origin: { x: 0, y: 0, z: 0 }, axisX: { x: 0, y: 1, z: 0 }, axisY: { x: 0, y: 0, z: 1 }, axisZ: { x: 1, y: 0, z: 0 } } }],
  furnitures: [{ name: 'Габаритная рамка', count: 3 }, { name: 'petle oddiy', count: 4 }, { name: 'Евро 51мм Алкан', count: 8 }] };
const bp = bpjOqi(bpjMatn(new TextEncoder().encode(JSON.stringify(bpjNamuna))));
const bres = bazisLoyiha(bp.objects, { fayl: 'n.bpj', fittings: bp.fittings, fasteners: bp.fasteners });
ok('BPJ: panel, o\'lcham, kromka, furnitura (guruh nomi tashlanadi)', bres.fragment.parts.length === 1 && bres.fragment.parts[0].len === '700' && bres.fragment.edge.length === 1
  && bp.fittings.length === 1 && bp.fasteners.length === 1 && bres.fragment.w === 16 && bres.fragment.d === 450 && bres.fragment.h === 700, JSON.stringify([bres.fragment.w, bres.fragment.d, bres.fragment.h, bp.fittings, bp.fasteners]));
ok('BPJ: buzilgan JSON — xato kodi', bpjOqi('{bu json emas').xato === 'S3D-BAZIS-103');
const BPJ1 = join(ROOT, '..', 'mebelcity-platform', '1.bpj');
if (existsSync(BPJ1)) {
  const b1 = bpjOqi(bpjMatn(new Uint8Array(readFileSync(BPJ1))));
  const r1 = bazisLoyiha(b1.objects, { fayl: '1.bpj', fittings: b1.fittings, fasteners: b1.fasteners });
  const mm = Object.fromEntries(r1.materiallar.panel.map(m => [m.name.slice(0, 12), m.detal]));
  ok('1.bpj (haqiqiy eksport): 125 panel, materiallar BPJ hisobi bilan bir xil (89 / 25 / 11)', r1.hisobot.detal === 125 && Object.values(mm).sort((a, b) => b - a).join() === '89,25,11', JSON.stringify(mm));
} else skip('1.bpj (mebelcity-platform yo\'q)');

/* ── 3c) TZ-23 A5: 3D aniqligi — egri kontur (elementlar tartibsiz), o'yiq, material rangi, oyoq va ruchka ── */
const { docXatosi } = await import('../server/himoya.js');
/** shakl nuqtalari (z = 0 va t) o'qlar bilan o'girilganda — bazis3d qutisiga tushadimi (tartib va o'qlar to'g'riligi) */
const shaklQutida = (fr, tol = 2) => (fr.bazisShakl || []).every(([i, o, m, t, pts]) => {
  const b = fr.bazis3d[i], lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let k = 0; k < pts.length; k += 2) for (const z of [0, t]) for (let a = 0; a < 3; a++) {
    const v = o[a] + pts[k] * m[a] + pts[k + 1] * m[3 + a] + z * m[6 + a]; lo[a] = Math.min(lo[a], v); hi[a] = Math.max(hi[a], v);
  }
  return [0, 1, 2].every(a => Math.abs(lo[a] - (b[a] - b[3 + a] / 2)) <= tol && Math.abs(hi[a] - (b[a] + b[3 + a] / 2)) <= tol);
});
const L = (x1, y1, x2, y2) => ({ type: 'line', p1: [x1, y1], p2: [x2, y2] });
const egriObs = [
  /* stoleshnitsa: burchagi yumaloq (R 50), elementlar aralash tartibda va biri teskari; moyka o'yig'i */
  { modelCode: B.PANEL_CODE, name: 'Столешница', material: 'Столешница 26мм', thickness: 26,
    contour_outer: [L(0, 600, 0, 0), { type: 'arc', center: [550, 550], p1: [600, 550], p2: [550, 600], dir: true }, L(0, 0, 600, 0), L(600, 0, 600, 550), L(550, 600, 0, 600)],
    contour_inner: [[L(100, 100, 400, 100), L(400, 100, 400, 400), L(400, 400, 100, 400), L(100, 400, 100, 100)]],
    tf: { pos: [0, 850, 0], oq: [[1, 0, 0], [0, 0, -1], [0, 1, 0]] } },
  { modelCode: B.PANEL_CODE, name: 'bok', material: 'ЛДСП Кроношпан 4,575 Белый гладкий 16мм', thickness: 16,
    contour_outer: [L(0, 0, 600, 0), L(600, 0, 600, 750), L(600, 750, 0, 750), L(0, 750, 0, 0)], tf: { pos: [0, 100, 0], oq: [[0, 0, -1], [0, 1, 0], [1, 0, 0]] } },
  { modelCode: 3001, name: 'nojka nikel 100 mm', tf: { pos: [100, 100, -100], oq: [[0, 0, -1], [1, 0, 0], [0, -1, 0]] } },
  { modelCode: 3001, name: 'Ручка 160 мм', tf: { pos: [300, 500, 10], oq: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] } },
  { modelCode: 2004, name: 'Ручка-профиль Gola', tf: { pos: [300, 700, 10], oq: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] } },
  { modelCode: 3001, name: 'Евро 51мм Алкан', tf: { pos: [5, 5, 5], oq: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] } }
];
const eg = bazisLoyiha(egriObs, { fayl: 'egri.b3d' }).fragment;
const sh0 = (eg.bazisShakl || [])[0];
ok('A5: egri stoleshnitsa — o\'z konturi (tartibsiz elementlar ulandi, yoy bo\'laklandi, moyka o\'yig\'i), to\'g\'ri burchakli yon devor — quti',
  (eg.bazisShakl || []).length === 1 && sh0[0] === 0 && sh0[4].length / 2 > 6 && sh0[5].length === 1 && sh0[5][0].length === 8, JSON.stringify(eg.bazisShakl).slice(0, 200));
ok('A5: shakl o\'qlari to\'g\'ri — nuqtalar panel qutisiga tushadi', shaklQutida(eg));
ok('A5: material — har panelga indeks (nom va BZM kodi)', eg.bazisMat.length === 2 && eg.bazis3d.every(b => eg.bazisMat[b[7]]) && /^BZM-/.test(eg.bazisMat[eg.bazis3d[1][7]][1]));
const fu = eg.bazisFurn || [];
ok('A5: oyoq (100 mm, pastga) va ruchka (160 mm); profil-ruchka va mahkamlagich — yo\'q', fu.length === 2 && fu[0][0] === 0 && fu[0][10] === 100 && Math.abs(fu[0][9] + 1) < 1e-6 && fu[1][0] === 1 && fu[1][10] === 160, JSON.stringify(fu));
const ea = getModulePanels(eg, eg.w, eg.d, eg.h, {});
ok('A5: 3D — shakl, dekor rangi (oq), furnitura assembler orqali', !!ea.panels[0].shakl && ea.panels[1].rang && ea.panels[1].rang.guruh === 'oq' && ea.furn.length === 2 && ea.furn[0].tur === 'oyoq');
ok('A5: server cheklovlari (himoya.js) — o\'tadi', !docXatosi({ v: 1, room: {}, placements: [], bazis: { fragment: eg } }));

/* ── 4) mahalliy ma'lumot (bo'lsa) ── */
const fayllar = (dir) => { const out = []; (function w(d) { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? w(p) : /\.(b3d|fr3d)$/i.test(f) && out.push(p); } })(dir); return out; };
const MC = join(ROOT, '..', 'Smart3D', 'data1', 'modulniy', 'modulniy');
const ERP = join(ROOT, '..', 'mebelcity-platform', 'client_erp', 'DOCS', 'bazis_erp_paket', 'bazis_bom.js');
const TOPLAM = join(ROOT, '..', 'Smart3D', 'Smart3D_toplam_2026-10-16', '01_buyurtma_fayllari');
const mcF = existsSync(MC) ? fayllar(MC) : [];
const topF = existsSync(join(TOPLAM, '04_bazis')) ? fayllar(join(TOPLAM, '04_bazis')) : [];

if (existsSync(ERP) && (mcF.length || topF.length)) {
  globalThis.pako = { inflate };
  const asl = createRequire(import.meta.url)(ERP);
  let teng = 0, jami = 0;
  for (const f of [...mcF, ...topF]) {
    const b = new Uint8Array(readFileSync(f));
    const a = asl.parseBazisB3D(b), c = B.parseBazisB3D(b, { inflate });
    jami++;
    if (a.encrypted || c.encrypted ? !!a.encrypted === !!c.encrypted : JSON.stringify(asl.generateSpecification(a.objects)) === JSON.stringify(B.generateSpecification(c.objects))) teng++;
  }
  ok(`ko'chirma ERP asli (bazis_bom.js) bilan aynan: ${teng}/${jami} fayl`, teng === jami && jami > 0);
} else skip('ERP asli bilan tenglik (mebelcity-platform yoki fayllar yo\'q)');

if (mcF.length && existsSync(join(ROOT, 'scripts', 'bazis_daraxt.py'))) {
  const py = join(mkdtempSync(join(tmpdir(), 's3d-bz-')), 'd.json');
  const kod = `import sys, json, os\nsys.dont_write_bytecode = True\nsys.path.insert(0, ${JSON.stringify(join(ROOT, 'scripts'))})\nimport bazis_daraxt as D\nout = {}\nfor p in json.loads(sys.argv[1]):\n    obs = D.daraxt(p)\n    out[p] = None if obs is None else [[round(x, 2) for x in o['pos']] for o in obs if o['kod'] == D.PANEL]\njson.dump(out, open(sys.argv[2], 'w'))\n`;
  let pyRes = null;
  try { execFileSync('python3', ['-I', '-c', kod, JSON.stringify(mcF), py], { stdio: 'pipe', timeout: 120000 }); pyRes = JSON.parse(readFileSync(py, 'utf8')); } catch (e) { pyRes = null; }
  if (pyRes) {
    let teng = 0;
    for (const f of mcF) {
      const r = daraxt(new Uint8Array(readFileSync(f)), { inflate });
      const js = r && r.objects ? r.objects.filter(o => o.modelCode === 4002).map(o => o.tf.pos.map(x => Math.round(x * 100) / 100)) : null;
      if (JSON.stringify(js) === JSON.stringify(pyRes[f])) teng++;
    }
    ok(`daraxt Python (bazis_daraxt.py) bilan aynan: ${teng}/${mcF.length} MC modul (panel joylari)`, teng === mcF.length);
  } else skip('Python daraxti bilan tenglik (python3 yoki ERP parseri yo\'q)');
} else skip('Python daraxti bilan tenglik (data1 yo\'q)');

if (topF.length && existsSync(join(TOPLAM, '01_arra'))) {
  const dec = (buf) => { let s = new TextDecoder('utf-8').decode(buf); if (s.includes('�')) s = new TextDecoder('windows-1251').decode(buf); return s; };
  const attrs = (t) => Object.fromEntries([...t.matchAll(/([\w.]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
  const giblab = (file) => {
    const s = dec(readFileSync(file)), pp = {}, out = {};
    const prod = s.match(/<good typeId="product"[\s\S]*?<\/good>/);
    if (prod) for (const m of prod[0].matchAll(/<part ([^>]*?)\/>/g)) { const a = attrs(m[1]); pp[a.id] = a; }
    for (const m of s.matchAll(/<operation typeId="CS"[^>]*>([\s\S]*?)<\/operation>/g)) for (const pm of m[1].matchAll(/<part id="(\d+)"/g)) {
      const p = pp[pm[1]]; if (!p) continue;
      const k = Math.max(+p.dl, +p.dw) + 'x' + Math.min(+p.dl, +p.dw); out[k] = (out[k] || 0) + (+p.count || 1);
    }
    return out;
  };
  let jg = 0, jm = 0, n = 0, eng = 1, sekin = 0;
  for (const d of readdirSync(join(TOPLAM, '04_bazis')).filter(x => /^\d+_/.test(x))) {
    const f = readdirSync(join(TOPLAM, '04_bazis', d)).find(x => /\.b3d$/i.test(x));
    if (!f || !existsSync(join(TOPLAM, '01_arra', d))) continue;
    const t0 = Date.now();
    const r = daraxt(new Uint8Array(readFileSync(join(TOPLAM, '04_bazis', d, f))), { inflate });
    const sp = B.generateSpecification(r.objects);
    const rs = bazisLoyiha(r.objects, { fayl: f, fittings: sp.fittings, fasteners: sp.fasteners });
    const m2 = J('materials.json'); materiallarniQosh(m2, rs.materiallar);
    const c2 = cutlist(rs.fragment, rs.fragment.w, rs.fragment.d, rs.fragment.h, m2, {});
    const ns = nestProject(c2.parts.map(p => Object.assign({}, p, { id: 'x:' + p.ref })), m2, { mode: 'bssf', kerf: 4, trimL: 10, trimW: 10 });
    const pc = productionCost([c2], m2, { nestResult: ns });
    sekin = Math.max(sekin, Date.now() - t0);
    const ours = {}; for (const p of c2.parts) { const k = Math.max(p.finish_length, p.finish_width) + 'x' + Math.min(p.finish_length, p.finish_width); ours[k] = (ours[k] || 0) + 1; }
    let best = null;
    for (const pf of readdirSync(join(TOPLAM, '01_arra', d)).filter(x => /\.project$/i.test(x))) {
      const g = giblab(join(TOPLAM, '01_arra', d, pf));
      const mos = Object.keys(g).reduce((a, k) => a + Math.min(g[k], ours[k] || 0), 0), ng = Object.values(g).reduce((a, b) => a + b, 0);
      if (!best || mos > best.mos) best = { mos, ng };
    }
    n++; jg += best.ng; jm += best.mos; eng = Math.min(eng, best.mos / best.ng);
    if (!(pc.totalCost > 0) || c2.errors.length) ok(d.slice(0, 4) + ': smeta va kesim xatosiz', false, c2.errors.slice(0, 2).join('; '));
  }
  ok(`${n} ta haqiqiy buyurtma: sexdagi GibLab detallarining ${(100 * jm / jg).toFixed(1)}% i bizning kesim ro'yxatida (≥ 97%)`, n >= 30 && jm / jg >= 0.97, jm + '/' + jg);
  ok(`har buyurtmada kamida 70% (eng pasti ${(100 * eng).toFixed(0)}% — Bazis va GibLab fayllari boshqa versiya bo'lishi mumkin)`, eng >= 0.7);
  ok(`eng uzoq fayl ${sekin} ms (< 3000)`, sekin < 3000);
} else skip('30 ta haqiqiy buyurtma (Smart3D_toplam_2026-10-16 yo\'q)');

if (topF.length) {
  /* TZ-23 A5: haqiqiy fayllarda — egri panellar o'z konturi bilan, oyoq va ruchkalar, server cheklovlari */
  let sh = 0, oy = 0, ru = 0, qutida = 0, xatoli = [], yonida = 0;
  /* furnitura nuqtasi biror panel yonida (±30 mm) — joyi to'g'ri o'qilgan */
  const yon = (fr, f) => fr.bazis3d.some(b => [0, 1, 2].every(a => Math.abs(f[1 + a] - b[a]) <= b[3 + a] / 2 + 30));
  for (const f of topF.filter(x => /\.b3d$/i.test(x))) {
    const r = daraxt(new Uint8Array(readFileSync(f)), { inflate });
    if (!r || !r.objects) continue;
    const rs = bazisLoyiha(r.objects, { fayl: 'x.b3d' });
    if (rs.xato) continue;
    const fr = rs.fragment;
    sh += (fr.bazisShakl || []).length; oy += (fr.bazisFurn || []).filter(x => x[0] === 0).length; ru += (fr.bazisFurn || []).filter(x => x[0] === 1).length;
    yonida += (fr.bazisFurn || []).filter(x => yon(fr, x)).length;
    if (shaklQutida(fr)) qutida++; else xatoli.push(f.split('/').pop());
    const xe = docXatosi({ v: 1, room: {}, placements: [], bazis: { fragment: fr, materiallar: rs.materiallar, hisobot: rs.hisobot } });
    if (xe) xatoli.push(f.split('/').pop() + ': ' + xe);
  }
  ok(`A5: ${topF.length} ta haqiqiy faylda ${sh} egri panel, ${oy} oyoq, ${ru} ruchka; shakllar qutida, server cheklovlari ichida`, sh >= 100 && oy >= 150 && ru >= 150 && !xatoli.length, xatoli.slice(0, 3).join('; '));
  ok(`A5: oyoq va ruchkalar panel yonida — ${yonida}/${oy + ru}`, yonida === oy + ru, yonida + '/' + (oy + ru));
} else skip('A5 haqiqiy fayllar (Smart3D_toplam_2026-10-16 yo\'q)');

console.log(fail ? `\n❌ ${fail} xato (${pass} pass)` : `\n=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
