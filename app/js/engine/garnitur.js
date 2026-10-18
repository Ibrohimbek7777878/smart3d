/* Smart3D engine/garnitur.js — TZ-35 B+C (egasi #242–#244): "spalniy garnitur, classic model, spalniy razmeri 1800x2100 mm ldsp,
 * bosh va oyoq qismida yumshoq detallari, shkafi 2400x2300 mm 3 qismdan (o'rtada kiyim ilish, 2 chekkasi polka), trimosi tortmali
 * tepasida oyna, ruchkasiz push mexanizmda, umumiy rangi kashemir".
 *
 * Avval: tahlilchi birinchi o'lchamni oldi (oddiy 1800×2100 shkaf), krovat/trimo/oyna/yumshoq/push/klassik tilda yo'q edi, jim xato.
 * Endi matn BO'LAKLARGA ajratiladi (vergul, "va", qavs ichi — bo'lakka tegishli) va har bo'lak o'z buyumiga bog'lanadi:
 *   garnituraReja(matn, catalog, { sheets }) → {
 *     xona: { W, D, H, outline }, placements, sigmadi,
 *     bolaklar: [{ tur, matn, frg, olcham }],                  — tanilgan buyumlar
 *     qatorlar: [{ kalit, v, holat: 'bajarildi'|'qisman'|'bajarilmadi'|'sukut', diqqat, manba }],   — HAR bo'lak va xususiyat uchun (jim tashlash yo'q)
 *     bajarilmadi: qatorlar ichidan holat != 'bajarildi',
 *     tushunilmadi: [so'z yoki bo'lak],                        — tilda umuman tanilmagani
 *     xususiyat: { klassik, push, yumshoq, ldsp, karniz, tsokol, rang }
 *   }
 * Qoidalar: faqat katalogdagi tayyor modullar (yangi modul chizilmaydi); narx/hisob/kesimga tegilmaydi; o'lcham o'z buyumiga
 * bog'lanadi ("krovat 1800×2100" va "shkaf 2400×2300" — birinchi son hammasiga olinmaydi); xona aytilmasa — garnitur sig'adigan eng kichik;
 * aytilgan xona kichik bo'lsa — kengaytiriladi va kartada aytiladi. Joylash: karavot orqa devorda markazda (bosh tomoni devorga),
 * shkaf chap devor bo'ylab, trimo old devorda markazda, oyna trimo ustida; ustma-ust 0, devordan DEVOR_ORALIQ.
 * Modullarga yoziladigan maydonlar (3D shakllar o'qiydi — agent/mebel3d): uslub:'klassik', push:true (ruchkasiz), yumshoq:{bosh,oyoq},
 * kozgu:true (devordagi oyna paneli), karniz/tsokol:true, dekor:{nom,qalinlik} (butun garnitur rangi).
 */
import { toplamJoyla } from './promptlar.js';
import { footprint } from './rules.js';
import { devorChegara } from './devorOraliq.js';
import { buyumlar, modulTuri } from './aiTur.js';
import { katalogdanTop, buyumdanTop, olchamOl, modulBelgilari } from './katalogTanlash.js';
import { specTekshir, plitaTop } from './konstruksiyaTili.js';

const tayyorla = (m) => String(m || '').toLowerCase().replace(/[ʻʼ’‘`´]/g, "'").replace(/(\d),(\d)/g, '$1.$2').replace(/(\d)\s*[×х*]\s*(?=\d)/g, '$1x').replace(/\s+/g, ' ').trim();

/* ── buyum so'zlari (uz / ru / en). "spalniy razmeri" — yotoq o'lchami: karavot nazarda tutilgan ── */
const BOSH = [
  ['krovat', /krovat[a-z']*|karavot[a-z']*|kravat[a-z']*|karovat[a-z']*|кроват[а-яё]*|(?<![a-z])beds?(?![a-z])|(?:spalni|yotoq)[a-z']*\s*razmer[a-z']*|спальн[а-яё]*\s*размер[а-яё]*|размер[а-яё]*\s*спальн[а-яё]*|sleeping\s*size|bed\s*size/],
  ['trimo', /trimo[a-z']*|trumo[a-z']*|трюмо|dressing\s*table|vanity\s*table|туалетн[а-яё]*\s+столик/],
  ['shkaf', /shkaf[a-z']*|garderob[a-z']*|шкаф[а-яё]*|гардероб[а-яё]*|wardrobe|closet/],
  ['oyna', /ko'zgu[a-z']*|kozgu[a-z']*|(?<![a-z])oyna[a-z']*|зеркал[а-яё]*|mirror/],
  ['komod', /komod[a-z']*|комод[а-яё]*|dresser|chest of drawers/],
  ['tumba', /(?<!tv\s|тв\s)(?:tumba[a-z']*|тумб[а-яё]*|nightstands?|bedside\s*tables?)/]
];
/* xususiyatlar */
const XUS = {
  klassik: /klassik[a-z']*|klassika|classic[a-z]*|классик[а-яё]*|классическ[а-яё]*/,
  push: /(?<![a-z])push(?![a-z])|пуш|tip-?on|тип-?он|ruchkasiz|без\s*ручек|handle-?less|no\s*handles?/,
  yumshoq: /yumshoq[a-z']*|мягк[а-яё]*|upholster[a-z]*|(?<![a-z])soft(?![a-z])|padded/,
  ldsp: /ldsp|лдсп|chipboard/,
  karniz: /karniz|карниз|cornice/,
  tsokol: /tsokol|(?<![a-z])sokol(?!\s*plank)|цоколь|цоколя|plinth|toe\s*kick/,
  rang: /(?:rang[a-z']*|цвет[а-яё]*|colou?r)\s*[:=—–-]?\s*([a-zа-яё' -]{3,40})/
};
const BOSH_SOZ = /(?<![a-z'])bosh(?:i|ida|ga|qism[a-z']*)?(?![a-z'])|изголов[а-яё]*|голов[а-яё]*|head(?:board)?/;
const OYOQ_SOZ = /(?<![a-z'])oyoq(?![a-z']*\s*kiyim)[a-z']*|ножн[а-яё]*|изножь[а-яё]*|в\s*ногах|footboard|(?<![a-z])foot(?![a-z])/;
const UST_SOZ = /(?<![a-z'])(?:tepa|ust|yuqori)[a-z']*|сверху|наверху|(?<![а-яё])над(?![а-яё])|above|(?<![a-z])top(?![a-z])|on top/;
/* umumiy gap belgilari (bo'lakda buyum so'zi yo'q bo'lsa — butun garniturga tegishli) */
const UMUMIY = /umumiy|общ[а-яё]*|overall|general|(?:classic|klassik|классик)|model(?![a-z])|push|пуш|tip-?on|ruchkasiz|без\s*ручек|handle-?less|(?<![a-z])rang|цвет|colou?r|garnitur|гарнитур|(?<![a-z])set(?![a-z])/;
/* bilingan ("tanilgan") so'zlar — yig'indida tushunilmagan so'zlar ro'yxatiga tushmaydi */
const TANISH = new RegExp("(?<![a-zа-яё'])(?:" + [
  'spalni[a-z\']*', 'yotoq[a-z\']*', 'razmer[a-z\']*', 'model[a-z\']*', 'detal[a-z\']*', 'qism[a-z\']*', 'tepa[a-z\']*', 'ust[a-z\']*', 'yuqori[a-z\']*', 'mexanizm[a-z\']*', 'umumiy', 'rang[a-z\']*',
  'o\'rta[a-z\']*', 'chekka[a-z\']*', 'chet[a-z\']*', 'yon[a-z\']*', 'tortma[a-z\']*', 'kiyim', 'ilish', 'ilgich', 'shtanga', 'polka[a-z\']*', 'eshik[a-z\']*', 'fasad[a-z\']*', 'korpus[a-z\']*',
  'ldsp', 'mm', 'sm', 'metr', 'bosh', 'oyoq', 'garnitur[a-z\']*', 'bo\'lim[a-z\']*', 'chap[a-z\']*', 'o\'ng[a-z\']*', 'pastki', 'ostida', 'qanot[a-z\']*', 'ochiq', 'yopiq', 'ikki', 'uch', 'bitta', 'ta',
  'мебель', 'комплект', 'гарнитур[а-яё]*', 'центр[а-яё]*', 'спальн[а-яё]*', 'размер[а-яё]*', 'деталь', 'детали', 'часть', 'частях', 'частей', 'сверху', 'механизм[а-яё]*', 'общ[а-яё]*', 'цвет[а-яё]*', 'середин[а-яё]*', 'краям?[а-яё]*', 'полк[а-яё]*', 'ящик[а-яё]*', 'вешалк[а-яё]*', 'штанг[а-яё]*', 'одежд[а-яё]*', 'дверц[а-яё]*', 'двер[а-яё]*', 'головн[а-яё]*', 'ножн[а-яё]*', 'мягк[а-яё]*', 'классическ[а-яё]*', 'классик[а-яё]*', 'лдсп', 'без', 'ручек', 'пуш', 'для', 'из', 'на', 'над', 'при', 'три', 'две', 'два', 'одна', 'один',
  'both', 'bedroom', 'bed', 'room', 'set', 'size', 'part', 'parts', 'section', 'sections', 'soft', 'details', 'detail', 'head', 'foot', 'end', 'ends', 'middle', 'edges', 'shelf', 'shelves', 'hanging', 'rail', 'drawers', 'drawer', 'mirror', 'top', 'above', 'handle[a-z]*', 'overall', 'color', 'colour', 'classic', 'model', 'push', 'mechanism', 'with', 'and', 'the', 'for', 'of', 'in', 'on', 'two', 'three', 'one', 'wardrobe', 'closet', 'dressing', 'table', 'chipboard', 'upholstered', 'sleeping', 'width', 'length'
].join('|') + ")(?![a-zа-яё'])", 'g');
/* gapni bezovchi so'zlar (iltimos, menga …) — ro'yxatga tushmaydi */
const GAP_SOZ = /^(?:va|ham|hamda|bilan|uchun|iltimos|menga|kerak|qilib|qilish|bering|ber|qil|bo'lsin|bo'lsa|boladi|bo'ladi|dan|dagi|da|ga|ni|ning|и|а|но|или|пожалуйста|мне|нужн[а-яё]*|сделай[а-яё]*|нужен|нужна|с|со|and|or|please|make|need|me|a|an|to|of|is|are|be)$/;

/* ingliz/boshqa imlo → ERP dekor nomi (plitaTop tovush skeleti bilan ham topadi, lekin "cashmere" → "Кашмир" LMDF'ga o'tib ketadi) */
const RANG_ALIAS = { cashmere: 'kashemir', cachemire: 'kashemir', cashmir: 'kashemir' };
const GAP_KUCH = 500;   // mm — mebel bloklari orasida kamida (o'tish, eshik ochilishi)

function bolaklarga(s) {
  const out = []; let d = 0, cur = '';
  for (const ch of s) {
    if (ch === '(' || ch === '[') d++; else if (ch === ')' || ch === ']') d = Math.max(0, d - 1);
    if ((ch === ',' || ch === ';' || ch === '\n') && !d) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map(x => x.trim()).filter(Boolean);
}
const qavssiz = (x) => x.replace(/\([^)]*\)/g, ' ');

/** bo'lakdagi buyum so'zlari: [{ tur, i }] (birinchi uchrashuv, joyi bo'yicha) */
function boshlar(b) {
  const out = [];
  for (const [tur, re] of BOSH) { const m = new RegExp(re.source).exec(b); if (m) out.push({ tur, i: m.index }); }
  /* "shkaf" so'zi "tumba/komod" ichida emas; "oyna" va "trimo" bir bo'lakda — ikkala buyum */
  return out.sort((a, c) => a.i - c.i);
}

/** buyum bo'lagidagi o'lcham: o'z buyumiga bog'lanadi. Ikki son: karavot — eni × uzunligi (kichigi eni); shkaf/trimo/oyna — eni × boyi
 *  (ikkinchisi ≤800 bo'lsa — chuqurligi); uch son — eni × chuqurligi × boyi */
function olchamBogla(b, tur) {
  const raw = olchamOl(qavssiz(b));
  const ol = { eni: raw.eni || 0, chuqurligi: raw.chuqurligi || 0, boyi: raw.boyi || 0 };
  if (ol.eni && ol.chuqurligi && !ol.boyi) {
    if (tur === 'krovat') { if (ol.eni > ol.chuqurligi) [ol.eni, ol.chuqurligi] = [ol.chuqurligi, ol.eni]; }
    else if (ol.chuqurligi > 800) { ol.boyi = ol.chuqurligi; ol.chuqurligi = 0; }
  }
  return ol;
}

/** shkaf bo'lagi: "3 qismdan (o'rtada kiyim ilish, 2 chekkasi polka)" → { n, bolimlar: [{ shtanga, polka }], polkaSoni } */
function shkafTarkib(b) {
  const qismM = /(\d+)\s*(?:ta\s*)?(?:qism|bo'lim|секци|част|section|part)/.exec(b);
  const sonSoz = { ikki: 2, uch: 3, "to'rt": 4, besh: 5, два: 2, три: 3, четыре: 4, two: 2, three: 3, four: 4 };
  const qismS = !qismM && new RegExp("(?:^|\\s)(" + Object.keys(sonSoz).join('|') + ")\\s*(?:ta\\s*)?(?:qism|bo'lim|секци|част|section|part)").exec(b);
  let n = qismM ? +qismM[1] : qismS ? sonSoz[qismS[1]] : 0;
  const bo = [];
  const parts = (b.match(/\(([^)]*)\)/g) || []).map(x => x.slice(1, -1)).join(',').split(/[,;]| va | и | and /).map(x => x.trim()).filter(Boolean);
  const shtanga = /shtang|kiyim\s*il|ilgich|iladigan|veshal|вешал|штанг|одежд|hanging|rail/, polka = /polka|полк|shel(?:f|ves)/;
  const orta = /o'?rta|середин|центр|middle|center|centre/, chet = /chekka|chet|yon(?:lar|ida)?|ikki\s*tomon|края|краям|крайн|sides?|edges?|ends?/;
  const rol = [];
  for (const p of parts) {
    const t = shtanga.test(p) ? 'shtanga' : polka.test(p) ? 'polka' : null;
    const j = orta.test(p) ? 'orta' : chet.test(p) ? 'chet' : /chap|слева|left/.test(p) ? 'chap' : /o'ng|справа|right/.test(p) ? 'ong' : null;
    if (t) rol.push({ t, j, p });
  }
  if (!n && rol.some(r => r.j === 'orta') && rol.some(r => r.j === 'chet')) n = 3;
  if (n >= 2 && n <= 8) {
    for (let k = 0; k < n; k++) bo.push({ shtanga: false, polka: 0, tortma: 0 });
    for (const r of rol) {
      const idx = r.j === 'orta' ? [Math.floor((n - 1) / 2)] : r.j === 'chet' ? [0, n - 1] : r.j === 'chap' ? [0] : r.j === 'ong' ? [n - 1] : [];
      for (const k of idx) { if (r.t === 'shtanga') bo[k].shtanga = true; else bo[k].polka = Math.max(1, bo[k].polka); }
    }
  }
  const pm = /(\d+)\s*(?:ta\s*)?(?:polka|полк|shel)/.exec(b);
  return { n, bolimlar: bo, polkaSoni: pm ? +pm[1] : 0, rol };
}

const clamp = (v, a, b) => Math.max(a || v, Math.min(b || v, v));

/** karavot: eni (+ uzunligi) bo'yicha katalogdan. ldsp so'ralsa yoki yumshoq so'ralmasa — LDSP karavot; faqat yumshoq — yumshoq karkasli karavot */
function krovatTanla(catalog, eni, ldsp, yumshoq) {
  const hamma = Object.values(catalog).filter(f => f && modulTuri(f) === 'krovat' && f.production !== 'none' && !/^CH-/.test(f.code) && !f.chizma && !Array.isArray(f.bazis3d)
    && !/boshka|toshqin/i.test(f.name || ''));
  const mos = hamma.filter(f => !eni || (eni >= (+f.min_w || +f.w) && eni <= (+f.max_w || +f.w)));
  const yum = (f) => f.production === 'upholstery';
  const afzal = yumshoq && !ldsp ? yum : (f) => !yum(f);
  const tartib = (a, c) => (afzal(a) ? 0 : 1) - (afzal(c) ? 0 : 1) || Math.abs(+a.w - (eni || +a.w)) - Math.abs(+c.w - (eni || +c.w)) || (a.code < c.code ? -1 : 1);
  return mos.sort(tartib)[0] || null;
}

/**
 * Garnitur matni → qurish rejasi (engine; web karta va test shu natijani ishlatadi).
 * @param {string} matn
 * @param {object} catalog
 * @param {{ sheets?: Array, xona?: { eni?: number, chuqurligi?: number } }} [o] — sheets: sheet-catalog.json sheets (dekor nomi bo'yicha)
 */
export function garnituraReja(matn, catalog, o = {}) {
  const s = tayyorla(matn);
  const qatorlar = [], tushunilmadi = [];
  const q = (kalit, v = {}, holat = 'bajarildi', extra = {}) => qatorlar.push(Object.assign({ kalit, v, holat, diqqat: holat === 'bajarilmadi' || holat === 'qisman', manba: holat === 'sukut' ? 'sukut' : holat === 'bajarildi' ? 'katalog' : 'matn' }, extra));

  /* ── 1) bo'laklarga ajratish ── */
  const pieces = [];                                   // { tur, matn, n }
  const global = { matn: [] };
  const xonaMatn = [];
  const bolaklar = bolaklarga(s);
  const yutilgan = [];                                 // har bo'lak tanildimi (jim tashlash tekshiruvi)
  let oxirgi = null;
  for (const b of bolaklar) {
    if (/(?<![a-z])xona(?![a-z])|комнат|(?<![a-z])room(?![a-z])/.test(b) && /\d/.test(b) && !/yotoq\s*xona|bed\s*room|bedroom|спальн/.test(b.replace(/\d.*/, ''))) { xonaMatn.push(b); yutilgan.push(b); continue; }
    const hs = boshlar(b);
    if (hs.length) {
      hs.forEach((h, k) => {
        const bosh = k === 0 ? 0 : h.i, oxir = k + 1 < hs.length ? hs[k + 1].i : b.length;
        const seg = b.slice(bosh, oxir);
        const p = { tur: h.tur, matn: seg };
        pieces.push(p); oxirgi = p;
      });
      /* birinchi buyumdan oldingi so'zlar ("spalniy razmeri" dan oldin) — shu bo'lak kontekstida */
      yutilgan.push(b); continue;
    }
    if (UMUMIY.test(b) || !oxirgi) { global.matn.push(b); yutilgan.push(b); continue; }
    oxirgi.matn += ' ' + b; yutilgan.push(b);          // buyumsiz bo'lak ("bosh va oyoq qismida yumshoq detallari") — oldingi buyumga
  }

  /* ── 2) xususiyatlar: butun garnitur (global bo'laklar) va buyumga xos ── */
  const gm = global.matn.join(', ');
  const hamma = s;
  const xus = {
    klassik: XUS.klassik.test(hamma), push: XUS.push.test(hamma), ldsp: XUS.ldsp.test(hamma), karniz: XUS.karniz.test(hamma), tsokol: XUS.tsokol.test(hamma),
    yumshoq: false, rang: null
  };
  const piece = (tur) => pieces.find(p => p.tur === tur);
  const krovat = piece('krovat');
  /* yumshoq: qaysi qism ("bosh va oyoq qismida yumshoq") — karavot bo'lagida, bo'lmasa global */
  const ymM = (krovat ? krovat.matn : gm);
  const yumshoqMatn = XUS.yumshoq.test(ymM) ? ymM : XUS.yumshoq.test(hamma) ? hamma : '';
  const yumshoq = yumshoqMatn ? { bosh: BOSH_SOZ.test(yumshoqMatn), oyoq: OYOQ_SOZ.test(yumshoqMatn) } : null;
  if (yumshoq && !yumshoq.bosh && !yumshoq.oyoq) { yumshoq.bosh = true; yumshoq.oyoq = true; }   // qism aytilmagan — butun karavot
  xus.yumshoq = !!yumshoq;
  /* rang: «umumiy rangi kashemir» — butun garnitur */
  const rm = XUS.rang.exec(hamma);
  if (rm) {
    const nom = rm[1].replace(/\s+\d{1,2}\s*(?:mm|мм).*$/, '').replace(/\s+(?:bo'?lsin|bo'?lad[a-z]*|будет|is)\s*$/, '').trim();
    const ql = /(\d{1,2}(?:\.\d)?)\s*(?:mm|мм)/.exec(hamma.slice(rm.index));
    if (nom.length >= 3) xus.rang = { nom: RANG_ALIAS[nom] || nom, qalinlik: ql ? Math.round(+ql[1]) : 16, soraldi: nom };
  }

  /* ── 3) xona (aytilgan bo'lsa) ── */
  let xonaSor = o.xona || null;
  for (const m of xonaMatn) { const r = olchamOl(m); if (r.eni >= 1000 && r.chuqurligi >= 1000) xonaSor = { eni: r.eni, chuqurligi: r.chuqurligi }; }

  /* ── 4) har buyum → katalog moduli (faqat katalog; o'lcham o'z buyumiga) ── */
  const kat = Object.assign({}, catalog);              // o'lchami o'zgargan nusxalar (aslini o'zgartirmaydi)
  const items = [], tarkib = [];
  const bolakInfo = [];
  const qoy = (kod, ol, extra = {}) => { const f = catalog[kod]; kat[kod] = Object.assign({}, f, ol); return f; };
  let karavotBlok = null, trimoP = null;

  if (!pieces.length) {
    q('buyum_topilmadi', {}, 'bajarilmadi');
  }
  for (const p of pieces) {
    const ol = olchamBogla(p.matn, p.tur);
    if (p.tur === 'krovat') {
      const eniS = ol.eni, uzS = ol.chuqurligi;
      const f = krovatTanla(catalog, eniS, xus.ldsp, !!yumshoq);
      if (!f) { q('krovat_yoq', { v: eniS }, 'bajarilmadi'); continue; }
      const eni = eniS || +f.w;
      const d = uzS ? clamp(uzS, +f.min_d, +f.max_d) : +f.d;
      if (uzS && d !== uzS) q('olcham_chegara', { b: 'krovat', o: 'chuqurligi', v: uzS, a: +f.min_d || '—', c: +f.max_d || '—', m: d }, 'qisman');
      else if (uzS && !(+f.min_d || +f.max_d) && Math.abs(uzS - +f.d) > 0.5) q('olcham_asl', { b: 'krovat', o: 'chuqurligi', v: uzS, a: +f.d }, 'bajarildi');
      qoy(f.code, { w: eni, d });
      q('krovat', { frg: f.code, nom: f.name, w: eni, d }, 'bajarildi');
      if (!eniS) q('olcham_sukut', { b: 'krovat', w: eni, d, h: +f.h }, 'sukut');
      if (xus.ldsp && f.production === 'upholstery') q('ldsp_yumshoq_karkas', { frg: f.code }, 'qisman');
      karavotBlok = { kod: f.code, w: eni, d, f };
      bolakInfo.push({ tur: 'krovat', matn: p.matn.trim(), frg: f.code, olcham: { w: eni, d, h: +f.h } });
      continue;
    }
    if (p.tur === 'shkaf') {
      const tk = shkafTarkib(p.matn);
      const raw = { tur: 'shkaf', nom: '', eni: ol.eni, chuqurligi: ol.chuqurligi, boyi: ol.boyi, tag: 'auto', qopqoq: 'auto', tushunilmadi: [],
        bolimlar: tk.bolimlar.length ? tk.bolimlar.map(b => ({ polka: b.polka ? 1 : 0, shtanga: b.shtanga, eshik: -1 })) : [] };
      const sp = specTekshir(raw);
      sp.spec.bolimlar.forEach((b, i) => { b.eshik = -1; b.polka = tk.polkaSoni && tk.bolimlar.length ? Math.round(tk.polkaSoni / tk.bolimlar.filter(x => x.polka).length) * (tk.bolimlar[i] && tk.bolimlar[i].polka ? 1 : 0) : 0; if (!tk.bolimlar[i] || !tk.bolimlar[i].shtanga) b.shtanga = !!(tk.bolimlar[i] && tk.bolimlar[i].shtanga); });
      /* so'ralgan yagona matn: kupe aytilmagan; "klassik" ochiladigan eshik */
      const tan = katalogdanTop(sp.spec, raw, catalog, p.matn);
      if (!tan || !tan.topildi) {
        q('shkaf_yoq', { s: ((tan && tan.yetishmaydi) || []).map(x => x.k).join(', ') || 'tur' }, 'bajarilmadi');
        continue;
      }
      const f = catalog[tan.frg];
      qoy(tan.frg, { w: tan.olcham.w, d: tan.olcham.d, h: tan.olcham.h });
      q('shkaf', { frg: tan.frg, nom: tan.nom, w: tan.olcham.w, h: tan.olcham.h }, 'bajarildi');
      for (const x of tan.mosEmas) if (/^(eni|chuqurligi|boyi)$/.test(x.k)) q('olcham_chegara', { b: 'shkaf', o: x.k, v: x.soraldi, a: x.min || '—', c: x.max || '—', m: x.natija }, 'qisman');
      if (!ol.chuqurligi) q('olcham_chuq_sukut', { b: 'shkaf', d: tan.olcham.d }, 'sukut');
      const bel = modulBelgilari(f);
      if (tk.n) q('shkaf_qism', { n: tk.n, e: bel.eshik, p: bel.polka }, 'bajarildi');
      if (tk.rol.some(r => r.t === 'shtanga')) q(bel.shtanga ? 'shkaf_shtanga_bor' : 'shkaf_shtanga_yoq', {}, bel.shtanga ? 'bajarildi' : 'bajarilmadi');
      if (tk.rol.some(r => r.t === 'polka')) q('shkaf_polka', { n: bel.polka }, 'bajarildi');
      if (bel.kupe) q('shkaf_kupe', { frg: tan.frg }, 'qisman');
      bolakInfo.push({ tur: 'shkaf', matn: p.matn.trim(), frg: tan.frg, olcham: tan.olcham });
      items.push({ tur: 'shkaf', kod: tan.frg, devor: 'chap', joy: 'oxir', w: tan.olcham.w });
      continue;
    }
    if (p.tur === 'trimo' || p.tur === 'komod' || p.tur === 'tumba') {
      const tur = p.tur === 'tumba' ? 'tumba' : 'komod';
      const sorNom = p.tur === 'trimo' ? 'trimo' : p.tur;
      const n = p.tur === 'tumba' ? ((buyumlar(p.matn).find(b => b.tur === 'tumba') || {}).n || 1) : 1;
      const tan = p.tur === 'tumba' ? { topildi: false } : buyumdanTop(['trimo'], p.matn, catalog);
      if (!tan || !tan.topildi) { q('buyum_yoq', { b: sorNom, n }, 'bajarilmadi'); continue; }
      const f = catalog[tan.frg];
      const w = ol.eni ? clamp(ol.eni, +f.min_w, +f.max_w) : tan.olcham.w, h = ol.boyi ? clamp(ol.boyi, +f.min_h, +f.max_h) : tan.olcham.h;
      if (ol.eni && w !== ol.eni) q('olcham_chegara', { b: p.tur, o: 'eni', v: ol.eni, a: +f.min_w || '—', c: +f.max_w || '—', m: w }, 'qisman');
      qoy(f.code, { w, h, d: ol.chuqurligi ? clamp(ol.chuqurligi, +f.min_d, +f.max_d) : +f.d });
      q(p.tur === 'trimo' ? 'trimo' : 'komod', { frg: f.code, nom: f.name, w, h }, 'bajarildi');
      const tortmaS = /tortma|ящик|drawer|chexol/.test(p.matn);
      const bel = modulBelgilari(f);
      if (tortmaS) q('trimo_tortma', { n: bel.tortma || 4, frg: f.code }, 'bajarildi');
      if (!ol.eni && !ol.boyi) q('olcham_sukut', { b: p.tur, w, d: +f.d, h }, 'sukut');
      trimoP = { kod: f.code, w, h, f };
      items.push({ tur: 'trimo', kod: f.code, devor: 'old', joy: 'markaz', w });
      bolakInfo.push({ tur: p.tur, matn: p.matn.trim(), frg: f.code, olcham: { w, d: +f.d, h } });
      continue;
    }
    if (p.tur === 'oyna') continue;                    // trimodan keyin
  }

  /* oyna: trimo ustida (bo'lagi bor, yoki trimo bo'lsa — "tepasida oyna") */
  const oynalar = pieces.filter(p => p.tur === 'oyna');
  let oynaKod = null;
  for (const p of oynalar) {
    const tan = buyumdanTop(['kozgu'], p.matn, catalog);
    if (!tan || !tan.topildi) { q('oyna_yoq', {}, 'bajarilmadi'); continue; }
    const f = catalog[tan.frg];
    const ol = olchamBogla(p.matn, 'oyna');
    const kerakW = ol.eni || (trimoP ? trimoP.w : tan.olcham.w);
    const w = clamp(kerakW, +f.min_w, +f.max_w);
    qoy(f.code, { w, h: ol.boyi ? clamp(ol.boyi, +f.min_h, +f.max_h) : +f.h });
    /* "oyna" ko'zgu deb olindi; katalogda faqat hammom ko'zguli shkafi — ramkali klassik ko'zgu paneli yo'q */
    q('oyna', { frg: f.code, nom: f.name, w }, 'qisman');
    if (/(?<![a-z])oyna/.test(p.matn)) q('oyna_kozgu', {}, 'bajarildi', { diqqat: false });
    oynaKod = f.code;
    if (trimoP) items.push({ tur: 'oyna', kod: f.code, devor: 'old', joy: 'markaz', w, z: trimoP.h });
    else items.push({ tur: 'oyna', kod: f.code, devor: 'old', joy: 'markaz', w, z: 1000 });
    bolakInfo.push({ tur: 'oyna', matn: p.matn.trim(), frg: f.code, olcham: { w, d: +f.d, h: +kat[f.code].h } });
  }

  /* ── 5) xona va joylash ── */
  const T = devorChegara({ wall_thickness: 100 });
  const bosh = []; if (karavotBlok) {
    /* bosh qismi devorda: yumshoq bosh (SP-BD-002 "Изголовье") karavot ortida; karavot + bosh bir blok */
    let bm = null;
    if (yumshoq && yumshoq.bosh) {
      bm = Object.values(catalog).find(f => f && f.category === 'bed' && /boshka/i.test(f.name || '') && f.production === 'upholstery' && !/^CH-/.test(f.code));
      if (bm) {
        const hw = karavotBlok.w;
        qoy(bm.code, { w: hw });
        q('yumshoq_bosh', { frg: bm.code, nom: bm.name, w: hw }, 'bajarildi');
      } else q('yumshoq_bosh_yoq', {}, 'bajarilmadi');
    }
    const hd = bm ? +bm.d : 0;
    karavotBlok.hd = hd; karavotBlok.bm = bm;
    kat[karavotBlok.kod] = Object.assign({}, kat[karavotBlok.kod], { d: karavotBlok.d + hd });
    bosh.push({ tur: 'krovat', kod: karavotBlok.kod, devor: 'orqa', joy: 'markaz', w: karavotBlok.w });
    if (yumshoq && yumshoq.oyoq) q('yumshoq_oyoq', { w: karavotBlok.w }, 'bajarilmadi');
    if (yumshoq && !yumshoq.bosh && !yumshoq.oyoq) q('yumshoq_yoq', {}, 'bajarilmadi');
  } else if (yumshoq) q('yumshoq_karavotsiz', {}, 'bajarilmadi');

  const tartib = bosh.concat(items.filter(x => x.tur === 'shkaf'), items.filter(x => x.tur === 'trimo'), items.filter(x => x.tur === 'oyna'));
  const joyla = (W, D, H) => toplamJoyla(W, D, H, tartib.map(x => Object.assign({}, x)), kat, T);
  const asosiyKodlar = new Set(tartib.filter(x => x.tur !== 'oyna').map(x => x.kod));
  const H = Math.max(2700, Math.ceil(Math.max(0, ...tartib.map(x => (+(x.z || 0)) + (+kat[x.kod].h || 0))) / 100) * 100);
  const tozaOraliq = (pl) => {
    const bl = pl.filter(p => asosiyKodlar.has(p.frg));
    for (let i = 0; i < bl.length; i++) for (let j = i + 1; j < bl.length; j++) {
      const a = footprint(bl[i]), b = footprint(bl[j]);
      const gx = Math.max(a.x0 - b.x1, b.x0 - a.x1), gy = Math.max(a.y0 - b.y1, b.y0 - a.y1);
      if (Math.max(gx, gy) < GAP_KUCH) return false;
    }
    return true;
  };
  let W = 0, D = 0, r = null, kengaydi = null;
  if (tartib.length) {
    const minW = xonaSor && xonaSor.eni ? xonaSor.eni : 0, minD = xonaSor && xonaSor.chuqurligi ? xonaSor.chuqurligi : 0;
    const variantlar = [];
    for (let w = Math.max(3000, minW); w <= 8000; w += 100) for (let d = Math.max(3000, minD); d <= 8000; d += 100) variantlar.push([w, d]);
    variantlar.sort((a, b) => a[0] * a[1] - b[0] * b[1] || a[0] - b[0]);
    /* aytilgan xona o'zi sig'sa — shu; aks holda eng kichik yetarli (kengaytirish) */
    if (xonaSor && xonaSor.eni && xonaSor.chuqurligi) {
      const t0 = joyla(xonaSor.eni, xonaSor.chuqurligi, H);
      if (!t0.sigmadi.length && tozaOraliq(t0.placements)) { r = t0; W = xonaSor.eni; D = xonaSor.chuqurligi; }
    }
    if (!r) for (const [w, d] of variantlar) {
      const t1 = joyla(w, d, H);
      if (!t1.sigmadi.length && tozaOraliq(t1.placements)) { r = t1; W = w; D = d; break; }
    }
    if (!r) { W = 8000; D = 8000; r = joyla(W, D, H); }
    if (xonaSor && xonaSor.eni && xonaSor.chuqurligi && (W !== xonaSor.eni || D !== xonaSor.chuqurligi)) kengaydi = { a: xonaSor.eni, b: xonaSor.chuqurligi, W, D };
  }
  const placements = r ? r.placements : [];
  const sigmadi = r ? r.sigmadi : [];

  /* bosh qismi: karavot blokini ikkiga ajratish — yumshoq bosh devorda, karavot uning oldida (bosh tomoni devorga) */
  if (karavotBlok) {
    const i = placements.findIndex(p => p.frg === karavotBlok.kod);
    if (i >= 0) {
      const kp = placements[i];
      if (karavotBlok.bm) {
        const bm = karavotBlok.bm;
        placements.push({ id: 'p' + (placements.length + 1), frg: bm.code, name: bm.name, z: 0, w: karavotBlok.w, d: +bm.d, h: +kat[bm.code].h, qty: 1, x: kp.x, y: kp.y, rot: kp.rot, yumshoq: true, kozgu: false });
        kp.y += karavotBlok.hd;
      }
      kp.d = karavotBlok.d;
      kp.yumshoq = yumshoq ? { bosh: !!yumshoq.bosh, oyoq: !!yumshoq.oyoq } : false;
    }
  }
  if (oynaKod) for (const p of placements) if (p.frg === oynaKod) p.kozgu = true;

  /* joylash holati */
  for (const x of tartib) {
    const bor = placements.some(p => p.frg === x.kod);
    if (!bor) q('sigmadi', { frg: x.kod, nom: catalog[x.kod].name, w: W, d: D }, 'bajarilmadi');
  }
  if (r && placements.length) {
    if (kengaydi) q('xona_keng', kengaydi, 'qisman');
    else if (xonaSor && xonaSor.eni && xonaSor.chuqurligi) q('xona_matn', { w: W, d: D }, 'bajarildi');
    else q('xona_sukut', { w: W, d: D }, 'sukut');
    q('joy', { t: T }, 'bajarildi');
  }

  /* ── 6) xususiyatlar → modullarga ── */
  const eshikli = placements.filter(p => { const f = catalog[p.frg]; return f && /wardrobe|bed/.test(f.category) && (modulTuri(f) === 'garderob' || modulTuri(f) === 'kupe' || modulTuri(f) === 'komod'); });
  if (xus.klassik) {
    for (const p of placements) p.uslub = 'klassik';
    q('uslub_klassik', { n: placements.length }, 'qisman');
  }
  if (xus.push) {
    for (const p of eshikli) p.push = true;
    q('push', { n: eshikli.length }, 'qisman');
  }
  if (xus.karniz) { for (const p of placements.filter(p => modulTuri(catalog[p.frg]) === 'garderob' || modulTuri(catalog[p.frg]) === 'kupe')) p.karniz = true; q('karniz', {}, 'bajarilmadi'); }
  if (xus.tsokol) { for (const p of placements.filter(p => modulTuri(catalog[p.frg]) === 'garderob' || modulTuri(catalog[p.frg]) === 'kupe')) p.tsokol = true; q('tsokol', {}, 'bajarilmadi'); }
  if (xus.ldsp) q('ldsp', {}, 'bajarildi');
  /* rang butun garniturga */
  let rang = null;
  if (xus.rang) {
    const sheets = o.sheets;
    const korpus = Array.isArray(sheets) ? plitaTop(sheets, xus.rang.nom, xus.rang.qalinlik, 'korpus') : null;
    const fasad = Array.isArray(sheets) ? plitaTop(sheets, xus.rang.nom, xus.rang.qalinlik, 'fasad') : null;
    rang = { nom: xus.rang.nom, qalinlik: xus.rang.qalinlik, korpus, fasad };
    if (!Array.isArray(sheets)) q('rang_nom', { nom: xus.rang.nom }, 'qisman');
    else if (!korpus) q('rang_yoq', { nom: xus.rang.nom }, 'bajarilmadi');
    else {
      const dekor = { nom: xus.rang.nom, qalinlik: xus.rang.qalinlik, korpus: korpus.name, fasad: (fasad || korpus).name };
      for (const p of placements) { const f = catalog[p.frg]; if (f && f.production !== 'none') p.dekor = Object.assign({}, dekor); }
      q('rang', { nom: xus.rang.nom, sheet: korpus.name, n: placements.filter(p => p.dekor).length }, 'bajarildi');
    }
  }

  /* ── 7) tushunilmagan so'zlar (tilda umuman tanilmagan) — jim tashlanmaydi ── */
  const soz = (x) => qavssiz(x) + ' ' + (x.match(/\(([^)]*)\)/g) || []).join(' ');
  for (const b of bolaklar) {
    let t = soz(b);
    for (const [, re] of BOSH) t = t.replace(new RegExp(re.source, 'g'), ' ');
    for (const re of Object.values(XUS)) t = t.replace(new RegExp(re.source, 'g'), ' ');
    t = t.replace(new RegExp(BOSH_SOZ.source, 'g'), ' ').replace(new RegExp(OYOQ_SOZ.source, 'g'), ' ').replace(new RegExp(UST_SOZ.source, 'g'), ' ');
    t = t.replace(/\d+(?:\.\d+)?\s*(?:mm|мм|sm|см|cm|m|м)?/g, ' ').replace(/(?<=\d)x(?=\d)/g, ' ');
    t = t.replace(TANISH, ' ');
    for (const w of t.split(/[^a-zа-яё']+/).filter(x => x.length >= 3)) {
      if (GAP_SOZ.test(w) || tushunilmadi.includes(w)) continue;
      /* rang nomi ("kashemir") — dekor nomi, tushunilmagan emas */
      if (xus.rang && xus.rang.soraldi.split(/\s+/).includes(w)) continue;
      tushunilmadi.push(w);
    }
  }
  if (tushunilmadi.length) q('tushunilmadi', { s: tushunilmadi.join(', ') }, 'bajarilmadi');

  return {
    tur: 'garnitur', xona: { W, D, H, outline: [[0, 0], [W, 0], [W, D], [0, D]] }, placements, sigmadi,
    bolaklar: bolakInfo, qatorlar, bajarilmadi: qatorlar.filter(z => z.holat !== 'bajarildi' && z.holat !== 'sukut'), tushunilmadi,
    xususiyat: Object.assign({}, xus, { yumshoq }), rang, kengaydi,
    umumiy: { bolaklar: bolaklar.length, buyum: pieces.length }
  };
}
