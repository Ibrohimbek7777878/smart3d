/* Smart3D engine/konstruksiyaTili.js — TZ-26: usta matni → konstruksiya tili → ideal chizma (TZ-24 A dvigateli).
 *
 * Konstruksiya tili (Claude va AI'siz tahlilchi bir xil yozadi; server va brauzerda bir xil tekshiriladi):
 *   { tur: 'shkaf'|'pastki'|'ustki'|'tumba'|'erkin', nom, eni, chuqurligi, boyi (mm; 0 — aytilmagan),
 *     tag: 'sokol'|'oyoq'|'yoq'|'auto', qopqoq: 'yaxlit'|'planka'|'auto',
 *     bolimlar: [ chapdan o'ngga: { eni (0 — teng), eshik (-1 — eniga qarab, 0, 1, 2), petlya: 'chap'|'ong'|'auto',
 *                 polka, tortma, shtanga, ajrat: 'polka'|'auto' (qatlamlar orasi: polka — polka ushlagichda, auto — bo'lgich),
 *                 qatlamlar: [ pastdan yuqoriga: { boyi (0 — teng), eshik, petlya, polka, tortma, shtanga } ] } ],
 *     orqa: 'hdf'|'yergacha'|'yoq'|'auto', material: { korpus|polka|fasad: { nom (ERP dekor nomi, '' — aytilmagan), qalinlik } },
 *     furnitura: { birikma: 'konfirmat'|'ekssentrik'|'auto', polka: 'polkaderjatel'|'auto', ruchka (uzun ruchka mm, 0 — standart) },
 *     eksport: 'obj'|'' (qurilgach fayl darhol yuklanadi) }
 *   Pastki modul va tumbaning "bo'yi" — oyog'i bilan (stoleshnitsasiz), korpus bo'yi = bo'yi − oyoq.
 *
 * Tizim to'g'rilaydi ("ideal"): o'lcham — tur chegarasiga; bir eshik 600 mm dan keng bo'lsa — 2 eshik; eshikli bo'lim
 * 1200 mm dan keng bo'lsa — teng bo'limlarga bo'linadi; polka 800 mm dan keng bo'lsa — vertikal bo'lgich; polkalar orasi
 * 150 mm dan, tortma fasadi 100 mm dan kichik bo'lmaydi; tortmali bo'limga eshik qo'yilmaydi (tortmaning o'z fasadi bor);
 * tortma va polka bir bo'limda bo'lsa — pastda tortmalar, tepada polka. Har to'g'rilash — izoh bilan (tuzatish).
 * AI raqam o'ylab topmaydi: aytilmagan o'lcham — turning standarti (yangiChizma); narx — tizim hisobidan. */
import { yangiChizma, QOIDA } from './chizish.js';
import { oshxonami } from './oshxonaTili.js';

export const TURLAR = ['shkaf', 'pastki', 'ustki', 'tumba', 'erkin'];
export const CHEGARA = {
  shkaf: { eni: [400, 2750], chuqurligi: [300, 800], boyi: [1200, 2700] },
  erkin: { eni: [200, 2750], chuqurligi: [150, 800], boyi: [300, 2700] },
  pastki: { eni: [200, 1200], chuqurligi: [300, 650], boyi: [450, 950] },
  tumba: { eni: [250, 1000], chuqurligi: [300, 650], boyi: [450, 950] },
  ustki: { eni: [200, 1200], chuqurligi: [200, 450], boyi: [250, 1000] }
};
/* TZ-37: standart konstruksiya (admin panel, sozlama 'standart_konstruksiya') — matnda AYTILMAGAN qiymatlar uchun sukut.
 * Aytilgan qiymat ustun. Standart berilmasa (server yo'q, admin yozmagan) — hozirgi qattiq sukutlar (xulq o'zgarmaydi). */
export const STANDART_SUKUT = {
  korpus: { nom: 'LDSP', qalinlik: 16 }, fasad: { nom: 'MDF', qalinlik: 16 }, orqa: { nom: 'HDF', qalinlik: 3 }, polka: { nom: 'LDSP', qalinlik: 16 },
  ruchka: { tur: 'standart', uzunlik: 0 }, birikma: 'konfirmat', tag: 'oyoq', oyoqBalandlik: 100
};
/** Standartni tekshirish (server PUT va brauzer bitta qoida) → { std } yoki { xato: 'matn' } */
export function standartTekshir(raw) {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : null;
  if (!r) return { xato: "standart obyekt bo'lishi kerak" };
  const S = STANDART_SUKUT, std = {};
  const matn = (v, f, max) => {
    if (typeof v !== 'string') return { xato: `${f}: matn bo'lishi kerak` };
    const t = v.trim();
    if (!t || t.length > max) return { xato: `${f}: 1…${max} belgi` };
    if (/[<>]/.test(t)) return { xato: `${f}: < va > mumkin emas` };
    return { v: t };
  };
  const son = (v, f, a, b) => (typeof v === 'number' && Number.isFinite(v) && v >= a && v <= b ? { v } : { xato: `${f}: ${a}…${b} oralig'idagi son bo'lishi kerak` });
  for (const [k, [a, b]] of [['korpus', [3, 50]], ['fasad', [3, 50]], ['orqa', [2, 20]], ['polka', [3, 50]]]) {
    const x = r[k] == null ? S[k] : r[k];
    if (!x || typeof x !== 'object' || Array.isArray(x)) return { xato: `${k}: obyekt bo'lishi kerak` };
    const nom = matn(x.nom == null ? S[k].nom : x.nom, `${k}.nom`, 60), q = son(x.qalinlik == null ? S[k].qalinlik : x.qalinlik, `${k}.qalinlik`, a, b);
    if (nom.xato) return nom;
    if (q.xato) return q;
    std[k] = { nom: nom.v, qalinlik: q.v };
  }
  const rx = r.ruchka == null ? S.ruchka : r.ruchka;
  if (!rx || typeof rx !== 'object' || Array.isArray(rx)) return { xato: "ruchka: obyekt bo'lishi kerak" };
  const tur = matn(rx.tur == null ? S.ruchka.tur : rx.tur, 'ruchka.tur', 40);
  if (tur.xato) return tur;
  const ul = rx.uzunlik == null ? 0 : rx.uzunlik;
  if (!(ul === 0 || (typeof ul === 'number' && Number.isFinite(ul) && ul >= 96 && ul <= 2500))) return { xato: 'ruchka.uzunlik: 0 yoki 96…2500' };
  std.ruchka = { tur: tur.v, uzunlik: ul };
  const bi = r.birikma == null ? S.birikma : r.birikma;
  if (!['konfirmat', 'ekssentrik'].includes(bi)) return { xato: 'birikma: konfirmat yoki ekssentrik' };
  std.birikma = bi;
  const tg = r.tag == null ? S.tag : r.tag;
  if (!['oyoq', 'sokol'].includes(tg)) return { xato: 'tag: oyoq yoki sokol' };
  std.tag = tg;
  const ob = son(r.oyoqBalandlik == null ? S.oyoqBalandlik : r.oyoqBalandlik, 'oyoqBalandlik', 20, 300);
  if (ob.xato) return ob;
  std.oyoqBalandlik = ob.v;
  return { std };
}

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
- ajrat: qatlamlar orasidagi gorizontal detal — "polka" (polka ushlagichda turadigan polka, masalan "kiyim joyi, tepa va pastida polka") yoki "auto" (bo'lgich).
- orqa: orqa devor — "hdf", "yergacha" (orqa HDF polgacha, sokolni ham yopadi; "bakavina yergacha"), "yoq" yoki "auto".
- material: korpus, polka (ichki qism), fasad — har biri { nom: dekor nomi matndagidek ("kashemir", "дуб золотой"), qalinlik: mm }. Aytilmagan — nom "", qalinlik 0. "Korpus va ichki qism" — korpus va polka bir xil.
- furnitura: birikma ("konfirmat", "ekssentrik", "auto"), polka ("polkaderjatel" yoki "auto"), ruchka — uzun ruchka uzunligi mm ("1 metrlik ruchka" = 1000), aytilmagan — 0.
- eksport: "obj" — usta OBJ faylni so'rasa ("obj formatda yubor"), aks holda "yoq".
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
export function specTekshir(raw, standart) {
  const std = standart && standartTekshir(standart).std || null;   // TZ-37: aytilmagan qiymatlar uchun admin standarti
  const r = raw && typeof raw === 'object' ? raw : {};
  if (r.tur === 'xona') return { xona: true, tushunilmadi: [] };
  const tuzatish = [];
  let tur = TURLAR.includes(r.tur) ? r.tur : 'shkaf';
  const asos = yangiChizma(tur), ch = CHEGARA[tur];
  const tagAytilgan = ['sokol', 'oyoq', 'yoq'].includes(r.tag);
  const tagTur = tagAytilgan ? r.tag : ((tur === 'pastki' || tur === 'tumba') && std ? std.tag : asos.tag.tur);
  const oyoqH = std && tagTur === 'oyoq' && !tagAytilgan && std.oyoqBalandlik !== (asos.tag.h || 100) ? std.oyoqBalandlik : 0;                  // standartdagi oyoq balandligi (faqat aytilmagan oyoq uchun)
  const oyoq = (tur === 'pastki' || tur === 'tumba') && tagTur !== 'yoq' ? (oyoqH || asos.tag.h || 100) : 0;
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
    eni: Math.max(0, son(b && b.eni)), ajrat: b && b.ajrat === 'polka' ? 'polka' : 'auto',
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
    const kerak = (b.polka > 0 || b.qatlamlar.some(q => q.polka > 0) || (b.ajrat === 'polka' && b.qatlamlar.length > 1)) ? Math.ceil(w[i] / POLKA_MAX) : 1;
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
  /* material (ERP dekori nomi — saytda ro'yxatdan qidiriladi), furnitura, orqa devor, eksport */
  const rm = r.material && typeof r.material === 'object' ? r.material : {};
  const matOl = (x) => ({ nom: x && typeof x.nom === 'string' ? x.nom.replace(/[<>]/g, '').trim().slice(0, 60) : '', qalinlik: ichida(son(x && x.qalinlik), [0, 40]) });
  const material = { korpus: matOl(rm.korpus), polka: matOl(rm.polka), fasad: matOl(rm.fasad) };
  if (std) for (const k of ['korpus', 'polka', 'fasad']) if (material[k].nom && !material[k].qalinlik) material[k].qalinlik = std[k].qalinlik;   // dekor aytilgan, qalinlik aytilmagan
  if (!material.polka.nom && material.korpus.nom) material.polka = Object.assign({}, material.korpus);   // ichki qism — korpus dekorida
  const rf = r.furnitura && typeof r.furnitura === 'object' ? r.furnitura : {};
  const furnitura = { birikma: ['konfirmat', 'ekssentrik'].includes(rf.birikma) ? rf.birikma : (std && std.birikma === 'ekssentrik' ? 'ekssentrik' : 'auto'),   // konfirmat — dvigatelning o'z sukuti ('auto')
    polka: rf.polka === 'polkaderjatel' ? 'polkaderjatel' : 'auto', ruchka: 0 };
  const ru = son(rf.ruchka);
  if (ru > 0) { furnitura.ruchka = ichida(ru, [96, 2500]); if (furnitura.ruchka !== ru) tuzatish.push({ kod: 'ruchka', n: ru, m: furnitura.ruchka }); }
  else if (std && std.ruchka.uzunlik >= 96) furnitura.ruchka = std.ruchka.uzunlik;
  const orqa = ['hdf', 'yergacha', 'yoq'].includes(r.orqa) ? r.orqa : 'auto';
  return {
    spec: { tur, nom, eni, chuqurligi, boyi, tag, qopqoq: ['yaxlit', 'planka'].includes(r.qopqoq) ? r.qopqoq : asos.qopqoq, bolimlar,
      orqa, material, furnitura, eksport: r.eksport === 'obj' ? 'obj' : '', ...(oyoqH ? { oyoqH } : {}) },
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
  const oyoq = (spec.tur === 'pastki' || spec.tur === 'tumba') && spec.tag !== 'yoq' ? (spec.oyoqH || ch.tag.h || 100) : 0;
  ch.w = spec.eni; ch.d = spec.chuqurligi; ch.h = spec.boyi - oyoq;
  ch.qopqoq = spec.qopqoq;
  if (spec.orqa === 'yoq') ch.orqa = 'yoq';
  if (spec.orqa === 'yergacha' && (spec.tur === 'shkaf' || spec.tur === 'erkin')) ch.orqaYer = true;   // HDF polgacha (sokol ortini yopadi)
  if (spec.furnitura && spec.furnitura.ruchka > 0) ch.ruchka = { l: spec.furnitura.ruchka };
  if (spec.furnitura && spec.furnitura.birikma === 'ekssentrik') ch.birikma = 'ekssentrik';         // korpus — eksentrikda (d6.js EKS)
  if (spec.tur !== 'ustki') ch.tag = { tur: spec.tag, h: spec.tag === 'yoq' ? 0 : spec.tag === (yangiChizma(spec.tur).tag.tur) ? ch.tag.h : spec.tag === 'oyoq' && spec.oyoqH > 0 ? spec.oyoqH : spec.tag === 'sokol' ? 84 : 100 };
  const tugun = (x) => {
    const n = {};
    if (x.eshik > 0) { n.eshik = x.eshik; if (x.eshik === 1) n.petlya = x.petlya === 'ong' ? 'ong' : 'chap'; }
    if (x.qatlamlar && x.qatlamlar.length > 1) {
      n.yo = 'h'; n.bo = x.qatlamlar.map(q => ({ o: q.boyi > 0 ? q.boyi : null, n: tugun(q) }));
      if (x.ajrat === 'polka') n.ajrat = 'polka';                // qatlamlar orasi — polka (ushlagichda), bo'lgich emas
      return n;
    }
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
  const yig = (x) => {
    s.polka += x.polka + (x.ajrat === 'polka' && x.qatlamlar && x.qatlamlar.length > 1 ? x.qatlamlar.length - 1 : 0);
    s.tortma += x.tortma; s.shtanga += x.shtanga ? 1 : 0; s.eshik += Math.max(0, x.eshik); (x.qatlamlar || []).forEach(yig);
  };
  spec.bolimlar.forEach(yig);
  return s;
}


/* ── AI'siz tahlilchi (uz, ru, en; oddiy jumlalar; o'zbekcha og'zaki imlo xatolariga chidamli:
 *    "balandlig", "chuqurlig", "eniga", "materali", "brikmasi", "vishilka", "derjatel", "sokilli", "bakavina", "1mterlik") ── */
const KW = {
  shkaf: /shkaf|garderob|kiyim|penal|шкаф|шифонь|гардероб|пенал|wardrobe|closet|tall cabinet/,
  pastki: /pastki|ostki|stol ?osti|нижн|напольн|base cabinet|lower cabinet|base unit/,
  ustki: /ustki|osma|devorga|верхн|навесн|upper|wall cabinet|wall unit/,
  tumba: /tumba|komod|тумб|комод|drawer unit|chest of drawers|dresser/,
  erkin: /javon|stellaj|стеллаж|bookcase|shelving|shelf unit|ochiq polka/
};
const ICH = {
  polka: /(\d+)\s*(?:ta(?:dan)?\s*)?(?:teng\s+|равн[а-яё]*\s+|одинаков[а-яё]*\s+|equal\s+)?(?:polka|пол(?:к|ок)|shel)|(?:polka|пол(?:к|ок)[^\s\d:,.;]*|shel[^\s\d:,.;]*)\s*(\d+)/,
  tortma: /(\d+)\s*(?:ta\s*)?(?:tortma|yashik|ящик|выдвиж|drawer)|(?:tortma[^\s\d:,.;]*|ящик[^\s\d:,.;]*|drawer[^\s\d:,.;]*)\s*(\d+)/,
  eshik: /(\d+)\s*(?:ta\s*)?(?:eshik(?!siz)|дверц|двер|створ|door)|(?:eshik(?!siz)[^\s\d:,.;]*|двер[^\s\d:,.;]*|door[^\s\d:,.;]*)\s*(\d+)/,   // "eshiksiz 3 tortma" — 3 eshik emas
  shtanga: /shtang|vishil|veshil|ilgich|(?<![a-z'])ilish|iladigan|iluvchi|osiladigan|veshal|штанг|вешал|плечик|(?<![a-z])rod(?![a-z])|hanging|rail/,
  eshiksiz: /eshiksiz|ochiq\b|без двер|открыт|no doors?|open\b/
};
const XONA = /\bxona|комнат|\broom\b|reja|планировк|\bl ?shakl|burchakli oshxona|г-образ|п-образ|u-shape|l-shape|orol|остров|island|xolodilnik|холодильник|fridge|plita|плит|stove|moyka|мойк|sink|\d+\s*ta\s*(?:pastki|ustki|shkaf|modul)|\d+\s*(?:нижн|верхн|шкаф)[^\s\d:,.;]*\s+и\s+\d+/;

/** matn bitta modul konstruksiyasimi (true) yoki xona/oshxona (false) */
export function konstruksiyami(matn) {
  const s = String(matn || '').toLowerCase();
  if (!s.trim()) return false;
  if (XONA.test(s)) return false;
  if (oshxonami(s)) return false;                           // egasi #166: "kuxnya 4500 mm, 1 etaj …" — oshxona (oshxonaTili.js)
  if (/(oshxona|кухн|kitchen)/.test(s) && /\d(?:[.,]\d)?\s*[x×х*]\s*\d(?:[.,]\d)?\s*(?:m|м)\b/.test(s)) return false;
  return Object.values(KW).some(re => re.test(s)) || /polka|tortma|shtanga|bo'lim|полк|ящик|штанг|секци|shel|drawer|section/.test(s);
}

/* o'lcham birligi: mm oldin ("1200mm" — metr emas), metr — og'zaki xatolar bilan ("metr", "mtr", "1mterlik") */
const BIRLIK = "(mm|мм|sm|см|cm|m(?:e?t[a-z']*)?(?![a-z'])|м(?:етр[а-яё]*|тр)?(?![а-яё]))";   // "moyka"/"мойка" birlik emas (600 moyka — 600 mm)
/** matndagi o'lcham: "1.2 m", "120 sm", "1200 mm", "1200" → mm */
function mm(v, birlik) {
  const x = +String(v).replace(',', '.');
  if (!isFinite(x)) return 0;
  const b = birlik || '';
  if (/^(mm|мм)/.test(b)) return Math.round(x);
  if (/^(sm|см|cm)/.test(b)) return Math.round(x * 10);
  if (/^(m|м)/.test(b)) return Math.round(x * 1000);
  return x < 10 ? Math.round(x * 1000) : Math.round(x);
}
const sonOl = (re, s) => { const m = re.exec(s); return m ? +(m[1] || m[2]) : null; };

/* so'z bilan aytilgan son → raqam ("ikki eshikli", "bittadan", "две двери", "six shelves") */
const SONLAR = [
  [1, "bir|bitta|bittadan|один|одна|одно|одну|одной|одним|one"], [2, "ikki|ikkita|ikkitadan|два|две|двух|two|double"], [3, "uch|uchta|три|трёх|трех|three"],
  [4, "to'rt|tort|to'rtta|tortta|четыре|four"], [5, "besh|beshta|пять|five"], [6, "olti|oltita|шесть|six"], [7, "yetti|yettita|семь|seven"],
  [8, "sakkiz|sakkizta|восемь|eight"], [9, "to'qqiz|toqqiz|девять|nine"], [10, "o'n|o'nta|десять|ten"]
].map(([n, s]) => [new RegExp("(?<![a-zа-яё'])(?:" + s + ")(?![a-zа-яё'])", 'g'), String(n)]);
function tayyorla(matn) {
  let s = String(matn || '').toLowerCase().replace(/[ʻʼ’‘`´]/g, "'").replace(/(\d),(\d)/g, '$1.$2');
  for (const [re, n] of SONLAR) s = s.replace(re, n + ' ');
  /* o'lcham ko'paytmasi: "1200х600" (kirill х ham) — faqat sonlar orasida */
  s = s.replace(/(\d)\s*(mm|мм|sm|см|cm|m|м)?\s*[×хx*]\s*(?=\d)/g, '$1$2x');
  return s.replace(/[ \t]+/g, ' ');
}

/* material: "korpusi va ichki qism materiali: kashemir, 16mm", "fasad dub zolotoy 16mm", "материал корпуса — кашемир 16 мм" */
const MAT_SOZ = "(materi?al[a-z']*|матери?ал[а-яё]*)";
const NOM = "([^\\d,;:.\\n]+)", QAL = "(?:\\s*[,;]?\\s*(\\d{1,2}(?:\\.\\d)?)\\s*(?:mm|мм))?";
const MAT_RE = {
  korpus: new RegExp("(?:korpus[a-z']*|корпус[а-яё]*|carcass|body)((?:\\s+(?:va|hamda|и|and)\\s+(?:ichki(?:\\s+qism[a-z']*)?|polka[a-z']*|внутрен[а-яё]*(?:\\s+част[а-яё]*)?|полк[а-яё]*|interior|inside|shel[a-z]*))?)\\s*" + MAT_SOZ + "?\\s*[:=—–-]?\\s*" + NOM + QAL, 'g'),
  korpus2: new RegExp(MAT_SOZ + "\\s+(?:korpus[a-z']*|корпус[а-яё]*|carcass|body)\\s*[:=—–-]?\\s*" + NOM + QAL, 'g'),
  polka: new RegExp("(?:polka[a-z']*|полок|полк[а-яё]*|shel[a-z]*)\\s*" + MAT_SOZ + "\\s*[:=—–-]?\\s*" + NOM + QAL, 'g'),
  fasad: new RegExp("(?:fasad[a-z']*|фасад[а-яё]*|front[a-z]*)\\s*" + MAT_SOZ + "?\\s*[:=—–-]?\\s*" + NOM + QAL, 'g'),
  umumiy: new RegExp("(?<![a-zа-яё])" + MAT_SOZ + "\\s*[:=—–-]?\\s*" + NOM + QAL, 'g')
};
const NOM_EMAS = /korpus|корпус|fasad|фасад|polka|полк|eshik|двер|ruchk|ручк|brikma|birikma|bakavin|боковин|konfirmat|конфирмат|sokol|цокол/;
function nomTozala(x) {
  const n = String(x || '').replace(/^\s*(?:из|from|of|dan)\s+/, '').replace(/\s+(?:bo'?ladi|bo'?lsin|bo'?lad|qilinadi|будет|is)\s*$/, '').trim();
  return n.replace(/[^a-zа-яё' -]/g, '').trim().length >= 3 && !NOM_EMAS.test(n) ? n.slice(0, 60) : '';
}
function materialOl(s) {
  const bosh = () => ({ nom: '', qalinlik: 0 });
  const M = { korpus: bosh(), polka: bosh(), fasad: bosh() };
  const top = (re, fn) => { re.lastIndex = 0; let m; while ((m = re.exec(s))) if (fn(m)) return; };
  top(MAT_RE.korpus, (m) => {
    const nom = nomTozala(m[3]); if (!nom || !(m[2] || m[4])) return false;
    M.korpus = { nom, qalinlik: m[4] ? Math.round(+m[4]) : 0 };
    if (m[1] && m[1].trim()) M.polka = Object.assign({}, M.korpus);      // "korpus va ichki qism" — polka ham
    return true;
  });
  if (!M.korpus.nom) top(MAT_RE.korpus2, (m) => { const nom = nomTozala(m[2]); if (!nom) return false; M.korpus = { nom, qalinlik: m[3] ? Math.round(+m[3]) : 0 }; return true; });
  top(MAT_RE.polka, (m) => { const nom = nomTozala(m[2]); if (!nom) return false; M.polka = { nom, qalinlik: m[3] ? Math.round(+m[3]) : 0 }; return true; });
  top(MAT_RE.fasad, (m) => { const nom = nomTozala(m[2]); if (!nom || !(m[1] || m[3])) return false; M.fasad = { nom, qalinlik: m[3] ? Math.round(+m[3]) : 0 }; return true; });
  if (!M.korpus.nom) top(MAT_RE.umumiy, (m) => {
    if (/(korpus|корпус|fasad|фасад|polka|полк|shel|front)[^,;]{0,25}$/.test(s.slice(Math.max(0, m.index - 30), m.index))) return false;
    const nom = nomTozala(m[2]); if (!nom) return false; M.korpus = { nom, qalinlik: m[3] ? Math.round(+m[3]) : 0 }; return true;
  });
  return M;
}

/* furnitura, orqa devor, eksport */
function furnituraOl(s) {
  const f = { birikma: 'auto', polka: 'auto', ruchka: 0 };
  if (/konfirmat|конфирмат|confirmat|evrovint|евровинт|styajk|стяжк/.test(s)) f.birikma = 'konfirmat';
  else if (/ek?ss?entrik|эксцентрик|minifiks|минификс|eccentric|cam ?lock/.test(s)) f.birikma = 'ekssentrik';
  if (/derjat|держат|polkoderj|полкодерж|shelf ?(?:support|pin)|ushlagich/.test(s)) f.polka = 'polkaderjatel';
  const R = "(?:ruchk[a-z']*|ручк[а-яё]*|handle[a-z]*|tutqich[a-z']*)";
  const a = new RegExp("(\\d+(?:\\.\\d+)?)\\s*" + BIRLIK + "?[a-zа-яё']*\\s+(?:uzun[a-z']*\\s+|long\\s+|длинн[а-яё]*\\s+)?" + R).exec(s)
    || new RegExp(R + "\\s*(?:uzunligi|uzun|длин[а-яё]*|length|long)?\\s*[:=—–-]?\\s*(\\d+(?:\\.\\d+)?)\\s*" + BIRLIK).exec(s);
  if (a) { const v = mm(a[1], a[2]); if (v >= 96) f.ruchka = v; }
  return f;
}

/* bo'lim bo'laklari: "chapda …, o'rtada …, o'ngda …" (apostrofsiz "ong" ham) */
const JOY = [
  ['chap', /(?<![a-z'])chap(?:da|ida|ga|dan|idan|dagi|i)?(?![a-z'])|слева|(?<![а-яё])лев(?:ая|ой|ую|ом|ее)(?![а-яё])|(?<![a-z])left(?![a-z])/],
  ['orta', /(?<![a-z'])o'?rta(?:da|sida|dagi|si)?(?![a-z'])|посередин[^\s\d:,.;]*|в центре|(?<![a-z])(?:middle|center)(?![a-z])/],
  ['ong', /(?<![a-z'])o'?ng(?:da|ida|ga|dan|idan|dagi|i)?(?![a-z'])|справа|(?<![а-яё])прав(?:ая|ой|ую|ом|ее)(?![а-яё])|(?<![a-z])right(?![a-z])/]
];
/* bo'lim bo'lagining davomi (vergul ortidan ham shu bo'limga: "…joy, tepa va pastida polka") va umumiy gap belgilari */
const DAVOM = /polk|полк|shel|tortma|yashik|ящик|drawer|shtang|vishil|veshil|ilgich|iladi|штанг|вешал|rail|(?<![a-z])rod|hanging|tepa|ust|yuqori|past|ost|сверх|снизу|наверх|внизу|над|под|above|below|top|bottom/;
const UMUMIY_GAP = /korpus|корпус|fasad|фасад|ruchk|ручк|handle|eshik|двер|створ|door|sokol|sokil|цокол|plinth|materi?al|матер|obj|обж|konfirmat|конфирмат|ek?ss?entrik|эксцентрик|derjat|держат|birikma|brikma|bakavin|bokovin|боковин|orqa|задн|(?<![a-z'])eni(?:ga|si)?(?![a-z])|balandl|chuqur|ширин|высот|глубин|width|height|depth/;
const UST = /(?<![a-z'])(?:tepa|ust|yuqori)[a-z']*|сверху|наверху|(?<![а-яё])над(?![а-яё])|above|(?<![a-z])top(?![a-z])/;
const OST = /(?<![a-z'])(?:past|ost)[a-z']*|снизу|внизу|(?<![а-яё])под(?![а-яё])|below|bottom/;
const BOLIM_ENI = new RegExp("(?<![a-z'])(?:eni(?:ga|si)?|kengli[gk]i?|ширин[а-яё]*|width|wide)\\s*[:=—–-]?\\s*(\\d+(?:\\.\\d+)?)\\s*" + BIRLIK + "?");

/** AI'siz tahlilchi: matn → xom konstruksiya tili (keyin specTekshir) */
export function matndanSpec(matn) {
  const s = tayyorla(matn);
  const r = { tur: 'shkaf', nom: '', eni: 0, chuqurligi: 0, boyi: 0, tag: 'auto', qopqoq: 'auto', bolimlar: [], tushunilmadi: [],
    orqa: 'auto', material: materialOl(s), furnitura: furnituraOl(s), eksport: '' };
  for (const t of ['tumba', 'ustki', 'pastki', 'erkin', 'shkaf']) if (KW[t].test(s)) { r.tur = t; break; }

  /* bo'limlar: "chapda …, o'rtada …, o'ngda …" yoki "N bo'lim" */
  const qism = [], umumiy = [];
  const re = new RegExp(JOY.map(j => '(?:' + j[1].source + ')').join('|'), 'g');
  let m, oldingi = null, bosh = 0;
  /* joy bo'lagi — birinchi vergulgacha va keyingi bo'laklar, toki ular shu bo'lim tarkibi (polka, shtanga, tepa/past …) ekan;
     umumiy gap (korpus, fasad, eshik, ruchka, o'lcham …) — butun modulga ("…, o'ngda 4 polka, 2 eshik") */
  const bolak = (joy, t) => {
    const f = t.split(/[,;](?!\d)|\.(?!\d)/);
    let i = 1;
    while (i < f.length && (!f[i].trim() || (DAVOM.test(f[i]) && !UMUMIY_GAP.test(f[i])))) i++;
    qism.push({ joy, s: f.slice(0, i).join(', ') });
    if (i < f.length) umumiy.push(f.slice(i).join(', '));
  };
  while ((m = re.exec(s))) {
    const j = JOY.find(x => new RegExp('^(?:' + x[1].source + ')').test(m[0]))[0];
    if (oldingi) bolak(oldingi, s.slice(bosh, m.index)); else umumiy.push(s.slice(0, m.index));
    oldingi = j; bosh = m.index + m[0].length;
  }
  if (oldingi) bolak(oldingi, s.slice(bosh)); else umumiy.push(s);
  const U = umumiy.join(' , ');

  /* o'lcham (umumiy gapdan — bo'limning "kengligi 1000" i modul eni emas): "1200x600x2200" (eni x chuqurligi x bo'yi) yoki "1200x2200" */
  const u = new RegExp("(\\d+(?:\\.\\d+)?)\\s*" + BIRLIK + "?\\s*x\\s*(\\d+(?:\\.\\d+)?)\\s*" + BIRLIK + "?(?:\\s*x\\s*(\\d+(?:\\.\\d+)?)\\s*" + BIRLIK + "?)?").exec(U);
  if (u) {
    if (u[5]) { r.eni = mm(u[1], u[2] || u[6]); r.chuqurligi = mm(u[3], u[4] || u[6]); r.boyi = mm(u[5], u[6]); }
    else { r.eni = mm(u[1], u[2] || u[4]); r.boyi = mm(u[3], u[4]); }
  }
  const KAL = [['eni', "(?:eni(?:ga|si|ni)?|kengli[gk]i?|ширин[^\\s\\d:,.;]*|width|wide)"],
    ['chuqurligi', "(?:chuqur[^\\s\\d:,.;]*|глубин[^\\s\\d:,.;]*|depth|deep)"],
    ['boyi', "(?:bo'?y[iu]?|buyi|baland[^\\s\\d:,.;]*|баланд|высот[^\\s\\d:,.;]*|height|tall|high)"]];
  for (const [k, w] of KAL) { const x = new RegExp("(?<![a-z'])" + w + "\\s*[:=—–-]?\\s*(\\d+(?:\\.\\d+)?)\\s*" + BIRLIK + "?").exec(U); if (x) r[k] = mm(x[1], x[2]); }
  /* inglizcha tartib: "1500 wide", "2200 high", "600 deep" */
  for (const [k, re2] of [['eni', /(\d+(?:\.\d+)?)\s*(mm|cm|m)?\s*(?:wide|width)/], ['boyi', /(\d+(?:\.\d+)?)\s*(mm|cm|m)?\s*(?:high|tall|height)/], ['chuqurligi', /(\d+(?:\.\d+)?)\s*(mm|cm|m)?\s*(?:deep|depth)/]]) {
    const x = re2.exec(U); if (x) r[k] = mm(x[1], x[2]);
  }
  if (!r.eni) {                                             // "shkaf 1200" — turdan keyingi yolg'iz son — eni
    const x = new RegExp("(?:shkaf|garderob|tumba|komod|javon|stellaj|modul|шкаф|тумб[^\\s\\d:,.;]*|комод|стеллаж|wardrobe|cabinet|bookcase)[^\\s\\d:,.;]*\\s+(\\d+(?:\\.\\d+)?)\\s*" + BIRLIK + "?(?!\\d|\\s*(?:ta\\b|x|polka|tortma|eshik|bo'lim|bolim|qism|пол|ящик|двер|секци|shel|drawer|door|section))").exec(U);
    if (x && (x[2] || +x[1] >= 100)) r.eni = mm(x[1], x[2]);   // birliksiz kichik son (2, 3) — o'lcham emas
  }
  if (/sokol|sokil|sokl|цокол|plinth/.test(s)) r.tag = 'sokol';
  else if (/oyoq|ножк|legs/.test(s)) r.tag = 'oyoq';
  if (/(?:bakavin|bokovin|боковин|orqa|задн|back|hdf|хдф)[^,;.]{0,40}?(?:yergacha|ergacha|polgacha|pol ?gacha|до пола|до земли|to the floor|floor)/.test(s)) r.orqa = 'yergacha';
  if (/(?<![a-z])obj(?![a-z])|обж/.test(s)) r.eksport = 'obj';

  const tarkibOl = (t) => {
    const x = { polka: sonOl(ICH.polka, t) || (/(polka|пол(?:к|ок)|shel)/.test(t) ? 1 : 0), tortma: sonOl(ICH.tortma, t) || 0, shtanga: ICH.shtanga.test(t), eshik: -1, petlya: 'auto', qatlamlar: [] };
    const e = sonOl(ICH.eshik, t);
    /* "600 eshikli" — 600 eshik soni emas (o'lcham): 20 dan katta son — eshik soni aytilmagan */
    if (e != null && e <= 20) x.eshik = e; else if (e == null && ICH.eshiksiz.test(t)) x.eshik = 0;
    if (/(?:tortma|ящик|drawer)[^\s\d:,.;]*\s+(?:pastda|снизу|bottom)|(?:pastda|снизу|bottom)\D{0,12}(?:tortma|ящик|drawer)/.test(t) && x.tortma && (x.polka || x.shtanga)) {
      x.qatlamlar = [{ tortma: x.tortma }, { polka: x.polka, shtanga: x.shtanga }]; x.tortma = 0; x.polka = 0; x.shtanga = false;
    }
    return x;
  };
  /* bo'lim: eni ("kengligi 1000") va kiyim joyi ("1 metr kiyim iladigan joy, tepa va pastida polka" — joy bo'yi 1000,
     ustida va ostida polka; "1 metr" eni deb aytilmasa — kiyim joyining bo'yi) */
  const bolimOl = (t) => {
    const x = tarkibOl(t);
    const e = BOLIM_ENI.exec(t);
    if (e) x.eni = mm(e[1], e[2]);
    if (x.shtanga && !x.tortma && !x.qatlamlar.length && /polk|полк|shel/.test(t)) {
      const ust = UST.test(t), ost = OST.test(t);
      if (ust || ost) {
        const h = new RegExp("(\\d+(?:\\.\\d+)?)\\s*" + BIRLIK).exec(e ? t.replace(e[0], ' ') : t);
        x.qatlamlar = [ost ? { boyi: 0 } : null, { boyi: h ? mm(h[1], h[2]) : 0, shtanga: true }, ust ? { boyi: 0 } : null].filter(Boolean);
        x.ajrat = 'polka'; x.polka = 0; x.shtanga = false;
      }
    }
    return x;
  };
  const tartib = { chap: 0, orta: 1, ong: 2 };
  if (qism.length) {
    qism.sort((a, b) => tartib[a.joy] - tartib[b.joy]);
    r.bolimlar = qism.map(q => Object.assign({ eni: 0 }, bolimOl(q.s)));
  } else {
    const k = sonOl(/(\d+)\s*(?:ta\s*)?(?:bo'lim|bolim|qism|секци|отдел|section|compartment)/, s);
    const t = tarkibOl(U);
    r.bolimlar = Array.from({ length: Math.max(1, Math.min(6, k || 1)) }, () => JSON.parse(JSON.stringify(t)));
  }
  /* umumiy eshik soni ("2 eshik", "ikki eshikli") — bo'limlarga taqsimlanadi */
  let E = sonOl(ICH.eshik, U);
  const eshiksiz = ICH.eshiksiz.test(U);
  /* katalog tanlovi uchun (katalogTanlash.js): eshikJami — matndagi umumiy eshik soni (bo'limlarga taqsimlashda 2 tadan
     cheklanadi — "3 eshik" yo'qolmasin); eshikBor — "eshikli" (soni aytilmagan). "pastki shkaf 600 eshikli" — 600 eni */
  if (E != null && E > 20) { if (!r.eni && E >= 100) r.eni = mm(E); E = null; r.eshikBor = true; }
  else if (E == null && !eshiksiz && /eshikli|eshigi bor|с дверц|с двер|with doors?/.test(U)) r.eshikBor = true;
  if (E != null) r.eshikJami = E;
  if (E != null || eshiksiz) {
    const n = r.bolimlar.length, e = eshiksiz ? 0 : E;
    r.bolimlar.forEach((b, i) => {
      if (b.eshik !== -1 && qism.length) return;           // bo'limda o'zi aytilgan
      b.eshik = e === 0 ? 0 : e >= 2 * n ? 2 : e >= n ? (i < e - n ? 2 : 1) : (i < e ? 1 : 0);
    });
  }
  if (!r.bolimlar.length) r.bolimlar = [tarkibOl(s)];
  /* hech narsa tushunilmasa — standart tarkib (specTekshir) */
  if (r.bolimlar.length === 1 && !r.bolimlar[0].polka && !r.bolimlar[0].tortma && !r.bolimlar[0].shtanga && r.bolimlar[0].eshik === -1 && !qism.length) r.bolimlar = [];
  return r;
}

/* ── ERP plitasi nomi bo'yicha (AI va tahlilchi dekor nomini matndagidek beradi: "kashemir", "dubzalatoy", "дуб золотой") ──
 * Lotin/kirill va og'zaki imlo ("zalatoy" — "золотой", qo'shib yozilgan "dubzalatoy") — tovush skeleti bo'yicha; topilmasa — null
 * (o'ylab topilmaydi, chaqiruvchi "ro'yxatda yo'q" deydi). Tartib: qalinlik → ortiqcha dekor so'zi kam → tur (LDSP oldin) → narxi bor. */
const LAT = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 's', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya' };
const skelet = (w) => String(w).toLowerCase().replace(/[а-яё]/g, c => LAT[c] ?? c).replace(/([og])'/g, '$1').replace(/[^a-z]/g, '')
  .replace(/kh|(?<![scz])h/g, 'x').replace(/c(?!h)/g, 'k').replace(/q/g, 'k').replace(/w/g, 'v').replace(/o/g, 'a').replace(/[ey]/g, 'i').replace(/(.)\1+/g, '$1');
function lev(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) { let prev = row[0]; row[0] = i; for (let j = 1; j <= b.length; j++) { const t = row[j]; row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; } }
  return row[b.length];
}
function mos(q, w) {
  if (!q || !w) return false;
  if (q === w) return true;
  const n = Math.min(q.length, w.length);
  let p = 0; while (p < n && q[p] === w[p]) p++;
  if (Math.abs(q.length - w.length) <= 3 && ((n >= 3 && p === n) || (n >= 6 && p >= n - 2))) return true;   // qo'shimcha: "кашемира", "золотого"
  const L = Math.max(q.length, w.length);
  return L >= 6 && lev(q, w) <= Math.floor(L / 6);
}
const PLITA_TUR = { korpus: ['LDSP', 'LMDF', 'MDF'], polka: ['LDSP', 'LMDF', 'MDF'], fasad: ['LDSP', 'LMDF', 'MDF', 'AKRIL'] };
/** sheets — sheet-catalog.json sheets; nom — dekor nomi; qalinlik — mm (0 — aytilmagan, 16 afzal); qism — korpus|polka|fasad */
export function plitaTop(sheets, nom, qalinlik, qism = 'korpus') {
  const qs = String(nom || '').split(/[^a-zа-яё'0-9]+/i).map(skelet).filter(w => w.length >= 2);
  if (!qs.length || !Array.isArray(sheets)) return null;
  const qj = qs.join(''), turlar = PLITA_TUR[qism] || PLITA_TUR.korpus, th0 = +qalinlik || 0;
  let eng = null;
  sheets.forEach((sh, idx) => {
    const tr = turlar.indexOf(sh.type), th = +sh.th || 0;
    if (tr < 0 || th < 15 || th > 26 || (th0 && Math.abs(th - th0) > 0.6)) return;
    const ws = String(sh.name || '').split(/[^a-zа-яё']+/i).filter(Boolean).map(skelet).filter(Boolean);
    let topdi = 0;
    for (let i = 0; i < ws.length && !topdi; i++) {
      if (qs.every((q, k) => mos(q, ws[i + k]))) topdi = qs.length;                  // so'zma-so'z
      for (let j = i + 1; j <= Math.min(ws.length, i + 4) && !topdi; j++) if (mos(qj, ws.slice(i, j).join(''))) topdi = j - i;   // qo'shib yozilgan
    }
    if (!topdi) return;
    const ortiqcha = ws.filter(w => w.length >= 3).length - topdi;
    const k = [Math.abs(th - (th0 || 16)), ortiqcha, tr, sh.uzs > 0 ? 0 : 1, idx];
    const i0 = eng ? k.findIndex((v, i) => v !== eng.k[i]) : -1;
    if (!eng || (i0 >= 0 && k[i0] < eng.k[i0])) eng = { sh, k };                        // leksikografik: birinchi farq kichigi
  });
  return eng ? eng.sh : null;
}
