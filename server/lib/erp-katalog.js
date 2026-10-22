/* ERP bilan ishlaydigan ikki qism (routes/admin-erp.js — admin yuklagan JSON; lib/erp-jonli.js — jonli sinxron) uchun BITTA katalog va qatlam yordamchisi (TZ-44):
 * dublikat qurilmaydi — farq hisoblash (app/js/engine/erpSinxron.js) ikkalasida bir xil kirish shaklini oladi.
 *  - erpKatalog(): fayl katalogi (bir marta o'qiladi): plita (sheet-catalog.json, kalit — ERP-kod), furnitura (furnitura-catalog.json, kalit — katalog ID),
 *    stoleshnitsa (faqat ko'rsatiladi), dollar kursi;
 *  - qatlamMap / qoldaMap: ERP qatlami (erp_narx) va admin qo'lda narxi (mat_narx — ustun);
 *  - qaynoqKalitlar(): ilova hozir ishlatayotgan "qaynoq" to'plam (Asosiy 100 plitalari, sukut ERP plitalari, bog'langan furnitura) — kalitlar. */
import { readJsonData } from './malumot.js';
import { erpKod } from '../../app/js/engine/erpKod.js';
import { nomKalit } from '../../app/js/engine/erpSinxron.js';

let kesh = null;

/** fayl katalogi: { plita:[{k, sku, nom, fayl}], furnitura:[…], stoleshnitsa:[…], kurs, kodlar:{plita:Set, furnitura:Set} } */
export function erpKatalog() {
  if (!kesh) {
    const fc = readJsonData('furnitura-catalog.json') || {};
    kesh = {
      plita: (((readJsonData('sheet-catalog.json') || {}).sheets) || []).map(s => ({ k: erpKod(s), sku: s.sku, nom: s.name, fayl: s.uzs > 0 ? Math.round(s.uzs) : 0 })),
      furnitura: (fc.items || []).filter(i => i.id).map(i => ({ k: String(i.id), sku: i.sku, nom: i.name, fayl: !i.no_price && i.uzs > 0 ? Math.round(i.uzs) : 0 })),
      stoleshnitsa: (((readJsonData('stoleshnitsa-erp.json') || {}).items) || []).map(s => ({ erp_id: s.erp_id, sku: s.sku, nom: s.nom, narx_m2: s.narx_m2 })),
      kurs: fc.exchangeRate || 0
    };
    kesh.kodlar = { plita: new Set(kesh.plita.map(x => x.k)), furnitura: new Set(kesh.furnitura.map(x => x.k)) };
  }
  return kesh;
}

export const qatlamMap = (db, tur) => new Map(db.prepare('SELECT kalit, uzs FROM erp_narx WHERE tur = ?').all(tur).map(x => [x.kalit, x.uzs]));
export const qoldaMap = (db) => new Map(db.prepare('SELECT kod, uzs FROM mat_narx WHERE uzs > 0').all().map(x => [x.kod, x.uzs]));

/** katalog + joriy qatlamlar → erpSinxron.mahsulotFarq kirishi (K). kurs — bu yerda 0: jonli sinxron dollarni ERP'ning o'z kursida so'mga aylantirib beradi */
export function farqKirish(db, kat, { kurs } = {}) {
  const erpP = qatlamMap(db, 'plita'), erpF = qatlamMap(db, 'furnitura'), qolda = qoldaMap(db);
  return {
    plita: kat.plita.map(x => ({ ...x, erp: erpP.get(x.k) || 0, qolda: qolda.get(x.k) || 0 })),
    furnitura: kat.furnitura.map(x => ({ ...x, erp: erpF.get(x.k) || 0 })),
    stoleshnitsa: kat.stoleshnitsa,
    kurs: kurs === undefined ? kat.kurs : kurs
  };
}

/** qaynoq kalitlar: { plita:Set(ERP-kod), furnitura:Set(katalog ID) }. Manba:
 *   plita — dekor-asosiy.json (Asosiy 100) kodlari; materials.json sukut_erp va panel_materials (ERP nomi bo'yicha katalogdan topiladi);
 *   furnitura — furnitura-boglash.json bog'lanishlari va admin bazasi (furn_boglash). */
export function qaynoqKalitlar(db, kat = erpKatalog()) {
  const plita = new Set(), furnitura = new Set();
  const mavjud = kat.kodlar.plita;
  for (const it of ((readJsonData('dekor-asosiy.json') || {}).items) || []) for (const k of it.kodlar || []) if (mavjud.has(k)) plita.add(k);
  const mats = readJsonData('materials.json') || {};
  const nomlar = new Map();
  for (const x of kat.plita) { const n = nomKalit(x.nom); if (n) { const l = nomlar.get(n); if (l) l.push(x); else nomlar.set(n, [x]); } }
  const nomBilan = (nom) => { const l = nomlar.get(nomKalit(nom)); if (l && l.length === 1) plita.add(l[0].k); };
  for (const v of Object.values(mats.sukut_erp || {})) if (v && typeof v === 'object' && v.nom) nomBilan(v.nom);
  for (const p of mats.panel_materials || []) if (p && p.sku_nom) nomBilan(p.sku_nom);
  const furnMavjud = kat.kodlar.furnitura;
  for (const id of Object.values(((readJsonData('furnitura-boglash.json') || {}).links) || {})) if (furnMavjud.has(String(id))) furnitura.add(String(id));
  try { for (const x of db.prepare('SELECT erp_id FROM furn_boglash').all()) if (furnMavjud.has(String(x.erp_id))) furnitura.add(String(x.erp_id)); } catch (_) { /* jadval yo'q — fayl bog'lanishlari yetadi */ }
  return { plita, furnitura };
}
