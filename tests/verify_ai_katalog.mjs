/* egasi #183: "bizda bor modullardan foydalanib AI bizga konstruksiya qilib bersin" — testchining 14 so'rovi (AI'siz tahlilchi).
 * Har so'rov: turi to'g'ri tanildi (oshxona / shablon / bitta modul / tanilmadi), faqat katalog modullari (CH- yo'q), ustma-ust 0,
 * talablar jim tashlab ketilmaydi (ustkisiz, duxovka kolonnada — penal SP-K-020, idish yuvish mashinasi SP-TX-002), eshik soni farqi
 * "mos" deyilmaydi, maxsus modul (moyka) faqat so'ralganda, xona so'rovi bitta modulga tushmaydi, tanilmagan — hech narsa qurilmaydi.
 * Ishlatish: node tests/verify_ai_katalog.mjs */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { aiTur, shablonReja, buyumlar, modulniTop, KIND_MODUL, XONA_SHABLON } from '../app/js/engine/aiTur.js';
import { promptLoyiha } from '../app/js/engine/promptlar.js';
import { matndanSpec, specTekshir } from '../app/js/engine/konstruksiyaTili.js';
import { katalogdanTop, modulTuri, modulBelgilari, buyumdanTop, modulBolimSoni } from '../app/js/engine/katalogTanlash.js';
import { konstruksiya } from '../app/js/engine/konstruktor/index.js';
import { aiBuild } from '../app/js/ai.js';
import { garnituraReja } from '../app/js/engine/garnitur.js';
import { devorChegara } from '../app/js/engine/devorOraliq.js';
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

/* ══ egasi #209 (14): "130 ta tayyor moduldan AI barchasidan terib bersin" — qamrov ══
 * N = katalogdagi hamma tayyor modul: SP-… (85) + MC-… (38) + o'rnatma texnika SP-TX-… (7) = 130.
 * "AI ishlata oladigan" = shu modulning O'Z belgilari (tur so'zi, o'lchami, eshik/tortma/polka soni, nomidagi maxsus so'z) bilan
 * yozilgan oddiy so'rov AI orqali aynan shu modulni tanlaydi. Belgilari bir xil modullar ajratilmaydi — "juft" deb ro'yxatlanadi
 * (ikkinchisi ham uchraydi, lekin boshqa modul bilan bir xil so'rovga to'g'ri keladi). Hech narsa o'ylab topilmaydi. */
const NOM_SOZ = (f) => String(f.name || '').replace(/^MC\s*·\s*/, '').replace(/\([^)]*\d+\s*x\s*\d+[^)]*\)/g, ' ').replace(/[()+,]/g, ' ').replace(/\s+/g, ' ').trim();
const MAXSUS_SOZ = /moyka|gluxoy|vityachka|kargo|duxovoy nije|tandir|aventos|sushilka|pufog/i;
function sorov(f) {
  const k = modulTuri(f), b = modulBelgilari(f), ol = `${f.w}x${f.d}x${f.h}`;
  const sozlar = (String(f.name || '').match(MAXSUS_SOZ) || []);
  const tarkib = (b.eshik ? ` ${b.eshik} eshik` : ' eshiksiz') + (b.tortma ? ` ${b.tortma} tortma` : '') + (b.polka ? ` ${b.polka} polka` : '');
  if (k === 'penal' && /^SP-K-006$/.test(f.code)) return `${NOM_SOZ(f)} ${ol}`;
  if (/^kuxnya-(pastki|ustki)$/.test(f.group) && !/^SP-ST/.test(f.code)) return `${f.group === 'kuxnya-pastki' ? 'pastki' : 'ustki'} shkaf ${sozlar.join(' ')} ${ol}${tarkib}`;
  if (/^MC-(SH|KR)/.test(f.code)) return `${k === 'krovat' ? 'krovat spalni' : 'garderob shkaf'} ${(String(f.name).match(/\d{3}/) || ['000'])[0]} ${ol}`;
  if (k === 'parta') return `parta ${NOM_SOZ(f).replace(/парта/i, '')} ${ol}`;
  if (/^MC-K[AK]/.test(f.code)) return `${k === 'antresol' ? 'antresol' : 'penal'} ${sozlar.join(' ')} ${ol}${tarkib}`;
  return `${NOM_SOZ(f)} ${ol}`;
}
const tanla = (m) => { const yo = aiTur(m); if (yo.tur !== 'modul') return { tur: yo.tur, frg: null }; const t = modulniTop(m, cat, yo); return { tur: 'modul', frg: t && t.topildi ? t.frg : null, t }; };
{
  const hammasi = Object.values(cat);
  const natija = hammasi.map(f => { const q = sorov(f), r = tanla(q); return { code: f.code, q, got: r.frg, tur: r.tur, ok: r.frg === f.code }; });
  /* belgilari bir xil modullar: so'rov matni ham, o'lchami ham, soni ham bir xil → juft (bittasi tanlanadi) */
  const guruh = {};
  for (const n of natija) (guruh[n.q] = guruh[n.q] || []).push(n.code);
  const juft = natija.filter(n => !n.ok && guruh[n.q].length > 1 && n.got && guruh[n.q].includes(n.got));
  const oks = natija.filter(n => n.ok).length;
  const yoq = natija.filter(n => !n.ok && !juft.includes(n));
  console.log(`  AI ishlata oladigan tayyor modullar: ${oks} / ${hammasi.length}` + (juft.length ? ` (+${juft.length} ta belgilari bir xil juft, alohida tanlanmaydi: ${juft.map(n => n.code + '≡' + n.got).join(', ')})` : ''));
  if (process.env.KATALOG_TOLIQ) console.log(natija.filter(n => !n.ok).map(n => `    ${n.code} [${n.q}] → ${n.got || n.tur}`).join('\n'));
  if (yoq.length) console.log(`  tanilmay qolganlar (${yoq.length}): ${yoq.map(n => n.code).join(', ')}`);
  ok('qamrov: 130 modulning kamida 127 tasi AI orqali o\'z belgilari bilan tanlanadi (oldin: 26 — bitta modul yo\'li, 53 — barcha yo\'l)', oks >= 127, `${oks}/${hammasi.length}: ${yoq.concat(juft).map(n => n.code + '[' + n.q + ']→' + (n.got || n.tur)).join('; ')}`);
  ok('qamrov: N = 85 SP + 38 MC + 7 texnika = 130', hammasi.length === 130 && hammasi.filter(f => /^SP-TX/.test(f.code)).length === 7);
}

/* har modul turi uchun oddiy so'rov → tanlangan kod (nom/tur/o'lcham bo'yicha; xona so'zi ham, 3 o'lcham ham yo'q) */
{
  const T = [
    ['divan 2000', 'SP-S-001'], ['mehmonxona divani 2200x900x800', 'SP-S-006'], ['kreslo', 'SP-S-003'], ['ofis kreslasi 650x650x1100', 'SP-C-001'], ['oshxona stuli 400x400x900', 'SP-C-004'],
    ['ish stoli 1400', 'SP-T-004'], ['kompyuter stoli', 'SP-T-005'], ['ovqat stoli 6 kishilik', 'SP-T-002'], ['jurnal stoli', 'SP-S-004'], ['yozuv stoli 3 tortmali tumba 1400x700x750', 'SP-O-010'],
    ['krovat 1600', 'SP-BD-003'], ['kir yotoq 180', 'SP-BD-004'], ['komod 6 tortma', 'SP-BD-005'], ['bolalar parta 800x490x730', 'MC-PA-02'],
    ['tv taxta 1.8 m', 'SP-SH-002'], ['kitob javoni', 'SP-SH-003'], ['vitrina', 'SP-SH-004'], ['kiyim ilgich', 'SP-D-002'], ['poyabzal shkafi 800', 'SP-W-008'],
    ["hammom ko'zguli shkaf", 'SP-H-011'], ['hammom osma tumba rakovina', 'SP-H-010'], ['gyalka shkafi', 'SP-B-005'],
    ['penal duxovka', 'SP-K-020'], ['antresol 2 fasad', 'MC-KA-02'], ['burchak shkaf', 'SP-K-027'], ['ichki eshik', 'SP-D-001'], ['deraza 1400', 'SP-WI-001'],
    ['duxovka', 'SP-TX-001'], ['posudomoyka', 'SP-TX-002'], ['stoleshnitsa 3 m', 'SP-ST-001'], ['kupe 2400 3 eshik', 'SP-G-011'], ['garderob 1800', 'SP-W-006'],
    ['pastki shkaf 600 moyka uchun 2 eshik', 'MC-KP-08'], ['ustki shkaf vityachka 2 eshik', 'MC-KU-10']
  ];
  for (const [m, kod] of T) { const r = tanla(m); ok(`tur: «${m}» → ${kod}`, r.frg === kod, S(r.tur) + ' ' + r.frg); }
  /* shablon va oshxona yo'llari buzilmadi; bir nechta tur — xona shabloni (har biri katalogdan); tanilmagan — hech narsa */
  ok('«krovat 1600 va ikki tumba» — bitta modul emas, xona shabloni', aiTur('krovat 1600 va ikki tumba').tur === 'shablon');
  ok('«stol va 4 stul» — xona shabloni', aiTur('stol va 4 stul').tur === 'shablon');
  ok('«hammom 2x2.5, shkaf, rakovina» — xona (hammom shabloni)', aiTur('hammom 2x2.5 m, rakovina, ko\'zgu').tur === 'shablon');
  ok('«salom», «mashina chizib ber» — tanilmadi (modul tanlanmaydi)', ['salom', 'mashina chizib ber', 'samolyot'].every(m => aiTur(m).tur === 'nomalum'));
  /* katalogda yo'q tur — "bajarilmadi": tumba (krovat yonida) katalogda yo'q → KIND_MODUL bo'sh */
  ok("katalogda yo'q tur (krovat yonidagi tumba) — KIND_MODUL bo'sh, shablon qizil qator beradi", KIND_MODUL.tumba === null);
  ok("hamma KIND_MODUL kodi katalogda bor", Object.values(KIND_MODUL).every(c => !c || cat[c]), S(Object.values(KIND_MODUL).filter(c => c && !cat[c])));
  /* o'lcham chegaradan chiqsa — eng yaqin ruxsat etilgan qiymat va "mos emas" qatori (jim emas) */
  const d = tanla('kupe 5000 3 eshik');
  ok('«kupe 5000» — o\'lcham chegaradan tashqari: jim qabul qilinmaydi (topilmadi yoki «mos emas» qatori)', d.t && (!d.t.topildi || d.t.mosEmas.some(x => x.k === 'eni')), S(d.t && [d.t.topildi, d.t.mosEmas]));
}

/* ══ TZ-35 B+C (egasi #242–#244): spalniy garnitur — matn BO'LAKLARGA ajratiladi, har buyum o'z o'lchami bilan ══
 * Oldin: oddiy 1 ta shkaf 1800×2100 (birinchi son hammasiga), krovat/trimo/oyna/yumshoq/push/klassik tilda yo'q, tushunilmaganlar ro'yxati bo'sh. */
{
  const sheets = J('sheet-catalog.json').sheets;
  const UZ = "spalniy garnitur, classic model, spalniy razmeri 1800x2100 mm ldsp, bosh va oyoq qismida yumshoq detallari, shkafi 2400x2300 mm 3 qismdan (o'rtada kiyim ilish, 2 chekkasi polka), trimosi tortmali tepasida oyna, ruchkasiz push mexanizmda, umumiy rangi kashemir";
  const RU = 'спальный гарнитур, классика, размер спальни 1800x2100 мм лдсп, мягкие детали в изголовье и в ногах, шкаф 2400x2300 мм из 3 частей (в центре штанга для одежды, по краям полки), трюмо с ящиками, сверху зеркало, без ручек push, общий цвет кашемир';
  const EN = 'bedroom set, classic model, bed size 1800x2100 mm chipboard, upholstered head and foot, wardrobe 2400x2300 mm in 3 sections (hanging rail in the middle, shelves on both edges), dressing table with drawers and a mirror on top, handleless push mechanism, overall color cashmere';
  const T = devorChegara({ wall_thickness: 100 });
  const holat = (g, kalit) => (g.qatorlar.find(z => z.kalit === kalit) || {}).holat;
  for (const [til, m] of [['uz', UZ], ['ru', RU], ['en', EN]]) {
    const yo = aiTur(m), g = garnituraReja(m, cat, { sheets });
    const k = g.placements.map(p => p.frg).sort();
    ok(`G1[${til}] garnitur turi (oldin: modul — 1 ta shkaf)`, yo.tur === 'garnitur', S(yo));
    ok(`G2[${til}] 5 modul, katalogdan: krovat SP-BD-004 + yumshoq bosh SP-BD-002 + shkaf SP-G-011 + trimo SP-BD-005 + oyna SP-H-011`,
      S(k) === S(['SP-BD-002', 'SP-BD-004', 'SP-BD-005', 'SP-G-011', 'SP-H-011']) && katalogdan(g.placements), S(k));
    const kr = g.placements.find(p => p.frg === 'SP-BD-004'), sh = g.placements.find(p => p.frg === 'SP-G-011'), tr = g.placements.find(p => p.frg === 'SP-BD-005'), oy = g.placements.find(p => p.frg === 'SP-H-011'), bosh = g.placements.find(p => p.frg === 'SP-BD-002');
    ok(`G3[${til}] o'lcham o'z buyumiga: krovat 1800×2100, shkaf eni 2400 bo'yi 2300 (birinchi son hammasiga olinmadi)`, kr.w === 1800 && kr.d === 2100 && sh.w === 2400 && sh.h === 2300 && tr.w !== 1800 && tr.w !== 2400, S([kr.w, kr.d, sh.w, sh.h, tr.w]));
    ok(`G4[${til}] ustma-ust 0, hammasi xona ichida va devordan ≥ ${T} mm`, !ustmaUst(g.placements) && g.sigmadi.length === 0 && g.placements.every(p => { const f = footprint(p); return f.x0 >= T - 0.5 && f.y0 >= T - 0.5 && f.x1 <= g.xona.W - T + 0.5 && f.y1 <= g.xona.D - T + 0.5; }), S(g.xona));
    ok(`G5[${til}] krovat orqa devorda, markazda, bosh tomoni devorda (yumshoq bosh devorga tegib, krovat uning oldida)`,
      bosh.y === T && Math.abs(kr.y - (T + bosh.d)) < 1 && Math.abs((kr.x + kr.w / 2) - g.xona.W / 2) < 6 && kr.rot === 0, S([bosh.y, kr.y, kr.x, g.xona.W]));
    ok(`G6[${til}] shkaf yon (chap) devor bo'ylab, trimo old devorda markazda, oyna trimo ustida (bir xil markaz, z = trimo bo'yi)`,
      sh.rot === 270 && sh.x === T && tr.rot === 180 && Math.abs((tr.x - tr.w / 2) - g.xona.W / 2) < 6 && oy.z === tr.h && Math.abs(oy.x - tr.x) < 1 && oy.kozgu === true, S([sh.rot, sh.x, tr.rot, tr.x, oy.z, tr.h]));
    const dek = g.placements.filter(p => p.dekor);
    ok(`G7[${til}] rang BUTUN garniturga: har modulda bir xil «Кашемир» dekori (korpus va fasad)`, dek.length === 5 && new Set(dek.map(p => p.dekor.korpus + '|' + p.dekor.fasad)).size === 1 && /Кашемир/.test(dek[0].dekor.korpus) && /Кашемир/.test(dek[0].dekor.fasad), S(dek.map(p => p.dekor)));
    ok(`G8[${til}] klassik uslub — hamma modulda uslub:'klassik'; push — shkaf va trimoda push:true (ruchkasiz); yumshoq krovat belgisi`,
      g.placements.every(p => p.uslub === 'klassik') && sh.push === true && tr.push === true && kr.push === undefined && S(kr.yumshoq) === S({ bosh: true, oyoq: true }), S([sh.push, tr.push, kr.yumshoq]));
    /* B3: har bo'lak va xususiyat — holat bilan; jim tashlash yo'q */
    ok(`G9[${til}] bo'laklar holati: krovat/shkaf/trimo bajarildi, oyna qisman (hammom ko'zgusi), yumshoq bosh bajarildi, yumshoq oyoq BAJARILMADI (sabab bilan), push va klassik qisman, rang bajarildi`,
      holat(g, 'krovat') === 'bajarildi' && holat(g, 'shkaf') === 'bajarildi' && holat(g, 'trimo') === 'bajarildi' && holat(g, 'oyna') === 'qisman' && holat(g, 'yumshoq_bosh') === 'bajarildi'
      && holat(g, 'yumshoq_oyoq') === 'bajarilmadi' && holat(g, 'push') === 'qisman' && holat(g, 'uslub_klassik') === 'qisman' && holat(g, 'rang') === 'bajarildi' && holat(g, 'ldsp') === 'bajarildi', S(g.qatorlar.map(z => z.kalit + ':' + z.holat)));
    ok(`G10[${til}] bajarilmaganlar ro'yxati bo'sh emas (yumshoq oyoq, push, klassik, oyna, kupe) va hammasi sabab bilan; tilda tanilmagan so'z yo'q`,
      g.bajarilmadi.length >= 4 && g.bajarilmadi.every(z => z.diqqat) && ['yumshoq_oyoq', 'push', 'uslub_klassik', 'oyna', 'shkaf_kupe'].every(x => g.bajarilmadi.some(z => z.kalit === x)) && g.tushunilmadi.length === 0, S([g.bajarilmadi.map(z => z.kalit), g.tushunilmadi]));
    ok(`G11[${til}] shkaf tarkibi: 3 qism, o'rtada shtanga (modulda bor), chetlarda polka — kartada`, holat(g, 'shkaf_qism') === 'bajarildi' && holat(g, 'shkaf_shtanga_bor') === 'bajarildi' && holat(g, 'shkaf_polka') === 'bajarildi' && g.qatorlar.find(z => z.kalit === 'shkaf_qism').v.n === 3);
    ok(`G12[${til}] har bo'lakka qator bor: 4 buyum bo'lagi tanildi (krovat, shkaf, trimo, oyna), umumiy bo'laklar jim tashlanmadi`, S(g.bolaklar.map(b => b.tur)) === S(['krovat', 'shkaf', 'trimo', 'oyna']) && g.umumiy.bolaklar >= 7, S([g.bolaklar.map(b => b.tur), g.umumiy]));
    ok(`G13[${til}] xona aytilmagan — sukut: garnitur sig'adigan eng kichik (qator «xona_sukut»), modullar orasi ≥ 500 mm`, holat(g, 'xona_sukut') === 'sukut' && g.xona.W >= 3000 && g.xona.D >= 3000, S(g.xona));
  }
  const g1 = garnituraReja(UZ, cat, { sheets }), g2 = garnituraReja(UZ, cat, { sheets });
  ok('G14 natija har safar bir xil', S(g1.placements) === S(g2.placements) && S(g1.qatorlar) === S(g2.qatorlar));
  /* jim tashlash yo'q: tanilmagan so'z — ro'yxatda; katalogda yo'q tur (tumba) — bajarilmadi */
  const gU = garnituraReja(UZ + ', qizil flamingo bo\'lsin', cat, { sheets });
  ok('G15 tilda tanilmagan so\'zlar kartada («Tushunilmadi: qizil, flamingo») va bajarilmadi ro\'yxatida', gU.tushunilmadi.includes('flamingo') && gU.tushunilmadi.includes('qizil') && gU.bajarilmadi.some(z => z.kalit === 'tushunilmadi'), S(gU.tushunilmadi));
  const gT = garnituraReja("yotoqxona garnituri: karavot 1600, ikki tumba, shkaf 1800x2200, xona 4x3.5 m", cat, { sheets });
  ok('G16 katalogda yo\'q tur (ikki tumba) — bajarilmadi (jim emas); aytilgan xona 4×3.5 — shu o\'lchamda; karavot 1600', holat(gT, 'buyum_yoq') === 'bajarilmadi' && gT.qatorlar.find(z => z.kalit === 'buyum_yoq').v.n === 2 && gT.xona.W === 4000 && gT.xona.D === 3500 && gT.placements.some(p => p.frg === 'SP-BD-003' && p.w === 1600), S([gT.xona, gT.placements.map(p => p.frg + ':' + p.w)]));
  const gK = garnituraReja("spalniy garnitur xona 3x3 m, krovat 1800x2100, shkaf 2400x2300, trimo", cat, { sheets });
  ok('G17 xona kichik — kengaytiriladi va kartada aytiladi (xona_keng), ustma-ust 0, sig\'madi 0', holat(gK, 'xona_keng') === 'qisman' && gK.xona.W > 3000 && !ustmaUst(gK.placements) && gK.sigmadi.length === 0, S([gK.xona, gK.kengaydi]));
  ok('G18 rang ERP ro\'yxatida yo\'q — bajarilmadi (jim emas), modullar standartda', holat(garnituraReja(UZ.replace('kashemir', 'zumrad kosmik'), cat, { sheets }), 'rang_yoq') === 'bajarilmadi');
  ok('G19 yo\'naltirish: «oshxona garnituri 3 metr» — oshxona (garnitur emas); «krovat 1600 va ikki tumba» — shablon; bitta «trimo tortmali» — modul → komod SP-BD-005', aiTur('oshxona garnituri 3 metr').tur === 'oshxona' && aiTur('krovat 1600 va ikki tumba').tur === 'shablon'
    && aiTur('trimo tortmali').tur === 'modul' && (modulniTop('trimo tortmali', cat) || {}).frg === 'SP-BD-005');
  ok('G20 «krovat 1800x2100, shkaf 2400x2300, trimo» (garnitur so\'zisiz) ham — garnitur, oldingi birinchi-son xatosi yo\'q', aiTur('krovat 1800x2100, shkaf 2400x2300, trimo').tur === 'garnitur');
}

/* ══ TZ-35 qabul kamchiliklari (A, B1, B2, B3): o'lcham o'z buyumiga; «3 qismdan» = 3 bo'lim; rang hujjatda; to'xtov so'zlar tushunilmagan emas ══ */
{
  const sheets = J('sheet-catalog.json').sheets;
  const holat = (g, kalit) => (g.qatorlar.find(z => z.kalit === kalit) || {}).holat;
  /* A: «karavot 1800x2100 va 3 qanotli garderob 2400x2300» — oldin 0 modul (1800x2100 xona deb o'qilgan, shablon «xona») */
  const A = [['uz', 'karavot 1800x2100 va 3 qanotli garderob 2400x2300'], ['uz2', 'krovat 1800x2100 va shkaf 2400x2300'], ['ru', 'карават 1800x2100 и шкаф 2400x2300'], ['ru2', 'кровать 1800×2100 и 3-створчатый шкаф 2400×2300'], ['en', 'bed 1800x2100 and wardrobe 2400x2300']];
  for (const [til, m] of A) {
    const yo = aiTur(m), g = garnituraReja(m, cat, { sheets });
    const kr = g.placements.find(p => modulTuri(cat[p.frg]) === 'krovat'), sh = g.placements.find(p => ['garderob', 'kupe'].includes(modulTuri(cat[p.frg])));
    ok(`A1[${til}] «${m.slice(0, 30)}…» — garnitur (oldin: shablon «xona», 0 modul)`, yo.tur === 'garnitur', S(yo));
    ok(`A2[${til}] 2 alohida modul: krovat 1800×2100 va shkaf eni 2400 bo'yi 2300; 1800×2100 xona emas`, g.placements.length === 2 && kr && sh && kr.w === 1800 && kr.d === 2100 && sh.w === 2400 && sh.h === 2300 && holat(g, 'xona_sukut') === 'sukut', S(g.placements.map(p => [p.frg, p.w, p.d, p.h])));
    ok(`A3[${til}] ustma-ust 0, sig'madi 0, katalogdan`, !ustmaUst(g.placements) && !g.sigmadi.length && katalogdan(g.placements));
  }
  ok('A4 «3 qanotli garderob» — eshik soni teng modul SP-W-006 (3 qanotli), 4 qanotli SP-W-007 emas', garnituraReja(A[0][1], cat, { sheets }).placements.some(p => p.frg === 'SP-W-006'));
  for (const sz of ['krovat', 'karavot', 'kravat', 'karavat', 'karyola', 'кровать', 'bed']) ok(`A5 imlo «${sz}» + shkaf — garnitur, krovat topildi`, aiTur(`${sz} 1800x2100 va shkaf 2400x2300`).tur === 'garnitur' && garnituraReja(`${sz} 1800x2100 va shkaf 2400x2300`, cat, { sheets }).placements.some(p => modulTuri(cat[p.frg]) === 'krovat'), sz);
  const gX = garnituraReja('karavot 1800x2100 va shkaf 2400x2300, xona 5x6 m', cat, { sheets }), gY = garnituraReja('krovat 1800x2100 va shkaf 2400x2300 xonasi 5x6', cat, { sheets });
  ok('A6 «xona 5x6» — xona o\'lchami (5000×6000), buyum o\'lchamlari o\'z joyida', [gX, gY].every(g => g.xona.W === 5000 && g.xona.D === 6000 && g.placements.find(p => modulTuri(cat[p.frg]) === 'krovat').d === 2100), S([gX.xona, gY.xona]));
  ok('A7 yo\'naltirish buzilmadi: «yotoqxona 4x5» — shablon; «krovat 1600 va ikki tumba» — shablon; «shkaf 800x600 va tumba 600x500» (krovat/trimo yo\'q) — garnitur emas; «oshxona 3 metr» — oshxona',
    aiTur('yotoqxona 4x5').tur === 'shablon' && aiTur('krovat 1600 va ikki tumba').tur === 'shablon' && aiTur('shkaf 800x600 va tumba 600x500').tur !== 'garnitur' && aiTur('oshxona 3 metr').tur === 'oshxona');

  /* B1+B2+B3: egasining to'liq prompti (qavssiz) */
  const EGA9 = "spalniy garnitur, classic model spalniy razmeri 1800x2100 mm material ldsp, bosh va oyoq qismida yumshoq detallari bor, shkafi 2400x2300mm 3 qismdan iborat o'rtadagi qismi kiyim ilish uchun 2 ta chekkasi polkalar, trimosi tortmali tepasida oyna bor ruchkasiz push mexanizmda, umuniy rangi kashemir";
  const g9 = garnituraReja(EGA9, cat, { sheets });
  const sh9 = g9.placements.find(p => ['garderob', 'kupe'].includes(modulTuri(cat[p.frg])));
  ok('B1 «3 qismdan» (o\'rtada shtanga, chetlarda polka) = 3 BO\'LIMLI modul SP-G-011 (peregorodka ×2); SP-W-007 (4 qanot, 1 bo\'lim) emas', sh9 && sh9.frg === 'SP-G-011' && modulBolimSoni(cat['SP-G-011']) === 3 && modulBolimSoni(cat['SP-W-007']) === 1 && modulBolimSoni(cat['SP-W-006']) === 1, sh9 && sh9.frg);
  ok('B1 kartada: shkaf_qism bajarildi (3=3), shtanga modulda bor, polka, kupe — QISMAN (ochiladigan eshikli 3 bo\'limli shkaf katalogda yo\'q)', holat(g9, 'shkaf_qism') === 'bajarildi' && holat(g9, 'shkaf_shtanga_bor') === 'bajarildi' && holat(g9, 'shkaf_polka') === 'bajarildi' && holat(g9, 'shkaf_kupe') === 'qisman', S(g9.qatorlar.map(z => z.kalit + ':' + z.holat)));
  ok('B1 mos bo\'limli modul bo\'lmasa — «qisman» qator (shkaf_qism): 5 qismdan', garnituraReja('krovat 1800x2100 va shkaf 2400x2300 5 qismdan', cat, { sheets }).qatorlar.some(z => z.kalit === 'shkaf_qism' && z.holat === 'qisman'));
  const dk = g9.placements.filter(p => p.dekor);
  ok('B2 rang hujjat maydoniga tushadi: har qurilgan modulda p.dekor {nom: kashemir, korpus: «Кашемир…», fasad} bo\'sh emas (web ularni p.slots korpus/polka/fasad + doc.erpMat ga o\'tkazadi)',
    dk.length === g9.placements.length && dk.every(p => p.dekor.nom === 'kashemir' && /Кашемир/.test(p.dekor.korpus) && /Кашемир/.test(p.dekor.fasad)) && g9.rang && g9.rang.korpus && /Кашемир/.test(g9.rang.korpus.name), S(g9.placements.map(p => p.dekor)));
  const BEKOR = ['material', 'bor', 'iborat', 'umuniy', 'umumiy', 'rangi', 'razmeri', 'model', 'qismdan', 'qism', 'detal', 'mebel', 'yumshoq', 'tortmali', 'ldsp', 'classic', 'klassik', 'tepasida', 'ostida', 'bilan', 'va', 'ham', 'hamda', 'mm', 'bosh', 'oyoq', 'push'];
  ok('B3 to\'xtov/umumiy so\'zlar tushunilmagan emas: egasi prompti — Tushunilmadi ro\'yxati ANIQ bo\'sh (oldin: material, bor, iborat, umuniy)', S(g9.tushunilmadi) === '[]' && !g9.qatorlar.some(z => z.kalit === 'tushunilmadi'), S(g9.tushunilmadi));
  const gQ = garnituraReja(EGA9 + ", qizil flamingo", cat, { sheets });
  ok('B3 haqiqiy tushunilmaganlar chiqadi: «qizil flamingo» → [qizil, flamingo], to\'xtov so\'zlar yo\'q', S(gQ.tushunilmadi) === S(['qizil', 'flamingo']) && BEKOR.every(w => !gQ.tushunilmadi.includes(w)), S(gQ.tushunilmadi));
  const gR = garnituraReja('spalniy garnitur, krovat 1800x2100 mm material ldsp, yumshoq oyoq, shkaf 2400x2300 umumiy rangi kashemir, trimo ko\'zgu ramkasi bilan, push mexanizmi, umumiy hajmi', cat, { sheets });
  ok('B3 «yumshoq oyoq» — bajarilmadi, «push mexanizmi» — qisman (alohida qatorlar), «ko\'zgu ramkasi» tushunilmadi; «material, umumiy, bilan» emas', holat(gR, 'yumshoq_oyoq') === 'bajarilmadi' && holat(gR, 'push') === 'qisman' && gR.tushunilmadi.includes('ramkasi') && gR.tushunilmadi.includes('hajmi') && ['material', 'umumiy', 'bilan', 'rangi'].every(w => !gR.tushunilmadi.includes(w)), S([gR.tushunilmadi, gR.qatorlar.map(z => z.kalit + ':' + z.holat)]));
  /* ruscha va inglizcha to'liq prompt: tushunilmadi bo'sh (G10 ham) */
  ok('B3 shkaf tarkibi qavssiz va qavsli matnda bir xil modul (SP-G-011)', ['shkafi 2400x2300 mm 3 qismdan (o\'rtada kiyim ilish, 2 chekkasi polka)', 'shkafi 2400x2300 mm 3 qismdan o\'rtadagi qismi kiyim ilish uchun 2 ta chekkasi polkalar'].every(x => (garnituraReja('krovat 1800x2100, ' + x, cat, { sheets }).placements.find(p => p.frg === 'SP-G-011'))));
}
/* egasi #239–#241: yotoqxona GARNITURI (shablon) — ikki kishilik karavot (boshi devorga), 3 qanotli garderob, komod, deraza, eshik;
   yon tumbalar katalogda yo'q — "bajarilmadi" qatori; o'lchamga moslashadi, ustma-ust 0, devordan 3 mm */
{
  const yp = P.find(x => x.id === 'yotoqxona');
  const kod = yp.toplam.map(x => x.kod);
  ok('garnitur: karavot MC-KR-04 + garderob SP-W-006 + komod SP-BD-005 + deraza SP-WI-001 + eshik SP-D-001', S(kod.slice().sort()) === S(['MC-KR-04', 'SP-BD-005', 'SP-D-001', 'SP-W-006', 'SP-WI-001'].sort()), S(kod));
  for (const [e, c] of [[4000, 3600], [3400, 3000], [5200, 4200], [7000, 7000]]) {
    const r = promptLoyiha(yp, { eni: e, chuqurligi: c }, cat);
    const pl = r.placements, fp = pl.map(footprint);
    ok(`garnitur ${e}x${c}: hammasi joylandi, sig'madi yo'q`, pl.length === 5 && !r.sigmadi.length, S([pl.length, r.sigmadi]));
    ok(`garnitur ${e}x${c}: ustma-ust 0, katalogdan`, !ustmaUst(pl) && katalogdan(pl));
    ok(`garnitur ${e}x${c}: devordan 3 mm (orqa, chap, ong, old)`, fp.every(f => f.x0 >= 52.5 && f.y0 >= 52.5 && f.x1 <= e - 52.5 && f.y1 <= c - 52.5) && fp.some(f => Math.round(f.y0) === 53) && fp.some(f => Math.round(f.x0) === 53) && fp.some(f => Math.round(e - f.x1) === 53) && fp.some(f => Math.round(c - f.y1) === 53), S(fp.map(f => [f.x0, f.y0, f.x1, f.y1].map(Math.round))));
    const kr = pl.find(p => p.frg === 'MC-KR-04'), fk = footprint(kr);
    ok(`garnitur ${e}x${c}: karavot boshi orqa devorga (90° burilgan, uzunligi 2000 xonaga qaraydi), xona o'rtasida`, kr.rot === 90 && Math.round(fk.y1 - fk.y0) === 2000 && Math.round(fk.x1 - fk.x0) === 1750 && Math.abs((fk.x0 + fk.x1) / 2 - e / 2) <= 5, S([kr.rot, fk]));
    ok(`garnitur ${e}x${c}: deraza balandda (z 900), eshik polda`, pl.find(p => p.frg === 'SP-WI-001').z === 900 && pl.find(p => p.frg === 'SP-D-001').z === 0);
  }
  {
    const r = promptLoyiha(yp, {}, cat), pk = (c) => r.placements.find(p => p.frg === c);
    ok('garnitur: karavot, garderob, komod — klassik va BITTA umumiy rang (kashemir), deraza/eshik rangsiz', ['MC-KR-04', 'SP-W-006', 'SP-BD-005'].every(c => pk(c).klassik && pk(c).garnituRang === 0xD2C2AC) && !pk('SP-WI-001').garnituRang && !pk('SP-D-001').klassik, S(r.placements.map(p => [p.frg, p.klassik, p.garnituRang])));
    ok('garnitur: garderob va komod ruchkasiz (push — faqat ko\'rinish), komod trimo eni 1200, p.ruchkasiz YO\'Q (kesim/narx o\'zgarmaydi)', pk('SP-W-006').push && pk('SP-BD-005').push && pk('SP-BD-005').w === 1200 && r.placements.every(p => !p.ruchkasiz));
  }
  const rj = shablonReja('yotoqxona 4x3.6', yp, cat);
  ok("garnitur: yon tumbalar — «bajarilmadi» qatori (karavot yonidagi tumba ×2), qizil", rj.qatorlar.some(z => z.kalit === 'buyum_yoq' && z.v.b === 'tumba' && z.v.n === 2 && z.diqqat), S(rj.qatorlar));
  const rj2 = shablonReja('yotoqxona 4x3.6 va ikki tumba', yp, cat);
  ok("garnitur: tumba so'ralsa — qator takrorlanmaydi", rj2.qatorlar.filter(z => z.kalit === 'buyum_yoq' && z.v.b === 'tumba').length === 1);
  const rk = shablon('yotoqxona 5x4, krovat 1600, garderob', 'yotoqxona');
  ok("garnitur: krovat 1600 — SP-BD-003 (burilmaydi, eni 1600), qolgan garnitur saqlanadi, ustma-ust 0", rk.r.placements.find(p => p.frg === 'SP-BD-003') && rk.r.placements.find(p => p.frg === 'SP-BD-003').rot === 0 && rk.r.placements.some(p => p.frg === 'SP-WI-001') && !ustmaUst(rk.r.placements), S(rk.r.placements.map(p => [p.frg, p.rot])));
  /* bolalar va mehmonxona shablonlari ham deraza + eshik bilan to'liqroq: chegara o'lchamlarida sig'madi yo'q, ustma-ust 0 */
  for (const id of ['bolalar', 'mehmonxona-tv']) {
    const pr = P.find(x => x.id === id), mm = pr.maydon;
    ok(`${id}: deraza SP-WI-001 va eshik SP-D-001 bor`, pr.toplam.some(x => x.kod === 'SP-WI-001') && pr.toplam.some(x => x.kod === 'SP-D-001'));
    for (const [a, b] of [[0, 0], [1, 1], [0, 1], [1, 0], [0.5, 0.5]]) {
      const k = { eni: mm[0].min + (mm[0].max - mm[0].min) * a, chuqurligi: mm[1].min + (mm[1].max - mm[1].min) * b };
      const r = promptLoyiha(pr, k, cat);
      ok(`${id} ${Math.round(k.eni)}x${Math.round(k.chuqurligi)}: sig'madi yo'q, ustma-ust 0`, !r.sigmadi.length && !ustmaUst(r.placements) && katalogdan(r.placements), S(r.sigmadi));
    }
  }
  const ai = aiTur('yotoqxona 4x3.6');
  ok('garnitur: AI «yotoqxona» so\'rovi shablonga tushadi', ai.tur === 'shablon' && ai.shablon === 'yotoqxona');
}

/* ===== Qabul-50 kamchiliklari (agent/qabul50fix): ko'p mebelli matnda hech narsa jim yo'qolmasin; har bo'lak o'z o'lchamini oladi ===== */
{
  const sheets = J('sheet-catalog.json').sheets;
  const xs = (m) => { const yo = aiTur(m); const p = yo.shablon === 'xona' ? XONA_SHABLON : P.find(x => x.id === yo.shablon); const rj = shablonReja(m, p, cat); return { yo, rj, r: promptLoyiha(rj.prompt, rj.kirish, cat) }; };
  const tur = (r) => r.placements.map(p => modulTuri(cat[p.frg]));
  const qat = (rj, kalit, b) => rj.qatorlar.filter(z => z.kalit === kalit && (!b || z.v.b === b));
  const sozlar = (v) => Object.keys(v);
  /* (1) #33: krovat va 2 tumba — tumba katalogda yo'q: qizil «bajarilmadi» qatori (jim emas) */
  for (const m of ['krovat va 2 tumba', 'кровать и 2 тумбы', 'bed and 2 nightstands']) {
    const x = xs(m);
    ok(`Q33 «${m}» — krovat qurildi, tumba ×2 «bajarilmadi» (qizil), sig'madi 0`, x.yo.tur === 'shablon' && tur(x.r).filter(t => t === 'krovat').length === 1 && x.r.placements.length === 1 && qat(x.rj, 'buyum_yoq', 'tumba').some(z => z.v.n === 2 && z.diqqat) && !x.r.sigmadi.length, S([x.yo, x.rj.qatorlar]));
  }
  /* (1) #34: divan 2 metr va stol — divan eni 2000, stol alohida modul, sig'madi yo'q (xona kattalashadi, kartada aytiladi) */
  for (const m of ['divan 2 metr va stol', 'диван 2 метра и стол', 'sofa 2 m and table']) {
    const x = xs(m), dv = x.r.placements.find(p => modulTuri(cat[p.frg]) === 'divan');
    ok(`Q34 «${m}» — divan eni 2000 + stol alohida modul, sig'madi 0, ustma-ust 0, xona kattalashgani kartada`, x.r.placements.length === 2 && dv && dv.w === 2000 && tur(x.r).includes('ish stoli') | tur(x.r).some(t => /stol/.test(t)) && !x.r.sigmadi.length && !ustmaUst(x.r.placements) && qat(x.rj, 'buyum_olcham', 'divan').length === 1 && x.rj.qatorlar.some(z => z.kalit === 'olcham_kengaydi' && z.diqqat), S([x.r.placements.map(p => [p.frg, p.w]), x.r.sigmadi, tur(x.r)]));
  }
  /* (1) #38: bolalar garnituri: krovat, stol, shkaf — stol tushib qolmaydi (bolalar shablonida parta = stol), shkaf, krovat bor */
  for (const m of ["bolalar garnituri: krovat, stol, shkaf", 'детский гарнитур: кровать, стол, шкаф', 'kids set: bed, desk, wardrobe']) {
    const x = xs(m), t = tur(x.r);
    ok(`Q38 «${m.slice(0, 28)}» — krovat, stol (parta/stol), shkaf — hammasi; tushunilmadi/«bajarilmadi» jim emas; sig'madi 0`, t.includes('krovat') && t.some(z => ['parta', 'stol'].includes(z) || /stol/.test(z)) && t.some(z => ['garderob', 'kupe'].includes(z)) && !x.r.sigmadi.length && !ustmaUst(x.r.placements) && !x.rj.qatorlar.some(z => z.kalit === 'buyum_yoq'), S([x.yo, t, x.r.sigmadi]));
  }
  /* (1) #39: ofis: stol, shkaf, javon — shkaf jim tushmaydi */
  for (const m of ['ofis: stol, shkaf, javon', 'офис: стол, шкаф, стеллаж', 'office: desk, cabinet, bookcase']) {
    const x = xs(m), t = tur(x.r);
    ok(`Q39 «${m}» — stol, shkaf (garderob), javon uchalasi; sig'madi 0`, x.yo.shablon === 'ofis-ikki' && x.r.placements.some(p => p.frg === 'SP-O-010') && t.includes('garderob') && x.r.placements.some(p => p.frg === 'SP-SH-005') && !x.r.sigmadi.length && !ustmaUst(x.r.placements), S([x.yo, x.r.placements.map(p => p.frg), x.r.sigmadi]));
  }
  /* (2) #32: karavot 1600x2000 va 2 eshikli garderob — garnitur (jim 0 modul emas), o'lcham krovatga, garderobda o'lcham yo'q, «2 eshikli» tushunilmadi emas */
  for (const m of ['karavot 1600x2000 va 2 eshikli garderob', 'кровать 1600x2000 и 2-створчатый шкаф', 'bed 1600x2000 and 2 door wardrobe']) {
    const yo = aiTur(m), g = yo.tur === 'garnitur' ? garnituraReja(m, cat, { sheets }) : null;
    const kr = g && g.placements.find(p => modulTuri(cat[p.frg]) === 'krovat'), sh = g && g.placements.find(p => ['garderob', 'kupe'].includes(modulTuri(cat[p.frg])));
    ok(`Q32 «${m}» — garnitur: krovat 1600×2000 + garderob; xona shablon emas; tushunilmadi bo'sh; ustma-ust 0`, g && g.placements.length === 2 && kr && sh && kr.w === 1600 && kr.d === 2000 && !g.tushunilmadi.length && !ustmaUst(g.placements) && !g.sigmadi.length, S([yo, g && g.placements.map(p => [p.frg, p.w, p.d]), g && g.tushunilmadi]));
  }
  ok('Q32 yo\'naltirish buzilmadi: «yotoqxona: krovat 1600x2000, garderob» — yotoqxona shabloni; «krovat 1600 va ikki tumba» — xona shabloni', aiTur('yotoqxona: krovat 1600x2000, garderob').tur === 'shablon' && aiTur('krovat 1600 va ikki tumba').tur === 'shablon');
  /* (3) #36: bitta sonli «<buyum> <son>» o'z buyumiga eni; chegaradan chiqsa — eng yaqin chegara va kartada */
  for (const m of ['garderob 2400 va komod 1200', 'гардероб 2400 и комод 1200', 'wardrobe 2400 and dresser 1200']) {
    const x = xs(m), gd = x.r.placements.find(p => modulTuri(cat[p.frg]) === 'garderob'), km = x.r.placements.find(p => modulTuri(cat[p.frg]) === 'komod');
    ok(`Q36 «${m}» — garderob eni 2400, komod eni 1200 (har biri o'zida); sig'madi 0; kartada ikki «eni» qatori`, gd && km && gd.w === 2400 && km.w === 1200 && !x.r.sigmadi.length && !ustmaUst(x.r.placements) && qat(x.rj, 'buyum_olcham').length === 2, S([x.r.placements.map(p => [p.frg, p.w]), x.r.sigmadi]));
  }
  {
    const x = xs('garderob 5000 va komod 1200'), gd = x.r.placements.find(p => modulTuri(cat[p.frg]) === 'garderob'), f = cat[gd.frg];
    ok('Q36 chegaradan chiqsa: garderob 5000 → modul max_w, kartada qizil qator (olcham chegarasi)', gd.w === +f.max_w && qat(x.rj, 'buyum_olcham_chegara', 'garderob').some(z => z.v.v === 5000 && z.v.m === gd.w && z.diqqat), S([gd.w, x.rj.qatorlar]));
  }
  /* (4) #47: antresol bilan kupe shkaf — kupe qurildi, antresol «bajarilmadi» (katalogda faqat oshxona antresoli) */
  for (const m of ['antresol bilan kupe shkaf', 'антресоль и шкаф-купе', 'mezzanine and sliding wardrobe']) {
    const x = xs(m);
    ok(`Q47 «${m}» — kupe SP-G-010 qurildi, antresol ×1 «bajarilmadi» (qizil), jim emas`, x.r.placements.length === 1 && x.r.placements[0].frg === 'SP-G-010' && qat(x.rj, 'buyum_antresol_yoq', 'antresol').some(z => z.diqqat), S(x.rj.qatorlar));
  }
  ok('Q48 «bar peshtaxta aylana» — kutilgan xulq: tushunmadim (nomalum), hech narsa qurilmaydi', aiTur('bar peshtaxta aylana').tur === 'nomalum');
  /* i18n: har buyum turi va yangi karta qatorlari uch tilda (kalit o'zi ko'rinib qolmasin) */
  {
    const src = readFileSync(fileURLToPath(new URL('../app/js/engine/aiTur.js', import.meta.url)), 'utf8');
    const turlar = [...src.slice(src.indexOf('const BUYUM = {'), src.indexOf('/* aniqroq tur bilan')).matchAll(/^  (\w+):/gm)].map(m => m[1]);
    for (const til of ['uz', 'ru', 'en']) {
      const L = JSON.parse(readFileSync(fileURLToPath(new URL(`../web/src/i18n/${til}.json`, import.meta.url)), 'utf8'));
      const yoq = turlar.filter(k => !L['ai.b_' + k]).concat(['olcham_kengaydi', 'buyum_olcham', 'buyum_olcham_chegara', 'buyum_antresol_yoq'].filter(k => !L['ai.sh_' + k]));
      ok(`i18n[${til}] barcha buyum turlari (ai.b_*) va yangi qatorlar (ai.sh_*) tarjimada`, !yoq.length, yoq.join(','));
    }
  }
}

console.log(fail ? `\n❌ ${fail} xato (${pass} pass)` : `\n=== HAMMASI OK (${pass} pass, 0 fail) ===`);
process.exit(fail ? 1 : 0);
