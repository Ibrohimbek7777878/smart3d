/* Smart3D engine/erpSinxron.js — ERP eksporti (admin yuklagan JSON) ↔ bizning katalog: farq hisoblash (TZ-37, 3-faza). SOF funksiyalar (Node va brauzer):
 * tarmoq, fayl va baza YO'Q — ERP bilan jonli aloqa ham yo'q. Admin ERP'dan GET bilan olingan JSON'ni (Smart3D_malumot/erp-*.json shaklida) yuklaydi;
 * bu modul uni tekshiradi va joriy narxlar bilan solishtirib, har qator uchun holat beradi. Hech narsa o'zgarmaydi — qo'llashni server qiladi (routes/admin-erp.js).
 *
 * Kirish shakllari (ERP /api/v2/products/ va /erp/services/api/manage/services/ eksporti):
 *   mahsulotlar: { _meta: { sana, manba }, mahsulotlar: [{ id, sku, name, category_name, unit, display_price_uzs, price_list_uzs, display_price_usd, qoldiq }] }
 *   xizmatlar:   { _meta: { sana }, xizmatlar: [{ id, name, code, category_name, client_price, is_active }] }
 * Narx: ERP "display_price_uzs" (mavjud materials.json va stoleshnitsa-erp.json ham shu maydondan; "price_list_uzs" — sotuv narxi, faqat ko'rsatiladi).
 * Moslash: NOM bo'yicha (scripts/erp_rasmlar.py dagi kabi: boshidagi kod va belgilarsiz), SKU ikkala tomonda bo'lsa — teng bo'lishi shart. SKU yolg'iz
 * yetarli emas: plita SKU'si dekor kodi, turli qalinlik/brend mahsulotlarida takrorlanadi (haqiqiy ERP ma'lumotida: bir SKU — ЛХДФ 3 mm va ЛДСП 16 mm).
 * Noaniq (bir nechta mos, SKU farqi, ikki katalogga tushgan, birligi varaq emas, ERP'da takror) — HECH QACHON qo'llanmaydi, "noaniq" deb ko'rsatiladi. Narx o'ylab topilmaydi: ERP'da narx 0/yo'q
 * bo'lsa — "narxsiz", mavjud narx o'zgarmaydi. Istisno: furnitura uchun ERP so'm narxi yo'q, dollar bor bo'lsa — dollar × katalogdagi kurs (scripts/furnitura_narx_tiklash.py qoidasi).
 *
 * Qator holati (h): ozgardi | toldirildi (katalogda narx yo'q edi) | bir_xil | narxsiz (ERP'da narx yo'q) | qolda (admin qo'lda narx qo'ygan — ustun) | yangi (katalogda yo'q)
 *                   | noaniq | yoq (katalogda bor, yuklangan faylda yo'q — fayl to'liq ro'yxat bo'lmasligi mumkin). q — "qo'llanadi" (faqat ozgardi va toldirildi).
 * Guruh (g): plita | furnitura | xizmat | stoleshnitsa (faqat ko'rsatiladi — alohida fayl, scripts/stoleshnitsa_erp.py) | yangi | noaniq. */
import { xizmatJadvalOqish } from './narxStavka.js';

export const LIMIT = { qator: 20000, narx: 1e10, yoq_royxat: 300 };
const PLITA_BIRLIK = new Set(['', 'шт', 'шт.', 'sht', 'dona', 'pcs', 'лист']);
const obj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

const normSku = (s) => String(s == null ? '' : s).toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
/** nom bo'yicha moslash kaliti — scripts/erp_rasmlar.py nom(): boshidagi kod ("102-01-08-301 …") olinadi, faqat harf va raqam qoladi */
export const nomKalit = (s) => String(s == null ? '' : s).replace(/^\s*[\d\-.]+\s+/, '').toLowerCase().replace(/ё/g, 'е').replace(/[^0-9a-zа-я]+/g, '');
const matn = (v, max) => (typeof v === 'string' || typeof v === 'number' ? String(v).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');
/** narx maydoni: yo'q/bo'sh → 0; to'g'ri son → butun so'm; manfiy, son emas yoki juda katta → null (qator rad) */
function narxOl(v) {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : (typeof v === 'string' && v.trim() !== '' ? Number(v.trim().replace(/\s/g, '').replace(',', '.')) : NaN);
  return Number.isFinite(n) && n >= 0 && n <= LIMIT.narx ? Math.round(n) : null;
}
const sanaOl = (j) => { const s = matn(j && obj(j._meta) ? j._meta.sana : '', 20); return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : ''; };
const royxatOl = (j, kalit) => (Array.isArray(j) ? j : obj(j) ? (j[kalit] || j.results || j.items) : null);

/** ERP mahsulotlar eksporti → tozalangan qatorlar. → { qatorlar, rad:[{ i, sabab }], meta } yoki { xato } */
export function erpMahsulotOqi(json) {
  const arr = royxatOl(json, 'mahsulotlar');
  if (!Array.isArray(arr) || !arr.length) return { xato: "mahsulotlar ro'yxati yo'q yoki bo'sh" };
  if (arr.length > LIMIT.qator) return { xato: `mahsulotlar juda ko'p (${LIMIT.qator} gacha)` };
  const qatorlar = [], rad = [], korilgan = new Set();
  arr.forEach((m, i) => {
    if (!obj(m)) return rad.push({ i, sabab: 'obyekt emas' });
    const nom = matn(m.name, 300);
    if (!nom) return rad.push({ i, sabab: "nom yo'q" });
    const narx = narxOl(m.display_price_uzs), royxat = narxOl(m.price_list_uzs), usd = narxOl(m.display_price_usd);
    if (narx === null || royxat === null || usd === null) return rad.push({ i, sabab: "narx noto'g'ri" });
    const id = matn(m.id, 40);
    if (id) { if (korilgan.has(id)) return rad.push({ i, sabab: 'id takrorlangan' }); korilgan.add(id); }
    const qoldiq = typeof m.qoldiq === 'number' && Number.isFinite(m.qoldiq) ? m.qoldiq : null;
    qatorlar.push({ id, sku: matn(m.sku, 80), nom, kat: matn(m.category_name, 200), birlik: matn(m.unit, 20), narx, royxat: royxat || null, usd, qoldiq });
  });
  if (!qatorlar.length) return { xato: "yaroqli mahsulot qatori yo'q" };
  return { qatorlar, rad, meta: { sana: sanaOl(json), manba: matn(obj(json) && obj(json._meta) ? json._meta.manba : '', 200) } };
}

function indeks(items) {
  const bn = new Map();
  for (const it of items) { const k = nomKalit(it.nom); if (!k) continue; const l = bn.get(k); if (l) l.push(it); else bn.set(k, [it]); }
  return { bn };
}
/** bitta ERP qatori → katalog yozuvi: { h: 'bir'|'noaniq'|'yoq', it?, sabab? }.
 *  Moslik NOM bo'yicha (kod va belgilarsiz). SKU yolg'iz yetarli EMAS: plita SKU'si dekor kodi — bir xil kod turli qalinlik/brend/turdagi mahsulotlarda
 *  takrorlanadi (haqiqiy ERP ma'lumotida tekshirilgan). SKU ikkala tomonda bor bo'lsa — ular teng bo'lishi SHART. */
function topish(row, ix) {
  const k = nomKalit(row.nom);
  const c = k ? (ix.bn.get(k) || []) : [];
  if (!c.length) return { h: 'yoq' };
  const s = normSku(row.sku);
  const mos = c.filter(x => !s || !normSku(x.sku) || normSku(x.sku) === s);
  if (mos.length === 1) return { h: 'bir', it: mos[0] };
  return { h: 'noaniq', sabab: mos.length ? 'bir_nechta' : 'sku_farq' };
}
const foizOl = (eski, yangi) => (eski > 0 && yangi > 0 ? Math.round((yangi - eski) / eski * 1000) / 10 : null);
const QOLLANADI = new Set(['ozgardi', 'toldirildi']);

/** narx holati: joriy (hozir ishlatiladigan narx) ↔ ERP narxi (yangi) */
function holat(joriy, yangi, qolda) {
  if (!(yangi > 0)) return 'narxsiz';
  if (qolda > 0) return yangi === qolda ? 'bir_xil' : 'qolda';
  if (joriy === yangi) return 'bir_xil';
  return joriy > 0 ? 'ozgardi' : 'toldirildi';
}
const saralash = (a, b) => {
  const r = (x) => (x.q ? (x.h === 'ozgardi' ? 0 : 1) : x.h === 'yoq' ? 3 : 2);
  return r(a) - r(b) || Math.abs(b.foiz || 0) - Math.abs(a.foiz || 0) || String(a.g + a.nom).localeCompare(String(b.g + b.nom));
};

/** Mahsulotlar farqi. qatorlar — erpMahsulotOqi natijasi; K — katalog va joriy narxlar (server tayyorlaydi):
 *    plita:        [{ k (ERP-kod), sku, nom, fayl (fayldagi narx), erp (ERP qatlamidagi narx yoki 0), qolda (admin qo'lda narxi yoki 0) }]
 *    furnitura:    [{ k (ID), sku, nom, fayl, erp }]
 *    stoleshnitsa: [{ erp_id, sku, nom, narx_m2 }]
 *    kurs:         dollar kursi (furnitura katalogidagi exchangeRate) yoki 0
 *  → { qatorlar: [farq qatori], xulosa } */
export function mahsulotFarq(qatorlar, K) {
  const plita = (K && K.plita) || [], furn = (K && K.furnitura) || [], stol = (K && K.stoleshnitsa) || [], kurs = (K && K.kurs) || 0;
  const ixP = indeks(plita), ixF = indeks(furn);
  const stolId = new Map(stol.map(s => [String(s.erp_id), s]));
  const out = [], korilgan = { plita: new Set(), furnitura: new Set() };
  for (const r of qatorlar) {
    const asos = { erp_id: r.id, sku: r.sku, nom: r.nom, birlik: r.birlik, royxat: r.royxat };
    const s = r.id && stolId.get(r.id);
    if (s) {
      const yangi = r.birlik === 'м2' || r.birlik === 'm2' ? r.narx : 0;
      const hh = holat(s.narx_m2 || 0, yangi, 0);
      out.push({ ...asos, g: 'stoleshnitsa', k: String(s.erp_id), eski: s.narx_m2 || 0, yangi, foiz: foizOl(s.narx_m2, yangi), manba: 'fayl', h: hh === 'toldirildi' ? 'ozgardi' : hh, q: false });   // faqat ko'rsatiladi
      continue;
    }
    const a = topish(r, ixP), b = topish(r, ixF);
    if (a.h === 'bir' && b.h === 'bir') { out.push({ ...asos, g: 'noaniq', k: '', eski: 0, yangi: r.narx, foiz: null, manba: '', h: 'noaniq', q: false, sabab: 'ikki_katalog' }); continue; }
    if (a.h === 'bir') {
      const it = a.it;
      if (!PLITA_BIRLIK.has(r.birlik.toLowerCase())) { out.push({ ...asos, g: 'noaniq', k: '', eski: 0, yangi: r.narx, foiz: null, manba: '', h: 'noaniq', q: false, sabab: 'birlik' }); continue; }   // m2 narxi varaq narxiga mos emas
      const joriy = it.qolda > 0 ? it.qolda : it.erp > 0 ? it.erp : it.fayl || 0;
      const h = holat(joriy, r.narx, it.qolda || 0);
      korilgan.plita.add(it.k);
      out.push({ ...asos, g: 'plita', k: it.k, katalog_nom: it.nom, eski: joriy, yangi: r.narx, foiz: foizOl(joriy, r.narx), manba: it.qolda > 0 ? 'qolda' : it.erp > 0 ? 'erp' : 'fayl', h, q: QOLLANADI.has(h) });
      continue;
    }
    if (b.h === 'bir') {
      const it = b.it;
      const usdKurs = !(r.narx > 0) && r.usd > 0 && kurs > 0;
      const yangi = r.narx > 0 ? r.narx : usdKurs ? Math.round(r.usd * kurs) : 0;
      const joriy = it.erp > 0 ? it.erp : it.fayl || 0;
      const h = holat(joriy, yangi, 0);
      korilgan.furnitura.add(it.k);
      out.push({ ...asos, g: 'furnitura', k: it.k, katalog_nom: it.nom, eski: joriy, yangi, foiz: foizOl(joriy, yangi), manba: it.erp > 0 ? 'erp' : 'fayl', narx_manba: usdKurs ? 'usd_kurs' : 'uzs', h, q: QOLLANADI.has(h) });
      continue;
    }
    if (a.h === 'noaniq' || b.h === 'noaniq') { out.push({ ...asos, g: 'noaniq', k: '', eski: 0, yangi: r.narx, foiz: null, manba: '', h: 'noaniq', q: false, sabab: (a.sabab || b.sabab) }); continue; }
    out.push({ ...asos, g: 'yangi', k: '', eski: 0, yangi: r.narx, foiz: null, manba: '', h: 'yangi', q: false });
  }
  /* bitta katalog yozuviga ERP'da bir nechta qator tushsa — qaysi biri to'g'ri ekani noma'lum: hammasi "noaniq" */
  const guruh = new Map();
  for (const x of out) if (x.g === 'plita' || x.g === 'furnitura') { const kk = x.g + ':' + x.k; guruh.set(kk, (guruh.get(kk) || 0) + 1); }
  for (const x of out) if ((x.g === 'plita' || x.g === 'furnitura') && guruh.get(x.g + ':' + x.k) > 1) { x.h = 'noaniq'; x.q = false; x.sabab = 'takror'; }
  /* katalogda bor, faylda yo'q (faqat ro'yxat boshi — to'liq soni xulosada) */
  const yoq = { plita: 0, furnitura: 0 };
  for (const [g, items] of [['plita', plita], ['furnitura', furn]]) {
    for (const it of items) {
      if (korilgan[g].has(it.k)) continue;
      yoq[g]++;
      if (yoq[g] <= LIMIT.yoq_royxat) out.push({ g, k: it.k, erp_id: '', sku: it.sku || '', nom: it.nom, birlik: '', royxat: null, eski: (g === 'plita' ? (it.qolda > 0 ? it.qolda : it.erp > 0 ? it.erp : it.fayl) : (it.erp > 0 ? it.erp : it.fayl)) || 0, yangi: 0, foiz: null, manba: '', h: 'yoq', q: false });
    }
  }
  out.sort(saralash);
  return { qatorlar: out, xulosa: xulosaHisobla(out, { qatorlar: qatorlar.length, katalog: { plita: plita.length, furnitura: furn.length }, yoq }) };
}

/** farq qatorlaridan xulosa: guruh × holat sonlari, qo'llanadigan qatorlar */
export function xulosaHisobla(qatorlar, qo) {
  const guruh = {}, qollanadi = {};
  for (const x of qatorlar) {
    if (x.h === 'yoq') continue;
    const g = (guruh[x.g] = guruh[x.g] || {});
    g[x.h] = (g[x.h] || 0) + 1;
    if (x.q) qollanadi[x.g] = (qollanadi[x.g] || 0) + 1;
  }
  return { ...qo, guruh, qollanadi };
}

/* ═══════════ XIZMATLAR (ERP /erp/services/api/manage/services/) ═══════════ */

/** ERP xizmatlar eksporti → { xizmatlar: {kod: qator}, jami, otkazildi, chetda, rad, meta } yoki { xato }.
 *  Qatorlarni mavjud xizmatJadvalOqish (narxStavka.js) o'qiydi — Xizmat_narxlari.xlsx bilan BIR XIL qoidalar (faqat raspil, kromka, prisadka, Bazis; UZS; faol; narx > 0). */
export function erpXizmatOqi(json) {
  const arr = royxatOl(json, 'xizmatlar');
  if (!Array.isArray(arr) || !arr.length) return { xato: "xizmatlar ro'yxati yo'q yoki bo'sh" };
  if (arr.length > LIMIT.qator) return { xato: `xizmatlar juda ko'p (${LIMIT.qator} gacha)` };
  const sana = sanaOl(json) || new Date().toISOString().slice(0, 10);
  const rows = [['Kod', 'Nomi', 'Kategoriya', 'Birlik turi', 'Mijoz narxi', 'Amal sanasi', 'Faol', 'Valyuta']], rad = [];
  arr.forEach((x, i) => {
    if (!obj(x)) return rad.push({ i, sabab: 'obyekt emas' });
    const kod = matn(x.code, 40), nom = matn(x.name, 200);
    const narx = typeof x.client_price === 'number' ? x.client_price : (typeof x.client_price === 'string' ? Number(x.client_price) : NaN);
    if (!kod || !nom) return rad.push({ i, sabab: "kod yoki nom yo'q" });
    if (!Number.isFinite(narx) || narx < 0 || narx > LIMIT.narx) return rad.push({ i, sabab: "narx noto'g'ri" });
    rows.push([kod, nom, matn(x.category_name, 100), '', narx, sana, x.is_active === false ? "yo'q" : 'ha', 'UZS']);
  });
  if (rows.length < 2) return { xato: "yaroqli xizmat qatori yo'q" };
  const o = xizmatJadvalOqish(rows);
  if (!o) return { xato: "xizmatlar o'qilmadi" };
  return { xizmatlar: o.xizmatlar, jami: o.jami, otkazildi: o.otkazildi, chetda: rows.length - 1 - o.jami, rad, meta: { sana, manba: matn(obj(json) && obj(json._meta) ? json._meta.manba : '', 200) } };
}

/** Xizmatlar farqi: yuklangan (erpXizmatOqi) ↔ joriy narx hujjati (cur.xizmatlar). Admin qo'lda ("egasi") qo'ygan qiymat ustun — "qolda".
 *  bo'yin: tekshir(kod, qator) → xato matni yoki '' (narxStavka.narxQollash chegaralari; xato bo'lsa "noaniq/chegara"). → { qatorlar, xulosa } */
export function xizmatFarq(yuklangan, cur, tekshir) {
  const out = [], hozir = (cur && cur.xizmatlar) || {};
  for (const [kod, r] of Object.entries(yuklangan.xizmatlar)) {
    const e = hozir[kod] || null;
    const asos = { g: 'xizmat', k: kod, erp_id: kod, sku: kod, nom: r.nom, birlik: r.birlik, guruh: r.guruh, royxat: null, satr: r };   // satr — qo'llashda hujjatga yoziladigan to'liq qator
    let h, eski = e ? e.qiymat : 0;
    if (!e) h = 'yangi';
    else if (e.qiymat === r.qiymat) h = 'bir_xil';
    else h = e.manba === 'egasi' ? 'qolda' : 'ozgardi';
    let sabab;
    if ((h === 'ozgardi' || h === 'yangi') && tekshir) { const x = tekshir(kod, r); if (x) { h = 'noaniq'; sabab = 'chegara'; } }
    out.push({ ...asos, eski, yangi: r.qiymat, foiz: foizOl(eski, r.qiymat), manba: e ? (e.manba === 'egasi' ? 'qolda' : 'fayl') : '', h, q: h === 'ozgardi' || h === 'yangi', ...(sabab ? { sabab } : {}) });
  }
  let yoq = 0;
  for (const kod of Object.keys(hozir)) if (!yuklangan.xizmatlar[kod]) { yoq++; if (yoq <= LIMIT.yoq_royxat) out.push({ g: 'xizmat', k: kod, erp_id: '', sku: kod, nom: hozir[kod].nom || kod, birlik: hozir[kod].birlik || '', guruh: hozir[kod].guruh, royxat: null, eski: hozir[kod].qiymat, yangi: 0, foiz: null, manba: '', h: 'yoq', q: false }); }
  out.sort(saralash);
  return { qatorlar: out, xulosa: xulosaHisobla(out, { qatorlar: Object.keys(yuklangan.xizmatlar).length, jami_erp: yuklangan.jami, otkazildi: yuklangan.otkazildi, chetda: yuklangan.chetda, yoq: { xizmat: yoq } }) };
}
