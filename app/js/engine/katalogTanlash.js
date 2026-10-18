/* Smart3D engine/katalogTanlash.js — egasi #168: "AI o'zi emas, bizda bor modullar asosida chizsin; yo'q joydan chizmasin".
 *
 * Bitta mebel matni (konstruksiya tili spec'i) → katalogdagi eng mos tayyor modul (fragments.json, fragments-mc.json).
 *   katalogdanTop(spec, soralgan, catalog, matn) → { topildi, frg, nom, olcham: {w,d,h}, mos: [...], mosEmas: [...], yetishmaydi: [...], nomzodlar }
 *   spec      — specTekshir natijasi (tur, bo'limlar: eshik, polka, tortma, shtanga)
 *   soralgan  — xom spec (matndanSpec / AI): eni/chuqurligi/boyi 0 — aytilmagan (modul o'z o'lchamida qoladi)
 * O'lcham — modulning min/max chegarasida (chegarasi yozilmagan o'lcham — ilova kabi erkin); chegaradan tashqarisi — eng yaqin
 * ruxsat etilgan qiymat va "mos emas" qatori. Polka, eshik, tortma soni katalog modulida o'zgarmaydi — farqi "mos emas" qatorida.
 * Topilmaydi (yetishmaydi bilan): shu turdagi modul yo'q; so'ralgan tortma, eshik yoki shtanga modulda yo'q; tortma soni 1 tadan
 * ko'p farq qiladi; o'lcham chegaradan 20% dan ko'p chiqadi. Hech narsa o'ylab topilmaydi va yangi (CH-…) modul yaratilmaydi — chizish faqat foydalanuvchi o'zi bossa. */

/** tur → katalog guruhi */
const TUR_GURUH = {
  shkaf: (f) => f.category === 'wardrobe' && f.group === 'garderob',
  pastki: (f) => f.group === 'kuxnya-pastki' && f.category !== 'filler',
  ustki: (f) => f.group === 'kuxnya-ustki' && f.category !== 'filler',
  tumba: (f) => f.category === 'drawer_base' || f.category === 'mobile_pedestal' || f.group === 'komod',
  erkin: (f) => f.category === 'shelf'
};

/* maxsus modullar — faqat matnda so'ralsa (egasi #183: "pastki shkaf 600 eshikli" — moyka moduli emas). re — modul nomi, soz — matn */
const MAXSUS = [
  { re: /moyka|мойк|sink/i, soz: /moyk|rakovin|chanoq|мойк|раковин|sink/ },
  { re: /gluxoy|burchak|углов|corner/i, soz: /burchak|gluxoy|углов|угол|corner/ },
  { re: /duxov/i, soz: /duxov|духов|oven/ },
  { re: /vityach|vityajk|vytyajk|вытяж/i, soz: /vit[iy]+a?ch|vit[iy]?yaj|vytyaj|вытяж|hood/ },
  { re: /kargo|cargo/i, soz: /kargo|карго|cargo|butilk|бутыл/ },
  { re: /sushilk|quritgich/i, soz: /sushilk|сушилк|quritgich|idish/ },
  { re: /aventos|ko'tarilma/i, soz: /aventos|ko'taril|подъ[её]мн|lift/ },
  { re: /poyabzal/i, soz: /poyabzal|oyoq kiyim|обув|shoe/ },
  { re: /tandir/i, soz: /tandir/ },
  { re: /^tall|pufog/i, soz: /tall|baland|пенал|penal|kolonna|pufog/ }
];
export const maxsusmi = (f, matn) => MAXSUS.some(m => m.re.test(String(f.name || '')) && !m.soz.test(String(matn || '').toLowerCase()));

const son = (q) => (typeof q === 'number' ? q : /^\s*\d+\s*$/.test(String(q)) ? +q : 1);
const yig = (parts, re) => (parts || []).filter(p => re.test(p.code || '')).reduce((a, p) => a + son(p.qty), 0);

/** katalog modulining ichki belgilari (detal va furnitura ro'yxatidan) */
export function modulBelgilari(f) {
  const parts = f.parts || [], hw = (f.hardware || []).map(h => (h.code || '') + ' ' + (h.name || '')).join(' | ');
  return {
    eshik: yig(parts, /^(eshik\d*|dver(?:_\d+)?|kupe_eshik|ko'zgu_eshik|past_eshik|tepa_eshik|fasad|door\d*|konstruktsiya_panelnix_dverey(?:_\d+)?)$/i),
    tortma: Math.max(yig(parts, /^(tortma_tub|dno_yashika(?:_\d+)?)$/i), yig(parts, /^(tortma_fasad|fasad_yashika(?:_\d+)?)$/i)),
    polka: yig(parts, /^(polka(?:_\d+)?|shift\d*)$/i),
    shtanga: /shtang|штанг|truba|труба|veshal/i.test(hw) || parts.some(p => /shtang|truba/i.test(p.code || '')),
    kupe: parts.some(p => /kupe/i.test(p.code || '')) || /KUPE|купе/i.test(hw)
  };
}

/** spec'dagi so'ralgan ichki tarkib (aytilmagan eshik: -1 → null). xom — matndanSpec: eshikJami (umumiy son — bo'limlarga
 *  taqsimlashda 2 tadan cheklanadi, "3 eshik" yo'qolmasin), eshikBor ("eshikli", soni aytilmagan) */
function soralganTarkib(spec, xom = {}) {
  let eshik = 0, eshikAytildi = false, tortma = 0, polka = 0, shtanga = false;
  const qosh = (x) => {
    if (x.eshik > 0) { eshik += x.eshik; eshikAytildi = true; } else if (x.eshik === 0) eshikAytildi = true;
    tortma += x.tortma || 0; polka += x.polka || 0; shtanga = shtanga || !!x.shtanga;
  };
  for (const b of spec.bolimlar || []) { qosh(b); for (const q of b.qatlamlar || []) qosh(q); }
  if (xom.eshikJami > 0 && xom.eshikJami <= 20) { eshik = xom.eshikJami; eshikAytildi = true; }   // umumiy gapdagi son (bo'lim ichidagisi emas)
  else if (xom.eshikBor) eshikAytildi = false;                                                     // "eshikli" — soni modulniki
  return { eshik: eshikAytildi ? eshik : null, eshikBor: !!xom.eshikBor, tortma, polka, shtanga };
}

const OLCH = [['w', 'eni'], ['d', 'chuqurligi'], ['h', 'boyi']];

/**
 * @param {object} spec — toza spec (specTekshir)
 * @param {object} soralgan — xom spec (0 — aytilmagan)
 * @param {object} catalog — sex standarti qo'llangan katalog
 * @param {string} [matn]
 */
export function katalogdanTop(spec, soralgan, catalog, matn = '') {
  const guruh = TUR_GURUH[spec.tur];
  const nomzod = Object.values(catalog || {}).filter(f => f && guruh && guruh(f) && !f.chizma && !Array.isArray(f.bazis3d) && f.production !== 'none' && !/^CH-/.test(f.code)
    && !maxsusmi(f, matn));
  if (!nomzod.length) return { topildi: false, yetishmaydi: [{ k: 'tur', tur: spec.tur }], nomzodlar: 0 };
  const sor = soralgan || {};
  const ich = soralganTarkib(spec, sor);
  const kupeSoralgan = /kupe|купе|sliding|surma/i.test(String(matn));
  let eng = null;
  for (const f of nomzod) {
    const b = modulBelgilari(f), mos = [], mosEmas = [], yetishmaydi = [], olcham = {};
    let ball = 0;
    if (MAXSUS.some(m => m.re.test(String(f.name || '')) && m.soz.test(String(matn).toLowerCase()))) ball -= 25;   // so'ralgan maxsus modul (moyka …) afzal
    for (const [o, k] of OLCH) {
      const v = +sor[k] || 0, min = +f['min_' + o] || 0, max = +f['max_' + o] || 0;
      if (!v) { olcham[o] = +f[o]; continue; }
      const w = Math.max(min || v, Math.min(max || v, v));
      olcham[o] = w;
      const qator = { k, soraldi: v, min: min || null, max: max || null, natija: w };
      /* chegarasi yozilmagan o'lcham — erkin, lekin asl o'lchamidan uzoqlashgani jarima (chegarasi bor mos modul afzal) va kartada asl o'lcham */
      if (!min && !max && Math.abs(v - +f[o]) > 0.5) { qator.asl = +f[o]; ball += Math.abs(v - +f[o]) / 25; }
      if (w === v) { mos.push(qator); ball += Math.abs(w - +f[o]) / 1000; }   // teng ball: o'z o'lchami so'ralganga yaqin modul (chegarasi bor modullar orasida ham)
      else { mosEmas.push(qator); ball += Math.abs(w - v) / 10; if (Math.abs(w - v) > 0.2 * v) yetishmaydi.push(qator); }
    }
    for (const k of ['eshik', 'tortma', 'polka']) {
      const v = ich[k];
      if (v == null || (k !== 'eshik' && !v && (k === 'polka' || !b[k]))) continue;   // polka aytilmagan (0) — tanlovga ta'sir qilmaydi
      const qator = { k, soraldi: v, modulda: b[k] };
      if (v === b[k]) mos.push(qator);
      else {
        mosEmas.push(qator); ball += Math.abs(v - b[k]) * (k === 'polka' ? 3 : k === 'eshik' ? 30 : 40);
        /* hal qiluvchi farq: tortma so'raldi — modulda yo'q yoki soni 1 tadan ko'p farq qiladi; eshik so'raldi — modulda yo'q */
        if ((k === 'tortma' && v > 0 && (!b.tortma || Math.abs(v - b.tortma) > 1)) || (k === 'eshik' && v > 0 && !b.eshik)) yetishmaydi.push(qator);
      }
    }
    if (ich.eshikBor && ich.eshik == null) { const qator = { k: 'eshik', soraldi: '≥1', modulda: b.eshik }; if (b.eshik > 0) mos.push(Object.assign(qator, { soraldi: b.eshik })); else { mosEmas.push(qator); yetishmaydi.push(qator); ball += 200; } }
    if (ich.shtanga) { const qator = { k: 'shtanga', soraldi: 1, modulda: b.shtanga ? 1 : 0 }; if (b.shtanga) mos.push(qator); else { mosEmas.push(qator); yetishmaydi.push(qator); ball += 200; } }
    if (b.kupe !== kupeSoralgan) { mosEmas.push({ k: 'kupe', soraldi: kupeSoralgan ? 1 : 0, modulda: b.kupe ? 1 : 0 }); ball += 20; }
    const natija = { topildi: !yetishmaydi.length, frg: f.code, nom: f.name, olcham, mos, mosEmas, yetishmaydi, ball, nomzodlar: nomzod.length };
    /* afzal: topilgani (yetishmaydisi yo'q), keyin ball kichigi; teng bo'lsa — kod tartibi (har safar bir xil natija) */
    if (!eng || (natija.topildi && !eng.topildi) || (natija.topildi === eng.topildi && (ball < eng.ball - 1e-9 || (Math.abs(ball - eng.ball) < 1e-9 && f.code < eng.frg)))) eng = natija;
  }
  return eng;
}

/* ══ egasi #209 (14): "130 ta tayyor moduldan AI barchasidan terib bersin" — bitta modul turi bo'yicha tanlash ══
 * Avval faqat shkaf/pastki/ustki/tumba/javon (konstruksiya tili) tanlanardi; stol, krovat, divan, stul, hammom, TV, dahliz, penal,
 * burchak, antresol, eshik, deraza, texnika … matnidan "tanilmadi" chiqardi. Endi har katalog moduliga tur beriladi (modulTuri) va
 * nom/tur/o'lcham bo'yicha tanlanadi (buyumdanTop). Katalogda yo'q tur — topilmadi (kartada "bajarilmadi"); modul o'ylab chizilmaydi. */

/** katalog moduli → buyum turi (null — AI bitta modul sifatida tanlamaydi) */
export function modulTuri(f) {
  if (!f) return null;
  const n = String(f.name || '').toLowerCase(), c = f.category, g = String(f.group || '');
  if (c === 'appliance') return 'texnika';
  if (c === 'bed') return g === 'komod' ? 'komod' : 'krovat';
  if (c === 'wardrobe') return /kupe|sliding/.test(n) ? 'kupe' : /poyabzal/.test(n) ? 'poyabzal' : 'garderob';
  if (c === 'coat_hanger') return 'ilgich';
  if (c === 'shelf') return g === 'tv' ? 'tv' : g === 'vitirina' ? 'vitrina' : 'javon';
  if (c === 'sofa') return 'divan';
  if (c === 'chair') return 'stul';
  if (c === 'desk') return /parta/i.test(n) || g === 'bolalar' ? 'parta' : 'stol';
  if (c === 'table') return 'stol';
  if (c === 'vanity') return 'rakovina';
  if (c === 'mirror_cabinet') return 'kozgu';
  if (c === 'bathroom') return 'hammom';
  if (c === 'door') return 'eshik';
  if (c === 'window') return 'deraza';
  if (c === 'countertop') return 'stoleshnitsa';
  if (c === 'filler') return 'dobor';
  if (c === 'mobile_pedestal') return 'tumba';
  if (g === 'kuxnya-antresol' || g === 'entresol') return 'antresol';
  if (g === 'peshxona') return 'peshxona';
  if (c === 'tall_cabinet' || g === 'kuxnya-kolonna' || g === 'kuxnya-muz' || /^tall\b/.test(n)) return 'penal';
  if (c === 'wall_corner' || g === 'kuxnya-burchak') return 'burchak';
  if (g === 'kuxnya-orol') return 'orol';
  if (g === 'kuxnya-deraza') return 'derazaosti';
  if (g === 'kuxnya-pec') return 'pech';
  if (c === 'drawer_base' || c === 'cargo_base') return 'tumba';
  if (g === 'kuxnya-pastki') return 'pastki';
  if (g === 'kuxnya-ustki' || c === 'wall_cabinet') return 'ustki';
  return null;
}
/** so'ralgan tur → qaysi modul turlaridan tanlanadi ("garderob" — kupe va poyabzal shkafi ham, "stol" — ish va ovqat stollari …) */
const TUR_KENG = {
  garderob: ['garderob', 'kupe', 'poyabzal'], kupe: ['kupe'], hammom: ['hammom', 'rakovina', 'kozgu'], rakovina: ['rakovina', 'hammom'], kozgu: ['kozgu', 'hammom'],
  divan: ['divan'], stul: ['stul'], kreslo: ['divan', 'stul'], stol: ['stol'], yozuv: ['stol'], krovat: ['krovat', 'komod'], trimo: ['komod'], tumba: ['tumba', 'komod'], komod: ['komod', 'tumba'],
  javon: ['javon', 'vitrina', 'tv'], pastki: ['pastki', 'tumba'], ustki: ['ustki', 'antresol']
};
const IKKILAMCHI = /boshka|toshqin|yon dobor|dobor|sokol|karniz|ichki javon/i;   // asosiy modul emas (qo'shimcha) — nomi so'ralmasa tanlanmaydi
const SOZ_TOZA = (s) => String(s || '').toLowerCase().replace(/[ʻʼ’‘`´']/g, '').replace(/[^a-zа-яё0-9]+/g, ' ').trim();
const tokenlar = (s) => SOZ_TOZA(s).split(' ').filter(w => w.length >= 3 && (!/^\d+$/.test(w) || /^0\d\d$/.test(w)) &&   // 001, 002 … — modul raqami ("shkaf 002")
   !['uchun', 'bilan', 'mc', 'sp', 'kishilik', 'kishi', 'ega'].includes(w));
const mosSoz = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && a.slice(0, 4) === b.slice(0, 4));

/** matndagi o'lchamlar: "1400x700x750", "2.2 m", "160 sm", "180", "1200 mm" → {eni, chuqurligi, boyi} (mm; 0 — aytilmagan).
 *  Soni bor so'zlar ("3 eshik", "4 polka", "2 tortma", "3 kishilik") o'lcham emas. */
export function olchamOl(matn) {
  const s = String(matn || '').toLowerCase().replace(/[ʻʼ’‘`´]/g, "'").replace(/(\d),(\d)/g, '$1.$2');
  /* birliksiz: 10 dan kichik — metr; ko'paytmada (AxBxC) qolgani — mm; yolg'iz son 250 gacha — sm ("krovat 160", "divan 200"), undan katta — mm */
  const mm = (v, b, kopaytma) => { const x = +v; if (/^(mm|мм)/.test(b || '')) return Math.round(x); if (/^(sm|см|cm)/.test(b || '')) return Math.round(x * 10); if (/^(m|м)/.test(b || '')) return Math.round(x * 1000); return x < 10 ? Math.round(x * 1000) : kopaytma || x > 250 ? Math.round(x) : Math.round(x * 10); };
  const U = "(mm|мм|sm|см|cm|m(?![a-z])|м(?![а-яё]))?";
  const k = new RegExp("(\\d+(?:\\.\\d+)?)\\s*" + U + "\\s*[x×х*]\\s*(\\d+(?:\\.\\d+)?)\\s*" + U + "(?:\\s*[x×х*]\\s*(\\d+(?:\\.\\d+)?)\\s*" + U + ")?").exec(s);
  if (k) {
    const u = k[2] || k[4] || k[6] || '';
    return { eni: mm(k[1], k[2] || u, 1), chuqurligi: mm(k[3], k[4] || u, 1), boyi: k[5] ? mm(k[5], k[6] || u, 1) : 0 };
  }
  const re = new RegExp("(?<![\\d.x×])(\\d+(?:\\.\\d+)?)\\s*" + U + "(?![\\d.])(?!\\s*(?:ta\\b|ta(?=[a-z])|kishi|eshik|polka|tortma|etaj|qavat|fasad|yash|qanot|tok|chexol|dver|ящик|полк|шт))", 'g');
  let m;
  while ((m = re.exec(s))) {
    if (m[2] === '' && /\bstandart|\b№/.test(s.slice(Math.max(0, m.index - 3), m.index))) continue;
    const v = mm(m[1], m[2]);
    if (v >= 100 && v <= 12000) return { eni: v, chuqurligi: 0, boyi: 0 };
  }
  return { eni: 0, chuqurligi: 0, boyi: 0 };
}

/** matndagi ichki tarkib soni: "2 fasad", "3 eshik", "2 tortma", "4 polka" (aytilmagan — null) */
function sonlarOl(matn) {
  const s = String(matn || '').toLowerCase().replace(/[ʻʼ’‘`´]/g, "'"), out = { eshik: null, tortma: null, polka: null };
  const re = { eshik: /(\d+)\s*(?:ta\s*)?(?:fasad|eshik|qanot|дверц|двер)/, tortma: /(\d+)\s*(?:ta\s*)?(?:tortma|yash|ящик)/, polka: /(\d+)\s*(?:ta\s*)?(?:polka|полк)/ };
  for (const k of Object.keys(re)) { const m = re[k].exec(s); if (m) out[k] = +m[1]; }
  return out;
}

/**
 * Bitta modul — tur bo'yicha: nom (so'zlar), o'lcham, ichki belgilar. Qaytaradi katalogdanTop bilan bir xil shakl.
 * @param {string|string[]} turlar — buyum turi(lari) (aiTur.buyum)
 * @param {string} matn
 * @param {object} catalog
 */
export function buyumdanTop(turlar, matn, catalog) {
  const ts = [].concat(turlar), ruxsat = new Set(ts.flatMap(t => TUR_KENG[t] || [t]));
  const nomzod = Object.values(catalog || {}).filter(f => f && ruxsat.has(modulTuri(f)) && !f.chizma && !Array.isArray(f.bazis3d) && !/^CH-/.test(f.code));
  if (!nomzod.length) return { topildi: false, yetishmaydi: [{ k: 'tur', tur: ts[0] }], nomzodlar: 0 };
  const q = tokenlar(matn), sor = olchamOl(matn);
  let eng = null;
  for (const f of nomzod) {
    const nomT = tokenlar(String(f.name || '').replace(/\(.*?\)/g, ' ')), qavsT = tokenlar((String(f.name || '').match(/\((.*?)\)/g) || []).join(' '));
    const moslar = nomT.filter(w => q.some(x => mosSoz(x, w))), qMos = qavsT.filter(w => q.some(x => mosSoz(x, w)));
    let ball = -3 * moslar.length - qMos.length + 0.4 * (nomT.length - moslar.length);
    if (ts.includes(modulTuri(f))) ball -= 2;                                                  // so'ralgan turning o'zi (alias emas) afzal
    if (IKKILAMCHI.test(f.name || '') && !moslar.some(w => IKKILAMCHI.test(w))) ball += 6;      // qo'shimcha modul: nomi aytilmasa — asosiy modul afzal
    const mos = [], mosEmas = [], yetishmaydi = [], olcham = {};
    for (const [o, k] of OLCH) {
      const v = +sor[k] || 0, min = +f['min_' + o] || 0, max = +f['max_' + o] || 0;
      if (!v) { olcham[o] = +f[o]; continue; }
      const w = Math.max(min || v, Math.min(max || v, v));
      olcham[o] = w;
      const qator = { k, soraldi: v, min: min || null, max: max || null, natija: w };
      if (!min && !max && Math.abs(v - +f[o]) > 0.5) { qator.asl = +f[o]; ball += Math.abs(v - +f[o]) / 25; }
      if (w === v) { mos.push(qator); ball += Math.abs(w - +f[o]) / 100; }   // chegarada bo'lsa ham: o'z o'lchami so'ralganga yaqin modul afzal
      else { mosEmas.push(qator); ball += Math.abs(w - v) / 10; if (Math.abs(w - v) > 0.2 * v) yetishmaydi.push(qator); }
    }
    /* ichki tarkib (eshik/fasad, tortma, polka soni) — matnda aytilgan bo'lsa (modulBelgilari, katalogdanTop bilan bir xil qoida) */
    const bel = modulBelgilari(f), ich = sonlarOl(matn);
    for (const k of ['eshik', 'tortma', 'polka']) {
      if (ich[k] == null || (ich[k] > 0 && !bel[k])) continue;      // modulda bu belgi detal nomidan ko'rinmasa (komod "4 chexolli") — jarima emas
      const qator = { k, soraldi: ich[k], modulda: bel[k] };
      if (ich[k] === bel[k]) mos.push(qator); else { mosEmas.push(qator); ball += Math.abs(ich[k] - bel[k]) * (k === 'polka' ? 1 : 4); }   // yumshoq: nom so'zi (−3) ustun, son farqi ikkinchi darajali (qismlar nomi har modulda har xil yozilgan)
    }
    const natija = { topildi: !yetishmaydi.length, frg: f.code, nom: f.name, olcham, mos, mosEmas, yetishmaydi, ball, nomzodlar: nomzod.length };
    if (!eng || (natija.topildi && !eng.topildi) || (natija.topildi === eng.topildi && (ball < eng.ball - 1e-9 || (Math.abs(ball - eng.ball) < 1e-9 && f.code < eng.frg)))) eng = natija;
  }
  return eng;
}
