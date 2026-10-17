/* #182: "Asosiy 100" dekor — har biri ideal ishlashi: 100 dekor × (korpus, fasad) × (MC-KP-02, SP-K-001) × (faqat shu modul, butun loyiha).
 * Har holatda: ERP plitasi loyihaga qo'shiladi (doc.erpMat), kesim ro'yxatidagi shu qism detallari aynan shu ERP kodda, raskroyda list narxi =
 * shu plitaning ERP narxi, 3D rangi (joyRanglari) = rang_hex = plitkadagi rang (plitaRangi), saqlanib (JSON) yangi hisob bazasida qayta
 * ochilganda — material va narx tiklanadi. Korpus tanlansa polka ham shu dekorda (3D va kesim bir xil). Ro'yxat: mijoz nomisiz, 100 ta, takrorsiz. */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
globalThis.SpPrice = require('../app/js/engine/price.js');
const { loadData, createHisob } = await import('../web/src/services/hisob.js');
const E = await import('../web/src/services/erpMaterial.js');
const { dekorKalit } = await import('../app/js/engine/dekorAsosiy.js');

const DATA = fileURLToPath(new URL('../app/data/', import.meta.url));
const read = n => Promise.resolve(JSON.parse(readFileSync(DATA + n, 'utf8')));
let pass = 0, fail = 0;
const xatolar = [];
const ok = (name, cond, info = '') => { if (cond) pass++; else { fail++; xatolar.push(name + ' ' + info); } };
const ochiq = (name, cond, info = '') => { ok(name, cond, info); console.log(cond ? '  ✓' : '  ✗', name, cond ? '' : info); };

const H = createHisob(await loadData(read)), H2 = createHisob(await loadData(read));   // H2 — qayta ochish (yangi sahifa)
const A = JSON.parse(readFileSync(DATA + 'dekor-asosiy.json', 'utf8')).items;
const sheets = H.sheetCatalog.sheets, bySh = new Map(sheets.map(s => [E.erpKod(s), s]));
const room = { outline: [[0, 0], [3600, 0], [3600, 3000], [0, 3000]], wall_height: 2700, wall_thickness: 100, openings: [] };
const yangi = (frg) => { const f = H.catalog[frg]; return { v: 1, room, placements: [{ id: 'p1', frg, x: 50, y: 50, z: frg === 'SP-K-001' ? 0 : 100, w: f.w, d: f.d, h: f.h, rot: 0, qty: 1 }] }; };
const SLOT = { korpus: ['korpus', 'polka'], fasad: ['fasad'] };
const pj0 = { matCode: 'LDSP18', polkaCode: 'LDSP16', fasadCode: 'MDF16' };

/* 1. ro'yxat */
ochiq('dekor-asosiy.json: 100 yozuv, takrorsiz dekor, har birida ERP kodi, rang, manba', A.length === 100 && new Set(A.map(e => e.kalit)).size === 100 &&
  A.every(e => e.kodlar.length && /^#[0-9a-f]{6}$/.test(e.rang_hex) && ['yogoch', 'matt', 'glyanes'].includes(e.yuza) && ['aniq', 'taxminiy'].includes(e.rang_ishonch) && e.manba && e.manba.sex >= 0 && e.manba.qoldiq >= 0));
ochiq('har ERP kodi katalogdagi narxli LDSP/LMDF/MDF 16–18 mm plitasi va shu dekor kaliti', A.every(e => e.kodlar.every(c => { const s = bySh.get(c); return s && s.uzs > 0 && ['LDSP', 'LMDF', 'MDF'].includes(s.type) && s.th >= 15.5 && s.th <= 18.5; })));
ochiq('tartib: sexdagi buyurtmalar soni, keyin qoldiq (kamaymaydi)', A.every((e, i) => !i || A[i - 1].manba.sex > e.manba.sex || (A[i - 1].manba.sex === e.manba.sex && A[i - 1].manba.qoldiq >= e.manba.qoldiq)));
ochiq('mijoz ma\'lumoti yo\'q (faqat dekor, son, kod)', !/aka|ака|opa|\+998|998\d{9}/i.test(readFileSync(DATA + 'dekor-asosiy.json', 'utf8')));
ochiq('dekorKalit: ishlab chiqaruvchi/qalinlik/kod farqi — bitta dekor', dekorKalit('Белый гладкий 0110') === dekorKalit('белый гладкий') && dekorKalit('Дуб Cонома') === 'дуб сонома');

/* 2. har dekor × qism × modul × doira */
const tanla = (e, qism) => {
  const v = e.kodlar.map(c => bySh.get(c)).filter(Boolean);
  return v.find(s => +s.th === 16) || v[0];
};
let holat = 0;
for (const e of A) {
  const hexN = parseInt(e.rang_hex.slice(1), 16);
  for (const qism of ['korpus', 'fasad']) {
    const sh = tanla(e, qism);
    for (const frg of ['MC-KP-02', 'SP-K-001']) for (const doira of ['modul', 'loyiha']) {
      holat++;
      const id = `${e.o}.${e.dekor} ${qism} ${frg} ${doira}`;
      const doc = yangi(frg), code = E.erpQosh(H, doc, sh), pj = Object.assign({}, pj0);
      if (doira === 'modul') doc.placements[0].slots = Object.fromEntries(SLOT[qism].map(s => [s, code]));
      else if (qism === 'korpus') { pj.matCode = code; pj.polkaCode = code; } else pj.fasadCode = code;
      const opt = { materialCode: pj.matCode, polkaCode: pj.polkaCode, fasadCode: pj.fasadCode };
      const r = H.recalc(doc, opt);
      const parts = r.cutlists[0].parts.filter(p => SLOT[qism].includes(p.slot));
      ok('doc.erpMat: ' + id, !!(doc.erpMat && doc.erpMat[code] && doc.erpMat[code].sheet_price === sh.uzs));
      ok('kesim materiali: ' + id, parts.length > 0 && parts.every(p => p.material === code), JSON.stringify([...new Set(parts.map(p => p.material))]));
      const line = r.prod.lines.find(l => l.code === code);
      ok('narx (list narxi = ERP): ' + id, !!line && line.unit_price === sh.uzs && line.qty >= 1 && line.amount === line.unit_price * line.qty, JSON.stringify(line));
      const j = E.joyRanglari(H, doc.placements, pj)[0]._rang || {};
      ok('3D rang = rang_hex: ' + id, SLOT[qism].every(s => j[s] && j[s].rang === hexN && j[s].yogoch === (e.yuza === 'yogoch')), JSON.stringify(j));
      ok('plitka rangi = 3D: ' + id, E.plitaRangi(H, sh).rang === hexN);
      /* saqlash → yangi sahifa (H2) → qayta ochish */
      const saq = JSON.parse(JSON.stringify(E.erpSaqla(H, doc, [pj.matCode, pj.polkaCode, pj.fasadCode])));
      E.erpUla(H2, saq);
      const r2 = H2.recalc(saq, opt), l2 = r2.prod.lines.find(l => l.code === code);
      ok('qayta ochildi: ' + id, r2.cutlists[0].parts.filter(p => SLOT[qism].includes(p.slot)).every(p => p.material === code) && !!l2 && l2.unit_price === sh.uzs && r2.prod.clientTotal === r.prod.clientTotal);
    }
  }
}
ochiq(`${holat} holat (100 dekor × korpus/fasad × MC/SP × modul/loyiha): doc, kesim, narx, 3D, plitka, qayta ochish`, xatolar.length === 0, xatolar.slice(0, 5).join(' | '));
console.log(fail ? `=== XATO (${pass} pass, ${fail} fail) ===` : `=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
