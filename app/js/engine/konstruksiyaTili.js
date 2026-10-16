/* Smart3D engine/konstruksiyaTili.js — TZ-26: usta matni → konstruksiya tili → ideal chizma (TZ-24 A dvigateli).
 *
 * Konstruksiya tili (Claude va AI'siz tahlilchi bir xil yozadi; server va brauzerda bir xil tekshiriladi):
 *   { tur: 'shkaf'|'pastki'|'ustki'|'tumba'|'erkin', nom, eni, chuqurligi, boyi (mm; 0 — aytilmagan),
 *     tag: 'sokol'|'oyoq'|'yoq'|'auto', qopqoq: 'yaxlit'|'planka'|'auto',
 *     bolimlar: [ chapdan o'ngga: { eni (0 — teng), eshik (-1 — eniga qarab, 0, 1, 2), petlya: 'chap'|'ong'|'auto',
 *                 polka, tortma, shtanga, qatlamlar: [ pastdan yuqoriga: { boyi (0 — teng), eshik, petlya, polka, tortma, shtanga } ] } ] }
 *   Pastki modul va tumbaning "bo'yi" — oyog'i bilan (stoleshnitsasiz), korpus bo'yi = bo'yi − oyoq.
 *
 * Tizim to'g'rilaydi ("ideal"): o'lcham — tur chegarasiga; bir eshik 600 mm dan keng bo'lsa — 2 eshik; eshikli bo'lim
 * 1200 mm dan keng bo'lsa — teng bo'limlarga bo'linadi; polka 800 mm dan keng bo'lsa — vertikal bo'lgich; polkalar orasi
 * 150 mm dan, tortma fasadi 100 mm dan kichik bo'lmaydi; tortmali bo'limga eshik qo'yilmaydi (tortmaning o'z fasadi bor);
 * tortma va polka bir bo'limda bo'lsa — pastda tortmalar, tepada polka. Har to'g'rilash — izoh bilan (tuzatish).
 * AI raqam o'ylab topmaydi: aytilmagan o'lcham — turning standarti (yangiChizma); narx — tizim hisobidan. */
import { yangiChizma, QOIDA } from './chizish.js';

export const TURLAR = ['shkaf', 'pastki', 'ustki', 'tumba', 'erkin'];
export const CHEGARA = {
  shkaf: { eni: [400, 2750], chuqurligi: [300, 800], boyi: [1200, 2700] },
  erkin: { eni: [200, 2750], chuqurligi: [150, 800], boyi: [300, 2700] },
  pastki: { eni: [200, 1200], chuqurligi: [300, 650], boyi: [450, 950] },
  tumba: { eni: [250, 1000], chuqurligi: [300, 650], boyi: [450, 950] },
  ustki: { eni: [200, 1200], chuqurligi: [200, 450], boyi: [250, 1000] }
};
const T = 16;                                               // to'g'rilash hisobi — LDSP 16 (polka standarti)
const POLKA_MAX = QOIDA.polkaEni[16] || 800, ESHIK_MAX = QOIDA.eshikMax || 600, ORA_MIN = 150;

/** AI uchun til ta'rifi (server tizim ko'rsatmasi shu matnni oladi) */
export const TIL_IZOH = `Konstruksiya tili (JSON):
- tur: "shkaf" (garderob, penal, kiyim shkafi), "pastki" (oshxona pastki shkafi, stol osti), "ustki" (osma, devorga), "tumba" (tortmali tumba, komod), "erkin" (javon, stellaj, ochiq polkalar).
- nom: qisqa nom (usta aytgan yoki tur bo'yicha).
- eni, chuqurligi, boyi: millimetrda; aytilmagan bo'lsa 0 (tizim standartini qo'yadi). "1.2 m" = 1200, "60 sm" = 600. "1200x600x2200" — eni x chuqurligi x bo'yi.
- tag: "sokol", "oyoq", "yoq" yoki "auto" (aytilmagan).
- qopqoq: "yaxlit", "planka" yoki "auto".
- bolimlar: vertikal bo'limlar CHAPDAN O'NGGA. Har bo'lim: eni (mm, 0 — teng), eshik (0, 1, 2 yoki -1 — aytilmagan, tizim eniga qarab qo'yadi), petlya ("chap", "ong", "auto"), polka (soni), tortma (soni), shtanga (kiyim ilgich, true/false), qatlamlar.
- qatlamlar: bo'lim ichida gorizontal bo'lingan qismlar PASTDAN YUQORIGA (masalan pastda 3 tortma, tepada 2 polka). Har qatlam: boyi (mm, 0 — teng), eshik, petlya, polka, tortma, shtanga. Qatlam yo'q bo'lsa — bo'sh ro'yxat.
- Faqat matnda AYTILGANNI yozing, raqam o'ylab topmang. "Eshiklar" soni umumiy aytilsa — bo'limlarga taqsimlang (har bo'limga 1 yoki 2). Eshik aytilmagan bo'lsa -1.
- Matn bitta mebel konstruksiyasi emas (xona, oshxona rejasi, bir nechta modul buyurtmasi) bo'lsa — tur "xona".`;

const son = (v) => (typeof v === 'number' && isFinite(v) ? Math.round(v) : typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim()) ? Math.round(+v) : 0);
const ichida = (v, [a, b]) => Math.max(a, Math.min(b, v));
const bool = (v) => v === true || v === 'true' || v === 1;

/** xom tarkib (bo'lim yoki qatlam) → toza */
function tarkib(x) {
  x = x && typeof x === 'object' ? x : {};
  const e = son(x.eshik);
  return { eshik: e < 0 ? -1 : Math.min(2, e), petlya: ['chap', 'ong'].includes(x.petlya) ? x.petlya : 'auto',
    polka: ichida(son(x.polka), [0, 20]), tortma: ichida(son(x.tortma), [0, 10]), shtanga: bool(x.shtanga) };
}

/**
 * Tekshirish va to'g'rilash. raw — AI yoki tahlilchi javobi (har qanday shakl: yetishmagan maydon — standart).
 * @returns {{ spec, tuzatish: Array<{kod, ...}>, tushunilmadi: string[] }} yoki { xona: true } (bu konstruksiya emas)
 */
export function specTekshir(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  if (r.tur === 'xona') return { xona: true, tushunilmadi: [] };
  const tuzatish = [];
  let tur = TURLAR.includes(r.tur) ? r.tur : 'shkaf';
  const asos = yangiChizma(tur), ch = CHEGARA[tur];
  const tagTur = ['sokol', 'oyoq', 'yoq'].includes(r.tag) ? r.tag : asos.tag.tur;
  const oyoq = (tur === 'pastki' || tur === 'tumba') && tagTur !== 'yoq' ? (asos.tag.h || 100) : 0;
  const ol = (k, std) => {
    const v = son(r[k]);
    if (!(v > 0)) return std;
    const q = ichida(v, ch[k]);
    if (q !== v) tuzatish.push({ kod: 'olcham', o: k, n: v, m: q });
    return q;
  };
  const eni = ol('eni', asos.w), chuqurligi = ol('chuqurligi', asos.d);
  const boyi = ol('boyi', asos.h + oyoq);
  let bolimlar = (Array.isArray(r.bolimlar) ? r.bolimlar : []).slice(0, 8).map(b => Object.assign(tarkib(b), {
    eni: Math.max(0, son(b && b.eni)),
    qatlamlar: (Array.isArray(b && b.qatlamlar) ? b.qatlamlar : []).slice(0, 6).map(q => Object.assign(tarkib(q), { boyi: Math.max(0, son(q && q.boyi)) }))
  }));
  if (!bolimlar.length) bolimlar = ichkidanBolimlar(asos.ichki);       // hech narsa aytilmagan — turning standart ichi

  /* ichki o'lchamlar (16 mm korpus bilan taxminiy — faqat to'g'rilash uchun; aniq detal — chizish dvigatelida) */
  const korpusH = boyi - oyoq - (tur === 'shkaf' || tur === 'erkin' ? (asos.tag.h || 0) : 0);
  const ichH = korpusH - 2 * T;
  const enlar = () => {
    const ichW = eni - 2 * T - (bolimlar.length - 1) * T;
    const aniq = bolimlar.reduce((a, b) => a + b.eni, 0), teng = bolimlar.filter(b => !b.eni).length;
    if (aniq > ichW + 1 || (!teng && Math.abs(aniq - ichW) > 1)) { if (aniq) tuzatish.push({ kod: 'eni_yigindi', n: aniq, m: Math.round(ichW) }); bolimlar.forEach(b => { b.eni = 0; }); return enlar(); }
    const t0 = teng ? (ichW - aniq) / teng : 0;
    return bolimlar.map(b => b.eni || t0);
  };

  /* 1) polka 800 mm dan keng — bo'limni teng bo'laklarga (vertikal bo'lgich) */
  let w = enlar();
  bolimlar = bolimlar.flatMap((b, i) => {
    const kerak = (b.polka > 0 || b.qatlamlar.some(q => q.polka > 0)) ? Math.ceil(w[i] / POLKA_MAX) : 1;
    if (kerak <= 1) return [b];
    tuzatish.push({ kod: 'polka_bolgich', n: Math.round(w[i]), k: kerak });
    return Array.from({ length: kerak }, () => Object.assign(JSON.parse(JSON.stringify(b)), { eni: 0, eshik: b.eshik > 0 ? -1 : b.eshik }));
  });
  /* 2) eshikli bo'lim 1200 mm dan keng — teng bo'limlar (har birida 2 eshik gacha) */
  w = enlar();
  bolimlar = bolimlar.flatMap((b, i) => {
    if (!(b.eshik !== 0 && w[i] > 2 * ESHIK_MAX)) return [b];
    const k = Math.ceil(w[i] / (2 * ESHIK_MAX));
    tuzatish.push({ kod: 'bolim_bol', n: Math.round(w[i]), k });
    return Array.from({ length: k }, () => Object.assign(JSON.parse(JSON.stringify(b)), { eni: 0, eshik: -1 }));
  });
  w = enlar();

  /* 3) har bo'lim va qatlam: tortma — eshiksiz, pastda; eshik soni eniga qarab; polka va tortma zichligi */
  const n = bolimlar.length;
  bolimlar.forEach((b, i) => {
    const pet = n === 1 ? 'chap' : i === n - 1 ? 'ong' : 'chap';
    /* tortma va polka/shtanga bir joyda — pastda tortmalar, tepada qolgani */
    if (!b.qatlamlar.length && b.tortma > 0 && (b.polka > 0 || b.shtanga)) {
      b.qatlamlar = [Object.assign(tarkib({ tortma: b.tortma }), { boyi: 0 }), Object.assign(tarkib({ polka: b.polka, shtanga: b.shtanga, eshik: b.eshik }), { boyi: 0 })];
      b.tortma = 0; b.polka = 0; b.shtanga = false; b.eshik = 0;
      tuzatish.push({ kod: 'tortma_qatlam' });
    }
    const qatlamli = b.qatlamlar.length > 1;
    if (qatlamli && b.qatlamlar.some(q => q.tortma > 0) && b.eshik !== 0) {
      /* tortmasi bor bo'limda umumiy eshik bo'lmaydi — eshik tortmasiz qatlamlarga */
      b.qatlamlar.forEach(q => { if (!q.tortma && q.eshik === 0 && b.eshik !== 0) q.eshik = b.eshik; });
      if (b.eshik > 0) tuzatish.push({ kod: 'tortma_eshik' });
      b.eshik = 0;
    }
    if (!qatlamli && b.qatlamlar.length === 1) { Object.assign(b, b.qatlamlar[0], { eni: b.eni }); b.qatlamlar = []; }
    const eshikTuzat = (x, en) => {
      if (x.tortma > 0) { if (x.eshik > 0) tuzatish.push({ kod: 'tortma_eshik' }); x.eshik = 0; return; }
      if (x.eshik === -1) x.eshik = tur === 'erkin' ? 0 : en > ESHIK_MAX ? 2 : 1;
      else if (x.eshik === 1 && en > ESHIK_MAX) { x.eshik = 2; tuzatish.push({ kod: 'eshik2', n: Math.round(en) }); }
      if (x.eshik === 1 && x.petlya === 'auto') x.petlya = pet;
    };
    const zich = (x, h) => {
      if (x.polka > 0) { const k = Math.max(0, Math.floor((h - ORA_MIN) / (ORA_MIN + T))); if (x.polka > k) { tuzatish.push({ kod: 'polka_kam', n: x.polka, m: k }); x.polka = k; } }
      if (x.tortma > 0) { const k = Math.max(1, Math.floor((h + QOIDA.tirqish) / (QOIDA.tortmaMinH + QOIDA.tirqish))); if (x.tortma > k) { tuzatish.push({ kod: 'tortma_kam', n: x.tortma, m: k }); x.tortma = k; } }
    };
    eshikTuzat(b, w[i]);
    if (qatlamli) {
      const aniq = b.qatlamlar.reduce((a, q) => a + q.boyi, 0), teng = b.qatlamlar.filter(q => !q.boyi).length;
      const bor = ichH - (b.qatlamlar.length - 1) * T;
      if (aniq > bor || (!teng && Math.abs(aniq - bor) > 1)) { b.qatlamlar.forEach(q => { q.boyi = 0; }); if (aniq) tuzatish.push({ kod: 'qatlam_yigindi', n: aniq, m: Math.round(bor) }); }
      const a2 = b.qatlamlar.reduce((a, q) => a + q.boyi, 0), t2 = b.qatlamlar.filter(q => !q.boyi).length, h0 = t2 ? (bor - a2) / t2 : 0;
      b.qatlamlar.forEach(q => { if (b.eshik !== 0 && q.eshik === -1) q.eshik = 0; eshikTuzat(q, w[i]); zich(q, q.boyi || h0); });
    } else zich(b, ichH);
  });
  if (tur === 'pastki' && bolimlar.every(b => b.tortma > 0 && !b.qatlamlar.length)) tur = 'tumba';

  const nom = typeof r.nom === 'string' && r.nom.trim() ? r.nom.trim().slice(0, 60) : '';
  const tag = (tur === 'pastki' || tur === 'tumba') && tagTur === 'sokol' ? 'sokol' : tagTur;
  return {
    spec: { tur, nom, eni, chuqurligi, boyi, tag, qopqoq: ['yaxlit', 'planka'].includes(r.qopqoq) ? r.qopqoq : asos.qopqoq, bolimlar },
    tuzatish, tushunilmadi: (Array.isArray(r.tushunilmadi) ? r.tushunilmadi : []).slice(0, 10).map(s => String(s).slice(0, 80))
  };
}

/** chizma ichi (yangiChizma) → bo'limlar (tur standarti) */
function ichkidanBolimlar(ichki) {
  const q = (n) => Object.assign(tarkib({ eshik: n.eshik == null ? 0 : n.eshik, petlya: n.petlya, polka: n.polka, tortma: n.tortma, shtanga: n.shtanga }),
    { qatlamlar: n.yo === 'h' ? (n.bo || []).map(b => Object.assign(q(b.n || {}), { boyi: b.o > 0 ? b.o : 0, qatlamlar: undefined })) : [] });
  const n = ichki || {};
  return (n.yo === 'v' ? (n.bo || []).map(b => Object.assign(q(b.n || {}), { eni: b.o > 0 ? b.o : 0 })) : [Object.assign(q(n), { eni: 0 })]);
}

/** toza spec → chizma (engine/chizish.js) */
export function specdanChizma(spec) {
  const ch = yangiChizma(spec.tur);
  const oyoq = (spec.tur === 'pastki' || spec.tur === 'tumba') && spec.tag !== 'yoq' ? (ch.tag.h || 100) : 0;
  ch.w = spec.eni; ch.d = spec.chuqurligi; ch.h = spec.boyi - oyoq;
  ch.qopqoq = spec.qopqoq;
  if (spec.tur !== 'ustki') ch.tag = { tur: spec.tag, h: spec.tag === 'yoq' ? 0 : spec.tag === (yangiChizma(spec.tur).tag.tur) ? ch.tag.h : spec.tag === 'sokol' ? 84 : 100 };
  const tugun = (x) => {
    const n = {};
    if (x.eshik > 0) { n.eshik = x.eshik; if (x.eshik === 1) n.petlya = x.petlya === 'ong' ? 'ong' : 'chap'; }
    if (x.qatlamlar && x.qatlamlar.length > 1) { n.yo = 'h'; n.bo = x.qatlamlar.map(q => ({ o: q.boyi > 0 ? q.boyi : null, n: tugun(q) })); return n; }
    if (x.tortma > 0) n.tortma = x.tortma;
    else { if (x.polka > 0) n.polka = x.polka; if (x.shtanga) n.shtanga = true; }
    return n;
  };
  const b = spec.bolimlar;
  ch.ichki = b.length === 1 ? tugun(b[0]) : { yo: 'v', bo: b.map(x => ({ o: x.eni > 0 ? x.eni : null, n: tugun(x) })) };
  return ch;
}

/** qisqa tavsif (xabar uchun): "2 bo'lim · 4 polka · 3 tortma · shtanga · 4 eshik" — raqamlar */
export function specXulosa(spec) {
  const s = { bolim: spec.bolimlar.length, polka: 0, tortma: 0, shtanga: 0, eshik: 0 };
  const yig = (x) => { s.polka += x.polka; s.tortma += x.tortma; s.shtanga += x.shtanga ? 1 : 0; s.eshik += Math.max(0, x.eshik); (x.qatlamlar || []).forEach(yig); };
  spec.bolimlar.forEach(yig);
  return s;
}

/* ── AI'siz tahlilchi (uz, ru, en; oddiy jumlalar) ── */
const KW = {
  shkaf: /shkaf|garderob|kiyim|penal|шкаф|шифонь|гардероб|пенал|wardrobe|closet|tall cabinet/,
  pastki: /pastki|ostki|stol ?osti|нижн|напольн|base cabinet|lower cabinet|base unit/,
  ustki: /ustki|osma|devorga|верхн|навесн|upper|wall cabinet|wall unit/,
  tumba: /tumba|komod|тумб|комод|drawer unit|chest of drawers|dresser/,
  erkin: /javon|stellaj|стеллаж|bookcase|shelving|shelf unit|ochiq polka/
};
const ICH = {
  polka: /(\d+)\s*(?:ta\s*)?(?:polka|пол(?:к|ок)|shel)|(?:polka|пол(?:к|ок)[^\s\d:,.;]*|shel[^\s\d:,.;]*)\s*(\d+)/,
  tortma: /(\d+)\s*(?:ta\s*)?(?:tortma|yashik|ящик|выдвиж|drawer)|(?:tortma[^\s\d:,.;]*|ящик[^\s\d:,.;]*|drawer[^\s\d:,.;]*)\s*(\d+)/,
  eshik: /(\d+)\s*(?:ta\s*)?(?:eshik|дверц|двер|створ|door)|(?:eshik[^\s\d:,.;]*|двер[^\s\d:,.;]*|door[^\s\d:,.;]*)\s*(\d+)/,
  shtanga: /shtanga|ilgich|veshal|штанг|вешал|плечик|rod\b|hanging|rail/,
  eshiksiz: /eshiksiz|ochiq\b|без двер|открыт|no doors?|open\b/
};
const XONA = /\bxona|комнат|\broom\b|reja|планировк|\bl ?shakl|burchakli oshxona|г-образ|п-образ|u-shape|l-shape|orol|остров|island|xolodilnik|холодильник|fridge|plita|плит|stove|moyka|мойк|sink|\d+\s*ta\s*(?:pastki|ustki|shkaf|modul)|\d+\s*(?:нижн|верхн|шкаф)[^\s\d:,.;]*\s+и\s+\d+/;

/** matn bitta modul konstruksiyasimi (true) yoki xona/oshxona (false) */
export function konstruksiyami(matn) {
  const s = String(matn || '').toLowerCase();
  if (!s.trim()) return false;
  if (XONA.test(s)) return false;
  if (/(oshxona|кухн|kitchen)/.test(s) && /\d(?:[.,]\d)?\s*[x×х*]\s*\d(?:[.,]\d)?\s*(?:m|м)\b/.test(s)) return false;
  return Object.values(KW).some(re => re.test(s)) || /polka|tortma|shtanga|bo'lim|полк|ящик|штанг|секци|shel|drawer|section/.test(s);
}

/** matndagi o'lcham: "1.2 m", "120 sm", "1200 mm", "1200" → mm */
function mm(v, birlik) {
  const x = +String(v).replace(',', '.');
  if (!isFinite(x)) return 0;
  if (/^(m|м|metr|метр)/.test(birlik || '')) return Math.round(x * 1000);
  if (/^(sm|см|cm)/.test(birlik || '')) return Math.round(x * 10);
  return x < 10 ? Math.round(x * 1000) : Math.round(x);
}
const sonOl = (re, s) => { const m = re.exec(s); return m ? +(m[1] || m[2]) : null; };

/** AI'siz tahlilchi: matn → xom konstruksiya tili (keyin specTekshir) */
export function matndanSpec(matn) {
  const s = String(matn || '').toLowerCase().replace(/[×х*]/g, 'x').replace(/(\d),(\d)/g, '$1.$2');
  const r = { tur: 'shkaf', nom: '', eni: 0, chuqurligi: 0, boyi: 0, tag: 'auto', qopqoq: 'auto', bolimlar: [], tushunilmadi: [] };
  for (const t of ['tumba', 'ustki', 'pastki', 'erkin', 'shkaf']) if (KW[t].test(s)) { r.tur = t; break; }
  /* o'lcham: "1200x600x2200" (eni x chuqurligi x bo'yi) yoki "1200x2200" (eni x bo'yi) */
  const u = /(\d+(?:\.\d+)?)\s*(m|м|sm|см|cm|mm|мм)?\s*x\s*(\d+(?:\.\d+)?)\s*(m|м|sm|см|cm|mm|мм)?(?:\s*x\s*(\d+(?:\.\d+)?)\s*(m|м|sm|см|cm|mm|мм)?)?/.exec(s);
  if (u) {
    if (u[5]) { r.eni = mm(u[1], u[2] || u[6]); r.chuqurligi = mm(u[3], u[4] || u[6]); r.boyi = mm(u[5], u[6]); }
    else { r.eni = mm(u[1], u[2] || u[4]); r.boyi = mm(u[3], u[4]); }
  }
  const KAL = [['eni', /(?:eni|kengligi|ширин[^\s\d:,.;]*|width|wide)\s*:?\s*(\d+(?:\.\d+)?)\s*(m|м|sm|см|cm|mm|мм)?/],
    ['chuqurligi', /(?:chuqurligi|chuqur|глубин[^\s\d:,.;]*|depth|deep)\s*:?\s*(\d+(?:\.\d+)?)\s*(m|м|sm|см|cm|mm|мм)?/],
    ['boyi', /(?:bo'yi|boyi|balandligi|баланд|высот[^\s\d:,.;]*|height|tall|high)\s*:?\s*(\d+(?:\.\d+)?)\s*(m|м|sm|см|cm|mm|мм)?/]];
  for (const [k, re] of KAL) { const m = re.exec(s); if (m) r[k] = mm(m[1], m[2]); }
  /* inglizcha tartib: "1500 wide", "2200 high", "600 deep" */
  for (const [k, re] of [['eni', /(\d+(?:\.\d+)?)\s*(m|mm|cm)?\s*(?:wide|width)/], ['boyi', /(\d+(?:\.\d+)?)\s*(m|mm|cm)?\s*(?:high|tall|height)/], ['chuqurligi', /(\d+(?:\.\d+)?)\s*(m|mm|cm)?\s*(?:deep|depth)/]]) {
    const m = re.exec(s); if (m) r[k] = mm(m[1], m[2]);
  }
  if (!r.eni) {                                             // "shkaf 1200" — turdan keyingi yolg'iz son — eni
    const m = /(?:shkaf|garderob|tumba|komod|javon|stellaj|modul|шкаф|тумб[^\s\d:,.;]*|комод|стеллаж|wardrobe|cabinet|bookcase)[^\s\d:,.;]*\s+(\d+(?:\.\d+)?)\s*(m|м|sm|см|cm|mm|мм)?(?!\d|\s*(?:ta\b|x|polka|tortma|eshik|bo'lim|bolim|qism|пол|ящик|двер|секци|shel|drawer|door|section))/.exec(s);
    if (m && (m[2] || +m[1] >= 100)) r.eni = mm(m[1], m[2]);   // birliksiz kichik son (2, 3) — o'lcham emas
  }
  if (/sokol|цокол|plinth/.test(s)) r.tag = 'sokol';
  else if (/oyoq|ножк|legs/.test(s)) r.tag = 'oyoq';

  /* bo'limlar: "chapda …, o'rtada …, o'ngda …" yoki "N bo'lim" */
  const JOY = [['chap', /(?:chap(?:da|ida|ga)?|слева|левой|left)/], ['orta', /(?:o'rta(?:da|sida)?|orta(?:da)?|посередин[^\s\d:,.;]*|в центре|middle|center)/], ['ong', /(?:o'ng(?:da|ida|ga)?|справа|правой|right)/]];
  const qism = [];
  const re = new RegExp(JOY.map(j => j[1].source).join('|'), 'g');
  let m, oldingi = null, bosh = 0;
  const umumiy = [];
  /* joy bo'lagi birinchi vergul (nuqta-vergul, nuqta) gacha; qolgani — butun modulga ("…, o'ngda 4 polka, 2 eshik") */
  const bolak = (joy, t) => { const i = t.search(/[,;.](?!\d)/); if (i < 0) qism.push({ joy, s: t }); else { qism.push({ joy, s: t.slice(0, i) }); umumiy.push(t.slice(i)); } };
  while ((m = re.exec(s))) {
    const j = JOY.find(x => new RegExp('^' + x[1].source).test(m[0]))[0];
    if (oldingi) bolak(oldingi, s.slice(bosh, m.index)); else umumiy.push(s.slice(0, m.index));
    oldingi = j; bosh = m.index + m[0].length;
  }
  if (oldingi) bolak(oldingi, s.slice(bosh)); else umumiy.push(s);
  const tarkibOl = (t) => {
    const x = { polka: sonOl(ICH.polka, t) || (/(polka|пол(?:к|ок)|shel)/.test(t) ? 1 : 0), tortma: sonOl(ICH.tortma, t) || 0, shtanga: ICH.shtanga.test(t), eshik: -1, petlya: 'auto', qatlamlar: [] };
    const e = sonOl(ICH.eshik, t);
    if (e != null) x.eshik = e; else if (ICH.eshiksiz.test(t)) x.eshik = 0;
    if (/(?:tortma|ящик|drawer)[^\s\d:,.;]*\s+(?:pastda|снизу|bottom)|(?:pastda|снизу|bottom)\D{0,12}(?:tortma|ящик|drawer)/.test(t) && x.tortma && (x.polka || x.shtanga)) {
      x.qatlamlar = [{ tortma: x.tortma }, { polka: x.polka, shtanga: x.shtanga }]; x.tortma = 0; x.polka = 0; x.shtanga = false;
    }
    return x;
  };
  const tartib = { chap: 0, orta: 1, ong: 2 };
  if (qism.length) {
    qism.sort((a, b) => tartib[a.joy] - tartib[b.joy]);
    r.bolimlar = qism.map(q => Object.assign({ eni: 0 }, tarkibOl(q.s)));
  } else {
    const k = sonOl(/(\d+)\s*(?:ta\s*)?(?:bo'lim|bolim|qism|секци|отдел|section|compartment)/, s);
    const t = tarkibOl(umumiy.join(' '));
    r.bolimlar = Array.from({ length: Math.max(1, Math.min(6, k || 1)) }, () => JSON.parse(JSON.stringify(t)));
  }
  /* umumiy eshik soni ("2 eshik") — bo'limlarga taqsimlanadi */
  const E = sonOl(ICH.eshik, umumiy.join(' '));
  const eshiksiz = ICH.eshiksiz.test(umumiy.join(' '));
  if (E != null || eshiksiz) {
    const n = r.bolimlar.length, e = eshiksiz ? 0 : E;
    r.bolimlar.forEach((b, i) => {
      if (b.eshik !== -1 && qism.length) return;           // bo'limda o'zi aytilgan
      b.eshik = e === 0 ? 0 : e >= 2 * n ? 2 : e >= n ? (i < e - n ? 2 : 1) : (i < e ? 1 : 0);
    });
  }
  /* bo'lim qismida aytilmagan, lekin umumiy matnda aytilgan tarkib (bitta bo'lim) — allaqachon umumiy */
  if (!r.bolimlar.length) r.bolimlar = [tarkibOl(s)];
  /* hech narsa tushunilmasa — standart tarkib (specTekshir) */
  if (r.bolimlar.length === 1 && !r.bolimlar[0].polka && !r.bolimlar[0].tortma && !r.bolimlar[0].shtanga && r.bolimlar[0].eshik === -1 && !qism.length) r.bolimlar = [];
  return r;
}
