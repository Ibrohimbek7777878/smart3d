/* verify_mc.mjs — TZ-HAQIQIY-MODULLAR A5: MebelCity Bazis modullari (fragments-mc.json).
   Ishga tushirish: node tests/verify_mc.mjs
   [1] import butunligi · [2] Bazis bilan solishtirish (detal soni, maydon) · [3] sex standartlari
   [4] formula cho'zilishi · [5] haqiqiy modullardan oshxona: detal → kroy → narx → eksportlar */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'node:url';
import { cutlist, productionCost } from '../app/js/engine/cutlist.js';
import { nestProject } from '../app/js/engine/nesting.js';
import { deriveKitchen } from '../app/js/engine/kitchen.js';
import { validateDoc } from '../app/js/engine/rules.js';
import { applySexStandart } from '../app/js/engine/standart.js';
import { nestDXF, cutGCode } from '../app/js/engine/cnc.js';
import { buildOBJ } from '../app/js/engine/objexport.js';
import { buildGLB } from '../app/js/engine/glbexport.js';
import { buildBPJ } from '../app/js/engine/bpj.js';
import { buildProject } from '../app/js/engine/giblab.js';
import { buildXLSX } from '../app/js/engine/xlsxexport.js';

const J = (p) => JSON.parse(readFileSync(fileURLToPath(new URL('../app/data/' + p, import.meta.url)), 'utf8'));
const mc = J('fragments-mc.json').fragments;
const mats = J('materials.json');
const std = J('sex-standartlari.json');
const furnById = Object.fromEntries(J('furnitura-catalog.json').items.filter(i => i.id).map(i => [i.id, i]));
const catalog = Object.fromEntries([...J('fragments.json'), ...mc].map(f => [f.code, f]));
for (const f of Object.values(catalog)) applySexStandart(f, std);
const SLOTS = { korpus: 'LDSP16', polka: 'LDSP16', fasad: 'LDSP16' };   // Bazis modullari 16 mm LDSP

let n = 0, fails = 0;
const ok = (name, cond, extra = '') => {
  n++;
  if (!cond) { fails++; console.log('FAIL  ' + name + (extra ? '  → ' + extra : '')); }
  else console.log('ok    ' + name);
};

/* ══ [1] import butunligi ══ */
console.log('\n[1] Import');
ok('38 ta MebelCity moduli', mc.length === 38, String(mc.length));
ok('kodlar noyob (MC-…)', new Set(mc.map(f => f.code)).size === mc.length && mc.every(f => /^MC-[A-Z]{2}-\d{2}$/.test(f.code)));
ok('stoleshnitsa bo\'lagi modulda yo\'q (F2 yaxlit quradi)', mc.every(f => !f.parts.some(p => /stol|столешн/i.test(p.nom + p.code))));
ok('avtomatik furnitura o\'chiq (Bazis BOM to\'liq)', mc.every(f => f.auto_hardware === false));
ok('o\'ylab topilgan narx yo\'q: furnitura ID faqat ERP katalogidan', mc.every(f => f.hardware.every(h => !h.id || furnById[h.id])));
{ /* plita taklifida rang/dekor mos (B2): Bazis nomidagi har so'z (5 harf o'zagi) ERP nomida bor */
  const stems = (t) => String(t).toLowerCase().split(/[^a-zа-яё]+/i).filter(x => x.length >= 4 && !/^standart/.test(x)).map(x => x.slice(0, 5));
  const plita = J('id-links.json').links.filter(l => l.tur === 'plita' && (l.holat === 'taklif' || l.holat === 'aniq'));
  const bad = plita.filter(l => { const e = stems(l.erp_nom); return stems(l.nom).some(x => !e.includes(x)); });
  ok('plita taklifi: rangi boshqa mahsulot taklif qilinmaydi (ЛХДФ Белый ≠ Кашемир)', bad.length === 0, bad.map(l => l.nom + ' → ' + l.erp_nom).join(' | '));
}

/* ══ [2] Bazis bilan solishtirish (Bazis o'lchamida) ══ */
console.log('\n[2] Bazis bilan solishtirish');
let cntBad = [], zagBad = [], bomBad = [], bomN = 0, hwBad = [], edgeRep = [];
for (const f of mc) {
  const [W, D, H] = f.manba.bazis_olcham;
  const cl = cutlist(f, W, D, H, mats, { projectSlots: SLOTS });
  if (cl.errors.length) { cntBad.push(`${f.code}: ${cl.errors[0].message}`); continue; }
  const want = f.manba.bazis_panel - f.manba.stoleshnitsa_chiqarildi;
  if (cl.parts.length !== want) cntBad.push(`${f.code}: ${cl.parts.length}≠${want}`);
  const hwSum = (arr) => arr.reduce((s, x) => s + (+x.qty || 0), 0);
  if (hwSum(cl.hardware) !== hwSum(f.hardware)) hwBad.push(`${f.code}: ${hwSum(cl.hardware)}≠${hwSum(f.hardware)}`);
  if (f.manba.bom_kromka_m > 0) edgeRep.push([f.code, Math.round(cl.edges.reduce((s, e) => s + e.meters, 0) * 10) / 10, f.manba.bom_kromka_m]);
  /* tayyor (kromkasiz) o'lcham maydoni, Bazis materiali bo'yicha */
  const bzMat = Object.fromEntries(f.parts.map(q => [q.code, q.bazis_material]));
  const our = {};
  for (const p of cl.parts) our[bzMat[p.code]] = (our[bzMat[p.code]] || 0) + p.finish_length * p.finish_width / 1e6;
  const near = (a, b, tol) => Math.abs(a - b) <= Math.max(0.005, tol * b);
  /* (a) Bazis panellarining to'g'ri to'rtburchak o'lchami (kesish zagotovkasi) — aniq mos */
  for (const [m, a] of Object.entries(f.manba.zagotovka_m2))
    if (!near(our[m] || 0, a, 0.005)) zagBad.push(`${f.code} ${m.slice(0, 20)}: ${(our[m] || 0).toFixed(3)} vs ${a}`);
  /* (b) Bazis BOM (kontur maydoni) — faqat shaklli/o'qilmagan paneli yo'q modullarda */
  if (f.manba.kontur_farq) continue;
  bomN++;
  for (const [m, a] of Object.entries(f.manba.bom_maydon_m2)) {
    if (/столешн|stol/i.test(m)) continue;
    if (!near(our[m] || 0, a, 0.03)) bomBad.push(`${f.code} ${m.slice(0, 20)}: ${(our[m] || 0).toFixed(3)} vs Bazis ${a}`);
  }
}
ok('detallar soni Bazis bilan bir xil (38 modul)', cntBad.length === 0, cntBad.slice(0, 4).join(' | '));
{
  /* fayl oxiridagi amallar tarixi (undo: "Удаление 40 объектов", "Зеркальное отражение") detal bo'lmaydi */
  const qty = (c, nom) => catalog[c].parts.filter(p => p.nom === nom).reduce((s, p) => s + p.qty, 0);
  ok('amallar tarixi olinmaydi: yash 3 x — 3 tortma (eski 16), krovat detski — 26 panel (eski 52), kargo — 8 (eski 16)',
    qty('MC-KP-10', 'Фасад ящика') === 3 && catalog['MC-KR-01'].manba.bazis_panel === 26 && catalog['MC-KP-06'].manba.bazis_panel === 8,
    `${qty('MC-KP-10', 'Фасад ящика')} / ${catalog['MC-KR-01'].manba.bazis_panel} / ${catalog['MC-KP-06'].manba.bazis_panel}`);
}
ok('furnitura soni Bazis BOM bilan bir xil (cutlist qo\'shmaydi/tushirmaydi)', hwBad.length === 0, hwBad.slice(0, 4).join(' | '));
ok('har material maydoni = Bazis panel o\'lchamlari ±0.5% (38 modul)', zagBad.length === 0, zagBad.slice(0, 4).join(' | '));
console.log(`      kromka (ma'lumot): qoida bo'yicha vs Bazis BOM, ${edgeRep.length} modulda Bazis kromkasi bor — ` +
  edgeRep.slice(0, 5).map(([c, a, b]) => `${c} ${a}/${b} m`).join(' · '));
ok(`Bazis BOM (kontur) maydoni ±3% (${bomN} modul; shaklli panelli ${38 - bomN} tasi — zagotovka bo'yicha)`, bomBad.length === 0 && bomN >= 30, bomBad.slice(0, 4).join(' | '));

/* ══ [3] sex standartlari ══ */
console.log('\n[3] Sex standartlari');
const kp2 = catalog['MC-KP-02'];
ok('pastki 2 eshikli: eni 600–1070, bo\'yi 600–880, chuqurligi 450–580',
  kp2.min_w === 600 && kp2.max_w === 1070 && kp2.min_h === 600 && kp2.max_h === 880 && kp2.min_d === 450 && kp2.max_d === 580,
  JSON.stringify([kp2.min_w, kp2.max_w, kp2.min_h, kp2.max_h, kp2.min_d, kp2.max_d]));
const v = validateDoc({ room: { outline: [[0, 0], [4000, 0], [4000, 3000], [0, 3000]], openings: [] },
  placements: [{ id: 'p1', frg: 'MC-KP-02', x: 100, y: 100, z: 0, w: 600, d: 450, h: 1000, rot: 0 }] }, { catalog });
ok('bo\'yi 1000 > 880 → W_SIZE_CLAMP ogohlantirishi', v.warnings.some(w => w.code === 'W_SIZE_CLAMP' && /bo'yi/.test(w.message)), JSON.stringify(v.warnings));
const vit = catalog['MC-KU-09'];
ok('vityajka — o\'lchami o\'zgarmas (texnikaga moslangan)', vit.min_w === vit.max_w && vit.min_h === vit.max_h);
ok('krovat detski — tub panel aniq emas → o\'zgarmas', catalog['MC-KR-01'].min_w === catalog['MC-KR-01'].max_w && catalog['MC-KR-01'].min_d === catalog['MC-KR-01'].max_d);

/* ══ [3b] krovat va parta — ГОСТ (C): matras asosi / stol usti standart o'lchamga teng ══ */
console.log('\n[3b] Krovat va parta (ГОСТ 13025.2-85, ГОСТ 11015-93)');
const lim = (f) => [f.min_w, f.max_w, f.min_d, f.max_d, f.min_h, f.max_h].join(',');
ok('KR-02 chegarasi: eni 700–1800, uzunligi (d = asos + 10) 1870–2060, bo\'yi o\'zgarmas', lim(catalog['MC-KR-02']) === '700,1800,1870,2060,416,416', lim(catalog['MC-KR-02']));
ok('KR-05 chegarasi: uzunligi X o\'qida (w = asos + 5) 1865–2055, eni (d = asos + 37) 737–1837', lim(catalog['MC-KR-05']) === '1865,2055,737,1837,900,900', lim(catalog['MC-KR-05']));
ok('PA-01 chegarasi: uzunligi 600–1200, chuqurligi (d = usti − 110) ≥ 340, balandligi 460–820', lim(catalog['MC-PA-01']) === '600,1200,340,,460,820', lim(catalog['MC-PA-01']));
ok('standart o\'lcham: KR-02/03 900×2010, KR-04 uzunligi X o\'qida 2000, PA-01 eni 600',
  ['MC-KR-02', 'MC-KR-03'].every(c => catalog[c].w === 900 && catalog[c].d === 2010) && catalog['MC-KR-04'].w === 2000 && catalog['MC-PA-01'].w === 600);
/* Bazis'da KR-04 karavoti 90° burilgan guruh ichida, tortmalari guruhdan tashqarida — daraxt (bazis_daraxt.py)
   burilishni qo'shadi: bo'yi bosh qismi bilan 1166 (eski tekis o'qishda 416 chiqqan edi) */
ok('KR-04: guruh burilishi hisobga olingan — 2000×1750×1166; uzunligi (w) 1860–2050, eni (d = asos + 42) 742–1842, bo\'yi o\'zgarmas', lim(catalog['MC-KR-04']) === '1860,2050,742,1842,1166,1166' && catalog['MC-KR-04'].d === 1750 && catalog['MC-KR-04'].h === 1166, lim(catalog['MC-KR-04']));
{
  const sx = std.modullar, bad = [];
  for (const f of mc.filter(f => f.standart_map)) {
    const st = sx[f.standart], mp = f.standart_map;
    /* har standart o'lchamni min / std / max qiymatida tekshiramiz, qolganlari — modulning o'zi */
    for (const k of f.standart_olchamlar) {
      const vals = [st[k].min, (st[k].std || [])[0], st[k].max].filter(v => v != null);
      for (const v of vals) {
        const size = { w: f.w, d: f.d, h: f.h };
        size[mp[k].o] = v + mp[k].ofset;
        const cl = cutlist(f, size.w, size.d, size.h, mats, { projectSlots: SLOTS });
        const tag = `${f.code} ${k}=${v}`;
        if (cl.errors.length) { bad.push(tag + ': ' + cl.errors[0].message); continue; }
        if (cl.parts.some(p => !(p.finish_length > 0 && p.finish_width > 0))) { bad.push(tag + ': manfiy/0 detal'); continue; }
        if (k === 'h') continue;
        /* asos paneli: o'lchamlaridan biri aynan standart qiymat */
        const a = cl.parts.find(p => p.code === f.standart_detal);
        if (!a || ![a.finish_length, a.finish_width].includes(v)) bad.push(`${tag}: ${f.standart_detal} ${a && a.finish_length}×${a && a.finish_width}`);
      }
    }
  }
  ok('6 modul × min/std/max: formula xatosi yo\'q, hamma detal > 0, asos paneli = standart qiymat', bad.length === 0, bad.slice(0, 4).join(' | '));
  const k2 = cutlist(catalog['MC-KR-02'], 900, 2010, 416, mats, { projectSlots: SLOTS }).parts.find(p => p.code === 'krovat_pol');
  ok('KR-02 standart o\'lchamda matras asosi 900×2000', k2 && k2.finish_length === 900 && k2.finish_width === 2000, k2 && `${k2.finish_length}×${k2.finish_width}`);
}

/* ══ [4] formula cho'zilishi ══ */
console.log('\n[4] Formula');
const c800 = cutlist(kp2, 800, 450, 708, mats, { projectSlots: SLOTS });
const dver = c800.parts.filter(p => p.code === 'dver'), polka = c800.parts.find(p => p.code === 'polka'), bok = c800.parts.find(p => p.code === 'bok');
ok('eni 800: 2 eshik, har biri (800−4)/2 = 398', dver.length === 2 && dver.every(p => p.finish_width === 398), JSON.stringify(dver.map(p => p.finish_width)));
ok('eni 800: polka = 800 − 2×16 = 768', polka && polka.finish_length === 768, polka && String(polka.finish_length));
ok('bo\'yi 708: yon devor = 708 − 16 = 692', bok && bok.finish_length === 692, bok && String(bok.finish_length));
const c18 = cutlist(kp2, 800, 450, 708, mats, { projectSlots: { korpus: 'LDSP18', polka: 'LDSP18', fasad: 'LDSP18' } });
ok('LDSP18 tanlansa polka = 800 − 2×18 = 764', c18.parts.find(p => p.code === 'polka').finish_length === 764);
const cMix = cutlist(kp2, 800, 450, 708, mats, { projectSlots: { korpus: 'LDSP18', polka: 'LDSP16', fasad: 'LDSP16' } });
ok('korpus 18, polka 16: polka = 800 − 2×18 = 764 (t — korpus qalinligi)', cMix.parts.find(p => p.code === 'polka').finish_length === 764);
const sh5 = cutlist(catalog['MC-SH-05'], ...catalog['MC-SH-05'].manba.bazis_olcham, mats, { projectSlots: SLOTS });
ok('shisha OYNA slotida — LDSP kroyiga tushmaydi', sh5.parts.filter(p => p.code === 'oyna').every(p => p.material === 'OYNA' && p.thickness === 4) && sh5.parts.some(p => p.code === 'oyna'));

/* ══ [5] haqiqiy modullardan oshxona ══ */
console.log('\n[5] Oshxona (MebelCity modullari)');
const lower = [['MC-KP-08', 600], ['MC-KP-11', 400], ['MC-KP-02', 600], ['MC-KP-04', 450]];
const upper = [['MC-KU-04', 600], ['MC-KU-07', 600], ['MC-KU-03', 300]];
let x = 50;
const placements = lower.map(([c, w], i) => { const f = catalog[c]; const p = { id: 'p' + (i + 1), frg: c, x, y: 50, z: 0, w, d: f.d, h: f.h, rot: 0, qty: 1 }; x += w; return p; });
x = 50;
upper.forEach(([c, w], i) => { const f = catalog[c]; placements.push({ id: 'u' + (i + 1), frg: c, x, y: 50, z: 1450, w, d: f.d, h: f.h, rot: 0, qty: 1 }); x += w; });
const doc = { v: 1, room: { outline: [[0, 0], [3000, 0], [3000, 2500], [0, 2500]], wall_height: 2700, wall_thickness: 100, openings: [] },
  placements, kitchen: { stoleshnitsa: true, sokol: true, dobor: false, karniz: false, moyka: { on: false } } };
const derived = deriveKitchen(doc, catalog);
ok('yaxlit stoleshnitsa bitta (2050 mm qator)', derived.filter(p => p.frg === 'SP-ST-001').length === 1, JSON.stringify(derived.map(p => p.frg)));
const all = placements.concat(derived);
const cls = [];
for (const p of all) {
  const cl = cutlist(catalog[p.frg], p.w, p.d, p.h, mats, { projectSlots: SLOTS });
  cl.placementId = p.id; cls.push(cl);
}
ok('formula xatolari yo\'q', cls.every(c => c.errors.length === 0), JSON.stringify(cls.flatMap(c => c.errors).slice(0, 2)));
const parts = []; cls.forEach(cl => cl.parts.forEach(pp => parts.push(Object.assign({}, pp, { id: cl.placementId + ':' + pp.ref }))));
const nest = nestProject(parts, mats, { mode: 'bssf', kerf: 4, trimL: 10, trimW: 10 });
const unpl = Object.values(nest.by_material).reduce((s, r) => s + (r.unplaced || []).length, 0);
ok(`kroy: ${parts.length} detal, ${nest.summary.total_sheets} varaq, sig'magan 0`, unpl === 0, String(unpl));
const prod = productionCost(cls, mats, { nestResult: nest, furnituraById: furnById });
ok(`tannarx ${prod.totalCost} > 0, mijoz narxi ${prod.clientTotal}`, prod.totalCost > 0 && prod.clientTotal > prod.totalCost);
const mcHw = prod.lines.filter(l => l.group === 'Furnitura' && (l.id || /^BZ-/.test(l.code)));
ok('MebelCity zapchastlari smetada (nomi bilan)', mcHw.length > 5 && mcHw.every(l => l.name && !/^BZ-/.test(l.name)), String(mcHw.length));
ok('ERP\'da narxi yo\'q zapchast — 0 so\'m va "narx yo\'q" (o\'ylab topilmaydi)',
  mcHw.every(l => (l.unit_price > 0) === !!(l.id && furnById[l.id] && furnById[l.id].uzs > 0 && !furnById[l.id].no_price)) &&
  mcHw.filter(l => !(l.unit_price > 0)).every(l => prod.missing.some(m => m.code === l.code)));
const val = validateDoc(doc, { catalog });
ok('validatsiya: xato yo\'q, ustma-ust yo\'q', val.errors.length === 0 && !val.warnings.some(w => /OVERLAP/.test(w.code)), JSON.stringify(val.errors.concat(val.warnings.filter(w => /OVERLAP/.test(w.code)))).slice(0, 300));
const tryE = (name, fn) => { try { const r = fn(); ok(`eksport ${name}`, !!r); } catch (e) { ok(`eksport ${name}`, false, e.message); } };
tryE('OBJ', () => buildOBJ(doc, catalog).obj.length > 100);
tryE('GLB', () => buildGLB(doc, catalog).glb.byteLength > 1000);
tryE('BPJ', () => buildBPJ(doc, catalog, mats, { cutlists: cls }).meta.totalPanels > 0);
tryE('GibLab', () => buildProject({ cutlists: cls, materials: mats, modelName: 'MC', materialCode: 'LDSP', nest, settings: { kerf: 4, trimL: 10, trimW: 10 } }).xml.length > 100);
tryE('DXF', () => nestDXF(Object.assign({}, nest, { _cutlists: cls })).length > 100);
tryE('G-code', () => cutGCode(nest, cls, { toolDia: 6 }).length > 100);
tryE('Excel', () => buildXLSX({ prod, priceRes: { lines: [], total: prod.clientTotal }, materials: mats }).byteLength > 1000);
{ /* Excel STORE (siqilmagan) — 3-bo'lim furnitura ro'yxatida MebelCity zapchastlari nomi bor */
  const txt = new TextDecoder().decode(buildXLSX({ prod, priceRes: { lines: [], total: prod.clientTotal }, materials: mats }));
  const nm = mcHw.map(l => l.name.replace(/&/g, '&amp;').replace(/</g, '&lt;'));
  ok(`Excel furnitura bo'limida MebelCity zapchastlari (${nm.length} ta)`, nm.every(x => txt.includes(x)), nm.filter(x => !txt.includes(x)).slice(0, 3).join(' | '));
}
console.log(`\n   oshxona: ${placements.length} modul + ${derived.length} element · ${parts.length} detal · ${nest.summary.total_sheets} varaq · tannarx ${prod.totalCost} · mijoz ${prod.clientTotal} · narxsiz ${prod.missing.length} ta`);

console.log('\n' + (fails === 0 ? `=== HAMMASI OK (${n - fails} pass, 0 fail) ===` : `=== ${fails}/${n} XATO ===`));
process.exit(fails ? 1 : 0);
