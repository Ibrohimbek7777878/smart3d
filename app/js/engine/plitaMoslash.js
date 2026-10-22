/* Smart3D engine/plitaMoslash.js — TZ-42: Bazis/loyiha material nomini ERP plitasiga moslash va list formatini nomdagi maydondan aniqlash.
 *
 * Nega kerak (egasi #280–#282, "Big one" oshxona): Bazis fayldagi "ЛДСП, Сатин 4,6кв" ERP'dagi "ЛДСП Ультрадекор 4,575 Сатин BS 16мм"
 * (SKU 7045 BS) bilan bog'lanmagan edi — narx "taxmin", list formati noto'g'ri (4,6кв nomdan o'qilmay 2800×2070 olinardi).
 *
 * QOIDA (4.3 — o'ylab topilmaydi): moslik faqat BIR QIYMATLI bo'lsa avtomatik ("aniq"); bir nechta nomzod bo'lsa — "nomzod"
 * (foydalanuvchi tanlaydi: mavjud material tanlash oynasi); topilmasa — "yoq". Hech qachon "eng yaqinini" jimgina tanlamaydi.
 *
 * Toza funksiyalar (brauzer va Node bir xil): faqat matn va katalog yozuvlari (sheet-catalog.json shakli) bilan ishlaydi. */

/** list formati nom ichidagi maydondan (m²): "4,575" → 2500×1830 (ERP nomlari shunday yozadi; katalogdagi eni/bo'yi esa ba'zan sukut 2800×2070) */
export const MAYDON = [
  [4.575, [2500, 1830]], [5.0325, [2750, 1830]], [5.175, [2500, 2070]], [5.796, [2800, 2070]], [2.9768, [2440, 1220]], [2.928, [2440, 1200]]
];

/** nomdagi maydon (m²) yoki null. "4,575" / "5.0325" — aniq; "4,6кв" — yaxlitlangan (faqat "кв" bilan va bitta formatga yaqin bo'lsa).
 *  yaxlit: false — faqat aniq yozuv (Bazis materialining kroy formati uchun: "4,6кв" nominal belgi — sex ba'zan 5,0325 listdan kesadi,
 *  shuning uchun faqat ERP plitasi tanlangach format ERP mahsulotidan olinadi) */
export function nomMaydoni(nom, yaxlit = true) {
  const s = String(nom || '');
  let m = s.match(/(?<![\d.,])(\d)[,.](\d{2,4})(?![\d])/);
  if (m) {
    const a = parseFloat(m[1] + '.' + m[2]);
    const f = MAYDON.find(([x]) => Math.abs(x - a) <= 0.006);
    return f ? f[0] : null;
  }
  if (!yaxlit) return null;
  m = s.match(/(?<![\d.,])(\d)[,.](\d)\s*кв(?![а-яёa-z])/i);
  if (m) {
    const a = parseFloat(m[1] + '.' + m[2]);
    const yaqin = MAYDON.filter(([x]) => Math.abs(x - a) <= 0.05);
    return yaqin.length === 1 ? yaqin[0][0] : null;
  }
  return null;
}

/** list formati [uzunlik, en] nomdagi maydondan, bo'lmasa null (yaxlit — nomMaydoni ga qarang) */
export function nomFormati(nom, yaxlit = true) {
  const a = nomMaydoni(nom, yaxlit);
  const f = a == null ? null : MAYDON.find(([x]) => x === a);
  return f ? f[1].slice() : null;
}

/** ERP katalog yozuvining haqiqiy list formati: nomdagi maydon ishonchliroq — katalogdagi eni/bo'yi ko'pincha sukut 2800×2070
 *  (50 ta "4,575" va 125 ta "5,0325" LDSP shunday). Faqat sukut 2800×2070 bo'lib, nomdagi maydon boshqa formatni aytsa tuzatiladi
 *  (boshqa o'lcham ERP/kategoriyadan kelgan — tegilmaydi). Natija { f: [L, W], tuzatildi } */
export function plitaFormati(nom, l, w) {
  const L = +l, W = +w, kat = L > 100 && W > 100 ? [L, W] : null;
  const nomdan = nomFormati(nom);
  if (nomdan && (!kat || (kat[0] === 2800 && kat[1] === 2070 && (nomdan[0] !== 2800 || nomdan[1] !== 2070)))) {
    return { f: nomdan, tuzatildi: !!kat && (kat[0] !== nomdan[0] || kat[1] !== nomdan[1]) };
  }
  return { f: kat, tuzatildi: false };
}

/* ── nomni normallashtirish ── */
const BREND = [
  [/эггер|egger/i, 'egger'], [/кроностар|kronostar/i, 'kronostar'], [/кроношпан|kronospan/i, 'kronospan'], [/ультрадекор|ultradekor/i, 'ultradekor'],
  [/кастамону|kastamonu/i, 'kastamonu'], [/алтай|altay/i, 'altay'], [/silkway/i, 'silkway'], [/moonlight/i, 'moonlight'],
  [/кронопол|kronopol/i, 'kronopol'], [/baeir/i, 'baeir'], [/ламарти|lamarty/i, 'lamarty'], [/shanghai/i, 'shanghai']
];
const TUR_SOZ = /(?<![а-яёa-z])(?:лдсп|лмдф|мдф|лхдф|хдф|дсп|акрил|ldsp|lmdf|mdf|lhdf|hdf|akril)(?![а-яёa-z])/gi;
const SHUM = [
  /\d{3,4}\s*[*xх×]\s*\d{3,4}(?:\s*[*xх×]\s*[\d.,]+)?(?:\s*(?:мм|mm))?/gi,          // 2800*2070*18
  /\d+(?:[.,]\d+)?\s*(?:мм|mm)(?![а-яёa-z])/gi,                                         // 16мм, 16 мм
  /(?<![\wа-яё])\d[.,]\d+\s*(?:кв|м2)?(?![\wа-яё])/gi,                                  // 4,575 / 4,6кв
  /(?<![а-яё])кв(?![а-яё])/gi, /\([^)]*\)/g,
  /(?<![\wа-яё])(?:st\d*|[a-z]{1,3}\d*|[a-z]?\d{2,5}[a-z]{0,3})(?![\wа-яё])/gi         // dekor kodi: ST9, BS, PE, 0110, U190
];
const BIR = { c: 'с', a: 'а', e: 'е', o: 'о', p: 'р', x: 'х', y: 'у', k: 'к', m: 'м', t: 'т', h: 'н', b: 'в' };   // lotin → kirill o'xshash harf (aralash yozuv)

/** nom → { tur, brend, dekor: [so'zlar, tartiblangan, takrorsiz], maydon, sku: [normallashgan SKU nomzodlari], th } */
export function nomTahlil(nom) {
  let s = String(nom || '').replace(/ё/g, 'е').replace(/Ё/g, 'Е');
  const maydon = nomMaydoni(s);
  const th = (s.match(/(\d+(?:[.,]\d+)?)\s*(?:мм|mm)(?![а-яёa-z])/i) || [])[1];
  /* SKU nomzodlari: "7045 BS", "W980 SM", "0110" (qo'shimchasiz raqam ham) — SHUM kesishidan OLDIN */
  const sku = new Set();
  for (const m of s.matchAll(/(?<![\w\d.,])([a-zA-Z]?\d{3,4})\s*([a-zA-Z]{1,3}\d?)?(?![\wа-яё])/g)) {
    const raqam = m[1].toLowerCase();
    if (/^\d[.,]/.test(raqam)) continue;
    sku.add(raqam); if (m[2]) sku.add(raqam + m[2].toLowerCase());
  }
  let brend = '';
  for (const [re, nm] of BREND) if (re.test(s)) { brend = nm; s = s.replace(re, ' '); break; }
  const tur = (s.match(TUR_SOZ) || [])[0] || '';
  s = s.replace(TUR_SOZ, ' ');
  for (const re of SHUM) s = s.replace(re, ' ');
  const sozlar = s.toLowerCase().replace(/[*_,;:|/\\.\-+]+/g, ' ').split(/\s+/).filter(Boolean)
    .map(w => (/[а-я]/.test(w) ? w.replace(/[a-z]/g, ch => BIR[ch] || ch) : w));
  return { tur: tur.toLowerCase(), brend, dekor: [...new Set(sozlar)].sort(), maydon, sku: [...sku], th: th ? parseFloat(th.replace(',', '.')) : null };
}

/** Bazis materiali turi (loyiha.js materialTuri: ldsp | lmdf | mdf | akril | hdf) → ERP katalog turi */
const ERP_TUR = { ldsp: ['LDSP'], lmdf: ['LMDF'], mdf: ['MDF'], akril: ['AKRIL'], hdf: ['HDF'] };
const skuKalit = (v) => String(v || '').toLowerCase().replace(/\s+/g, '');
const tengToplam = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const ichida = (a, b) => a.every(x => b.includes(x));

/** ERP yozuvi uchun tahlil keshi (katalog 1281 ta — har chaqiruvda qayta tahlil qilinmasin) */
const KESH = new WeakMap();
const tahlilSheet = (sh) => { let r = KESH.get(sh); if (!r) { r = nomTahlil(sh.name); KESH.set(sh, r); } return r; };

/**
 * Bazis materialini ERP plitasiga moslash.
 * @param {{ name: string, thickness?: number, tur?: string }} bm — Bazis materiali (loyiha.js hisobot.materiallar yozuvi)
 * @param {Array} sheets — ERP plitalari (sheet-catalog.json .sheets: sku, name, type, th, l, w, uzs)
 * @returns {{ holat: 'aniq'|'nomzod'|'yoq', sheet: object|null, nomzodlar: object[], sabab: string }}
 *   aniq — bitta ERP plitasi (avtomatik qo'llanadi); nomzod — bir nechta (foydalanuvchi tanlaydi, eng ko'pi 6 ta); sabab 'format' (TZ-47 B) — dekor boshqa list formatida ham/faqat shunda bor;
 *   yoq — mos ERP plitasi topilmadi (sabab: tur | dekor_yoq | nom_yoq).
 */
export function bazisniERPga(bm, sheets) {
  const yoq = (sabab) => ({ holat: 'yoq', sheet: null, nomzodlar: [], sabab });
  const nom = String((bm && bm.name) || '').trim();
  if (!nom) return yoq('nom_yoq');
  const turlar = ERP_TUR[(bm && bm.tur) || ''];
  if (!turlar) return yoq('tur');
  const b = nomTahlil(nom), th = +(bm && bm.thickness) || b.th || 0;
  /* ERP plitasi Bazis nomidagi list maydoniga mosmi (nomda maydon yo'q bo'lsa — katalogdagi eni×bo'yi bo'yicha) */
  const formatMos = (s) => {
    const m = tahlilSheet(s).maydon;
    if (m != null) return m === b.maydon;
    return !(+s.l > 100 && +s.w > 100) || Math.abs(s.l * s.w / 1e6 - b.maydon) < 0.1;
  };
  /* nomzod tanlash: formatFiltr — Bazis nomidagi list maydoni (4,575 …) ERP plitasi maydoniga teng bo'lishi shart (sukut); TZ-47 (B): formatsiz ham sinaladi */
  const tanla = (formatFiltr) => {
    /* 1) tur, qalinlik, list maydoni (ikkalasida ham aytilgan bo'lsa) */
    let pool = (sheets || []).filter(s => turlar.includes(s.type) && (!th || Math.abs((+s.th || 0) - th) < 0.6));
    if (formatFiltr && b.maydon != null) pool = pool.filter(formatMos);
    /* narxi bor plitalar — oldin (#151: narxsiz plita ro'yxatda ko'rinmaydi); faqat narxsiz bo'lsa — ular */
    const narxli = pool.filter(s => s.uzs > 0);
    if (narxli.length) pool = narxli;
    /* takrorlarni olib tashlash: bir xil sku+nom+qalinlik */
    const ko = new Set();
    pool = pool.filter(s => { const k = [s.sku, s.name, s.th].join('|'); if (ko.has(k)) return false; ko.add(k); return true; });
    if (!pool.length) return yoq('dekor_yoq');
    /* 2) SKU — nomda ERP SKU'si aynan yozilgan bo'lsa (qo'shimchasi bilan: "7045 BS") */
    const sk = pool.filter(s => b.sku.includes(skuKalit(s.sku)) && /[a-z]/.test(skuKalit(s.sku).replace(/^[a-z]?\d+/, '')));
    if (sk.length === 1) return { holat: 'aniq', sheet: sk[0], nomzodlar: [sk[0]], sabab: 'sku' };
    /* 3) dekor so'zlari va ishlab chiqaruvchi */
    const brendOk = (s) => !b.brend || !tahlilSheet(s).brend || tahlilSheet(s).brend === b.brend;
    const dekorda = pool.filter(s => b.dekor.length && brendOk(s) && ichida(b.dekor, tahlilSheet(s).dekor));
    const aynan = dekorda.filter(s => tengToplam(b.dekor, tahlilSheet(s).dekor));
    /* nomzodlar tartibi: Bazis nomiga eng yaqin (ortiqcha dekor so'zi kam) → Ultradekor (sex standarti, #151) → arzoni */
    const tartib = (list) => list.slice().sort((x, y) => (tahlilSheet(x).dekor.length - tahlilSheet(y).dekor.length)
      || ((tahlilSheet(y).brend === 'ultradekor') - (tahlilSheet(x).brend === 'ultradekor')) || ((+x.uzs || 0) - (+y.uzs || 0)) || String(x.sku).localeCompare(String(y.sku)));
    if (aynan.length === 1) return { holat: 'aniq', sheet: aynan[0], nomzodlar: [aynan[0]], sabab: 'dekor' };
    if (aynan.length > 1) return { holat: 'nomzod', sheet: null, nomzodlar: tartib(aynan).slice(0, 6), sabab: 'kop' };
    if (dekorda.length) return { holat: 'nomzod', sheet: null, nomzodlar: tartib(dekorda).slice(0, 6), sabab: 'kop' };
    return yoq('dekor_yoq');
  };
  const r = tanla(true);
  /* TZ-47 (B): sexda format ko'pincha o'zgaradi (Bazis nomida 4,575 — kesish 5,0325 dan; 3812, 3877, 3888, 3936, 4034, 4250). Shuning uchun format farqi
     bo'lishi mumkin bo'lgan moslik "aniq" EMAS — "nomzod" (foydalanuvchi tanlaydi): (a) dekor boshqa formatda ham bor, (b) dekor faqat boshqa formatda bor
     (avval "yoq"). Nomdagi aniq SKU ("7045 BS") — aniq qoladi; Bazis nomida list maydoni bo'lmasa — oldingidek. */
  if (b.maydon != null && r.sabab !== 'sku' && (r.sabab === 'dekor' || r.sabab === 'dekor_yoq')) {
    const t = tanla(false);
    if (t.holat !== 'yoq' && t.sabab !== 'sku') {
      const boshqa = t.nomzodlar.filter(s => !formatMos(s));
      if (boshqa.length) return { holat: 'nomzod', sheet: null, nomzodlar: (r.sheet ? [r.sheet] : []).concat(boshqa.filter(s => s !== r.sheet)).slice(0, 6), sabab: 'format' };
    }
  }
  return r;
}

/** loyihadagi barcha Bazis materiallari → { [BZM kodi]: natija }. Stoleshnitsa va ERP kodi allaqachon tanlanganlar o'tkazib yuboriladi. */
export function bazisMoslashHammasi(materiallar, sheets, almash) {
  const out = {};
  for (const m of materiallar || []) {
    if (!m || !m.code || (almash && almash[m.code])) continue;
    out[m.code] = bazisniERPga(m, sheets);
  }
  return out;
}
