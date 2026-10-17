/* Smart3D engine/oshxonaTili.js — egasi #166: usta matni → oshxona spec'i (AI'siz, uch tilda, imlo xatolari bilan).
 *
 * "Kuxnya 4500 mm, Haytek bezruchka, gola profilli, 1 etaj 870, fartuk 600, 2 etaj 750, 3 etaj 600, chuqurliklar …,
 *  gaz va vitichka 600, 1 etajda 3 ta tortma tandem vakuum, stolichnitsa 38x600" — bitta modul EMAS, to'g'ri oshxona.
 *
 * Spec (konstruktor shu bo'yicha quradi — engine/konstruktor/index.js talab.oshxona):
 *   { uzunlik, qavatlar: [{ boyi, chuqurligi }] (pastdan: 1 — pastki, 2 — ustki, 3 — antresol), fartuk,
 *     uslub: 'haytek'|'', ruchkasiz, gola, tortma: { soni, yonaltiruvchi: 'tandem_vakuum'|'tandem'|'vakuum'|'' },
 *     gaz: { bor, eni }, vytyajka: { bor, eni }, stoleshnitsa: { qalinlik, chuqurligi },
 *     manba: { <maydon>: 'matn'|'sukut' } }
 *   Aytilmagan maydon — 0/false (sukut): konstruktor o'z standartini (QOIDALAR, katalog) qo'yadi — raqam o'ylab topilmaydi.
 *   1-qavat "bo'yi" — poldan stoleshnitsa ustigacha (oyoq + korpus + stoleshnitsa): sex amaliyoti — korpus 708/746/758
 *   (sex-standartlari.json) + oyoq 100 (MC Bazis) + stoleshnitsa 26/38 = 834…896 mm. */

export const OSHXONA_SOZ = /(?<![a-zа-яё])(?:oshxon[a-z']*|ashxon[a-z']*|kux+n[iy]?[ay][a-z]*|kuhn[iy]?[ay][a-z]*|kuxna[a-z]*|кухн[а-яё]*|kitchen[a-z]*)/;
const BIRLIK = "(mm|мм|sm|см|cm|metr[a-z]*|метр[а-яё]*|m|м)?";
const SON = "(\\d+(?:\\.\\d+)?)";
const SIZE_RE = new RegExp("(?<![\\d.])" + SON + "\\s*" + BIRLIK + "(?![a-zа-яё0-9])", 'g');

const QAVAT_SOZ = "(?:etaj[a-z']*|этаж[а-яё]*|qavat[a-z']*|ярус[а-яё]*|ряд[а-яё]*|tier[a-z]*|level[a-z]*|row[a-z]*|floor[a-z]*)";
const TARTIB = [
  [1, "birinchi|brinchi|birinji|перв[а-яё]*|нижн[а-яё]*|first|1st|bottom|lower"],
  [2, "ikkinchi|ikinchi|ikkinji|втор[а-яё]*|second|2nd|middle"],
  [3, "uchinchi|uchunchi|uchinji|трет[а-яё]*|third|3rd"]
];
const QAVAT_RE = new RegExp(
  "(?<![a-zа-яё0-9])(?:([1-3])\\s*(?:-?\\s*(?:chi|nchi|й|ий|ой|st|nd|rd|th))?\\s*-?\\s*" + QAVAT_SOZ +
  "|(" + TARTIB.map(x => x[1]).join('|') + ")\\s*-?\\s*" + QAVAT_SOZ +
  "|" + QAVAT_SOZ + "\\s*[-№#]?\\s*([1-3])(?![0-9])" +
  "|(antresol[a-z]*|antirsol[a-z]*|антресол[а-яё]*|mezonin[a-z]*|мезонин[а-яё]*|mezzanine[a-z]*))", 'g');

const BOYI_SOZ = /balandl|баландл|высот|height|bo'yi|bo'y\b|boyi\b|tall\b/g;
const CHUQ_SOZ = /chuqurl|chuqur\b|глубин|depth|deep/g;

/* parametr kalit so'zlari (bir parametr bo'lagi keyingisi boshlanganda tugaydi) */
const K = {
  fartuk: "fartu[kg][a-z']*|фартук[а-яё]*|apron|backsplash|splashback",
  gaz: "gaz(?![a-z])|gazl[a-z']*|газ(?![а-яё])|газов[а-яё]*|plita[a-z']*|плит[а-яё]*|stove|hob\\b|cooktop|cooker",
  vyt: "vi?t[iy]?ch?k[a-z']*|vy?t[iy]?[yj]?a[jz]?k[a-z']*|vit[iy]?[yj]a[jz]k[a-z']*|вытяжк[а-яё]*|вытяж[а-яё]*|hood|extractor",
  stol: "stol[iey]?[sc]h?n[iy]t?[sc]?[a-z']*|stoleshni[a-z']*|столешн[а-яё]*|countertop|worktop|столещн[а-яё]*",
  tortma: "tortma[a-z']*|yash[ci]?k[a-z']*|ящик[а-яё]*|выдвижн[а-яё]*|drawers?",
  tandem: "tandem[a-z]*|тандем[а-яё]*",
  kuxnya: OSHXONA_SOZ.source.replace('(?<![a-zа-яё])', '')
};
const KESUVCHI = new RegExp("(?:" + Object.values(K).join('|') + ")", 'g');
const kesRe = (...skip) => new RegExp("(?:" + Object.entries(K).filter(([k]) => !skip.includes(k)).map(([, v]) => v).join('|') + ")", 'g');

const SONLAR = [
  [1, "bir|bitta|один|одна|одну|one"], [2, "ikki|ikkita|два|две|two"], [3, "uch|uchta|три|three"], [4, "to'rt|tort|to'rtta|четыре|four"],
  [5, "besh|beshta|пять|five"], [6, "olti|oltita|шесть|six"]
].map(([n, s]) => [new RegExp("(?<![a-zа-яё'])(?:" + s + ")(?![a-zа-яё'])", 'g'), String(n)]);

/** matn → kichik harf, apostroflar, o'nli vergul, "38mmx600mm" → "38mm x 600mm" */
function tayyorla(matn) {
  return String(matn || '').toLowerCase().replace(/[ʻʼ’‘`´]/g, "'").replace(/(\d),(\d)/g, '$1.$2')
    .replace(/(\d)\s*(mm|мм|sm|см|cm|m|м)?\s*[x×х*]\s*(?=\d)/g, '$1$2 x ').replace(/[ \t\n]+/g, ' ');
}

/** son + birlik → mm. Birliksiz: 10 dan kichik — metr, aks holda mm */
function mmga(v, b) {
  const x = +v;
  if (!isFinite(x)) return 0;
  if (/^(mm|мм)$/.test(b || '')) return Math.round(x);
  if (/^(sm|см|cm)$/.test(b || '')) return Math.round(x * 10);
  if (/^(m|м|metr|метр)/.test(b || '')) return Math.round(x * 1000);
  return x < 10 ? Math.round(x * 1000) : Math.round(x);
}

/** [a, b) oralig'idagi o'lchamlar (birligi bor yoki ≥ 100 — "3 ta" son emas) */
function olchamlar(s, a, b) {
  const out = [];
  SIZE_RE.lastIndex = a;
  let m;
  while ((m = SIZE_RE.exec(s)) && m.index < b) {
    if (!m[2] && +m[1] < 100) continue;
    out.push({ v: mmga(m[1], m[2]), i: m.index, j: m.index + m[0].length });
  }
  return out;
}

/** re ning s dagi pos dan keyingi birinchi uchrashuvi (indeksi), yo'q — s.length */
function keyingi(re, s, pos) {
  re.lastIndex = pos;
  const m = re.exec(s);
  return m ? m.index : s.length;
}

/** kalit so'zdan keyin (keyingi parametrgacha) birinchi o'lcham */
function kalitOlcham(s, kalit, skip, chek) {
  const re = new RegExp("(?:" + kalit + ")", 'g');
  let m;
  while ((m = re.exec(s))) {
    const a = m.index + m[0].length, b = keyingi(kesRe(...skip), s, a);
    const o = olchamlar(s, a, b).find(x => x.v >= chek[0] && x.v <= chek[1]);
    if (o) return o.v;
  }
  return 0;
}

/** matn oshxonami (uzunligi yoki qavatlari bilan) — bitta modul emas */
export function oshxonami(matn) {
  const s = tayyorla(matn);
  if (!OSHXONA_SOZ.test(s)) return false;
  return !!uzunlikOl(s) || (QAVAT_RE.lastIndex = 0, QAVAT_RE.test(s));
}

/** oshxona uzunligi: "kuxnya 4500 mm", "кухня 4.5 м", "uzunligi 4500" (xona o'lchami "3x4" — uzunlik emas) */
function uzunlikOl(s) {
  const re = new RegExp(OSHXONA_SOZ.source + "[^\\d]{0,25}?(?<![\\d.])" + SON + "(?![\\d.])\\s*" + BIRLIK + "(?![a-zа-яё0-9])(?!\\s*x\\s*\\d)", 'g');
  let m;
  while ((m = re.exec(s))) {
    const v = mmga(m[1], m[2]);
    if (v >= 1000 && v <= 12000) return v;
  }
  const u = new RegExp("(?:uzunlig[a-z']*|uzunl[a-z']*|длин[а-яё]*|length)[^\\d]{0,12}?" + SON + "\\s*" + BIRLIK + "(?![a-zа-яё0-9])", 'g').exec(s);
  if (u) { const v = mmga(u[1], u[2]); if (v >= 1000 && v <= 12000) return v; }
  return 0;
}

/** qavat qiymatlari: { 1: { boyi, chuqurligi }, … } — "1 etaj balandligi 870", "chuqurliklar 1 etaj 450 mm 2 etaj 350" */
function qavatlarOl(s) {
  const tilga = [];
  QAVAT_RE.lastIndex = 0;
  let m;
  while ((m = QAVAT_RE.exec(s))) {
    let n = m[1] ? +m[1] : m[3] ? +m[3] : m[4] ? 3 : 0;
    if (m[2]) n = (TARTIB.find(([, re]) => new RegExp('^(?:' + re + ')$').test(m[2])) || [0])[0];
    if (n) tilga.push({ n, i: m.index, j: m.index + m[0].length });
  }
  const rejim = (pos) => {                                  // pos dan oldingi oxirgi kalit so'z: bo'yi yoki chuqurligi
    let b = -1, c = -1, x;
    BOYI_SOZ.lastIndex = 0; while ((x = BOYI_SOZ.exec(s)) && x.index < pos) b = x.index;
    CHUQ_SOZ.lastIndex = 0; while ((x = CHUQ_SOZ.exec(s)) && x.index < pos) c = x.index;
    return b < 0 && c < 0 ? null : c > b ? 'chuqurligi' : 'boyi';
  };
  const out = {};
  tilga.forEach((q, k) => {
    const nxt = k + 1 < tilga.length ? tilga[k + 1].i : s.length;
    const b = Math.min(nxt, keyingi(KESUVCHI, s, q.j));
    const o = olchamlar(s, q.j, b)[0];
    if (!o) return;
    let r = rejim(o.i);
    if (!r) {                                               // "2 etaj 750mm balandlikda" — kalit so'z keyin
      const keyin = s.slice(o.j, nxt);
      r = /chuqurl|глубин|depth|deep/.test(keyin) ? 'chuqurligi' : 'boyi';
    }
    out[q.n] = out[q.n] || {};
    if (!out[q.n][r]) out[q.n][r] = o.v;
  });
  return out;
}

/** son so'zlari → raqam (faqat tortma sanash uchun) */
function sonlarga(s) {
  for (const [re, n] of SONLAR) s = s.replace(re, n);
  return s;
}

/**
 * egasi #183: oshxona talablari — jim tashlab ketilmaydi (har biri kartada: bajarildi yoki "bajarilmadi: sabab").
 *   ustki: false — "ustkisiz", "ustki shkaflarsiz", "без верхних", "without wall cabinets"
 *   duxovka / mikro — penal (katalog SP-K-020 "Penal Duxovka va Mikroto'lqinli pech uchun"), posudomoyka — SP-TX-002 moyka yonida,
 *   xolodilnik — SP-TX-004. Aytilmagani — false (sukut: qo'yilmaydi; muzlatgich — avvalgi qoida bo'yicha)
 */
export function oshxonaTalablar(matn) {
  const s = tayyorla(matn);
  const ustkisiz = /ustki[a-z']*\s*(?:shkaf[a-z']*\s*)?siz|ustki\s+(?:shkaf[a-z']*\s+)?(?:yo'q|kerakmas|kerak emas)|osma[a-z']*\s*(?:shkaf[a-z']*\s*)?siz|tepa(?:dagi)?\s+shkaf[a-z']*siz|без\s+(?:верхн|навесн)[а-яё]*|(?:without|no)\s+(?:upper|wall)[\s-]*(?:cabinets?|units?)?/.test(s);
  const duxovka = /duxovk[a-z']*|духовк[а-яё]*|духов(?:ой|ого)\s*шкаф|(?<![a-z])oven/.test(s);
  const mikro = /mikro\s*to'?lqin|mikrovoln[a-z]*|микроволн[а-яё]*|свч|microwave/.test(s);
  const posudomoyka = /posudomo[yi]k[a-z']*|posudamo[yi]k[a-z']*|посудомо[ей]к[а-яё]*|посудомоечн[а-яё]*|idish\s*yuv[a-z']*|dish\s*washer|dishwasher|(?<![a-zа-яё])(?:pmm|пмм)(?![a-zа-яё])/.test(s);
  const xolodilnik = /xolodilnik|muzlatgich|холодильн|fridge|refrigerator/.test(s);
  return { ustki: !ustkisiz, duxovka, mikro, penal: duxovka || mikro, posudomoyka, xolodilnik };
}

/** matn → oshxona spec'i (AI'siz) */
export function oshxonaSpec(matn) {
  const s = tayyorla(matn), manba = {};
  const ol = (k, v) => { manba[k] = v ? 'matn' : 'sukut'; return v; };
  const uzunlik = ol('uzunlik', uzunlikOl(s));
  const q = qavatlarOl(s);
  const qavatlar = [1, 2, 3].map(n => ({ boyi: ol('q' + n + '_boyi', (q[n] && q[n].boyi) || 0), chuqurligi: ol('q' + n + '_chuqurligi', (q[n] && q[n].chuqurligi) || 0) }));
  /* 3-qavat aytilmagan — yo'q (2 qavat: pastki va ustki) */
  if (!qavatlar[2].boyi && !qavatlar[2].chuqurligi) { qavatlar.pop(); delete manba.q3_boyi; delete manba.q3_chuqurligi; }
  const fartuk = ol('fartuk', kalitOlcham(s, K.fartuk, ['fartuk'], [300, 1200]));
  const ruchkasiz = ol('ruchkasiz', /bez\s*ruch|bezruch|без\s*руч|безруч|ruchkasiz|tutqichsiz|handle-?less|no handles?|without handles?|(?<![a-zа-яё])(?:gol+[ao]|гол+[ао])(?![a-zа-яё])/.test(s));
  const gola = ol('gola', /(?<![a-zа-яё])(?:gol+[ao]|гол+[ао])(?![a-zа-яё])|gol+[ao][\s-]*(?:f?profil|prof)|гол+[ао][\s-]*профил/.test(s));
  const uslub = /haytek|xaytek|haytec|hi-?tech|high-?tech|хайтек|хай-тек|хай тек/.test(s) ? 'haytek' : '';
  manba.uslub = uslub ? 'matn' : 'sukut';
  /* tortma: "3 ta tortma", "3 ящика", "tortma 3 ta", "three drawers" */
  const sn = sonlarga(s);
  const tm = new RegExp("(?<![0-9.])(\\d{1,2})\\s*(?:ta(?:dan)?\\s*|шт\\.?\\s*)?(?:" + K.tortma + ")").exec(sn)
    || new RegExp("(?:" + K.tortma + ")\\s*[:=-]?\\s*(\\d{1,2})(?!\\s*(?:mm|мм|sm|см|cm|m|м)?\\d)(?:\\s*(?:ta|шт))").exec(sn);
  const tortmaSoni = ol('tortma', tm ? Math.min(12, +tm[1]) : 0);
  const tandem = /tandem|тандем/.test(s), vak = /vak[uy]+m|vacu+m|vakum|вакуу?м|soft[\s-]?close|доводчик|plavn|плавн/.test(s);
  const yonaltiruvchi = ol('yonaltiruvchi', tandem && vak ? 'tandem_vakuum' : tandem ? 'tandem' : vak ? 'vakuum' : '');
  const gazBor = new RegExp("(?<![a-zа-яё])(?:" + K.gaz + ")").test(s), vytBor = new RegExp("(?<![a-zа-яё])(?:" + K.vyt + ")").test(s);
  const gaz = { bor: gazBor, eni: gazBor ? kalitOlcham(s, K.gaz, ['gaz', 'vyt'], [300, 1200]) : 0 };
  const vytyajka = { bor: vytBor, eni: vytBor ? kalitOlcham(s, K.vyt, ['gaz', 'vyt'], [300, 1200]) : 0 };
  manba.gaz = gaz.eni ? 'matn' : 'sukut'; manba.vytyajka = vytyajka.eni ? 'matn' : 'sukut';
  /* stoleshnitsa: "stolichnitsa 38mm x 600mm" — ≤ 60 qalinligi, 300…1200 chuqurligi */
  const stoleshnitsa = { qalinlik: 0, chuqurligi: 0 };
  const sre = new RegExp("(?:" + K.stol + ")", 'g');
  let m;
  while ((m = sre.exec(s))) {
    const a = m.index + m[0].length, b = keyingi(kesRe('stol'), s, a);
    SIZE_RE.lastIndex = a;
    let x;
    while ((x = SIZE_RE.exec(s)) && x.index < b) {
      const v = /^(mm|мм)$/.test(x[2] || '') || !x[2] ? Math.round(+x[1]) : mmga(x[1], x[2]);
      if (v >= 10 && v <= 60 && !stoleshnitsa.qalinlik) stoleshnitsa.qalinlik = v;
      else if (v >= 300 && v <= 1200 && !stoleshnitsa.chuqurligi) stoleshnitsa.chuqurligi = v;
    }
  }
  manba.stol_qalinlik = stoleshnitsa.qalinlik ? 'matn' : 'sukut';
  manba.stol_chuqurligi = stoleshnitsa.chuqurligi ? 'matn' : 'sukut';
  const tl = oshxonaTalablar(matn), xolodilnik = tl.xolodilnik;
  const moyka = /moyka|rakovina|chanoq|мойк|раковин|(?<![a-z])sink/.test(s);
  manba.moyka = moyka ? 'matn' : 'sukut';
  return { uzunlik, qavatlar, fartuk, uslub, ruchkasiz, gola, tortma: { soni: tortmaSoni, yonaltiruvchi }, gaz, vytyajka, stoleshnitsa, xolodilnik, moyka: true,
    ustki: tl.ustki, duxovka: tl.duxovka, mikro: tl.mikro, penal: tl.penal, posudomoyka: tl.posudomoyka, manba };
}

/* chegaralar (aytilgan qiymat shu oraliqqa keltiriladi, har to'g'rilash — izoh bilan) */
export const OSH_CHEGARA = {
  uzunlik: [1200, 12000], fartuk: [300, 1000],
  q1_boyi: [700, 1000], q1_chuqurligi: [300, 700], q2_boyi: [300, 1200], q2_chuqurligi: [200, 600], q3_boyi: [200, 1000], q3_chuqurligi: [200, 700],
  gaz: [300, 1200], vytyajka: [300, 1200], stol_chuqurligi: [400, 1200]
};
const son = (v) => (typeof v === 'number' && isFinite(v) ? Math.round(v) : typeof v === 'string' && /^\d+(\.\d+)?$/.test(v.trim()) ? Math.round(+v) : 0);

/**
 * xom spec (AI'siz tahlilchi yoki serverdagi til modeli) → toza spec + tuzatishlar. Server va brauzerda bir xil.
 * @param {object} raw
 * @param {{ stolQalinlik?: number[] }} [o] — stoleshnitsa qalinliklari (kitchen.js STOL_QALINLIK)
 */
export function oshxonaTekshir(raw, o = {}) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const tuzatish = [];
  const ichida = (k, v) => {
    v = son(v);
    if (!v) return 0;
    const [a, b] = OSH_CHEGARA[k];
    const w = Math.max(a, Math.min(b, v));
    if (w !== v) tuzatish.push({ kod: k, n: v, m: w });
    return w;
  };
  const q = Array.isArray(raw.qavatlar) ? raw.qavatlar.slice(0, 3) : [];
  const qavatlar = q.map((x, i) => ({ boyi: ichida('q' + (i + 1) + '_boyi', x && x.boyi), chuqurligi: ichida('q' + (i + 1) + '_chuqurligi', x && x.chuqurligi) }));
  while (qavatlar.length < 2) qavatlar.push({ boyi: 0, chuqurligi: 0 });
  const QAL = o.stolQalinlik || [26, 38];
  const st = raw.stoleshnitsa || {};
  let qal = son(st.qalinlik);
  if (qal && !QAL.includes(qal)) {
    const w = QAL.slice().sort((a, b) => Math.abs(a - qal) - Math.abs(b - qal))[0];
    tuzatish.push({ kod: 'stol_qalinlik', n: qal, m: w }); qal = w;
  }
  const t = raw.tortma || {};
  const YON = ['tandem_vakuum', 'tandem', 'vakuum'];
  const spec = {
    uzunlik: ichida('uzunlik', raw.uzunlik), qavatlar, fartuk: ichida('fartuk', raw.fartuk),
    uslub: raw.uslub === 'haytek' ? 'haytek' : '', ruchkasiz: raw.ruchkasiz === true, gola: raw.gola === true,
    tortma: { soni: Math.max(0, Math.min(12, son(t.soni))), yonaltiruvchi: YON.includes(t.yonaltiruvchi) ? t.yonaltiruvchi : '' },
    gaz: { bor: !raw.gaz || raw.gaz.bor !== false, eni: ichida('gaz', raw.gaz && raw.gaz.eni) },
    vytyajka: { bor: !raw.vytyajka || raw.vytyajka.bor !== false, eni: ichida('vytyajka', raw.vytyajka && raw.vytyajka.eni) },
    stoleshnitsa: { qalinlik: qal, chuqurligi: ichida('stol_chuqurligi', st.chuqurligi) },
    xolodilnik: raw.xolodilnik === true, moyka: raw.moyka !== false,
    ustki: raw.ustki !== false, duxovka: raw.duxovka === true, mikro: raw.mikro === true, penal: raw.penal === true || raw.duxovka === true || raw.mikro === true,
    posudomoyka: raw.posudomoyka === true,
    manba: Object.assign({}, raw.manba || {})
  };
  if (spec.gola) spec.ruchkasiz = true;                    // Gola — ruchkasiz tizim
  return { spec, tuzatish };
}

/** ikki spec: a (AI'siz) asosiy, b (til modeli) — faqat a da sukut qolgan maydonlarni to'ldiradi */
export function oshxonaBirlashtir(a, b) {
  if (!b) return a;
  const s = JSON.parse(JSON.stringify(a));
  const bosh = (k) => !s.manba || s.manba[k] !== 'matn';
  const qoy = (k, yoz) => { if (bosh(k) && yoz()) s.manba[k] = 'ai'; };
  qoy('uzunlik', () => (b.uzunlik ? (s.uzunlik = b.uzunlik) : 0));
  for (let i = 0; i < 3; i++) {
    const bq = (b.qavatlar || [])[i];
    if (!bq) continue;
    if (!s.qavatlar[i]) s.qavatlar[i] = { boyi: 0, chuqurligi: 0 };
    qoy('q' + (i + 1) + '_boyi', () => (bq.boyi ? (s.qavatlar[i].boyi = bq.boyi) : 0));
    qoy('q' + (i + 1) + '_chuqurligi', () => (bq.chuqurligi ? (s.qavatlar[i].chuqurligi = bq.chuqurligi) : 0));
  }
  qoy('fartuk', () => (b.fartuk ? (s.fartuk = b.fartuk) : 0));
  qoy('ruchkasiz', () => (b.ruchkasiz ? (s.ruchkasiz = true) : 0));
  qoy('gola', () => (b.gola ? (s.gola = s.ruchkasiz = true) : 0));
  qoy('tortma', () => (b.tortma && b.tortma.soni ? (s.tortma.soni = b.tortma.soni) : 0));
  qoy('yonaltiruvchi', () => (b.tortma && b.tortma.yonaltiruvchi ? (s.tortma.yonaltiruvchi = b.tortma.yonaltiruvchi) : 0));
  qoy('gaz', () => (b.gaz && b.gaz.eni ? (s.gaz.eni = b.gaz.eni) : 0));
  qoy('vytyajka', () => (b.vytyajka && b.vytyajka.eni ? (s.vytyajka = { bor: true, eni: b.vytyajka.eni }) : 0));
  qoy('stol_qalinlik', () => (b.stoleshnitsa && b.stoleshnitsa.qalinlik ? (s.stoleshnitsa.qalinlik = b.stoleshnitsa.qalinlik) : 0));
  qoy('stol_chuqurligi', () => (b.stoleshnitsa && b.stoleshnitsa.chuqurligi ? (s.stoleshnitsa.chuqurligi = b.stoleshnitsa.chuqurligi) : 0));
  return s;
}

/** server sxemasidagi tekis maydonlar (0 — aytilmagan) → xom spec (oshxonaTekshir uchun) */
export function oshxonaSxemadan(j) {
  if (!j || typeof j !== 'object' || !son(j.uzunlik_mm) && !son(j.q1_boyi_mm) && !son(j.q2_boyi_mm)) return null;
  const qavatlar = [1, 2, 3].map(n => ({ boyi: son(j['q' + n + '_boyi_mm']), chuqurligi: son(j['q' + n + '_chuqurligi_mm']) }));
  if (!qavatlar[2].boyi && !qavatlar[2].chuqurligi) qavatlar.pop();
  return {
    uzunlik: son(j.uzunlik_mm), qavatlar, fartuk: son(j.fartuk_mm), ruchkasiz: j.ruchkasiz === true, gola: j.gola === true,
    uslub: j.haytek === true ? 'haytek' : '', tortma: { soni: son(j.tortma_soni), yonaltiruvchi: j.tandem_vakuum === true ? 'tandem_vakuum' : '' },
    gaz: { bor: true, eni: son(j.gaz_mm) }, vytyajka: { bor: true, eni: son(j.vytyajka_mm) },
    stoleshnitsa: { qalinlik: son(j.stol_qalinlik_mm), chuqurligi: son(j.stol_chuqurligi_mm) }
  };
}
