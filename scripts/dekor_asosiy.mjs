/* Asosiy 100 dekor (egasi #182) — material varag'ining boshidagi eng muhim 100 dekor: app/data/dekor-asosiy.json.
 *   Tanlov: faqat narxli ERP plitalari (sheet-catalog.json), LDSP / LMDF / MDF, 16–18 mm (korpus, polka, fasad).
 *   Ball: 1) sexdagi buyurtmalar soni (GibLab kroy natijalari + Bazis .b3d, bir buyurtma bir marta);
 *         2) ombordagi qoldiq (ERP "Qoldiq", shu dekorning 16/18 mm plitalari yig'indisi); 3) narxli variantlar soni.
 *   Bir dekor — bitta yozuv (ishlab chiqaruvchi va tur farqi — variantlar). Rang — scripts/dekor_rang.mjs (nom va dekor kodi bo'yicha).
 * Ishlatish (sex ma'lumoti maxfiy — repoga tushmaydi, faqat dekor nomi va sonlar):
 *   python3 -I scripts/dekor_asosiy_xlsx.py <Smart3D_toplam> xlsx.json; node scripts/bazis_materiallar.mjs <04_bazis> > bazis.json
 *   node scripts/dekor_asosiy.mjs xlsx.json bazis.json  → app/data/dekor-asosiy.json */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
globalThis.SpPrice = require('../app/js/engine/price.js');
const { dekorNomi } = await import('../web/src/features/editor/catalog/dekor.js');
const { erpKod } = await import('../web/src/services/erpMaterial.js');
const { dekorKalit } = await import('../app/js/engine/dekorAsosiy.js');
const { dekorRangi } = await import('./dekor_rang.mjs');

const DATA = fileURLToPath(new URL('../app/data/', import.meta.url));
const [xlsxF, bazisF] = process.argv.slice(2);
const X = JSON.parse(readFileSync(xlsxF, 'utf8')), B = JSON.parse(readFileSync(bazisF, 'utf8'));
const sheets = JSON.parse(readFileSync(DATA + 'sheet-catalog.json', 'utf8')).sheets;
const TUR = ['LDSP', 'LMDF', 'MDF'];
const mos = (s) => TUR.includes(s.type) && +s.uzs > 0 && +s.th >= 15.5 && +s.th <= 18.5;
const BREND_SOZ = /^(?:кроностар|кроношпан|kronospan|эггер|egger|ультрадекор|кастамону|шлифованная|ш)$/;
const kalit = (nom) => dekorKalit(dekorNomi(String(nom).split(/[\r\n]/)[0], '').nom);

const guruh = new Map();
for (const s of sheets.filter(mos)) {
  const k = kalit(s.name);
  if (!k || k.length < 3 || BREND_SOZ.test(k)) continue;              // dekorsiz (faqat ishlab chiqaruvchi nomi: "Кроностар 18мм 2800*2070")
  let g = guruh.get(k);
  if (!g) guruh.set(k, g = { k, nomlar: new Map(), v: [], buyurtma: new Set(), giblab: new Set(), bazis: new Set(), qoldiq: 0 });
  const d = dekorNomi(s.name, s.type);
  g.nomlar.set(d.nom, (g.nomlar.get(d.nom) || 0) + 1);
  g.v.push({ kod: erpKod(s), tur: s.type, th: +s.th, brend: d.brend, uzs: +s.uzs, nom: s.name });
}
for (const [id, rows] of Object.entries(X.giblab)) for (const [nom] of rows) { const g = guruh.get(kalit(nom)); if (g) { g.buyurtma.add(id); g.giblab.add(id); } }
for (const [id, list] of Object.entries(B)) for (const nom of list) { const g = guruh.get(kalit(nom)); if (g) { g.buyurtma.add(id); g.bazis.add(id); } }
for (const q of X.qoldiq) { if (!(q.qoldiq > 0) || !(+q.th >= 15.5 && +q.th <= 18.5)) continue; const g = guruh.get(kalit(q.nom)); if (g) g.qoldiq += Math.ceil(q.qoldiq); }

const list = [...guruh.values()].sort((a, b) => (b.buyurtma.size - a.buyurtma.size) || (b.qoldiq - a.qoldiq) || (b.v.length - a.v.length) || a.k.localeCompare(b.k, 'ru'));
const top = list.filter(g => dekorRangi(g.k, [...g.nomlar.keys()][0])).slice(0, 100).map((g, i) => {   // rangi aniqlanmagan dekor — ro'yxatga kirmaydi
  const nom = [...g.nomlar.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0][0].replace(/^L\s+/, '');
  const r = dekorRangi(g.k, nom);
  const v = g.v.sort((a, b) => TUR.indexOf(a.tur) - TUR.indexOf(b.tur) || a.th - b.th || ((b.brend === 'Ultradekor') - (a.brend === 'Ultradekor')) || a.uzs - b.uzs);
  return {
    o: i + 1, dekor: nom, kalit: g.k, tur: [...new Set(v.map(x => x.tur))], qalinlik: [...new Set(v.map(x => x.th))].sort((a, b) => a - b),
    kodlar: v.map(x => x.kod), rang_hex: r.hex, guruh: r.guruh, yuza: r.yuza, rang_ishonch: r.ishonch,
    manba: { sex: g.buyurtma.size, giblab: g.giblab.size, bazis: g.bazis.size, qoldiq: g.qoldiq }
  };
});
writeFileSync(DATA + 'dekor-asosiy.json', JSON.stringify({
  _meta: 'Asosiy 100 dekor (egasi #182, 2026-10-17): narxli ERP plitalari LDSP/LMDF/MDF 16-18 mm. Tartib: sexdagi buyurtmalar soni (GibLab + Bazis), keyin ombordagi qoldiq (ERP), keyin narxli variantlar. rang_hex — dekor nomi va ishlab chiqaruvchi dekor kodi bo\'yicha namuna rangi (ERP\'da rasm yo\'q); rang_ishonch: aniq | taxminiy. kodlar — ERP material kodlari (web/src/services/erpMaterial.js erpKod). Mijoz ma\'lumoti yo\'q. Qayta yaratish: scripts/dekor_asosiy.mjs.',
  items: top
}, null, 1) + '\n');
console.log('dekor-asosiy.json:', top.length, 'ta; jami dekor', list.length, '; sexda ishlatilgan', list.filter(g => g.buyurtma.size).length, '; qoldiqli', list.filter(g => g.qoldiq > 0).length,
  '; aniq rang', top.filter(x => x.rang_ishonch === 'aniq').length);
for (const x of top) console.log(x.o, x.dekor, '|', x.kalit, '|', x.tur.join('/'), x.qalinlik.join('/'), '| sex', x.manba.sex, 'qoldiq', x.manba.qoldiq, '|', x.rang_hex, x.guruh, x.yuza, x.rang_ishonch);
