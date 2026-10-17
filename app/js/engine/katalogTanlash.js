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
  { re: /vityach|vityajk|vytyajk|вытяж/i, soz: /vit[iy]?ch|vit[iy]?yaj|vytyaj|вытяж|hood/ },
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
      if (w === v) mos.push(qator); else { mosEmas.push(qator); ball += Math.abs(w - v) / 10; if (Math.abs(w - v) > 0.2 * v) yetishmaydi.push(qator); }
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
