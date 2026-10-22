#!/usr/bin/env node
/* scripts/katalog_erp_moslash.mjs — plita va furnitura kataloglarini ERP /api/v2/products/ eksportiga moslash REJASI (egasi #295, 2026-10-22).
 * Faqat O'QIYDI va reja chiqaradi; fayllarni yozish — scripts/katalog_erp_yangilash.py (Python: asl JSON formatini — 19.0 / 2800 — saqlash uchun).
 *
 * Moslash qoidasi — erpSinxron.js mahsulotFarq (server ERP sinxroni bilan BIR XIL: nomKalit + SKU, bir qiymatli bo'lsa). Dublikat yozilmagan:
 * shu funksiyaning o'zi ishlatiladi, shuning uchun reja qo'llangach server sinxroni shu qatorlarni "bir_xil" deb ko'radi.
 *
 * Reja qoidalari (qoida 4.3 — narx o'ylab topilmaydi):
 *   PLITA     bir qiymatli moslik: narx — ERP display_price_uzs > 0 bo'lsa; narxsiz (ERP 0/yo'q) — mavjud qiymat O'ZGARMAYDI.
 *             list formati (l×w) — ERP length/width ikkalasi > 100 bo'lsa; nomdagi maydon (4,575 …) ERP formatiga zid bo'lsa — format TEGILMAYDI ("format_ziddiyat").
 *             qalinlik (th) O'ZGARMAYDI: u erpKod() (admin narxi, dekor-asosiy.json, saqlangan loyihalar kaliti) ning bir qismi, ERP qalinligi esa
 *             ba'zan noto'g'ri (1, 15, 179 mm) — farqlar faqat hisobotga yoziladi.
 *   STOLESHNITSA erp_id bo'yicha aniq moslik (ERP birligi m2): narx_m2 — ERP display_price_uzs > 0 bo'lsa (qolgan maydonlar — qoldiq, o'lcham — tegilmaydi).
 *   FURNITURA bir qiymatli moslik: uzs — ERP display_price_uzs > 0 bo'lsa (ERP'ning O'ZI qaytargan so'm narxi, kurs ishlatilmaydi).
 *   Noaniq (bir nechta mos, SKU farqi, ikki katalog, birligi varaq emas) va ERP'da narxsiz — tegilmaydi, ro'yxat sifatida qaytadi.
 *
 * Ishlatish:  node scripts/katalog_erp_moslash.mjs <erp-mahsulotlar.json> [--out reja.json]   (qisqa xulosa stdout'ga)
 * Eksport:    reja(erpRows, sheetCatalog, furnCatalog) → { plita, furnitura, ... } (testlar ham ishlatadi) */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { erpMahsulotOqi, mahsulotFarq } from '../app/js/engine/erpSinxron.js';
import { erpKod } from '../app/js/engine/erpKod.js';
import { nomMaydoni } from '../app/js/engine/plitaMoslash.js';

const DATA = fileURLToPath(new URL('../app/data/', import.meta.url));
const raqam = (v) => { const n = typeof v === 'number' ? v : Number(v); return Number.isFinite(n) ? n : 0; };
const yaxlit4 = (n) => Math.round(n * 1e4) / 1e4;

/** ERP list formati yaroqlimi: ikkala o'lcham 100..6000 mm; katta qiymat — uzunlik (katalog konvensiyasi l ≥ w) */
export function erpFormat(e) {
  const a = raqam(e.length), b = raqam(e.width);
  if (!(a > 100 && b > 100 && a <= 6000 && b <= 6000)) return null;
  return [Math.max(a, b), Math.min(a, b)];
}
/** nomdagi maydon (4,575 / 5,0325 …) ERP formati bilan mos kelmasa — true (ziddiyat: ERP formati qo'llanmaydi) */
export function formatZid(nom, l, w) {
  const m = nomMaydoni(nom, false);
  return m != null && Math.abs(l * w / 1e6 - m) / m > 0.01;
}

export function reja(erp, sheetsDoc, furnDoc, stolDoc = { items: [] }) {
  const xom = Array.isArray(erp) ? erp : (erp.mahsulotlar || erp.results || erp.items);
  const oqildi = erpMahsulotOqi(xom.map(m => ({ ...m, display_price_usd: m.display_price_usd })));
  if (oqildi.xato) throw new Error('ERP fayli: ' + oqildi.xato);
  const erpById = new Map(xom.map(m => [String(m.id), m]));
  const sheets = sheetsDoc.sheets, furn = (furnDoc.items || []).filter(i => i.id);
  const kodIdx = new Map();                                  // erpKod → varaq indeksi (kalit takrorlansa — tegilmaydi)
  const kodTakror = new Set();
  sheets.forEach((s, i) => { const k = erpKod(s); if (kodIdx.has(k)) kodTakror.add(k); kodIdx.set(k, i); });
  const K = {
    plita: sheets.map(s => ({ k: erpKod(s), sku: s.sku, nom: s.name, fayl: s.uzs > 0 ? Math.round(s.uzs) : 0, erp: 0, qolda: 0 })),
    furnitura: furn.map(i => ({ k: String(i.id), sku: i.sku, nom: i.name, fayl: !i.no_price && i.uzs > 0 ? Math.round(i.uzs) : 0, erp: 0 })),
    stoleshnitsa: (stolDoc.items || []).map(x => ({ erp_id: x.erp_id, sku: x.sku, nom: x.nom, narx_m2: x.narx_m2 })), kurs: 0
  };
  const f = mahsulotFarq(oqildi.qatorlar, K);

  const out = { plita: [], furnitura: [], stoleshnitsa: [], noaniq: { plita: [], furnitura: [], erp_noaniq: 0 }, th_farq: [], format_ziddiyat: [], yoq: { plita: [], furnitura: [] }, xulosa: f.xulosa, erp_jami: xom.length };
  const kor = { plita: new Set(), furnitura: new Set() };
  const furnById = new Map(furn.map(x => [String(x.id), x]));
  for (const q of f.qatorlar) {
    if (q.g === 'noaniq') { out.noaniq.erp_noaniq++; continue; }
    if (q.g === 'stoleshnitsa') { out.stoleshnitsa.push({ erp_id: q.erp_id, sku: q.sku, nom: q.nom, h: q.h, eski: q.eski, yangi: q.yangi, foiz: q.foiz }); continue; }   // faqat narx_m2 (m2 birligi, ERP narxi > 0)
    if (q.g !== 'plita' && q.g !== 'furnitura') continue;
    if (q.h === 'yoq') continue;
    if (q.h === 'noaniq') { out.noaniq[q.g].push({ k: q.k, nom: q.katalog_nom || q.nom, erp_id: q.erp_id, sabab: q.sabab || '' }); continue; }
    const e = erpById.get(String(q.erp_id));
    if (!e) continue;
    kor[q.g].add(q.k);
    const yangiUzs = q.yangi > 0 ? q.yangi : 0;              // ERP narxi (butun so'm); 0 — narxsiz
    if (q.g === 'plita') {
      if (kodTakror.has(q.k)) { out.noaniq.plita.push({ k: q.k, nom: q.katalog_nom, erp_id: q.erp_id, sabab: 'erpKod_takror' }); continue; }
      const i = kodIdx.get(q.k), s = sheets[i];
      const fm = erpFormat(e);
      let l = null, w = null;
      if (fm) {
        if (formatZid(s.name, fm[0], fm[1])) out.format_ziddiyat.push({ nom: s.name, katalog: [s.l, s.w], erp: fm });
        else { l = fm[0]; w = fm[1]; }
      }
      const th = raqam(e.thickness);
      if (th > 0 && th !== s.th) out.th_farq.push({ sku: s.sku, nom: s.name, katalog: s.th, erp: th, erp_kategoriya: e.category_name || '' });
      const usd = yangiUzs > 0 && raqam(e.price_usd) > 0 ? yaxlit4(raqam(e.price_usd)) : null;
      out.plita.push({ i, sku: s.sku, nom: s.name, erp_id: q.erp_id, h: q.h, eski_uzs: s.uzs || 0, yangi_uzs: yangiUzs, eski_usd: s.usd || 0, yangi_usd: usd,
                       eski_lw: [s.l, s.w], yangi_lw: l != null ? [l, w] : null, foiz: q.foiz });
    } else {
      const it = furnById.get(q.k);
      out.furnitura.push({ id: q.k, sku: it.sku, nom: it.name, erp_id: q.erp_id, h: q.h, eski_uzs: it.uzs || 0, eski_src: it.price_src || '', yangi_uzs: yangiUzs,
                           eski_usd: it.usd || 0, yangi_usd: yangiUzs > 0 && raqam(e.price_usd) > 0 ? yaxlit4(raqam(e.price_usd)) : null,
                           narx_manba: raqam(e.price) > 0 ? 'uzs' : 'usd', faol: e.is_active !== false, foiz: q.foiz });
    }
  }
  for (const s of sheets) if (!kor.plita.has(erpKod(s))) out.yoq.plita.push({ sku: s.sku, nom: s.name });
  for (const it of furn) if (!kor.furnitura.has(String(it.id))) out.yoq.furnitura.push({ id: it.id, sku: it.sku, nom: it.name });
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = process.argv.slice(2);
  const yol = a.find(x => !x.startsWith('--'));
  if (!yol) { console.error('Ishlatish: node scripts/katalog_erp_moslash.mjs <erp-mahsulotlar.json> [--out reja.json]'); process.exit(2); }
  const oi = a.indexOf('--out');
  const R = reja(JSON.parse(readFileSync(yol, 'utf8')), JSON.parse(readFileSync(DATA + 'sheet-catalog.json', 'utf8')), JSON.parse(readFileSync(DATA + 'furnitura-catalog.json', 'utf8')),
                 JSON.parse(readFileSync(DATA + 'stoleshnitsa-erp.json', 'utf8')));
  if (oi >= 0) writeFileSync(a[oi + 1], JSON.stringify(R));
  const c = (arr, fn) => arr.reduce((m, x) => { const k = fn(x); m[k] = (m[k] || 0) + 1; return m; }, {});
  console.log(JSON.stringify({ erp_jami: R.erp_jami, plita: c(R.plita, x => x.h), furnitura: c(R.furnitura, x => x.h),
    stoleshnitsa: c(R.stoleshnitsa, x => x.h), noaniq: { plita: R.noaniq.plita.length, furnitura: R.noaniq.furnitura.length }, yoq: { plita: R.yoq.plita.length, furnitura: R.yoq.furnitura.length },
    th_farq: R.th_farq.length, format_ziddiyat: R.format_ziddiyat.length }));
}
