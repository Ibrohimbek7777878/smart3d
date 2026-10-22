/* Smart3D engine/xizmatKatalog.js — TZ-48: narx panelidagi «Xizmat qo'shish» oynasi uchun xizmatlar katalogi va qo'shilgan xizmat qatorlarini tekshirish.
 * SOF funksiyalar (Node va brauzer): tarmoq, fayl, baza YO'Q.
 *
 * Manbalar (narx O'YLAB TOPILMAYDI, qoida 4.3):
 *   1) app/data/erp-xizmatlar.json — Bittada ERP xizmatlar jadvali (mijoz narxi): arra, kromka, prisadka, pazlash, Rover, Bazis, VR. manba 'sex jadvali' (ERP).
 *   2) narx hujjati (server /api/narxlar, hisob H.narxlar) — xuddi shu kodli xizmat bo'lsa uning narxi/manbasi/sanasi USTUN (admin qo'lda yoki ERP jonli sinxron
 *      yangilagan narx); hujjatda bor, lekin ro'yxatda yo'q xizmat ham qo'shiladi.
 *   3) app/data/services.json — Smart3D xizmatlar katalogi (kroy, kromka, montaj, yetkazib berish …): ERP emas, tasdiqlanmagan narx — manba 'taxmin'
 *      (narx aniqligini pasaytiradi, narx tarkibida «taxmin» deb ko'rinadi).
 * Doc: doc.qoshXizmat = [{ kod, nom, guruh, birlik, narx, manba, sana, soni }] — loyiha bilan birga saqlanadi; narx qo'shilgan paytdagi (loyiha o'z narxini saqlaydi). */

export const XIZMAT_GURUHLAR = ['arra', 'kromka', 'prisadka', 'rover', 'bazis', 'boshqa'];
/** services.json kategoriyasi → guruh */
const SRV_GURUH = { cutting: 'arra', edging: 'kromka', drilling: 'prisadka', milling: 'rover', finishing: 'boshqa', logistics: 'boshqa', assembly: 'boshqa' };
const MANBALAR = ['sex jadvali', 'egasi', 'taxmin'];
export const QOSH_LIMIT = { soni: 100000, narx: 1e8, qator: 200 };
const SANA_RE = /^\d{4}-\d{2}-\d{2}$/;
const KOD_RE = /^[\w.\-]{1,40}$/;
const matn = (v, max) => (typeof v === 'string' || typeof v === 'number' ? String(v).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');

/**
 * Katalog: [{ kod, nom, guruh, birlik, narx, manba, sana, kat }] — guruh va nom bo'yicha tartiblangan.
 * erp — erp-xizmatlar.json; services — services.json; narxlar — narx hujjati (xizmatlar bo'limi bilan); hammasi ixtiyoriy.
 */
export function xizmatKatalog({ erp, services, narxlar } = {}) {
  const out = new Map();
  const sana0 = matn(erp && erp.sana, 10);
  for (const x of (erp && erp.xizmatlar) || []) {
    const kod = matn(x.kod, 40), narx = +x.narx;
    if (!KOD_RE.test(kod) || !(narx > 0) || !XIZMAT_GURUHLAR.includes(x.guruh)) continue;
    out.set(kod, { kod, nom: matn(x.nom, 200), guruh: x.guruh, birlik: matn(x.birlik, 20) || 'dona', narx: Math.round(narx), manba: 'sex jadvali', sana: SANA_RE.test(sana0) ? sana0 : '', kat: matn(x.kat, 100) });
  }
  for (const s of (narxlar && narxlar.xizmatlar && Object.entries(narxlar.xizmatlar)) || []) {
    const [kod, r] = s;
    if (!r || !(r.qiymat > 0)) continue;
    const e = out.get(kod);
    if (e) { e.narx = Math.round(r.qiymat); e.manba = MANBALAR.includes(r.manba) ? r.manba : e.manba; e.sana = SANA_RE.test(String(r.sana || '')) ? r.sana : e.sana; }
    else if (KOD_RE.test(kod) && XIZMAT_GURUHLAR.includes(r.guruh)) out.set(kod, { kod, nom: matn(r.nom, 200) || kod, guruh: r.guruh, birlik: matn(r.birlik, 20) || 'dona', narx: Math.round(r.qiymat), manba: MANBALAR.includes(r.manba) ? r.manba : 'taxmin', sana: SANA_RE.test(String(r.sana || '')) ? r.sana : '', kat: matn(r.kategoriya, 100) });
  }
  const sSana = matn(services && services.updated_at, 10);
  for (const x of (services && services.services) || []) {
    const kod = matn(x.code, 40), narx = +x.price;
    if (!KOD_RE.test(kod) || out.has(kod) || !(narx > 0)) continue;
    out.set(kod, { kod, nom: matn(x.name, 200), guruh: SRV_GURUH[x.category] || 'boshqa', birlik: matn(x.unit, 20) || 'dona', narx: Math.round(narx), manba: 'taxmin', sana: SANA_RE.test(sSana) ? sSana : '', kat: matn(x.category, 100) });
  }
  const tartib = (g) => XIZMAT_GURUHLAR.indexOf(g);
  return [...out.values()].sort((a, b) => tartib(a.guruh) - tartib(b.guruh) || a.nom.localeCompare(b.nom, 'ru'));
}

/** qidiruv: nom, kod, kategoriya bo'yicha (registrsiz); guruh — 'hammasi' yoki guruh nomi */
export function xizmatQidir(katalog, q, guruh) {
  const s = String(q || '').toLowerCase().replace(/ё/g, 'е').trim();
  const sozlar = s ? s.split(/\s+/) : [];
  return (katalog || []).filter(x => (!guruh || guruh === 'hammasi' || x.guruh === guruh)
    && sozlar.every(w => (x.nom + ' ' + x.kod + ' ' + x.kat).toLowerCase().replace(/ё/g, 'е').includes(w)));
}

/** Hujjatdagi qo'shilgan xizmatlar (doc.qoshXizmat) → tekshirilgan ro'yxat (buzuq qator tashlanadi; takror kod birlashtiriladi). Miqdor — butun son, ko'tarilib (S2: Math.ceil). */
export function qoshXizmatTekshir(list) {
  const out = new Map();
  if (!Array.isArray(list)) return [];
  for (const x of list.slice(0, QOSH_LIMIT.qator)) {
    if (!x || typeof x !== 'object') continue;
    const kod = matn(x.kod, 40), narx = +x.narx, soni = Math.ceil(+x.soni - 1e-9);
    if (!KOD_RE.test(kod) || !(narx > 0) || narx > QOSH_LIMIT.narx || !(soni >= 1)) continue;
    const q = { kod, nom: matn(x.nom, 200) || kod, guruh: XIZMAT_GURUHLAR.includes(x.guruh) ? x.guruh : 'boshqa', birlik: matn(x.birlik, 20) || 'dona', narx: Math.round(narx),
      manba: MANBALAR.includes(x.manba) ? x.manba : 'taxmin', sana: SANA_RE.test(String(x.sana || '')) ? x.sana : '', soni: Math.min(soni, QOSH_LIMIT.soni) };
    const e = out.get(kod);
    if (e) e.soni = Math.min(e.soni + q.soni, QOSH_LIMIT.soni); else out.set(kod, q);
  }
  return [...out.values()];
}
