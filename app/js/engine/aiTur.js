/* Smart3D engine/aiTur.js — egasi #183: "bizda bor modullardan foydalanib AI bizga konstruksiya qilib bersin".
 *
 * Matn → nima so'ralgani (AI'siz, uch tilda):
 *   aiTur(matn) → { tur: 'oshxona' | 'shablon' | 'modul' | 'nomalum', shablon?: id, xona?: 'yotoqxona'|… }
 *     oshxona — avvalgi yo'l (ai.js aiBuild + avtomatik konstruktor);
 *     shablon — xona turi (yotoqxona, mehmonxona/TV zona, dahliz, garderob xonasi, shkaf-kupe devor bo'ylab, bolalar, ofis, hammom):
 *               tayyor so'rov (app/data/promptlar.json) matndagi raqamlar bilan — faqat katalog modullari;
 *     modul   — bitta mebel (konstruksiyaTili → katalogTanlash);
 *     nomalum — tanilmadi: hech narsa qurilmaydi, karta "Tushunmadim" + tayyor variantlar (tasodifiy modul qo'yilmaydi).
 *   shablonReja(matn, prompt, catalog) → { prompt (toplami o'zgartirilgan nusxa), kirish, qatorlar: [{ kalit, v, diqqat, manba }] }
 *     So'ralgan buyum shablonda bo'lsa — belgilanadi; bo'lmasa — katalogdagi shu turdagi modul qo'shiladi (KIND_MODUL);
 *     katalogda yo'q bo'lsa — qizil qator "bajarilmadi". Raqam o'ylab topilmaydi: aytilmagan o'lcham — shablon sukuti (kartada "sukut").
 */
import { konstruksiyami } from './konstruksiyaTili.js';
import { OSHXONA_SOZ } from './oshxonaTili.js';

const tayyorla = (m) => String(m || '').toLowerCase().replace(/[ʻʼ’‘`´]/g, "'").replace(/(\d),(\d)/g, '$1.$2').replace(/\s+/g, ' ');

/* xona turlari → tayyor so'rov (promptlar.json id). Tartib muhim: aniqrog'i oldin */
const XONALAR = [
  { xona: 'garderob-xona', id: 'garderob-xona', re: /garderob\s*xona|garderobxona|гардеробн[а-яё]*|walk-?in/ },
  { xona: 'yotoqxona', id: 'yotoqxona', re: /yotoq\s*xona[a-z']*|yotoqxon[a-z']*|спальн[а-яё]*|bed\s*room|bedroom/ },
  { xona: 'bolalar', id: 'bolalar', re: /bolalar[a-z']*|детск[а-яё]*|kids'?\s*room|children'?s?\s*room|nursery/ },
  { xona: 'mehmonxona', id: 'mehmonxona-tv', re: /mehmon\s*xona[a-z']*|mehmonxon[a-z']*|гостин[а-яё]*|living\s*room|lounge|(?<![a-zа-яё])(?:tv|тв)[\s-]*(?:zona|зон[а-яё]*|zone|wall|devor)/ },
  { xona: 'dahliz', id: 'dahliz', re: /dahliz[a-z']*|daliz[a-z']*|dalan[a-z']*|koridor[a-z']*|yo'lak[a-z']*|prixo[jsh]+ka[a-z]*|прихож[а-яё]*|коридор[а-яё]*|hallway|entryway|entrance hall/ },
  { xona: 'hammom', id: 'hammom', re: /hammom[a-z']*|vanna\s*xona|ванн[а-яё]*\s*комнат|ванн[ао]й|санузел|bathroom/ },
  { xona: 'ofis', id: 'ofis-ikki', re: /(?<![a-z])ofis[a-z']*|офис[а-яё]*|(?<![a-z])office/ }
];
const XONA_SOZ = /(?<![a-z])xona(?![a-z])|xonaga|xonada|комнат[а-яё]*|(?<![a-z])room(?![a-z])/;
/** turi aytilmagan xona — so'ralgan buyumlardan (toplam bo'sh: shablonReja to'ldiradi) */
export const XONA_SHABLON = { id: 'xona', kat: 'xona', usul: 'toplam', nom: { uz: 'Xona', ru: 'Комната', en: 'Room' },
  maydon: [{ k: 'eni', q: 3600, min: 1500, max: 12000 }, { k: 'chuqurligi', q: 3000, min: 1500, max: 12000 }], toplam: [] };
const UY_OFIS = /uy(?:dagi|da)?\s*(?:ish|ofis)|home\s*office|домашн[а-яё]*\s*(?:офис|кабинет)|рабоч[а-яё]*\s*мест[а-яё]*\s*дома/;
const KUPE_DEVOR = /(?:kupe|купе|sliding)/;
const DEVOR_BOYLAB = /devor\s*bo'?y(?:lab|i|iga)|butun\s*devor|вдоль\s*(?:всей\s*)?стен[а-яё]*|во\s*всю\s*стену|along\s*(?:the\s*)?(?:whole\s*)?wall|full\s*wall/;

/* buyumlar (so'ralgan mebel turi) — matndan */
const BUYUM = {
  krovat: /krovat[a-z']*|karavot[a-z']*|kravat[a-z']*|karovat[a-z']*|кроват[а-яё]*|(?<![a-z])beds?(?![a-z])/,
  tumba: /(?<!tv\s|тв\s|tv-|тв-)(?:tumba[a-z']*|тумб[а-яё]*|nightstands?|bedside\s*tables?)/,
  komod: /komod[a-z']*|комод[а-яё]*|dresser|chest of drawers/,
  kupe: /kupe|купе|sliding\s*wardrobe/,
  poyabzal: /poyabzal[a-z']*|oyoq\s*kiyim[a-z']*|обув[а-яё]*|shoe\s*(?:cabinet|rack|storage)?/,
  ilgich: /kiyim\s*il(?:gich|adigan)[a-z']*|ilgich[a-z']*|veshalka[a-z]*|вешалк[а-яё]*|coat\s*(?:hanger|rack|panel)|coat/,
  garderob: /garderob(?!\s*xona)[a-z']*|гардероб(?!н)[а-яё]*|wardrobe|closet|kiyim\s*shkaf[a-z']*/,
  tv: /(?<![a-zа-яё])(?:tv|тв)(?![a-zа-яё])|televizor[a-z']*|телевизор[а-яё]*/,
  vitrina: /vitrina[a-z']*|витрин[а-яё]*|display\s*cabinets?/,
  divan: /divan[a-z']*|диван[а-яё]*|sofa|couch/,
  javon: /javon[a-z']*|tokcha[a-z']*|stellaj[a-z']*|стеллаж[а-яё]*|bookcase|shel(?:f|ves)|kitob/,
  parta: /parta[a-z']*|парт[аыу](?![а-яё])/,
  stol: /(?<![a-z])stol(?!eshn|ichn|ishn)[a-z']*|(?<![а-яё])стол(?!еш)[а-яё]*|desks?|(?<![a-z])tables?/,
  kozgu: /ko'zgu[a-z']*|kozgu[a-z']*|зеркал[а-яё]*|mirror/,
  rakovina: /rakovina[a-z']*|lavabo|раковин[а-яё]*|умывальн[а-яё]*|vanity|(?<![a-z])sink/
};
/* buyum → katalogdagi asosiy modul (shablonda bo'lmasa qo'shiladi). null — katalogda shu turdagi modul yo'q (egasiga ro'yxat) */
export const KIND_MODUL = {
  krovat: 'MC-KR-04', tumba: null, komod: 'SP-BD-005', kupe: 'SP-G-010', poyabzal: 'SP-W-008', ilgich: 'SP-D-002', garderob: 'SP-W-006',
  tv: 'SP-SH-002', vitrina: 'SP-SH-004', divan: 'SP-S-006', javon: 'SP-SH-005', parta: 'MC-PA-02', stol: 'SP-T-007', kozgu: 'SP-H-011', rakovina: 'SP-H-010'
};
/* katalog moduli → buyum turi (shablon tarkibini so'ralgan bilan solishtirish uchun) */
export function modulTuri(f) {
  if (!f) return null;
  const n = String(f.name || '').toLowerCase(), c = f.category, g = f.group;
  if (c === 'bed') return g === 'komod' ? 'komod' : /boshka|toshqin/.test(n) ? null : 'krovat';
  if (c === 'wardrobe') return /kupe/.test(n) ? 'kupe' : /poyabzal/.test(n) ? 'poyabzal' : 'garderob';
  if (c === 'coat_hanger') return 'ilgich';
  if (c === 'shelf') return g === 'tv' ? 'tv' : g === 'vitirina' ? 'vitrina' : 'javon';
  if (c === 'sofa') return 'divan';
  if (c === 'desk') return /parta/.test(n) || g === 'bolalar' ? 'parta' : 'stol';
  if (c === 'table') return 'stol';
  if (c === 'vanity') return 'rakovina';
  if (c === 'mirror_cabinet') return 'kozgu';
  if (c === 'bathroom') return 'garderob';
  return null;
}

const SONLAR = [[1, "bir|bitta|один|одна|одну|one|a|an"], [2, "ikki|ikkita|два|две|двух|two|pair of"], [3, "uch|uchta|три|трёх|трех|three"], [4, "to'rt|tort|to'rtta|четыре|four"]];
/** buyum so'zidan oldingi son ("ikki tumba", "2 ta tumba", "две тумбы") — topilmasa 1 */
function soni(s, i) {
  const old = s.slice(Math.max(0, i - 14), i);
  const m = /(\d{1,2})\s*(?:ta(?:dan)?|шт\.?)?\s*$/.exec(old);
  if (m) return Math.min(6, +m[1]);
  for (const [n, w] of SONLAR) if (new RegExp("(?:^|[^a-zа-яё'])(?:" + w + ")\\s*(?:ta)?\\s*$").test(old)) return n;
  return 1;
}

/** matndagi so'ralgan buyumlar: [{ tur, n, i }] (birinchi uchrashuv tartibida) */
export function buyumlar(matn) {
  const s = tayyorla(matn), out = [];
  for (const [tur, re] of Object.entries(BUYUM)) {
    const m = new RegExp(re.source).exec(s);
    if (!m) continue;
    if (tur === 'garderob' && BUYUM.kupe.test(s)) continue;                                  // "shkaf-kupe" — kupe
    if (tur === 'stol' && BUYUM.parta.test(s)) continue;
    if (tur === 'krovat' && /bed\s*room|bedroom/.test(s) && !/(?<![a-z])beds?(?![a-z]|room)/.test(s.replace(/bed\s*room|bedroom/g, ''))) continue;
    out.push({ tur, n: soni(s, m.index), i: m.index });
  }
  return out.sort((a, b) => a.i - b.i);
}

/** son + birlik → mm (birliksiz: 10 dan kichik — metr, aks holda mm) */
function mmga(v, b) {
  const x = +v;
  if (/^(mm|мм)$/.test(b || '')) return Math.round(x);
  if (/^(sm|см|cm)$/.test(b || '')) return Math.round(x * 10);
  if (/^(m|м|metr|метр)/.test(b || '')) return Math.round(x * 1000);
  return x < 10 ? Math.round(x * 1000) : Math.round(x);
}
const B = "(mm|мм|sm|см|cm|metr[a-z]*|метр[а-яё]*|m|м)?";

/** xona o'lchamlari: "4x3.6", "4000x3600" — eni, chuqurligi; aks holda xona so'zidan keyingi son ("dahliz 1800", "tv zona 3000") — eni */
function xonaOlcham(s, xonaRe) {
  const m = new RegExp("(\\d+(?:\\.\\d+)?)\\s*" + B + "\\s*[x×х*]\\s*(\\d+(?:\\.\\d+)?)\\s*" + B + "(?![a-zа-яё])").exec(s);
  if (m) {
    const u = m[2] || m[4];
    const a = mmga(m[1], u), b = mmga(m[3], m[4] || m[2]);
    if (a >= 1000 && b >= 1000) return { eni: a, chuqurligi: b };
  }
  if (xonaRe) {
    /* xona so'zi va son orasida buyum so'zi bo'lmasin ("yotoqxona: krovat 1600" — 1600 xona eni emas); xona so'zining o'zi ("tv zona") — mumkin */
    const re = new RegExp("(?:" + xonaRe.source + ")([^\\d]{0,24}?)(\\d+(?:\\.\\d+)?)\\s*" + B + "(?![a-zа-яё0-9])", 'g');
    let x;
    while ((x = re.exec(s))) {
      const ora = x[1].replace(new RegExp(xonaRe.source, 'g'), ' ');
      if (Object.values(BUYUM).some(r => new RegExp(r.source).test(ora))) continue;
      const v = mmga(x[2], x[3]);
      if (v >= 1000 && v <= 12000) return { eni: v };
    }
  }
  const e = new RegExp("(?:eni|ширин[а-яё]*|width)\\s*[:=-]?\\s*(\\d+(?:\\.\\d+)?)\\s*" + B).exec(s);
  if (e) { const v = mmga(e[1], e[2]); if (v >= 1000 && v <= 12000) return { eni: v }; }
  return {};
}

/** krovat eni: "krovat 1600", "кровать 160 см", "1600 krovat" (1400…2200 mm; 80…220 — sm) */
function krovatEni(s) {
  const m = new RegExp("(?:" + BUYUM.krovat.source + ")[^\\d,;]{0,12}?(\\d{2,4})\\s*" + B).exec(s)
    || new RegExp("(\\d{2,4})\\s*" + B + "\\s*(?:li\\s*|lik\\s*)?(?:" + BUYUM.krovat.source + ")").exec(s);
  if (!m) return 0;
  let v = +m[1];
  if (/^(sm|см|cm)$/.test(m[2] || '') || (v >= 80 && v <= 220)) v *= 10;
  return v >= 800 && v <= 2200 ? v : 0;
}

/** matn → nima so'ralgani */
export function aiTur(matn) {
  const s = tayyorla(matn);
  if (!s.trim()) return { tur: 'nomalum' };
  const oshxonaSoz = OSHXONA_SOZ.test(s);
  const xona = XONALAR.find(x => x.re.test(s));
  const by = buyumlar(s);
  if (!oshxonaSoz) {
    if (xona) {
      /* xona so'zi + bitta mebel konstruksiyasi ("yotoqxona uchun shkaf 1200 4 polka") — bitta modul */
      if (by.length <= 1 && konstruksiyami(s) && /\d/.test(s.replace(xona.re, ''))) return { tur: 'modul' };
      const id = xona.xona === 'ofis' && UY_OFIS.test(s) ? 'ofis-uy' : xona.id;
      return { tur: 'shablon', shablon: id, xona: xona.xona };
    }
    if (KUPE_DEVOR.test(s) && DEVOR_BOYLAB.test(s)) return { tur: 'shablon', shablon: 'garderob-kupe', xona: 'garderob-kupe' };
    /* turi aytilmagan xona va buyumlar ("4.2x3.1 xona, 1 garderob, 1 stol") — faqat so'ralgan buyumlar, katalogdagi asosiy modul bilan */
    if (XONA_SOZ.test(s) && by.length && !konstruksiyami(s.replace(XONA_SOZ, ' '))) return { tur: 'shablon', shablon: 'xona', xona: 'xona' };
    if (XONA_SOZ.test(s) && by.length >= 2) return { tur: 'shablon', shablon: 'xona', xona: 'xona' };
  }
  if (oshxonaSoz) return { tur: 'oshxona' };
  if (konstruksiyami(s)) return { tur: 'modul' };
  /* xona so'zisiz oshxona belgilari (avvalgi yo'l): moyka, plita, muzlatgich, osma/ustki, L/P shakl, burchakli, orol, "4 ta pastki" */
  if (/moyka|rakovina|chanoq|мойк|(?<![a-z])sink|plita|(?<![a-zа-яё])gaz(?![a-z])|плит|stove|(?<![a-z])hob(?![a-z])|xolodilnik|muzlatgich|холодильн|fridge|duxovk|духовк|vit[iy]?ch?k|vyt[iy]?ajk|вытяжк|stoleshn|столешн|osma|navesn|навесн|ustki|верхн|upper|[lгpпuу][\s-]*(?:shakl|образн|shape)|burchakli|углов|orol|остров|island|\d+\s*ta\s*(?:pastki|ustki)/.test(s)) return { tur: 'oshxona' };
  return { tur: 'nomalum', buyumlar: by };
}

/**
 * Tayyor so'rov + matndagi parametrlar → qurish rejasi (promptLoyiha uchun) va karta qatorlari.
 * @param {string} matn
 * @param {object} prompt — promptlar.json yozuvi (usul: 'toplam')
 * @param {object} catalog
 */
export function shablonReja(matn, prompt, catalog) {
  const s = tayyorla(matn), qatorlar = [];
  const q = (kalit, v = {}, o = {}) => qatorlar.push(Object.assign({ kalit, v, manba: 'matn', diqqat: false }, o));
  const xona = XONALAR.find(x => x.id === prompt.id || (x.xona === 'ofis' && /^ofis/.test(prompt.id)));
  const ol = xonaOlcham(s, xona ? xona.re : prompt.id === 'garderob-kupe' ? KUPE_DEVOR : prompt.id === 'xona' ? XONA_SOZ : null);
  const kirish = {};
  for (const m of prompt.maydon || []) {
    const v = ol[m.k];
    if (!v) { kirish[m.k] = m.q; q('olcham_sukut', { o: m.k, v: m.q }, { manba: 'sukut' }); continue; }
    const w = Math.min(m.max, Math.max(m.min, v));
    kirish[m.k] = w;
    if (w !== v) q('olcham_chegara', { o: m.k, v, a: m.min, b: m.max, m: w }, { diqqat: true });
    else q('olcham_matn', { o: m.k, v });
  }
  /* shablon tarkibi va so'ralgan buyumlar */
  const toplam = (prompt.toplam || []).map(x => Object.assign({}, x, { _turi: modulTuri(catalog[x.kod]) }));
  const soralgan = buyumlar(s);
  const kEni = krovatEni(s);
  const BOSH = ['old', 'ong', 'chap', 'orqa'];
  for (const b of soralgan) {
    const bor = toplam.filter(x => x._turi === b.tur);
    if (b.tur === 'krovat' && kEni) {
      /* krovat eni — katalogdagi karavotlardan: eni chegarasi ichida, asl eni eng yaqini (teng bo'lsa — kod tartibi) */
      const nomzod = Object.values(catalog).filter(f => modulTuri(f) === 'krovat' && f.production !== 'none' && !/^CH-/.test(f.code)
        && kEni >= (+f.min_w || +f.w) && kEni <= (+f.max_w || +f.w))
        .sort((a, c) => Math.abs(+a.w - kEni) - Math.abs(+c.w - kEni) || (a.code < c.code ? -1 : 1));
      if (!nomzod.length) { q('krovat_yoq', { v: kEni }, { diqqat: true, manba: 'katalog' }); continue; }
      const f = nomzod[0];
      if (bor.length) { bor[0].kod = f.code; bor[0].w = kEni; bor[0]._soraldi = true; }
      else toplam.push({ kod: f.code, devor: 'orqa', joy: 'markaz', w: kEni, _turi: 'krovat', _soraldi: true });
      q('krovat', { frg: f.code, nom: f.name, v: kEni }, { manba: 'katalog' });
      continue;
    }
    if (bor.length) {
      bor.forEach(x => { x._soraldi = true; });
      /* so'ralgan soni shablondagidan ko'p — shu modul yana qo'shiladi (sig'masa — "sig'madi") */
      for (let k = bor.length; k < b.n; k++) toplam.push(Object.assign({}, bor[0], { joy: 'markaz', devor: BOSH[k % BOSH.length] }));
      q('buyum_bor', { b: b.tur, n: b.n, frg: bor[0].kod, nom: (catalog[bor[0].kod] || {}).name || bor[0].kod }, { manba: 'katalog' });
      continue;
    }
    const kod = KIND_MODUL[b.tur];
    if (!kod || !catalog[kod]) { q('buyum_yoq', { b: b.tur, n: b.n }, { diqqat: true, manba: 'katalog' }); continue; }
    for (let k = 0; k < b.n; k++) toplam.push({ kod, devor: BOSH[k % BOSH.length], joy: 'markaz', _turi: b.tur, _soraldi: true });
    q('buyum_qoshildi', { b: b.tur, n: b.n, frg: kod, nom: catalog[kod].name }, { manba: 'katalog' });
  }
  const soralganTur = new Set(soralgan.map(b => b.tur));
  for (const x of toplam) if (!x._soraldi && !soralganTur.has(x._turi) && soralgan.length) q('shablondan', { frg: x.kod, nom: (catalog[x.kod] || {}).name || x.kod }, { manba: 'sukut' });
  return { prompt: Object.assign({}, prompt, { toplam: toplam.map(({ _turi, _soraldi, ...x }) => x) }), kirish, qatorlar };
}
