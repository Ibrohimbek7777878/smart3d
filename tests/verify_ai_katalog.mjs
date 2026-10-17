/* egasi #183: "bizda bor modullardan foydalanib AI bizga konstruksiya qilib bersin" — testchining 14 so'rovi (AI'siz tahlilchi).
 * Har so'rov: turi to'g'ri tanildi (oshxona / shablon / bitta modul / tanilmadi), faqat katalog modullari (CH- yo'q), ustma-ust 0,
 * talablar jim tashlab ketilmaydi (ustkisiz, duxovka kolonnada — penal SP-K-020, idish yuvish mashinasi SP-TX-002), eshik soni farqi
 * "mos" deyilmaydi, maxsus modul (moyka) faqat so'ralganda, xona so'rovi bitta modulga tushmaydi, tanilmagan — hech narsa qurilmaydi.
 * Ishlatish: node tests/verify_ai_katalog.mjs */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { aiTur, shablonReja, buyumlar } from '../app/js/engine/aiTur.js';
import { promptLoyiha } from '../app/js/engine/promptlar.js';
import { matndanSpec, specTekshir } from '../app/js/engine/konstruksiyaTili.js';
import { katalogdanTop } from '../app/js/engine/katalogTanlash.js';
import { konstruksiya } from '../app/js/engine/konstruktor/index.js';
import { aiBuild } from '../app/js/ai.js';
import { applySexStandart } from '../app/js/engine/standart.js';
import { footprint } from '../app/js/engine/rules.js';

const DATA = fileURLToPath(new URL('../app/data/', import.meta.url));
const J = (p) => JSON.parse(readFileSync(DATA + p, 'utf8'));
const std = J('sex-standartlari.json');
const cat = {};
for (const f of J('fragments.json')) cat[f.code] = f;
for (const f of J('fragments-mc.json').fragments) cat[f.code] = f;
for (const f of Object.values(cat)) applySexStandart(f, std);
for (const a of J('appliances.json').appliances) cat[a.code] = { code: a.code, name: a.name, category: 'appliance', group: 'texnika', w: a.w, d: a.d, h: a.h, min_w: 200, max_w: 1200, production: 'none', parts: [], holes: [], hardware: [], edge: [] };
const P = J('promptlar.json').promptlar;

let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) pass++; else { fail++; console.log('  ✗', name, info); } };
const S = JSON.stringify;

/* ustma-ust (bir xil balandlik oralig'ida) */
function ustmaUst(pl) {
  let n = 0;
  for (let i = 0; i < pl.length; i++) for (let j = i + 1; j < pl.length; j++) {
    const a = footprint(pl[i]), b = footprint(pl[j]);
    const xy = a.x0 < b.x1 - 2 && b.x0 < a.x1 - 2 && a.y0 < b.y1 - 2 && b.y0 < a.y1 - 2;
    const za = +pl[i].z || 0, zb = +pl[j].z || 0;
    if (xy && za < zb + (+pl[j].h || 0) - 1 && zb < za + (+pl[i].h || 0) - 1) n++;
  }
  return n;
}
const katalogdan = (pl) => pl.length > 0 && pl.every(p => cat[p.frg] && !/^CH-/.test(p.frg));
const kons = (room, talab) => konstruksiya(Object.assign({}, room, { utilities: [] }), talab, cat).variantlar[0] || null;
const oshxona = (m) => aiBuild(m, cat, { konstruktor: kons });
const shablon = (m, id) => { const p = P.find(x => x.id === id); const rj = shablonReja(m, p, cat); return { rj, r: promptLoyiha(rj.prompt, rj.kirish, cat) }; };
const modul = (m) => { const raw = matndanSpec(m); return katalogdanTop(specTekshir(raw).spec, raw, cat, m); };
const yuqori = (pl) => pl.filter(p => (+p.z || 0) >= 1000 && cat[p.frg].category !== 'appliance');

const EGA = 'Kuxnya 4500 mm, Haytek bezruchka, gola frofilli birinchi etaj balandligi 870mm fartuk 600 mm 2 etaj 750mm 3 etaj 600mm balandlikda, chuqurliklar 1 etaj 450 mm 2 etaj 350mm, 3 etaj 560mm gaz va vitichka 600mm dan 1 etajda 3 ta tortma bor tandem vacuum,Stolichnitsa 38mmx600mm';
const SORA = [
  'oshxona 3 metr', EGA, 'L shaklli oshxona 3600x3000', 'P shaklli oshxona 3600x2800x2400', 'кухня 3200 мм, духовка в колонне, посудомойка',
  'oshxona 2.4 m ustki shkaflarsiz', 'shkaf-kupe 2400 eni, 3 eshik', 'yotoqxona: krovat 1600, ikki tumba, garderob', 'dahliz 1800, kiyim ilgich va oyoq kiyim joyi',
  'mehmonxona tv zona 3000', "Shkaf 1200×600×2200: chapda shtanga, o'ngda 4 polka, 2 eshik", 'pastki shkaf 600 eshikli', 'pastki shkaf 800 3 tortma', 'salom, menga mashina chizib ber'
];
const TUR = ['oshxona', 'oshxona', 'oshxona', 'oshxona', 'oshxona', 'oshxona', 'modul', 'shablon', 'shablon', 'shablon', 'modul', 'modul', 'modul', 'nomalum'];
SORA.forEach((m, i) => ok(`${i + 1}. «${m.slice(0, 40)}» — turi ${TUR[i]}`, aiTur(m).tur === TUR[i], S(aiTur(m))));

/* 1–6: oshxonalar */
{
  const r1 = await oshxona(SORA[0]);
  ok('1. oshxona 3 metr — to\'g\'ri, katalogdan, ustma-ust 0, karta bor', r1.karta && r1.karta.shakl === 'I' && katalogdan(r1.doc.placements) && !ustmaUst(r1.doc.placements), S(r1.karta));
  const r2 = await oshxona(SORA[1]);
  ok('2. egasi matni — 3 qavat, katalogdan, ustma-ust 0', r2.oshxona && r2.oshxona.natija && r2.oshxona.natija.qavatlar.length === 3 && katalogdan(r2.doc.placements) && !ustmaUst(r2.doc.placements));
  const r3 = await oshxona(SORA[2]);
  ok('3. L oshxona — karta shakli L (to\'g\'ri emas), 2 devor', r3.karta && r3.karta.soraldi === 'L' && r3.karta.shakl === 'L' && r3.karta.devorlar.length === 2 && !ustmaUst(r3.doc.placements), S(r3.karta));
  const r4 = await oshxona(SORA[3]);
  ok('4. P oshxona 3600x2800x2400 — U, 3 devor, 2400 — shift balandligi (kartada)', r4.karta && r4.karta.shakl === 'U' && r4.karta.devorlar.length === 3 && r4.doc.room.wall_height === 2400
    && S(r4.karta.olcham3) === S({ w: 3600, d: 2800, h: 2400 }) && katalogdan(r4.doc.placements) && !ustmaUst(r4.doc.placements), S([r4.karta, r4.doc.room.wall_height]));
  ok('4. ustki shkaflar shiftga sig\'adi (2400)', r4.doc.placements.every(p => (+p.z || 0) + (+p.h || 0) <= 2400), S(r4.doc.placements.map(p => p.z + p.h)));
  const r5 = await oshxona(SORA[4]);
  const c5 = r5.doc.placements.map(p => p.frg);
  ok('5. духовка в колонне — penal SP-K-020; посудомойка — SP-TX-002 moyka yonida; talab kartada', c5.includes('SP-K-020') && c5.includes('SP-TX-002') && r5.karta.talab.penal && r5.karta.talab.posudomoyka, S(c5));
  const pm = r5.doc.placements.find(p => p.frg === 'SP-TX-002'), mo = r5.doc.placements.find(p => /^MC-KP-0[78]$/.test(p.frg));
  ok('5. idish yuvish mashinasi moyka bilan yonma-yon', pm && mo && (Math.abs(pm.x - (mo.x + mo.w)) < 1 || Math.abs(mo.x - (pm.x + pm.w)) < 1), S([pm, mo]));
  ok('5. penal ustida ustki shkaf yo\'q, ustma-ust 0, katalogdan', !ustmaUst(r5.doc.placements) && katalogdan(r5.doc.placements));
  const r6 = await oshxona(SORA[5]);
  ok('6. ustki shkaflarsiz — ustki qator yo\'q', r6.karta.talab.ustki === false && yuqori(r6.doc.placements).length === 0 && r6.doc.placements.length > 0, S(r6.doc.placements.map(p => p.frg + '@' + p.z)));
  /* talab joyga sig'masa — jim emas: penal olib tashlanadi va konstruktor izohi (karta qizil qator) */
  const r5b = await oshxona('кухня 1800 мм, духовка в колонне, посудомойка');
  const c5b = r5b.doc.placements.map(p => p.frg);
  ok('5b. 1800 mm ga sig\'masa — penal yoki posudomoyka yo\'q va izohda "joy_…"', (!c5b.includes('SP-K-020') || !c5b.includes('SP-TX-002')) && (r5b.karta.izohlar || []).some(z => /^joy_/.test(z.kalit)), S([c5b, r5b.karta.izohlar]));
  /* so'ralmasa — penal va posudomoyka qo'yilmaydi (avvalgidek) */
  ok('so\'ralmasa penal / posudomoyka yo\'q', !r1.doc.placements.some(p => p.frg === 'SP-K-020' || p.frg === 'SP-TX-002'));
}

/* 7, 11–13: bitta modul */
{
  const t7 = modul(SORA[6]);
  ok('7. shkaf-kupe 2400, 3 eshik → SP-G-011 (3 eshikli kupe), eshik 3 — mos', t7.topildi && t7.frg === 'SP-G-011' && t7.mos.some(x => x.k === 'eshik' && x.soraldi === 3 && x.modulda === 3), S(t7));
  ok('7. 4 eshikli modul "mos" deyilmaydi', !t7.mos.some(x => x.k === 'eshik' && x.soraldi !== x.modulda));
  const t11 = modul(SORA[10]);
  ok('11. shkaf 1200×600×2200 → MC-SH-01 (avvalgidek)', t11.topildi && t11.frg === 'MC-SH-01', S([t11.frg, t11.olcham]));
  const t12 = modul(SORA[11]);
  ok('12. pastki shkaf 600 eshikli → moyka emas (MC-KP-02), eni 600', t12.topildi && t12.frg === 'MC-KP-02' && t12.olcham.w === 600 && !/moyka/i.test(t12.nom), S([t12.frg, t12.nom, t12.olcham]));
  ok('12b. moyka so\'ralsa — moyka moduli', /moyka/i.test(modul('pastki shkaf 600 moyka uchun 2 eshik').nom || ''));
  const t13 = modul(SORA[12]);
  ok('13. pastki shkaf 800 3 tortma → SP-K-022 (avvalgidek)', t13.topildi && t13.frg === 'SP-K-022' && t13.olcham.w === 800, S(t13.frg));
}

/* 8–10: xona shablonlari */
{
  const { rj, r } = shablon(SORA[7], 'yotoqxona');
  const k = r.placements.map(p => p.frg);
  ok('8. yotoqxona — karavot 1600 (SP-BD-003), garderob, tasodifiy MC-KP yo\'q', k.includes('SP-BD-003') && r.placements.find(p => p.frg === 'SP-BD-003').w === 1600 && k.includes('SP-W-006') && !k.some(c => /^MC-KP/.test(c)), S(k));
  ok('8. ikki tumba — katalogda yo\'q: qizil qator', rj.qatorlar.some(z => z.kalit === 'buyum_yoq' && z.v.b === 'tumba' && z.v.n === 2 && z.diqqat), S(rj.qatorlar));
  ok('8. ustma-ust 0, katalogdan', !ustmaUst(r.placements) && katalogdan(r.placements));
  const d = shablon(SORA[8], 'dahliz');
  const kd = d.r.placements.map(p => p.frg);
  ok('9. dahliz 1800 — xona eni 1800, kiyim ilgich SP-D-002, poyabzal SP-W-008 (982 shkaf emas)', d.r.xona.W === 1800 && kd.includes('SP-D-002') && kd.includes('SP-W-008') && !kd.includes('MC-SH-01'), S([d.r.xona, kd]));
  ok('9. ustma-ust 0, sig\'madi yo\'q', !ustmaUst(d.r.placements) && !d.r.sigmadi.length, S(d.r.sigmadi));
  const m = shablon(SORA[9], 'mehmonxona-tv');
  const km = m.r.placements.map(p => p.frg);
  ok('10. mehmonxona tv zona — TV taxta, oshxona moduli yo\'q', km.includes('SP-SH-002') && !km.some(c => /^MC-K|^SP-K-/.test(c)), S(km));
  ok('10. eni 3000 — shablon chegarasi 3400 (qizil qator, jim emas)', m.rj.qatorlar.some(z => z.kalit === 'olcham_chegara' && z.v.v === 3000 && z.v.m === 3400 && z.diqqat), S(m.rj.qatorlar));
  ok('10. ustma-ust 0', !ustmaUst(m.r.placements));
}

/* 14: tanilmagan */
ok('14. tanilmagan — qurilmaydi (tur nomalum)', aiTur(SORA[13]).tur === 'nomalum');
ok('tanilmagan: bo\'sh matn, "rasm chiz", "hello"', ['', 'rasm chiz', 'hello'].every(m => aiTur(m).tur === 'nomalum'));
/* yo'naltirish: avvalgi oshxona va modul matnlari o'zgarmadi */
ok('avvalgi oshxona matnlari — oshxona', ['oshxona 3.6x3 m, balandlik 2.7, 4 ta pastki shkaf', 'кухня 3.6x3 м, высота 2.7, 4 нижних шкафа', '3x4 metr, L shakl, burchakka tumba, gaz plita, tepasiga osma shkaf, xolodilnik'].every(m => aiTur(m).tur === 'oshxona'));
ok('avvalgi modul matnlari — modul', ['shkaf 1200 4 polka', 'komod 6 tortma', 'javon 800x300x1800', 'тумба 600, 4 ящика'].every(m => aiTur(m).tur === 'modul'));
ok('xona so\'zi + bitta mebel — modul', aiTur('yotoqxona uchun shkaf 1200x600x2200, 2 eshik').tur === 'modul');
ok('buyumlar: "ikki tumba" — 2', S(buyumlar('yotoqxona: krovat 1600, ikki tumba, garderob').map(b => [b.tur, b.n])) === S([['krovat', 1], ['tumba', 2], ['garderob', 1]]));
ok('natija har safar bir xil', S(shablon(SORA[7], 'yotoqxona').r) === S(shablon(SORA[7], 'yotoqxona').r));

console.log(fail ? `\n❌ ${fail} xato (${pass} pass)` : `\n=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
