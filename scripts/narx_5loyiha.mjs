/* narx_5loyiha.mjs — TZ-32 C: 5 namuna loyihada "Narx aniqligi" (oldin/keyin solishtirish uchun, faqat o'qish).
 *   1. Tez oshxona        — «Tez boshlash → oshxona» (ishjoyi.tezOshxona): standart xona 5×4 m, konstruktor 1-variant
 *   2. AI shkaf           — AI matni «Shkaf 1200×600×2200: chapda shtanga, o'ngda 4 polka, 2 eshik» → katalogdan tanlangan modul
 *   3. 3 MC modul         — MC-KP-08 600, MC-KP-04 450, MC-KU-04 600 (Bazis asosli sex modullari)
 *   4. 5 umumiy modul     — SP-K-001, SP-K-010, SP-W-005, SP-SH-003, SP-K-022 (umumiy shablon modullar)
 *   5. Stoleshnitsali oshxona — scripts/smeta_hisob.mjs dagi 3 m oshxona (stoleshnitsa + sokol)
 * Hisob web bilan BIR XIL yo'l (services/hisob.js createHisob().recalc), narx stavkalari — server sukut hujjati (narxSukut),
 * loyiha materiallari — yangi loyiha sukuti (korpus/polka LDSP16, fasad MDF16).
 * Ishlatish: node scripts/narx_5loyiha.mjs [--json] */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHisob, loadData } from '../web/src/services/hisob.js';
import { narxSukut } from '../app/js/engine/narxStavka.js';
import { konstruksiya } from '../app/js/engine/konstruktor/index.js';
import { matndanSpec, specTekshir } from '../app/js/engine/konstruksiyaTili.js';
import { katalogdanTop } from '../app/js/engine/katalogTanlash.js';

const require = createRequire(import.meta.url);
globalThis.SpPrice = globalThis.SpPrice || require('../app/js/engine/price.js');

const read = (n) => readFile(fileURLToPath(new URL('../app/data/' + n, import.meta.url)), 'utf8').then(JSON.parse);
const data = await loadData(read);
const H = createHisob(data);
const catalog = H.catalog;
const SLOTS = { materialCode: 'LDSP16', fasadCode: 'MDF16' };
/* web/src/services/loyiha.js freshKitchen() bilan bir xil (u i18n ni tortadi — node'da import qilib bo'lmaydi) */
const freshKitchen = () => ({ stoleshnitsa: false, stolT: 26, sokol: false, dobor: false, doborH: 60, karniz: false, karnizH: 60, moyka: { on: false, offset: 600, fromBack: 100, size: 500 } });

const xona = (w, d, h) => ({ outline: [[0, 0], [w, 0], [w, d], [0, d]], wall_height: h, wall_thickness: 100, openings: [], utilities: [] });
/** modullarni bir qatorga (bir-biriga tegmay) joylaydi */
const qator = (royxat) => {
  let x = 50;
  return royxat.map(([c, w, d, h], i) => { const f = catalog[c]; const p = { id: 'p' + i, frg: c, x, y: 50, z: 0, w: w || f.w, d: d || f.d, h: h || f.h, rot: 0 }; x += p.w + 50; return p; });
};

const loyihalar = [];
/* 1. Tez oshxona */
{
  const r = xona(5000, 4000, 2700);
  const v = konstruksiya(r, { devor: 0 }, catalog).variantlar[0];
  loyihalar.push(['Tez oshxona', { room: r, placements: v.placements.filter(p => catalog[p.frg]), kitchen: Object.assign(freshKitchen(), v.kitchen) }]);
}
/* 2. AI shkaf */
{
  const m = "Shkaf 1200×600×2200: chapda shtanga, o'ngda 4 polka, 2 eshik";
  const raw = matndanSpec(m);
  const t = katalogdanTop(specTekshir(raw).spec, raw, catalog, m);
  const o = t.olcham || {};
  loyihalar.push(['AI shkaf (' + t.frg + ')', { room: xona(4000, 3000, 2700), placements: qator([[t.frg, o.w, o.d, o.h]]), kitchen: freshKitchen() }]);
}
/* 3. 3 MC modul */
loyihalar.push(['3 MC modul', { room: xona(4000, 3000, 2700), placements: qator([['MC-KP-08', 600], ['MC-KP-04', 450], ['MC-KU-04', 600]]), kitchen: freshKitchen() }]);
/* 4. 5 umumiy modul */
loyihalar.push(['5 umumiy modul', { room: xona(8000, 3000, 2700), placements: qator(['SP-K-001', 'SP-K-010', 'SP-W-005', 'SP-SH-003', 'SP-K-022'].map(c => [c])), kitchen: freshKitchen() }]);
/* 5. Stoleshnitsali oshxona (smeta_hisob.mjs bilan bir xil) */
{
  const lower = [['MC-KP-08', 600], ['MC-KP-11', 400], ['MC-KP-02', 600], ['MC-KP-04', 450]];
  const upper = [['MC-KU-04', 600], ['MC-KU-07', 600], ['MC-KU-03', 300]];
  let x = 50;
  const placements = lower.map(([c, w], i) => { const p = { id: 'p' + i, frg: c, x, y: 50, z: 0, w, d: catalog[c].d, h: catalog[c].h, rot: 0 }; x += w; return p; });
  x = 50;
  upper.forEach(([c, w], i) => { placements.push({ id: 'u' + i, frg: c, x, y: 50, z: 1450, w, d: catalog[c].d, h: catalog[c].h, rot: 0 }); x += w; });
  loyihalar.push(['Stoleshnitsali oshxona', { room: xona(3000, 2500, 2700), placements, kitchen: { stoleshnitsa: true, sokol: true, dobor: false, karniz: false, moyka: { on: false } } }]);
}

/** rejim: 'sukut' — server sukut stavka hujjati (haqiqiy ilova); 'faylsiz' — stavkasiz (materials.json "taxmin") */
function hisobla(doc, rejim) {
  H.narxlar = rejim === 'sukut' ? narxSukut(H.materials) : null;
  const r = H.recalc(JSON.parse(JSON.stringify(doc)), SLOTS);
  const p = r.prod;
  return {
    aniqlik: p.aniqlik.pct, mijoz: p.clientTotal, tannarx: p.totalCost, narxsiz: p.missing.length,
    xatolar: r.cutlists.reduce((s, c) => s + c.errors.length, 0),
    taxmin: p.aniqlik.taxmin.map(t => `${t.group}:${t.code}=${t.amount}`).join(' | ')
  };
}

const natija = loyihalar.map(([nom, doc]) => ({ nom, modul: doc.placements.length, sukut: hisobla(doc, 'sukut'), faylsiz: hisobla(doc, 'faylsiz') }));
if (process.argv.includes('--json')) console.log(JSON.stringify(natija, null, 1));
else {
  console.log('loyiha'.padEnd(34) + 'modul  aniqlik(sukut)  mijoz narxi   tannarx   narxsiz  xato   aniqlik(stavkasiz)');
  for (const n of natija) console.log(n.nom.padEnd(34) + String(n.modul).padEnd(7) + (n.sukut.aniqlik + '%').padEnd(16) + String(n.sukut.mijoz).padEnd(14) + String(n.sukut.tannarx).padEnd(10) + String(n.sukut.narxsiz).padEnd(9) + String(n.sukut.xatolar).padEnd(7) + n.faylsiz.aniqlik + '%');
  console.log('\nTaxmin (tasdiqlanmagan) qatorlar — sukut stavkada:');
  for (const n of natija) console.log('  ' + n.nom + ': ' + (n.sukut.taxmin || '—'));
}
